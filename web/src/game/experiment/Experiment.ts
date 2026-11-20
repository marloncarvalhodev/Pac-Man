import { MazeGenerator } from '../graph/MazeGenerator';
import { TerrainType } from '../graph/Terrain';
import { nodeEquals, nodeToKey, type Node } from '../graph/GraphTypes';
import { AutonomousAgent } from '../agents/AutonomousAgent';
import { AgentPerception, type RawEnemyData } from '../agents/AgentPerception';
import { calculateInterceptionTarget } from '../agents/GhostInterception';
import type { AutonomousMode, PlanningAlgorithm } from '../agents/AgentTypes';
import type { StrategyType } from '../agents/strategies';
import { aStar } from '../algorithms/AStar';
import { GAME_SPEED_CONFIG as speed } from '../config/GameConfig';
import { SCORE, createPacDots } from '../config/MatchRules';

export const ENGINE_VERSION = 2;
export const MAP = { rows: 25, cols: 25, loops: 0.1, portals: 1, keys: 2 };
export type Outcome = 'WON' | 'LOST' | 'TIMEOUT' | 'BLOCKED' | 'ERROR';
export interface ExperimentConfig {
  id: string;
  seeds: number[];
  repetitions: number;
  strategies: StrategyType[];
  algorithm: PlanningAlgorithm;
  mode: AutonomousMode;
  objective: 'exit' | 'dots' | 'survival' | 'score' | 'time';
  limitMs: number;
}
export interface ExperimentResult {
  id: string; batch: string; engine: number; date: string; seed: number; repetition: number;
  map: typeof MAP; strategy: StrategyType; algorithm: PlanningAlgorithm;
  mode: AutonomousMode; objective: ExperimentConfig['objective']; timeScale: 1;
  limitMs: number; outcome: Outcome; reason: string;
  initial: { player: Node; ghosts: Node[]; health: number; dots: number };
  simulatedMs: number; processingMs: number; decisionMs: number; cost: number;
  score: number; dots: number; moves: number; expanded: number; replans: number;
}

