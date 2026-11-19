import { Node, NodeKey, nodeToKey, nodeEquals } from '../graph/GraphTypes';
import { Graph } from '../graph/Graph';
import { TerrainType } from '../graph/Terrain';
import { EnemyPerception } from './AgentTypes';

export interface EscapeDecision {
  nextMove: [number, number] | null;
  escapePath: Node[];
  bestNeighbor: Node | null;
  reason: string;
}

/**
 * Módulo de Avaliação de Risco e Segurança do Pac-Man Autônomo.
 * Responsável por quantificar ameaças topológicas, detectar armadilhas/becos sem saída,
 * calcular penalizações dinâmicas não-destrutivas e planejar manobras de evasão.
 */
export class RiskAssessment {
  // Limiares de distância topológica no grafo (número de arestas/passos)
  static readonly IMMEDIATE_THREAT_DISTANCE = 3.5;
  static readonly CAUTION_THREAT_DISTANCE = 6.0;
  static readonly VULNERABILITY_EXPIRATION_THRESHOLD = 2.0; // Segundos antes do término

  /**
   * Calcula as distâncias topológicas exatas (em arestas) de uma origem a todos os nós acessíveis via BFS.
   */
  computeTopologicalDistances(graph: Graph, source: Node): Map<NodeKey, number> {
    const distMap = new Map<NodeKey, number>();
    const sourceKey = nodeToKey(source);
    distMap.set(sourceKey, 0);

    const queue: Node[] = [source];

    while (queue.length > 0) {
      const u = queue.shift()!;
      const uDist = distMap.get(nodeToKey(u))!;

      for (const edge of graph.neighbors(u)) {
        const v = edge.node;
        const vKey = nodeToKey(v);
        if (!distMap.has(vKey)) {
          distMap.set(vKey, uDist + 1);
          queue.push(v);
        }
      }
    }

    return distMap;
  }

  /**
   * Avalia a periculosidade de cada fantasma e calcula o fator de ameaça [0.0, 1.0].
   */
  evaluateEnemyThreat(
    enemy: EnemyPerception,
    pacmanPos: Node,
    pacmanDistances: Map<NodeKey, number>
  ): { dangerFactor: number; graphDist: number; isVulnerable: boolean } {
    const enemyKey = nodeToKey(enemy.pos);
    const graphDist = pacmanDistances.get(enemyKey) ?? 999;

    let dangerFactor = 1.0;
    let isVulnerable = false;

    if (enemy.isFrightened) {
      if (enemy.frightenedTimeRemaining > RiskAssessment.VULNERABILITY_EXPIRATION_THRESHOLD) {
        // Totalmente inofensivo
        dangerFactor = 0.0;
        isVulnerable = true;
      } else if (enemy.frightenedTimeRemaining > 0) {
        // Prestes a voltar a ser letal: perigo escala linearmente de 0 a 1
        const remaining = enemy.frightenedTimeRemaining;
        dangerFactor = 1.0 - remaining / RiskAssessment.VULNERABILITY_EXPIRATION_THRESHOLD;
        isVulnerable = false;
      }
    }

    return { dangerFactor, graphDist, isVulnerable };
  }

  /**
   * Constrói o mapa de penalidades de risco dinâmico para os vértices do grafo.
   * Não altera os pesos originais do grafo.
   */
  buildRiskMap(
    graph: Graph,
    enemies: EnemyPerception[],
    pacmanPos: Node
  ): Map<NodeKey, number> {
    const riskMap = new Map<NodeKey, number>();
    const pacDistances = this.computeTopologicalDistances(graph, pacmanPos);

    for (const enemy of enemies) {
      const { dangerFactor } = this.evaluateEnemyThreat(enemy, pacmanPos, pacDistances);
      if (dangerFactor <= 0.01) continue;

      const enemyDistances = this.computeTopologicalDistances(graph, enemy.pos);

      // Aplica penalidade decrescente com o inverso do quadrado da distância ao fantasma
      for (const [nodeKey, dist] of enemyDistances.entries()) {
        if (dist > 5) continue;

        let penalty = 0;
        if (dist === 0) penalty = 80.0;
        else if (dist === 1) penalty = 45.0;
        else if (dist === 2) penalty = 20.0;
        else if (dist === 3) penalty = 8.0;
        else if (dist === 4) penalty = 3.0;
        else if (dist === 5) penalty = 1.0;

        const effectivePenalty = penalty * dangerFactor;
        const currentRisk = riskMap.get(nodeKey) ?? 0;
        riskMap.set(nodeKey, Math.max(currentRisk, effectivePenalty));
      }

      // Penaliza adicionalmente a rota de antecipação do inimigo (próximos 2 passos)
      if (enemy.path && enemy.path.length > 1) {
        for (let i = 1; i <= Math.min(3, enemy.path.length - 1); i++) {
          const pathNode = enemy.path[i];
          const k = nodeToKey(pathNode);
          const pathBonus = (15.0 / i) * dangerFactor;
          const cur = riskMap.get(k) ?? 0;
          riskMap.set(k, Math.max(cur, pathBonus));
        }
      }
    }

    return riskMap;
  }

