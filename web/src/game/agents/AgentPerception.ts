import { Node, nodeToKey } from '../graph/GraphTypes';
import { Graph } from '../graph/Graph';
import { TerrainType } from '../graph/Terrain';
import { AgentPerceptionData, EnemyPerception } from './AgentTypes';
import { RiskAssessment } from './RiskAssessment';

export interface RawEnemyData {
  id: string;
  name: string;
  pos: Node;
  spawn: Node;
  facing: [number, number];
  path: Node[];
}

/**
 * Módulo de Percepção do Agente Autônomo.
 * Responsável por observar o estado do labirinto, objetivos e inimigos,
 * computando métricas topológicas no grafo sem efeitos colaterais no mundo físico.
 */
export class AgentPerception {
  private riskAssessment = new RiskAssessment();

  readState(
    currentPos: Node,
    graph: Graph,
    allKeys: Node[],
    collectedKeys: Set<string>,
    goal: Node,
    portalPairs: [Node, Node][],
    terrains: Map<string, TerrainType>,
    rawEnemies: RawEnemyData[] = [],
    frightenedUntilTime = 0,
    currentTime = 0,
    pacDots?: Set<string>,
    powerPellets?: Set<string>,
    health = 100,
    score = 0,
    seed = 0
  ): AgentPerceptionData {
    const remainingKeys = allKeys.filter((k) => !collectedKeys.has(nodeToKey(k)));

    // Computa distâncias topológicas reais a partir do Pac-Man via BFS
    const pacDistances = this.riskAssessment.computeTopologicalDistances(graph, currentPos);
    const isFrightenedGlobal = currentTime < frightenedUntilTime;
    const frightRemainingSec = isFrightenedGlobal
      ? Math.max(0, (frightenedUntilTime - currentTime) / 1000)
      : 0;

    const enemies: EnemyPerception[] = rawEnemies.map((raw) => {
      const eKey = nodeToKey(raw.pos);
      const graphDist = pacDistances.get(eKey) ?? 999;
      const dummyPerception: EnemyPerception = {
        id: raw.id,
        name: raw.name,
        pos: [raw.pos[0], raw.pos[1]],
        spawn: [raw.spawn[0], raw.spawn[1]],
        facing: [raw.facing[0], raw.facing[1]],
        path: raw.path.map((p) => [p[0], p[1]] as Node),
        isFrightened: isFrightenedGlobal,
        frightenedTimeRemaining: frightRemainingSec,
        graphDistance: graphDist,
        isVulnerable: false,
        dangerLevel: 1.0,
      };

      const evalResult = this.riskAssessment.evaluateEnemyThreat(
        dummyPerception,
        currentPos,
        pacDistances
      );

      dummyPerception.dangerLevel = evalResult.dangerFactor;
      dummyPerception.isVulnerable = evalResult.isVulnerable;
      dummyPerception.graphDistance = evalResult.graphDist;

      return dummyPerception;
    });

    return {
      currentPos: [currentPos[0], currentPos[1]],
      graph,
      remainingKeys,
      allKeys: allKeys.map((k) => [k[0], k[1]] as Node),
      collectedKeys: new Set(collectedKeys),
      goal: [goal[0], goal[1]],
      portalPairs: portalPairs.map(([p1, p2]) => [
        [p1[0], p1[1]],
        [p2[0], p2[1]],
      ] as [Node, Node]),
      terrains,
      enemies,
      frightenedUntilTime,
      currentTime,
      pacDots: pacDots ? new Set(pacDots) : undefined,
      powerPellets: powerPellets ? new Set(powerPellets) : undefined,
      health,
      score,
      seed,
    };
  }
}
