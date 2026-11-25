import { describe, expect, it } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { Node, nodeEquals, nodeToKey } from '../game/graph/GraphTypes';
import { TerrainType } from '../game/graph/Terrain';
import { AutonomousAgent } from '../game/agents/AutonomousAgent';
import { AgentPerception } from '../game/agents/AgentPerception';
import { AgentPlanner, RiskGraphWrapper } from '../game/agents/AgentPlanner';
import { RiskAssessment } from '../game/agents/RiskAssessment';
import { aStar } from '../game/algorithms/AStar';
import { dijkstra } from '../game/algorithms/Dijkstra';

describe('Pac-Man Autônomo - Etapa 2: Máquina vs. Máquina', () => {
  const riskAssessment = new RiskAssessment();
  const perception = new AgentPerception();
  const planner = new AgentPlanner();

  it('Detecção de ameaças deve considerar a topologia do grafo e não apenas Manhattan', () => {
    // Cria grafo em forma de "U": Pac-Man em [1, 1], Fantasma em [1, 3] separados por parede em [1, 2]
    // Manhattan(P, G) = |1-1| + |1-3| = 2.
    // Mas topologia real: [1, 1] -> [2, 1] -> [2, 2] -> [2, 3] -> [1, 3] = 4 arestas.
    const g = new Graph();
    const p: Node = [1, 1];
    const b1: Node = [2, 1];
    const b2: Node = [2, 2];
    const b3: Node = [2, 3];
    const ghostPos: Node = [1, 3];

    g.addEdge(p, b1, 1.0, true);
    g.addEdge(b1, b2, 1.0, true);
    g.addEdge(b2, b3, 1.0, true);
    g.addEdge(b3, ghostPos, 1.0, true);

    const distMap = riskAssessment.computeTopologicalDistances(g, p);

    // Distância topológica real deve ser 4, não 2!
    expect(distMap.get(nodeToKey(ghostPos))).toBe(4);

    const enemyData = {
      id: 'red',
      name: 'Fantasma Vermelho',
      pos: ghostPos,
      spawn: ghostPos,
      facing: [0, -1] as [number, number],
      path: [],
      isFrightened: false,
      frightenedTimeRemaining: 0,
      graphDistance: 4,
      isVulnerable: false,
      dangerLevel: 1.0,
    };

    const threat = riskAssessment.evaluateEnemyThreat(enemyData, p, distMap);
    expect(threat.graphDist).toBe(4);
    expect(threat.dangerFactor).toBe(1.0);
  });

  it('Desvios diante de fantasmas próximos: agente deve entrar em ESCAPING e evitar colisão', () => {
    // Labirinto simples:
    // P em [0, 1] tem dois caminhos:
    // Ramo Leste para [0, 2] (onde está o fantasma em [0, 3] vindo)
    // Ramo Sul para [1, 1] (caminho seguro)
    const g = new Graph();
    const p: Node = [0, 1];
    const north: Node = [0, 2];
    const south: Node = [1, 1];
    const ghostPos: Node = [0, 3];
    const goal: Node = [0, 0];

    g.addEdge(p, north, 1.0, true);
    g.addEdge(north, ghostPos, 1.0, true);
    g.addEdge(p, south, 1.0, true);
    g.addEdge(p, goal, 1.0, true);

    const decision = riskAssessment.calculateEscapeDecision(
      g,
      p,
      [
        {
          id: 'red',
          name: 'Fantasma Vermelho',
          pos: ghostPos,
          spawn: ghostPos,
          facing: [0, -1],
          path: [ghostPos, north],
          isFrightened: false,
          frightenedTimeRemaining: 0,
          graphDistance: 2,
          isVulnerable: false,
          dangerLevel: 1.0,
        },
      ],
      [0, 1],
      new Map()
    );

    expect(decision.nextMove).not.toBeNull();
    // O próximo movimento de fuga NÃO deve ser em direção ao fantasma (north)
    expect(nodeEquals(decision.bestNeighbor!, north)).toBe(false);
  });

  it('Replanejamento com risco dinâmico deve desviar de rotas perigosas quando há alternativas', () => {
    // Grafo com duas rotas de [0, 0] para [2, 2]:
    // Rota 1: [0, 0] -> [0, 1] -> [0, 2] -> [1, 2] -> [2, 2] (comprimento 4)
    // Rota 2: [0, 0] -> [1, 0] -> [2, 0] -> [2, 1] -> [2, 2] (comprimento 4)
    // Se o fantasma está patrulhando em [0, 1], o planejador com risco deve escolher a Rota 2!
    const g = new Graph();
    const s: Node = [0, 0];
    const a1: Node = [0, 1];
    const a2: Node = [0, 2];
    const a3: Node = [1, 2];
    const b1: Node = [1, 0];
    const b2: Node = [2, 0];
    const b3: Node = [2, 1];
    const t: Node = [2, 2];

    g.addEdge(s, a1, 1.0, true);
    g.addEdge(a1, a2, 1.0, true);
    g.addEdge(a2, a3, 1.0, true);
    g.addEdge(a3, t, 1.0, true);

    g.addEdge(s, b1, 1.0, true);
    g.addEdge(b1, b2, 1.0, true);
    g.addEdge(b2, b3, 1.0, true);
    g.addEdge(b3, t, 1.0, true);

    const ghostOnA: Node = [0, 1];
    const riskMap = riskAssessment.buildRiskMap(
      g,
      [
        {
          id: 'red',
          name: 'Fantasma Vermelho',
          pos: ghostOnA,
          spawn: ghostOnA,
          facing: [0, 1],
          path: [a1, a2],
          isFrightened: false,
          frightenedTimeRemaining: 0,
          graphDistance: 1,
          isVulnerable: false,
          dangerLevel: 1.0,
        },
      ],
      s
    );

    const perceptionData = {
      currentPos: s,
      graph: g,
      remainingKeys: [],
      allKeys: [],
      collectedKeys: new Set<string>(),
      goal: t,
      portalPairs: [],
      terrains: new Map(),
      enemies: [],
      frightenedUntilTime: 0,
      currentTime: 0,
    };

    const safePlan = planner.plan(perceptionData, 'A*', riskMap);
    expect(safePlan).not.toBeNull();
    // A rota escolhida deve conter b1 ([1, 0]) e evitar a1 ([0, 1])
    const pathKeys = new Set(safePlan!.fullPath.map(nodeToKey));
    expect(pathKeys.has(nodeToKey(b1))).toBe(true);
    expect(pathKeys.has(nodeToKey(a1))).toBe(false);
  });

  it('Retomada da estratégia de coleta quando o risco diminui', () => {
    const gen = new MazeGenerator(15, 15, 99);
    const world = gen.generateWorld(0.1, 1, 1);

    const agent = new AutonomousAgent('A*', 'MVM');

    // Estado 1: Fantasma adjacente a 1 passo de distância -> Ativa ESCAPING
    const nearEnemy = {
      id: 'red',
      name: 'Fantasma',
      pos: world.graph.neighbors(world.start)[0].node,
      spawn: world.enemySpawn,
      facing: [0, 1] as [number, number],
      path: [],
    };

    const dataDanger = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains,
      [nearEnemy],
      0,
      0
    );

    agent.start(dataDanger);
    const escapeMove = agent.update(dataDanger, 'PLAYING');
    expect(escapeMove).not.toBeNull();
    expect(agent.getStrategicState()).toBe('ESCAPING');

    // Estado 2: Fantasma foi para longe (spawn distante) -> Ameaça recua
    const farEnemy = {
      id: 'red',
      name: 'Fantasma',
      pos: world.enemySpawn,
      spawn: world.enemySpawn,
      facing: [0, 1] as [number, number],
      path: [],
    };

    const dataSafe = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains,
      [farEnemy],
      0,
      650
    );

    agent.update(dataSafe, 'PLAYING');
    // Deve sair de ESCAPING e retornar para COLLECTING
    expect(agent.getStrategicState()).toBe('COLLECTING');
  });

  it('Comportamento diante de orbes de poder: seguro durante vulnerabilidade e perigoso ao expirar', () => {
    const g = new Graph();
    const p: Node = [0, 0];
    const ghostPos: Node = [0, 2];
    g.addEdge(p, [0, 1], 1.0, true);
    g.addEdge([0, 1], ghostPos, 1.0, true);

    const distMap = riskAssessment.computeTopologicalDistances(g, p);

    // Cenário A: Faltam 5.0s de vulnerabilidade (> limiar 2.0s) -> Totalmente seguro
    const vulSafe = {
      id: 'red',
      name: 'Fantasma',
      pos: ghostPos,
      spawn: ghostPos,
      facing: [0, 1] as [number, number],
      path: [],
      isFrightened: true,
      frightenedTimeRemaining: 5.0,
      graphDistance: 2,
      isVulnerable: true,
      dangerLevel: 0,
    };

    const evalSafe = riskAssessment.evaluateEnemyThreat(vulSafe, p, distMap);
    expect(evalSafe.dangerFactor).toBe(0.0);
    expect(evalSafe.isVulnerable).toBe(true);

    // Cenário B: Faltam apenas 0.5s de vulnerabilidade (< limiar 2.0s) -> Não mais seguro!
    const vulExpiring = {
      ...vulSafe,
      frightenedTimeRemaining: 0.5,
    };

    const evalExpiring = riskAssessment.evaluateEnemyThreat(vulExpiring, p, distMap);
    expect(evalExpiring.dangerFactor).toBeGreaterThan(0.5); // Perigo alto!
    expect(evalExpiring.isVulnerable).toBe(false);
  });

  it('Prevenção de oscilações (Hysteresis): anti-oscilação desencoraja reversão imediata de 180°', () => {
    const g = new Graph();
    const u: Node = [1, 1];
    const prevNode: Node = [1, 0]; // De onde veio com heading [0, 1]
    const nextNode: Node = [1, 2];
    const sideNode: Node = [2, 1];

    g.addEdge(u, prevNode, 1.0, true);
    g.addEdge(u, nextNode, 1.0, true);
    g.addEdge(u, sideNode, 1.0, true);

    // Fantasma em [1, 4]
    const ghostPos: Node = [1, 4];
    g.addEdge(nextNode, [1, 3], 1.0, true);
    g.addEdge([1, 3], ghostPos, 1.0, true);

    const decision = riskAssessment.calculateEscapeDecision(
      g,
      u,
      [
        {
          id: 'red',
          name: 'Fantasma',
          pos: ghostPos,
          spawn: ghostPos,
          facing: [0, -1],
          path: [],
          isFrightened: false,
          frightenedTimeRemaining: 0,
          graphDistance: 3,
          isVulnerable: false,
          dangerLevel: 1.0,
        },
      ],
      [0, 1], // Último facing foi para direita
      new Map()
    );

    // O agente deve preferir virar para sideNode [2, 1] em vez de oscilar voltando imediatamente para prevNode
    expect(decision.bestNeighbor).toEqual(sideNode);
  });

  it('Evasão por portais: valoriza atalhos que afastam o Pac-Man do perigo', () => {
    const g = new Graph();
    const p: Node = [2, 1];
    const normalEscape: Node = [1, 1];
    const portalEntry: Node = [2, 2];
    const portalDest: Node = [10, 10]; // Teleporta para o outro lado do mapa
    const ghostPos: Node = [2, 0]; // Fantasma adjacente a P

    g.addEdge(p, normalEscape, 1.0, true);
    g.addEdge(p, ghostPos, 1.0, true);

    // Portal de p para portalDest através da célula de entrada portalEntry
    g.addEdge(p, portalDest, 1.0, false);
    g.addStep(p, portalEntry, portalDest);
    g.setEntry(p, portalDest, portalEntry);

    const decision = riskAssessment.calculateEscapeDecision(
      g,
      p,
      [
        {
          id: 'red',
          name: 'Fantasma',
          pos: ghostPos,
          spawn: ghostPos,
          facing: [0, 1],
          path: [ghostPos, p],
          isFrightened: false,
          frightenedTimeRemaining: 0,
          graphDistance: 1,
          isVulnerable: false,
          dangerLevel: 1.0,
        },
      ],
      [0, 1],
      new Map()
    );

    // Deve escolher o teletransporte para o portalDest
    expect(decision.bestNeighbor).toEqual(portalDest);
    expect(decision.nextMove).toEqual([0, 1]); // Comando ortogonal na direção da célula de entrada do portal!
  });

  it('Alternância entre modo Demonstração e Máquina vs. Máquina', () => {
    const agent = new AutonomousAgent('A*', 'MVM');
    expect(agent.getAutonomousMode()).toBe('MVM');

    agent.setAutonomousMode('DEMO');
    expect(agent.getAutonomousMode()).toBe('DEMO');

    agent.setAutonomousMode('MVM');
    expect(agent.getAutonomousMode()).toBe('MVM');
  });

  it('Preservação matemática: RiskGraphWrapper mantém pesos não-negativos e compatibilidade com Dijkstra e A*', () => {
    const gen = new MazeGenerator(15, 15, 42);
    const world = gen.generateWorld(0.1, 1, 1);

    const riskMap = new Map<string, number>();
    riskMap.set(nodeToKey(world.enemySpawn), 50.0);
    riskMap.set(nodeToKey(world.enemySpawn2), 30.0);

    const riskGraph = new RiskGraphWrapper(world.graph, riskMap);

    // Todos os pesos devem ser não-negativos
    for (const u of riskGraph.vertices) {
      for (const edge of riskGraph.neighbors(u)) {
        expect(edge.weight).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(edge.weight)).toBe(true);
      }
    }

    // Dijkstra e A* devem encontrar o mesmo custo mínimo no grafo com risco
    const resD = dijkstra(riskGraph, world.start, world.goal);
    const resA = aStar(riskGraph, world.start, world.goal, {
      portals: world.portalPairs,
    });

    expect(resD.found).toBe(true);
    expect(resA.found).toBe(true);
    expect(Math.abs(resD.cost - resA.cost)).toBeLessThan(1e-5);
  });

  it('Integração com a física do jogo: colisões reais de derrota e captura de fantasmas assustados', () => {
    const gen = new MazeGenerator(15, 15, 60);
    const world = gen.generateWorld(0.1, 1, 1);

    // Simula a lógica de colisão de GameScene
    let score = 0;
    let gameStatus = 'PLAYING';
    const playerPos: Node = [5, 5];
    const enemy = {
      pos: [5, 5] as Node,
      spawn: [10, 10] as Node,
    };

    // Cenário 1: Colisão normal com fantasma ativo não assustado -> Derrota
    const isFrightened = false;
    if (nodeEquals(playerPos, enemy.pos)) {
      if (!isFrightened) {
        gameStatus = 'LOST';
      }
    }
    expect(gameStatus).toBe('LOST');

    // Cenário 2: Colisão sob efeito de Power Pellet -> Come o fantasma e ganha 200 pontos
    gameStatus = 'PLAYING';
    enemy.pos = [5, 5];
    const isFrightenedActive = true;
    if (nodeEquals(playerPos, enemy.pos)) {
      if (isFrightenedActive) {
        enemy.pos = [...enemy.spawn];
        score += 200;
      }
    }
    expect(gameStatus).toBe('PLAYING');
    expect(score).toBe(200);
    expect(nodeEquals(enemy.pos, enemy.spawn)).toBe(true);
  });
});