  /**
   * Determina a rota de evasão ideal quando o Pac-Man está sob ameaça iminente.
   */
  calculateEscapeDecision(
    graph: Graph,
    pacmanPos: Node,
    enemies: EnemyPerception[],
    lastFacing: [number, number] | null,
    terrains: Map<string, TerrainType>
  ): EscapeDecision {
    const pacDistances = this.computeTopologicalDistances(graph, pacmanPos);
    const activeEnemies = enemies
      .map((e) => ({
        enemy: e,
        eval: this.evaluateEnemyThreat(e, pacmanPos, pacDistances),
      }))
      .filter((e) => e.eval.dangerFactor > 0.05);

    if (activeEnemies.length === 0) {
      return {
        nextMove: null,
        escapePath: [],
        bestNeighbor: null,
        reason: 'Nenhuma ameaça ativa',
      };
    }

    const neighbors = graph.neighbors(pacmanPos);
    if (neighbors.length === 0) {
      return {
        nextMove: null,
        escapePath: [],
        bestNeighbor: null,
        reason: 'Sem vizinhos disponíveis',
      };
    }

    // Calcula mapa de distâncias a partir de cada inimigo ativo
    const enemyDistMaps = activeEnemies.map((e) => ({
      dangerFactor: e.eval.dangerFactor,
      distMap: this.computeTopologicalDistances(graph, e.enemy.pos),
    }));

    let bestNeighbor: Node | null = null;
    let bestScore = -Infinity;

    for (const edge of neighbors) {
      const cand = edge.node;
      const candKey = nodeToKey(cand);
      const entryCell = graph.transitionEntry(pacmanPos, cand);
      const dr = entryCell[0] - pacmanPos[0];
      const dc = entryCell[1] - pacmanPos[1];

      // 1. Distância mínima topológica e direção em relação aos inimigos
      let minEnemyDist = 999;
      let totalEnemyDist = 0;
      let movesCloserToAny = false;

      for (const { dangerFactor, distMap } of enemyDistMaps) {
        if (dangerFactor <= 0.05) continue;
        const curD = distMap.get(nodeToKey(pacmanPos)) ?? 999;
        const candD = distMap.get(candKey) ?? 999;

        if (candD < minEnemyDist) {
          minEnemyDist = candD;
        }
        totalEnemyDist += candD * dangerFactor;

        // Se aproxima do fantasma ativo
        if (candD < curD) {
          movesCloserToAny = true;
        }
      }

      // Pontuação primária: distância ao fantasma mais próximo
      let score = minEnemyDist * 60.0 + totalEnemyDist * 5.0;

      // Penalidade severa se o passo reduz a distância para um fantasma letal
      if (movesCloserToAny) {
        score -= 250.0;
      }
      if (minEnemyDist <= 1) {
        score -= 500.0; // Risco de colisão direta imediata
      }

      // 2. Grau de conectividade (evitar becos sem saída)
      const degree = graph.degree(cand);
      if (degree <= 1) {
        score -= 35.0;
      } else if (degree >= 3) {
        // Bifurcação/Cruzamento oferece rotas de fuga alternativas
        score += 15.0;
      }

      // 3. Portais são excelentes rotas de fuga se afastam o Pac-Man do perigo
      if (!nodeEquals(entryCell, cand)) {
        score += 25.0;
      }

      // 4. Custo de Terreno
      const terrain = terrains.get(candKey) ?? TerrainType.NORMAL;
      if (terrain === TerrainType.LAVA) {
        score -= 40.0; // Evita lava se houver alternativas
      } else if (terrain === TerrainType.MUD) {
        score -= 15.0; // Lama desacelera e facilita captura
      } else if (terrain === TerrainType.BOOST) {
        score += 15.0; // Boost acelera o Pac-Man
      }

      // 5. Anti-oscilação (Hysteresis): penaliza levemente reversão imediata de 180°
      if (lastFacing && dr === -lastFacing[0] && dc === -lastFacing[1]) {
        score -= 8.0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestNeighbor = cand;
      }
    }

    if (!bestNeighbor) {
      return {
        nextMove: null,
        escapePath: [],
        bestNeighbor: null,
        reason: 'Nenhuma opção viável',
      };
    }

    const entryCell = graph.transitionEntry(pacmanPos, bestNeighbor);
    const dr = entryCell[0] - pacmanPos[0];
    const dc = entryCell[1] - pacmanPos[1];

    // Constrói um caminho de fuga projetado de 2-4 passos para exibição visual
    const escapePath: Node[] = [pacmanPos, bestNeighbor];
    let curr = bestNeighbor;
    let prev = pacmanPos;

    for (let step = 0; step < 3; step++) {
      const nextNbrs = graph.neighbors(curr).filter((n) => !nodeEquals(n.node, prev));
      if (nextNbrs.length === 0) break;

      let bestNext = nextNbrs[0].node;
      let maxD = -1;
      for (const n of nextNbrs) {
        const nKey = nodeToKey(n.node);
        let minD = 999;
        for (const { distMap } of enemyDistMaps) {
          const d = distMap.get(nKey) ?? 999;
          if (d < minD) minD = d;
        }
        if (minD > maxD) {
          maxD = minD;
          bestNext = n.node;
        }
      }

      escapePath.push(bestNext);
      prev = curr;
      curr = bestNext;
    }

    return {
      nextMove: [dr, dc],
      escapePath,
      bestNeighbor,
      reason: `Evasão ativa para (${bestNeighbor[0]}, ${bestNeighbor[1]})`,
    };
  }
}
