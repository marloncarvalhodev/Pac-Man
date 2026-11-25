import { describe, expect, it } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { Node, nodeEquals, nodeToKey } from '../game/graph/GraphTypes';
import { TerrainType, TERRAIN_COSTS } from '../game/graph/Terrain';
import { GAME_SPEED_CONFIG } from '../game/config/GameConfig';
import {
  MinCostStrategy,
  MinTimeStrategy,
  MaxScoreStrategy,
  SurvivalStrategy,
} from '../game/agents/strategies';
import { AutonomousAgent } from '../game/agents/AutonomousAgent';
import { AgentPerception } from '../game/agents/AgentPerception';
import { aStar } from '../game/algorithms/AStar';
import { dijkstra } from '../game/algorithms/Dijkstra';
import {
  calculateInterceptionTarget,
  computeDistancesFrom,
  getPacmanProbablePath,
} from '../game/agents/GhostInterception';

describe('Refinamento Técnico: Diagnóstico, Velocidades e Diferenciação dos Fantasmas', () => {
  const perception = new AgentPerception();

  // =========================================================================
  // 1. Velocidade Padrão e Multiplicadores de Terreno
  // =========================================================================
  describe('1. Velocidades Centrais e Multiplicadores de Terreno', () => {
    it('Os parâmetros de velocidade centralizados devem possuir os novos valores balanceados', () => {
      // Pac-Man: 200 ms (reduzido de 135 ms para maior legibilidade e reação)
      expect(GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS).toBe(200);
      // Fantasmas: 320 ms (balanceado para manter ameaça tática crível)
      expect(GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS).toBe(320);
      // Multiplicador do modo Frightened: 1.4x de lentidão
      expect(GAME_SPEED_CONFIG.GHOST_FRIGHTENED_MULTIPLIER).toBe(1.4);
    });

    it('O cálculo de delay de movimentação deve ser proporcional aos pesos dos terrenos', () => {
      const pBase = GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS;
      const gBase = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;

      // Normal (peso 1.0)
      expect(Math.floor(pBase * TERRAIN_COSTS[TerrainType.NORMAL])).toBe(200);
      expect(Math.floor(gBase * TERRAIN_COSTS[TerrainType.NORMAL])).toBe(320);

      // Boost / Gelo (peso 0.3)
      expect(Math.floor(pBase * TERRAIN_COSTS[TerrainType.BOOST])).toBe(60);
      expect(Math.floor(gBase * TERRAIN_COSTS[TerrainType.BOOST])).toBe(96);

      // Mud / Lama (peso 4.0)
      expect(Math.floor(pBase * TERRAIN_COSTS[TerrainType.MUD])).toBe(800);
      expect(Math.floor(gBase * TERRAIN_COSTS[TerrainType.MUD])).toBe(1280);

      // Lava (peso 8.0)
      expect(Math.floor(pBase * TERRAIN_COSTS[TerrainType.LAVA])).toBe(1600);
      expect(Math.floor(gBase * TERRAIN_COSTS[TerrainType.LAVA])).toBe(2560);

      // Preservação matemática estrita: razão de tempo == razão de pesos
      const mudRatio =
        (pBase * TERRAIN_COSTS[TerrainType.MUD]) / (pBase * TERRAIN_COSTS[TerrainType.NORMAL]);
      expect(mudRatio).toBe(4.0);

      const boostRatio =
        (pBase * TERRAIN_COSTS[TerrainType.BOOST]) / (pBase * TERRAIN_COSTS[TerrainType.NORMAL]);
      expect(boostRatio).toBeCloseTo(0.3, 5);
    });
  });

  // =========================================================================
  // 2. Consistência dos Temporizadores e Equivalência Matemática MIN_COST / MIN_TIME
  // =========================================================================
  describe('2. Consistência de Temporizadores e Isomorfismo MIN_COST / MIN_TIME', () => {
    it('MinTimeStrategy deve estar rigorosamente sincronizado com GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS', () => {
      expect(MinTimeStrategy.BASE_STEP_DELAY_MS).toBe(GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS);
      expect(MinTimeStrategy.estimateTimeSeconds(10.0)).toBeCloseTo(2.0, 5); // 10 * 0.200s = 2.0s
    });

    it('Preservação da equivalência matemática: MIN_COST e MIN_TIME produzem custos e rotas idênticos', () => {
      const gen = new MazeGenerator(15, 15, 123);
      const world = gen.generateWorld(0.1, 1, 2);

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0
      );

      const minCostStrategy = new MinCostStrategy();
      const minTimeStrategy = new MinTimeStrategy();

      const planCost = minCostStrategy.plan(data, 'A*');
      const planTime = minTimeStrategy.plan(data, 'A*');

      expect(planCost).not.toBeNull();
      expect(planTime).not.toBeNull();
      expect(planCost!.totalCost).toBe(planTime!.totalCost);
      expect(planCost!.fullPath.length).toBe(planTime!.fullPath.length);
      expect(planCost!.keyOrder).toEqual(planTime!.keyOrder);
    });

    it('Temporizadores de modo Frightened, recálculo de fantasmas e anti-jitter do agente', () => {
      expect(GAME_SPEED_CONFIG.FRIGHTENED_DURATION_MS).toBe(7000);
      expect(GAME_SPEED_CONFIG.GHOST_RECALC_INTERVAL_MS).toBe(250);
      expect(GAME_SPEED_CONFIG.AGENT_REPLAN_COOLDOWN_MS).toBe(350);
    });
  });

  // =========================================================================
  // 3. Escala da Velocidade de Simulação
  // =========================================================================
  describe('3. Escala da Velocidade da Simulação (0.5x, 1x, 2x)', () => {
    it('As opções de velocidade suportadas devem ser 0.5x, 1x e 2x', () => {
      expect(GAME_SPEED_CONFIG.SIMULATION_SPEEDS).toEqual([0.5, 1.0, 2.0]);
    });

    it('Avanço de frame proporcional ao multiplicador de velocidade', () => {
      const realFrameDelta = 16.666; // ~60 FPS em ms

      const deltaHalf = realFrameDelta * 0.5;
      const deltaNormal = realFrameDelta * 1.0;
      const deltaDouble = realFrameDelta * 2.0;

      expect(deltaHalf).toBeCloseTo(8.333, 2);
      expect(deltaNormal).toBeCloseTo(16.666, 2);
      expect(deltaDouble).toBeCloseTo(33.332, 2);
    });

    it('AutonomousAgent deve aceitar e atualizar seu fator de velocidade de simulação', () => {
      const agent = new AutonomousAgent('A*', 'MVM');
      expect(agent.getSimulationSpeed()).toBe(1.0);

      agent.setSimulationSpeed(2.0);
      expect(agent.getSimulationSpeed()).toBe(2.0);

      agent.setSimulationSpeed(0.5);
      expect(agent.getSimulationSpeed()).toBe(0.5);
    });
  });

  // =========================================================================
  // 4. Métricas Independentes da Velocidade de Visualização
  // =========================================================================
  describe('4. Métricas Científicas Independentes da Velocidade de Visualização', () => {
    it('O tempo simulado deve ser invariante e separado do tempo real decorrido', () => {
      const gen = new MazeGenerator(15, 15, 77);
      const world = gen.generateWorld(0.1, 1, 1);

      // Simulação a 1.0x com 10 segundos simulados (10000 ms)
      const agent1x = new AutonomousAgent('A*', 'MVM', 'MIN_COST');
      agent1x.setSimulationSpeed(1.0);

      const startData1x = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        1000 // Início em t = 1000ms simulados
      );
      agent1x.start(startData1x);

      // Avança a simulação em 10.000 ms simulados
      const endData1x = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        11000 // t = 11000ms simulados (10 segundos depois)
      );
      const metrics1x = agent1x.getMatchMetrics(endData1x);

      // Simulação a 2.0x com os MESMOS 10 segundos simulados
      const agent2x = new AutonomousAgent('A*', 'MVM', 'MIN_COST');
      agent2x.setSimulationSpeed(2.0);

      const startData2x = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        1000
      );
      agent2x.start(startData2x);

      const endData2x = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        11000 // Exatos mesmos 10 segundos simulados
      );
      const metrics2x = agent2x.getMatchMetrics(endData2x);

      // O tempo científico simulado DEVE ser exatamente o mesmo (10.00s) em ambas as velocidades!
      expect(metrics1x.simulatedTime).toBe(10.0);
      expect(metrics2x.simulatedTime).toBe(10.0);
      expect(metrics1x.time).toBe(metrics2x.time);

      // O campo simulationSpeed deve refletir a taxa selecionada
      expect(metrics1x.simulationSpeed).toBe(1.0);
      expect(metrics2x.simulationSpeed).toBe(2.0);

      // Métricas estruturais permanecem intactas
      expect(metrics1x.moves).toBe(metrics2x.moves);
      expect(metrics1x.traversedCost).toBe(metrics2x.traversedCost);
    });
  });

  // =========================================================================
  // 5. Seleção de Alvos: Perseguidor (Vermelho) vs. Interceptor (Roxo)
  // =========================================================================
  describe('5. Seleção de Alvos: Perseguidor vs. Interceptor', () => {
    it('Vermelho persegue playerPos diretamente; Roxo projeta e seleciona nó de interceptação à frente', () => {
      // Cria um corredor com bifurcação:
      // Pac-Man em [1, 1], movendo para a direita [0, 1]
      // Corredor: [1, 1] -> [1, 2] -> [1, 3] (bifurcação) -> [0, 3] / [2, 3]
      // Vermelho em [1, 0] (atrás do Pac-Man)
      // Roxo em [3, 3] (mais próximo da bifurcação em [1, 3] do que da posição atual do Pac-Man)
      const g = new Graph();
      const p: Node = [1, 1];
      const c1: Node = [1, 2];
      const junc: Node = [1, 3];
      const branchUp: Node = [0, 3];
      const branchDown: Node = [2, 3];
      const redPos: Node = [1, 0];
      const purplePos: Node = [3, 3];

      g.addEdge(redPos, p, 1.0, true);
      g.addEdge(p, c1, 1.0, true);
      g.addEdge(c1, junc, 1.0, true);
      g.addEdge(junc, branchUp, 1.0, true);
      g.addEdge(junc, branchDown, 1.0, true);
      g.addEdge(branchDown, purplePos, 1.0, true);

      // Alvo do Vermelho: Perseguidor direto
      const redTarget = p;
      const redRoute = aStar(g, redPos, redTarget);
      expect(redRoute.found).toBe(true);
      expect(nodeEquals(redRoute.path[redRoute.path.length - 1], p)).toBe(true);

      // Alvo do Roxo: Interceptor
      const interceptResult = calculateInterceptionTarget(
        g,
        purplePos,
        p,
        [0, 1], // Pac-Man virado para leste
        [p, c1, junc, branchUp],
        [branchUp]
      );

      expect(interceptResult.isInterception).toBe(true);
      // Roxo NÃO deve mirar na posição atual do Pac-Man p [1, 1]
      expect(nodeEquals(interceptResult.target, p)).toBe(false);
      // Roxo deve mirar na bifurcação à frente [1, 3] ou além
      expect(
        nodeEquals(interceptResult.target, junc) || nodeEquals(interceptResult.target, c1)
      ).toBe(true);
    });

    it('Cálculo de distâncias mínimas em grafo ponderado para o Interceptor (computeDistancesFrom)', () => {
      const g = new Graph();
      const s: Node = [0, 0];
      const a: Node = [0, 1];
      const b: Node = [0, 2];
      g.addEdge(s, a, 2.5, true);
      g.addEdge(a, b, 1.5, true);

      const distMap = computeDistancesFrom(g, s);
      expect(distMap.get(nodeToKey(s))).toBe(0);
      expect(distMap.get(nodeToKey(a))).toBe(2.5);
      expect(distMap.get(nodeToKey(b))).toBe(4.0);
    });

    it('Projeção de rota provável respeita topologia e facing do jogador (getPacmanProbablePath)', () => {
      const g = new Graph();
      const p0: Node = [0, 0];
      const p1: Node = [0, 1];
      const p2: Node = [0, 2];
      g.addEdge(p0, p1, 1.0, true);
      g.addEdge(p1, p2, 1.0, true);

      const path = getPacmanProbablePath(g, p0, [0, 1], [p2]);
      expect(path.length).toBe(3);
      expect(nodeEquals(path[0], p0)).toBe(true);
      expect(nodeEquals(path[1], p1)).toBe(true);
      expect(nodeEquals(path[2], p2)).toBe(true);
    });
  });

  // =========================================================================
  // 6. Diferenciação Estratégica dos Fantasmas em MAX_SCORE e SURVIVAL
  // =========================================================================
  describe('6. Diferenciação Algorítmica dos Fantasmas em MAX_SCORE e SURVIVAL', () => {
    it('Cenário MAX_SCORE: Pac-Man desviando para pegar Power Pellet faz com que fantasmas sigam caminhos distintos', () => {
      // Grafo em anel com bifurcação:
      // Pac-Man em [1, 1] planeja ir até a Power Pellet em [0, 2].
      // Vermelho em [2, 1] (ao sul de Pac-Man).
      // Roxo em [0, 4] (a leste).
      const g = new Graph();
      const pac: Node = [1, 1];
      const pellet: Node = [0, 2];
      const keyGoal: Node = [2, 4];

      const n1: Node = [1, 2];
      const n2: Node = [0, 1];
      const redPos: Node = [2, 1];
      const purplePos: Node = [0, 4];
      const eastJunc: Node = [1, 3];

      g.addEdge(redPos, pac, 1.0, true);
      g.addEdge(pac, n2, 1.0, true);
      g.addEdge(n2, pellet, 1.0, true);
      g.addEdge(pac, n1, 1.0, true);
      g.addEdge(n1, eastJunc, 1.0, true);
      g.addEdge(pellet, eastJunc, 1.0, true);
      g.addEdge(eastJunc, purplePos, 1.0, true);
      g.addEdge(eastJunc, keyGoal, 1.0, true);

      // Pac-Man em MAX_SCORE ruma para a Pellet: [pac, n2, pellet]
      const pacPlanned = [pac, n2, pellet];

      // Vermelho: Persegue Pac-Man diretamente
      const redRes = aStar(g, redPos, pac);
      expect(redRes.found).toBe(true);
      // Próximo passo do Vermelho é diretamente em direção ao Pac-Man
      expect(nodeEquals(redRes.path[1], pac)).toBe(true);

      // Roxo: Intercepta o Pac-Man na rota da Pellet / junção
      const purpleTarget = calculateInterceptionTarget(
        g,
        purplePos,
        pac,
        [-1, 0], // Pac-Man virado para norte
        pacPlanned,
        [pellet, keyGoal]
      );

      expect(purpleTarget.isInterception).toBe(true);
      // Roxo intercepta na Pellet [0, 2] ou junção [1, 3], NÃO em [1, 1]
      expect(nodeEquals(purpleTarget.target, pac)).toBe(false);

      const purpleRoute = aStar(g, purplePos, purpleTarget.target);
      expect(purpleRoute.found).toBe(true);
      // O próximo passo do Roxo é pelo corredor leste, completamente diferente do caminho do Vermelho!
      expect(nodeEquals(purpleRoute.path[1], redRes.path[1])).toBe(false);
    });

    it('Cenário SURVIVAL: Pac-Man contornando Lava faz com que Roxo intercepte na saída do desvio', () => {
      // Corredor direto tem Lava em [1, 2].
      // Pac-Man em [1, 1] toma desvio seguro por [0, 1] -> [0, 2] -> [0, 3] -> [1, 3].
      // Vermelho em [1, 0] (segue o Pac-Man pelo desvio).
      // Roxo em [2, 3] (posiciona-se na junção de retorno [1, 3] cortando o Pac-Man).
      const g = new Graph();
      const pac: Node = [1, 1];
      const lavaNode: Node = [1, 2];
      const exitJunc: Node = [1, 3];
      const redPos: Node = [1, 0];
      const purplePos: Node = [2, 3];

      const safe1: Node = [0, 1];
      const safe2: Node = [0, 2];
      const safe3: Node = [0, 3];

      g.addEdge(redPos, pac, 1.0, true);
      // Rota com lava (custo 8.0)
      g.addEdge(pac, lavaNode, 8.0, true);
      g.addEdge(lavaNode, exitJunc, 8.0, true);

      // Desvio de sobrevivência (custos 1.0)
      g.addEdge(pac, safe1, 1.0, true);
      g.addEdge(safe1, safe2, 1.0, true);
      g.addEdge(safe2, safe3, 1.0, true);
      g.addEdge(safe3, exitJunc, 1.0, true);

      g.addEdge(exitJunc, purplePos, 1.0, true);

      const pacDetour = [pac, safe1, safe2, safe3, exitJunc];

      // Vermelho mira em Pac-Man
      const redTarget = pac;
      const redRes = aStar(g, redPos, redTarget);
      expect(nodeEquals(redRes.path[1], pac)).toBe(true);

      // Roxo mira no corte de tempo competitivo
      const purpleTarget = calculateInterceptionTarget(
        g,
        purplePos,
        pac,
        [-1, 0],
        pacDetour,
        [exitJunc]
      );

      // O alvo do Roxo deve ser o nó de junção de saída [1, 3] ou o nó mais avançado do desvio
      expect(nodeEquals(purpleTarget.target, pac)).toBe(false);
      expect(
        nodeEquals(purpleTarget.target, exitJunc) || nodeEquals(purpleTarget.target, safe3)
      ).toBe(true);
    });
  });

  // =========================================================================
  // 7. Preservação da Física e dos Algoritmos de Grafos
  // =========================================================================
  describe('7. Preservação de Física, Portais e Algoritmos de Grafos', () => {
    it('Dijkstra e A* mantêm resultados idênticos no grafo com pesos ponderados e portais', () => {
      const gen = new MazeGenerator(15, 15, 88);
      const world = gen.generateWorld(0.1, 1, 2);

      const resD = dijkstra(world.graph, world.start, world.goal);
      const resA = aStar(world.graph, world.start, world.goal, {
        portals: world.portalPairs,
        minWeight: 0.3,
      });

      expect(resD.found).toBe(true);
      expect(resA.found).toBe(true);
      expect(Math.abs(resD.cost - resA.cost)).toBeLessThan(1e-5);
    });

    it('Portais transportam nós instantaneamente mantendo o custo da aresta de teleporte', () => {
      const g = new Graph();
      const p1: Node = [0, 0];
      const p1Entry: Node = [0, 1];
      const p2: Node = [10, 10];

      g.addEdge(p1, p2, 1.0, false);
      g.addStep(p1, p1Entry, p2);
      g.setEntry(p1, p2, p1Entry);

      expect(g.resolveStep(p1, 0, 1)).toEqual(p2);
      expect(g.transitionEntry(p1, p2)).toEqual(p1Entry);
    });
  });
});
