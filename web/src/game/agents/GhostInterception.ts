/**
 * Inteligência Estratégica do Fantasma Roxo (Interceptor / Emboscador).
 *
 * Fundamentação Teórica:
 * Enquanto o Fantasma Vermelho (Perseguidor direto) utiliza A* visando permanentemente
 * a posição atual do Pac-Man (p_0), o Fantasma Roxo analisa o vetor dinâmico de movimentação
 * e o caminho provável do Pac-Man no grafo P = [p_0, p_1, ..., p_k].
 *
 * Para cada nó candidato p_i (i >= 1):
 * - Computa o tempo estimado de chegada do Pac-Man:
 *     T_pac(p_i) = somatório_{j=0}^{i-1} w(p_j, p_{j+1}) * PLAYER_BASE_DELAY_MS
 * - Computa o tempo ótimo de chegada do Fantasma Roxo:
 *     T_ghost(p_i) = Custo_minimo(ghostPos, p_i) * GHOST_BASE_DELAY_MS
 * - Condição de Competitividade:
 *     T_ghost(p_i) <= T_pac(p_i) + TOLERANCIA
 *
 * O Fantasma Roxo seleciona o nó de interceptação ótimo (priorizando bifurcações e gargalos
 * à frente do Pac-Man) que pode alcançar em tempo competitivo, evitando confluir para o
 * mesmo corredor que o Fantasma Vermelho e gerando um cerco em pinça matematicamente fundamentado.
 */

import { Graph } from '../graph/Graph';
import { Node, NodeKey, nodeToKey, keyToNode, nodeEquals } from '../graph/GraphTypes';
import { PriorityQueue } from '../algorithms/PriorityQueue';
import { aStar } from '../algorithms/AStar';
import { GAME_SPEED_CONFIG } from '../config/GameConfig';

export interface InterceptionResult {
  target: Node;
  path: Node[];
  isInterception: boolean;
  pacmanArrivalTimeMs: number;
  ghostArrivalTimeMs: number;
}

/**
 * Computa o custo mínimo do caminho mais curto a partir de uma origem para todos
 * os nós alcançáveis no grafo ponderado com suporte a portais, via Min-Heap binário.
 */
export function computeDistancesFrom(graph: Graph, start: Node): Map<NodeKey, number> {
  const distances = new Map<NodeKey, number>();
  const pq = new PriorityQueue<{ key: NodeKey; dist: number }>();
  const startKey = nodeToKey(start);

  distances.set(startKey, 0);
  pq.enqueue({ key: startKey, dist: 0 }, 0);

  while (!pq.isEmpty()) {
    const item = pq.dequeue()!;
    const currentDist = item.dist;

    if (currentDist !== distances.get(item.key)) {
      continue;
    }

    const currentNode = keyToNode(item.key);
    for (const { node: neighbor, weight } of graph.neighbors(currentNode)) {
      const nKey = nodeToKey(neighbor);
      const tentative = currentDist + weight;

      if (tentative < (distances.get(nKey) ?? Infinity)) {
        distances.set(nKey, tentative);
        pq.enqueue({ key: nKey, dist: tentative }, tentative);
      }
    }
  }

  return distances;
}

/**
 * Projeta o caminho provável do Pac-Man no grafo.
 * - Se o agente autônomo já possui uma rota planejada ativa, utiliza essa rota.
 * - Se for jogador humano ou não houver rota explícita, projeta para frente ao longo
 *   da direção atual (facing), seguindo corredores, portais e cruzamentos em direção ao
 *   objetivo mais próximo (chave ou saída).
 */
export function getPacmanProbablePath(
  graph: Graph,
  currentPos: Node,
  facing: [number, number],
  remainingObjectives: Node[] = [],
  plannedPath?: Node[],
  horizon = 12
): Node[] {
  if (plannedPath && plannedPath.length > 1) {
    const startIdx = plannedPath.findIndex((n) => nodeEquals(n, currentPos));
    if (startIdx >= 0) {
      return plannedPath.slice(startIdx, startIdx + horizon);
    }
    return plannedPath.slice(0, horizon);
  }

  const projected: Node[] = [currentPos];
  let curr = currentPos;
  let currFacing = facing;
  const visitedInProj = new Set<string>([nodeToKey(currentPos)]);

  const targetObjective = remainingObjectives[0];

  for (let step = 0; step < horizon; step++) {
    // 1. Tenta continuar na direção do facing atual
    let nextNode = graph.resolveStep(curr, currFacing[0], currFacing[1]);

    if (!nextNode || !graph.hasEdge(curr, nextNode) || visitedInProj.has(nodeToKey(nextNode))) {
      // 2. Se a direção atual colide com parede ou já foi visitada, escolhe o vizinho mais promissor
      const nbrs = graph.neighbors(curr).filter((nbr) => !visitedInProj.has(nodeToKey(nbr.node)));

      if (nbrs.length === 0) {
        break; // Beco sem saída
      }

      if (nbrs.length === 1) {
        nextNode = nbrs[0].node;
      } else if (targetObjective) {
        // Em bifurcações, escolhe o vizinho que minimiza a distância Manhattan ao objetivo
        nbrs.sort((a, b) => {
          const dA =
            Math.abs(a.node[0] - targetObjective[0]) + Math.abs(a.node[1] - targetObjective[1]);
          const dB =
            Math.abs(b.node[0] - targetObjective[0]) + Math.abs(b.node[1] - targetObjective[1]);
          return dA - dB;
        });
        nextNode = nbrs[0].node;
      } else {
        nextNode = nbrs[0].node;
      }
    }

    if (!nextNode || visitedInProj.has(nodeToKey(nextNode))) {
      break;
    }

    const entry = graph.transitionEntry(curr, nextNode);
    const dr = entry[0] - curr[0];
    const dc = entry[1] - curr[1];
    if (dr !== 0 || dc !== 0) {
      currFacing = [dr, dc];
    }

    projected.push(nextNode);
    visitedInProj.add(nodeToKey(nextNode));
    curr = nextNode;
  }

  return projected;
}

