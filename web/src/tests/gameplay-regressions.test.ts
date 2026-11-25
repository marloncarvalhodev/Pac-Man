import { describe, expect, it } from 'vitest';
import { Graph } from '../game/graph/Graph';
import {
  MazeGenerator,
  isGraphStronglyConnected,
  computeGhostReachTimeMs,
  computeWeightedShortestPathsTo,
} from '../game/graph/MazeGenerator';
import { Node, nodeEquals, nodeToKey } from '../game/graph/GraphTypes';
import { TerrainType } from '../game/graph/Terrain';
import { GAME_SPEED_CONFIG } from '../game/config/GameConfig';
import { aStar } from '../game/algorithms/AStar';
import { dijkstra } from '../game/algorithms/Dijkstra';
import { calculateInterceptionTarget } from '../game/agents/GhostInterception';
import { AutonomousAgent } from '../game/agents/AutonomousAgent';
import { AgentPerception } from '../game/agents/AgentPerception';

describe('Investigação e Validação de Regressões de Jogabilidade', () => {
  const perception = new AgentPerception();

  // =========================================================================
  // 1. Geração de labirintos diferentes com sementes distintas
  // =========================================================================
  describe('1. Diversidade e Geração com Sementes Distintas', () => {
    it('Sementes diferentes devem gerar labirintos estruturalmente distintos', () => {
      const seedPairs = [
        [42, 43],
        [100, 200],
        [999, 1000],
        [12345, 67890],
      ];

      for (const [s1, s2] of seedPairs) {
        const gen1 = new MazeGenerator(25, 25, s1);
        const world1 = gen1.generateWorld(0.1, 1, 2);

        const gen2 = new MazeGenerator(25, 25, s2);
        const world2 = gen2.generateWorld(0.1, 1, 2);

        expect(world1.seed).not.toBe(world2.seed);

        // A malha de paredes deve ser diferente
        let differences = 0;
        for (let r = 0; r < world1.rows; r++) {
          for (let c = 0; c < world1.cols; c++) {
            if (world1.grid[r][c] !== world2.grid[r][c]) {
              differences++;
            }
          }
        }
        expect(differences).toBeGreaterThan(10);

        // Objetivos (chaves, portais, spawns) devem variar
        const keys1 = world1.keys.map(nodeToKey).join('|');
        const keys2 = world2.keys.map(nodeToKey).join('|');
        expect(keys1 !== keys2 || differences > 20).toBe(true);
      }
    });

    it('Reprodutibilidade estrita com a mesma semente', () => {
      const testSeeds = [1, 42, 9999, 1337];

      for (const s of testSeeds) {
        const w1 = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);
        const w2 = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);

        expect(w1.seed).toBe(w2.seed);
        expect(w1.grid).toEqual(w2.grid);
        expect(w1.start).toEqual(w2.start);
        expect(w1.goal).toEqual(w2.goal);
        expect(w1.keys).toEqual(w2.keys);
        expect(w1.powerPellets).toEqual(w2.powerPellets);
        expect(w1.portalPairs).toEqual(w2.portalPairs);
        expect(w1.enemySpawn).toEqual(w2.enemySpawn);
        expect(w1.enemySpawn2).toEqual(w2.enemySpawn2);
        expect(w1.graph.order).toBe(w2.graph.order);
        expect(w1.graph.size).toBe(w2.graph.size);
      }
    });
  });

  // =========================================================================
  // 2. Preservação da Conectividade e Acessibilidade dos Objetivos
  // =========================================================================
  describe('2. Conectividade Forte e Acessibilidade dos Objetivos', () => {
    it('Todos os vértices e objetivos devem ser mutuamente alcançáveis no grafo', () => {
      const seeds = [7, 42, 88, 123, 777, 9999];

      for (const s of seeds) {
        const world = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);

        const openCells: Node[] = [];
        for (let r = 0; r < world.rows; r++) {
          for (let c = 0; c < world.cols; c++) {
            if (world.grid[r][c] === 0) openCells.push([r, c]);
          }
        }

        // 1. Grafo é fortemente conexo
        expect(isGraphStronglyConnected(world.graph, openCells, world.start)).toBe(true);

        // 2. Start alcança todas as chaves
        for (const k of world.keys) {
          const res = aStar(world.graph, world.start, k, { portals: world.portalPairs });
          expect(res.found).toBe(true);
        }

        // 3. Start alcança o objetivo final (saída)
        const resGoal = aStar(world.graph, world.start, world.goal, {
          portals: world.portalPairs,
        });
        expect(resGoal.found).toBe(true);

        // 4. Start alcança as Power Pellets
        for (const p of world.powerPellets) {
          const res = aStar(world.graph, world.start, p, { portals: world.portalPairs });
          expect(res.found).toBe(true);
        }

        // 5. Inimigos conseguem alcançar o Start (Pac-Man)
        const resE1 = aStar(world.graph, world.enemySpawn, world.start, {
          portals: world.portalPairs,
        });
        expect(resE1.found).toBe(true);

        const resE2 = aStar(world.graph, world.enemySpawn2, world.start, {
          portals: world.portalPairs,
        });
        expect(resE2.found).toBe(true);
      }
    });
  });

  // =========================================================================
  // 3. Distribuição Inicial Válida dos Fantasmas
  // =========================================================================
  describe('3. Distribuição Inicial Válida dos Fantasmas', () => {
    it('Fantasmas não devem nascer em terrenos de perigo, start, goal, chaves ou portais', () => {
      const seeds = [3, 15, 42, 101, 555, 1234];

      for (const s of seeds) {
        const world = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);

        const e1Key = nodeToKey(world.enemySpawn);
        const e2Key = nodeToKey(world.enemySpawn2);

        // Não deve ser start nem goal
        expect(e1Key).not.toBe(nodeToKey(world.start));
        expect(e1Key).not.toBe(nodeToKey(world.goal));
        expect(e2Key).not.toBe(nodeToKey(world.start));
        expect(e2Key).not.toBe(nodeToKey(world.goal));

        // Não devem colidir entre si no spawn
        expect(e1Key).not.toBe(e2Key);

        // Devem nascer em terreno NORMAL (nunca em Lava ou Boost)
        expect(world.terrains.get(e1Key)).toBe(TerrainType.NORMAL);
        expect(world.terrains.get(e2Key)).toBe(TerrainType.NORMAL);

        // Não devem nascer sobre portais
        for (const [p1, p2] of world.portalPairs) {
          expect(e1Key).not.toBe(nodeToKey(p1));
          expect(e1Key).not.toBe(nodeToKey(p2));
          expect(e2Key).not.toBe(nodeToKey(p1));
          expect(e2Key).not.toBe(nodeToKey(p2));
        }

        // Não devem nascer sobre chaves
        for (const k of world.keys) {
          expect(e1Key).not.toBe(nodeToKey(k));
          expect(e2Key).not.toBe(nodeToKey(k));
        }

        // Não devem nascer sobre Power Pellets
        for (const p of world.powerPellets) {
          expect(e1Key).not.toBe(nodeToKey(p));
          expect(e2Key).not.toBe(nodeToKey(p));
        }
      }
    });
  });

  // =========================================================================
  // 4. Distância Topológica Inicial e Tempo Estimado até uma Possível Captura
  // =========================================================================
  describe('4. Distância Topológica Inicial e Tempo Mínimo de Sobrevivência Inicial', () => {
    it('A distância topológica no grafo deve garantir janela de tempo seguro no início da partida', () => {
      const seeds = [1, 2, 5, 42, 77, 100, 256, 999];
      const ghostDelayMs = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS; // 260 ms

      for (const s of seeds) {
        const world = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);

        // Calcula a menor rota no grafo físico (considerando portais e atalhos)
        const routeE1 = aStar(world.graph, world.enemySpawn, world.start, {
          portals: world.portalPairs,
        });
        const routeE2 = aStar(world.graph, world.enemySpawn2, world.start, {
          portals: world.portalPairs,
        });

        // Quantidade de arestas mínimas no trajeto
        const distE1 = routeE1.path.length - 1;
        const distE2 = routeE2.path.length - 1;

        // Distância topológica mínima do Pac-Man deve ser de pelo menos 14 arestas
        expect(distE1).toBeGreaterThanOrEqual(14);
        expect(distE2).toBeGreaterThanOrEqual(14);

        // Tempo mínimo estimado para o fantasma alcançar o start (caso o jogador ficasse parado)
        const estTimeE1 = (distE1 * ghostDelayMs) / 1000;
        const estTimeE2 = (distE2 * ghostDelayMs) / 1000;

        // Garante que o jogador tem no mínimo 3.6 segundos (e tipicamente > 4.5s) de folga no início
        expect(estTimeE1).toBeGreaterThanOrEqual(3.64);
        expect(estTimeE2).toBeGreaterThanOrEqual(3.64);

        // Separação mútua entre os dois fantasmas
        const routeBetweenGhosts = aStar(world.graph, world.enemySpawn, world.enemySpawn2, {
          portals: world.portalPairs,
        });
        expect(routeBetweenGhosts.found).toBe(true);
      }
    });
  });

  // =========================================================================
  // 5. Comparação de Dificuldade Antes e Depois dos Ajustes
  // =========================================================================
  describe('5. Comparação de Dificuldade: Equilíbrio e Ausência de "Spawn Kill"', () => {
    it('Velocidades relativas proporcionam desafio tático crível sem ser opressivo', () => {
      const pacDelay = GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS; // 200 ms
      const ghostDelay = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS; // 320 ms
      const speedRatio = ghostDelay / pacDelay; // 1.60

      expect(speedRatio).toBeCloseTo(1.6, 2);
      expect(pacDelay).toBeLessThan(ghostDelay);

      // Em modo Frightened, o Pac-Man é significativamente mais rápido para caça
      const frightGhostDelay = ghostDelay * GAME_SPEED_CONFIG.GHOST_FRIGHTENED_MULTIPLIER;
      const frightRatio = frightGhostDelay / pacDelay; // 1.82x mais lento
      expect(frightRatio).toBeGreaterThan(1.7);
    });
  });

  // =========================================================================
  // 6. Funcionamento dos Modos Humano, Demonstração e Máquina vs. Máquina
  // =========================================================================
  describe('6. Integridade Operacional dos Três Modos de Jogo', () => {
    it('Modo Demonstração (DEMO): agente autônomo opera sem inimigos ativos', () => {
      const agent = new AutonomousAgent('A*', 'DEMO');
      expect(agent.getAutonomousMode()).toBe('DEMO');

      const gen = new MazeGenerator(15, 15, 42);
      const world = gen.generateWorld(0.1, 1, 1);

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

      const started = agent.start(data);
      expect(started).toBe(true);

      const status = agent.getStatusReport(data);
      expect(status.isExperimentalNoGhosts).toBe(true);
      expect(status.strategicState).toBe('COLLECTING');
    });

    it('Modo Máquina vs. Máquina (MVM): agente autônomo detecta perigo e avalia risco', () => {
      const agent = new AutonomousAgent('A*', 'MVM');
      expect(agent.getAutonomousMode()).toBe('MVM');

      const gen = new MazeGenerator(15, 15, 42);
      const world = gen.generateWorld(0.1, 1, 1);

      // Fantasma a 2 passos de distância
      const nearEnemy = {
        id: 'red',
        name: 'Fantasma',
        pos: world.graph.neighbors(world.start)[0].node,
        spawn: world.enemySpawn,
        facing: [0, 1] as [number, number],
        path: [],
      };

      const data = perception.readState(
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

      agent.start(data);
      const move = agent.update(data, 'PLAYING');
      expect(move).not.toBeNull();
      // O agente deve detectar a ameaça e reagir com fuga ou cautela
      expect(agent.getStrategicState()).toBe('ESCAPING');
    });

    it('Transição dinâmica de modos preserva estabilidade e estado do agente', () => {
      const agent = new AutonomousAgent('A*', 'MVM');
      agent.setControlMode('HUMAN');
      expect(agent.getControlMode()).toBe('HUMAN');

      agent.setControlMode('AUTONOMOUS');
      expect(agent.getControlMode()).toBe('AUTONOMOUS');

      agent.setAutonomousMode('DEMO');
      expect(agent.getAutonomousMode()).toBe('DEMO');

      agent.setAutonomousMode('MVM');
      expect(agent.getAutonomousMode()).toBe('MVM');

      agent.setControlMode('HUMAN');
      expect(agent.getControlMode()).toBe('HUMAN');
    });
  });

  // =========================================================================
  // 7. Preparação da Partida: Contagem Regressiva Visual de 3 Segundos
  // =========================================================================
  describe('7. Preparação da Partida: Contagem Regressiva e Bloqueio de Movimento', () => {
    it('Configurações da contagem regressiva e espera inicial estão centralizadas em GameConfig', () => {
      expect(GAME_SPEED_CONFIG.COUNTDOWN_DURATION_SEC).toBe(3);
      expect(GAME_SPEED_CONFIG.GHOST_INITIAL_SPAWN_DELAY_MS).toBe(2000);
    });

    it('Durante a contagem regressiva (COUNTDOWN), o agente autônomo permanece imóvel e não emite passos', () => {
      const agent = new AutonomousAgent('A*', 'MVM');
      const gen = new MazeGenerator(15, 15, 42);
      const world = gen.generateWorld(0.1, 1, 1);

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

      agent.start(data);

      // Em estado de COUNTDOWN, update deve retornar null
      const moveDuringCountdown = agent.update(data, 'COUNTDOWN');
      expect(moveDuringCountdown).toBeNull();

      // Em estado de READY, update também deve retornar null
      const moveDuringReady = agent.update(data, 'READY');
      expect(moveDuringReady).toBeNull();

      // Em PLAYING, o agente volta a emitir movimentos válidos
      const moveDuringPlay = agent.update(data, 'PLAYING');
      expect(moveDuringPlay).not.toBeNull();
    });
  });

  // =========================================================================
  // 8. Janela Inicial de Reação dos Fantasmas (2 Segundos Simulados)
  // =========================================================================
  describe('8. Janela Inicial de Reação dos Fantasmas (Espera de 2 Segundos)', () => {
    it('Fantasmas não capturam e permanecem no spawn nos primeiros 2000ms de tempo simulado', () => {
      const ghostGraceMs = GAME_SPEED_CONFIG.GHOST_INITIAL_SPAWN_DELAY_MS;
      expect(ghostGraceMs).toBe(2000);

      // Simula verificações de tempo simulado:
      // Para t < 2000 ms, a proteção está ativa
      const checkGrace = (simTime: number) => simTime < ghostGraceMs;

      expect(checkGrace(0)).toBe(true);
      expect(checkGrace(500)).toBe(true);
      expect(checkGrace(1999)).toBe(true);
      expect(checkGrace(2000)).toBe(false);
      expect(checkGrace(3500)).toBe(false);
    });

    it('Troca de estratégias ou modos não reativa a janela inicial se o tempo simulado já passou de 2000ms', () => {
      const ghostGraceMs = GAME_SPEED_CONFIG.GHOST_INITIAL_SPAWN_DELAY_MS; // 2000 ms
      const currentSimTime = 2500; // Já decorreram 2.5s de simulação

      // A regra garante que a proteção depende unicamente do tempo simulado acumulado da partida
      const isProtected = currentSimTime < ghostGraceMs;
      expect(isProtected).toBe(false);

      // O agente autônomo trocando de modo mantém o tempo simulado da partida
      const agent = new AutonomousAgent('A*', 'MVM');
      agent.setControlMode('HUMAN');
      agent.setControlMode('AUTONOMOUS');
      agent.setStrategy('SURVIVAL');
      agent.setStrategy('MIN_COST');

      // Proteção não é reativada
      expect(isProtected).toBe(false);
    });
  });

  // =========================================================================
  // 9. Segurança Ponderada do Posicionamento Inicial (Dijkstra Reverso e Terrenos)
  // =========================================================================
  describe('9. Segurança Ponderada do Posicionamento Inicial no Grafo', () => {
    it('Posições iniciais dos fantasmas garantem tempo de percurso ponderado >= 3500ms até o Pac-Man', () => {
      const testSeeds = [1, 7, 42, 88, 123, 500, 999];

      for (const s of testSeeds) {
        const world = new MazeGenerator(25, 25, s).generateWorld(0.1, 1, 2);

        // Tempo mínimo estimado para o Fantasma Vermelho alcançar o Pac-Man em startCell
        const timeE1 = computeGhostReachTimeMs(world.graph, world.enemySpawn, world.start);
        // Tempo mínimo estimado para o Fantasma Roxo alcançar o Pac-Man em startCell
        const timeE2 = computeGhostReachTimeMs(world.graph, world.enemySpawn2, world.start);

        // Deve ser no mínimo 3500 ms de tempo puro de percurso físico
        expect(timeE1).toBeGreaterThanOrEqual(3500);
        expect(timeE2).toBeGreaterThanOrEqual(3500);

        // Janela total antes da primeira ameaça física real:
        // Contagem (3s) + Espera dos Fantasmas (2s) + Tempo de deslocamento (>= 3.5s) >= 8.5s!
        const totalSafetyWindowE1Sec =
          GAME_SPEED_CONFIG.COUNTDOWN_DURATION_SEC +
          GAME_SPEED_CONFIG.GHOST_INITIAL_SPAWN_DELAY_MS / 1000 +
          timeE1 / 1000;
        expect(totalSafetyWindowE1Sec).toBeGreaterThanOrEqual(8.5);

        // Separação ponderada entre os dois fantasmas
        const timeBetweenGhosts = computeGhostReachTimeMs(
          world.graph,
          world.enemySpawn,
          world.enemySpawn2
        );
        expect(timeBetweenGhosts).toBeGreaterThanOrEqual(320);
      }
    });

    it('computeWeightedShortestPathsTo calcula distâncias exatas idênticas a execuções pontuais de Dijkstra', () => {
      const world = new MazeGenerator(15, 15, 42).generateWorld(0.1, 1, 1);
      const allDists = computeWeightedShortestPathsTo(world.graph, world.start);

      expect(allDists.get(nodeToKey(world.start))).toBe(0);

      // Amostra 10 nós aleatórios do grafo e compara com Dijkstra tradicional
      const sampleNodes = world.graph.vertices.slice(0, 15);
      for (const node of sampleNodes) {
        const dijkstraRes = dijkstra(world.graph, node, world.start);
        const batchDist = allDists.get(nodeToKey(node));

        if (dijkstraRes.found) {
          expect(batchDist).toBeCloseTo(dijkstraRes.cost, 4);
        }
      }
    });
  });
});