export function runMatch(config: ExperimentConfig, seed: number, repetition: number,
  strategy: StrategyType): ExperimentResult {
  const beginning = performance.now();
  const world = new MazeGenerator(MAP.rows, MAP.cols, seed)
    .generateWorld(MAP.loops, MAP.portals, MAP.keys);
  const { graph, goal, terrains, portalPairs } = world;
  const dots = createPacDots(world);
  const pellets = new Set(world.powerPellets.map(nodeToKey));
  const keys = new Set<string>();
  const ghosts = (config.mode === 'MVM' ? [world.enemySpawn, world.enemySpawn2] : [])
    .map((spawn, index): RawEnemyData & { due: number } => ({
      id: index === 0 ? 'red' : 'purple', name: index === 0 ? 'Perseguidor' : 'Interceptor',
      pos: spawn, spawn, facing: [0, -1], path: [], due: speed.GHOST_INITIAL_SPAWN_DELAY_MS,
    }));
  const initial = { player: world.start, ghosts: ghosts.map(g => g.spawn), health: 100, dots: dots.size };
  const agent = new AutonomousAgent(config.algorithm, config.mode, strategy);
  const perception = new AgentPerception();
  let player = world.start, facing: Node = [0, 1], time = 0, due = 0, powerUntil = 0;
  let health = initial.health, score = 0, cost = 0, moves = 0, decisionMs = 0;
  let outcome: Outcome = 'TIMEOUT', reason = 'Limite de tempo simulado';
  const observe = () => perception.readState(player, graph, world.keys, keys, goal,
    portalPairs, terrains, time < speed.GHOST_INITIAL_SPAWN_DELAY_MS ? [] : ghosts,
    powerUntil, time, dots, pellets, health, score, seed);
  const collision = () => {
    if (time < speed.GHOST_INITIAL_SPAWN_DELAY_MS) return false;
    for (const ghost of ghosts) {
      if (!nodeEquals(ghost.pos, player)) continue;
      if (time >= powerUntil) return true;
      score += SCORE.ghost;
      ghost.pos = ghost.spawn;
      ghost.path = [];
      ghost.due = time + speed.GHOST_BASE_DELAY_MS;
    }
    return false;
  };
  try {
    const started = performance.now();
    let running = agent.start(observe());
    decisionMs += performance.now() - started;
    if (!running) { outcome = 'BLOCKED'; reason = 'Plano inicial inviável'; }
    while (running && time < config.limitMs) {
      time = Math.min(due, ...ghosts.map(g => g.due), config.limitMs);
      if (time >= config.limitMs) break;
      if (due === time) {
        const started = performance.now();
        const state = observe();
        const direction = agent.update(state, 'PLAYING');
        decisionMs += performance.now() - started;
        const next = direction && graph.resolveStep(player, direction[0], direction[1]);
        if (!next || !direction) { outcome = 'BLOCKED'; reason = 'Sem próximo movimento válido'; break; }
        const weight = graph.getEdgeWeight(player, next);
        if (weight === undefined) throw new Error('Movimento fora do grafo');
        const entry = graph.transitionEntry(player, next);
        player = next;
        facing = direction;
        cost += weight;
        moves++;
        due = time + Math.max(1, Math.floor(speed.PLAYER_BASE_DELAY_MS * weight));
        for (const cell of [entry, next]) {
          const key = nodeToKey(cell);
          if (dots.delete(key)) score += SCORE.dot;
          if (!keys.has(key) && world.keys.some(k => nodeEquals(k, cell))) {
            keys.add(key); score += SCORE.key;
          }
          if (pellets.delete(key)) { score += SCORE.pellet; powerUntil = time + speed.FRIGHTENED_DURATION_MS; }
        }
        if (terrains.get(nodeToKey(entry)) === TerrainType.LAVA) health -= 10;
        if (health <= 0) { outcome = 'LOST'; reason = 'Lava'; break; }
        if (collision()) { outcome = 'LOST'; reason = 'Captura'; break; }
        const needsDots = config.objective === 'dots' || strategy === 'FULL_CLEAR';
        if (nodeEquals(player, goal) && keys.size === world.keys.length && (!needsDots || !dots.size)) {
          outcome = 'WON'; reason = 'Saída alcançada com os objetivos cumpridos'; score += SCORE.victory;
          break;
        }
      }
      for (let index = 0; index < ghosts.length; index++) {
        const ghost = ghosts[index];
        if (ghost.due !== time) continue;
        const frightened = time < powerUntil;
        if (frightened) {
          const neighbors = graph.neighbors(ghost.pos);
          const distance = (p: Node) => Math.abs(p[0] - player[0]) + Math.abs(p[1] - player[1]);
          ghost.path = [ghost.pos, ...neighbors.sort((a, b) => distance(b.node) - distance(a.node))
            .slice(0, 1).map(edge => edge.node)];
        } else if (index === 0) {
          ghost.path = aStar(graph, ghost.pos, player, { portals: portalPairs }).path;
        } else {
          const objectives = world.keys.filter(k => !keys.has(nodeToKey(k)));
          ghost.path = calculateInterceptionTarget(graph, ghost.pos, player, facing,
            agent.getRemainingPath(player), objectives.length ? objectives : [goal], portalPairs,
            speed.PLAYER_BASE_DELAY_MS, speed.GHOST_BASE_DELAY_MS).path;
        }
        const next = ghost.path[1];
        let weight = 1;
        if (next) {
          weight = graph.getEdgeWeight(ghost.pos, next) ?? 1;
          const entry = graph.transitionEntry(ghost.pos, next);
          ghost.facing = [entry[0] - ghost.pos[0], entry[1] - ghost.pos[1]];
          ghost.pos = next;
          ghost.path = ghost.path.slice(1);
        }
        ghost.due = time + Math.max(1, Math.floor(speed.GHOST_BASE_DELAY_MS * weight *
          (frightened ? speed.GHOST_FRIGHTENED_MULTIPLIER : 1)));
      }
      if (collision()) { outcome = 'LOST'; reason = 'Captura'; break; }
    }
  } catch (error) {
    outcome = 'ERROR'; reason = error instanceof Error ? error.message : 'Erro de execução';
  }
  const metrics = agent.getMatchMetrics(observe());
  return { id: [config.id, seed, repetition, strategy].join('/'), batch: config.id,
    engine: ENGINE_VERSION, date: new Date().toISOString(), seed, repetition, map: MAP,
    strategy, algorithm: config.algorithm, mode: config.mode, objective: config.objective,
    timeScale: 1, limitMs: config.limitMs, initial, outcome, reason,
    simulatedMs: time, processingMs: performance.now() - beginning, decisionMs,
    cost, score, dots: initial.dots - dots.size, moves,
    expanded: metrics.nodesExpanded, replans: metrics.replanCount };
}