/**
 * Calcula o alvo estratégico de interceptação do Fantasma Roxo.
 */
export function calculateInterceptionTarget(
  graph: Graph,
  ghostPos: Node,
  playerPos: Node,
  playerFacing: [number, number],
  pacmanPlannedPath?: Node[],
  remainingObjectives: Node[] = [],
  portals: [Node, Node][] = [],
  playerBaseDelay: number = GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS,
  ghostBaseDelay: number = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS
): InterceptionResult {
  // Caso de colisão iminente: se o fantasma já estiver na mesma posição do jogador
  if (nodeEquals(ghostPos, playerPos)) {
    return {
      target: playerPos,
      path: [ghostPos],
      isInterception: false,
      pacmanArrivalTimeMs: 0,
      ghostArrivalTimeMs: 0,
    };
  }

  // 1. Projeta a rota provável do Pac-Man
  const pacPath = getPacmanProbablePath(
    graph,
    playerPos,
    playerFacing,
    remainingObjectives,
    pacmanPlannedPath,
    14
  );

  // 2. Computa distâncias mínimas de Ghost até todos os nós do grafo
  const ghostDistances = computeDistancesFrom(graph, ghostPos);

  // 3. Avalia tempos cumulativos do Pac-Man ao longo do caminho
  interface Candidate {
    node: Node;
    index: number;
    pacTime: number;
    ghostTime: number;
    isJunction: boolean;
  }

  const candidates: Candidate[] = [];
  let cumPacTime = 0;

  for (let i = 1; i < pacPath.length; i++) {
    const prev = pacPath[i - 1];
    const curr = pacPath[i];
    const edgeWeight = graph.getEdgeWeight(prev, curr) ?? 1.0;
    cumPacTime += edgeWeight * playerBaseDelay;

    const ghostCost = ghostDistances.get(nodeToKey(curr));
    if (ghostCost !== undefined && Number.isFinite(ghostCost)) {
      const ghostTime = ghostCost * ghostBaseDelay;
      const isJunction = graph.degree(curr) >= 3;

      candidates.push({
        node: curr,
        index: i,
        pacTime: cumPacTime,
        ghostTime,
        isJunction,
      });
    }
  }

  // Tolerância temporal para intercepção (margem competitiva de ~350ms)
  const TOLERANCE_MS = 350;

  // Filtra candidatos competitivos onde T_ghost <= T_pac + TOLERANCIA
  const competitiveCandidates = candidates.filter((c) => c.ghostTime <= c.pacTime + TOLERANCE_MS);

  let chosenTarget: Node | null = null;
  let bestPacTime = 0;
  let bestGhostTime = 0;

  if (competitiveCandidates.length > 0) {
    // Prioridade 1: Bifurcação/Junção competitiva mais próxima à frente do Pac-Man
    // (bloqueia o leque de escolhas do jogador antes da fuga)
    const junctionCandidate = competitiveCandidates.find((c) => c.isJunction && c.index >= 2);

    if (junctionCandidate) {
      chosenTarget = junctionCandidate.node;
      bestPacTime = junctionCandidate.pacTime;
      bestGhostTime = junctionCandidate.ghostTime;
    } else {
      // Prioridade 2: Primeiro nó competitivo à frente (corte frontal)
      const earliest = competitiveCandidates[0];
      chosenTarget = earliest.node;
      bestPacTime = earliest.pacTime;
      bestGhostTime = earliest.ghostTime;
    }
  }

  // Se nenhum nó do percurso imediato for competitivo (Pac-Man mais rápido ou correndo em direção oposta)
  if (!chosenTarget) {
    // 4. Analisa os objetivos principais do Pac-Man (chaves ou saída)
    for (const obj of remainingObjectives) {
      const ghostCostToObj = ghostDistances.get(nodeToKey(obj));
      if (ghostCostToObj !== undefined && Number.isFinite(ghostCostToObj)) {
        // O fantasma corta caminho para emboscar o Pac-Man no objetivo
        chosenTarget = obj;
        bestGhostTime = ghostCostToObj * ghostBaseDelay;
        bestPacTime = cumPacTime;
        break;
      }
    }

    // 5. Se ainda assim não encontrar, escolhe a junção mais próxima ou o ponto mais avançado do caminho
    if (!chosenTarget) {
      const forwardJunction = candidates.find((c) => c.isJunction);
      if (forwardJunction) {
        chosenTarget = forwardJunction.node;
        bestGhostTime = forwardJunction.ghostTime;
        bestPacTime = forwardJunction.pacTime;
      } else if (pacPath.length > 1) {
        chosenTarget = pacPath[pacPath.length - 1];
      } else {
        chosenTarget = playerPos;
      }
    }
  }

  // 6. Calcula a rota ótima do Fantasma Roxo até o alvo escolhido via A*
  const searchResult = aStar(graph, ghostPos, chosenTarget, {
    portals,
    minWeight: 0.3,
  });

  return {
    target: chosenTarget,
    path: searchResult.found ? searchResult.path : [ghostPos, chosenTarget],
    isInterception: !nodeEquals(chosenTarget, playerPos),
    pacmanArrivalTimeMs: bestPacTime,
    ghostArrivalTimeMs: bestGhostTime,
  };
}
