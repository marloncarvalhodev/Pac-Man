/**
 * Cena Principal do Jogo Pac-Man (Phaser 3).
 * Responsável pelo ciclo de simulação física, renderização contínua e IA.
 */

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameStatus, GameStateSnapshot } from '../core/GameState';
import { MazeGenerator, WorldData } from '../graph/MazeGenerator';
import { Node, nodeToKey, nodeEquals, keyToNode } from '../graph/GraphTypes';
import { TerrainType, TERRAIN_COSTS } from '../graph/Terrain';
import { WallRenderer } from '../rendering/WallRenderer';
import { CharacterRenderer } from '../rendering/CharacterRenderer';
import { GraphRenderer } from '../rendering/GraphRenderer';
import { soundManager } from '../systems/SoundManager';
import { aStar } from '../algorithms/AStar';
import { dijkstra } from '../algorithms/Dijkstra';
import { solveMultiGoal } from '../algorithms/MultiGoalSolver';
import { PathfindingResult } from '../algorithms/PathfindingTypes';
import { GAME_SPEED_CONFIG, SimulationSpeed } from '../config/GameConfig';
import { calculateInterceptionTarget } from '../agents/GhostInterception';
import {
  AutonomousAgent,
  ControlMode,
  AutonomousMode,
  AgentPerceptionData,
  AgentPerception,
  PlanningAlgorithm,
  StrategyType,
} from '../agents';

export class GameScene extends Phaser.Scene {
  private world!: WorldData;
  private cellSize = 28;

  // Camadas de renderização (Graphics)
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;
  private xrayGraphics!: Phaser.GameObjects.Graphics;
  private agentGraphics!: Phaser.GameObjects.Graphics;

  // Estado do Jogador (Pac-Man)
  private playerPos: Node = [1, 1];
  private playerRenderX = 0;
  private playerRenderY = 0;
  private playerFacing: [number, number] = [0, 1];
  private nextPlayerFacing: [number, number] = [0, 1];
  private isMoving = false;
  private nextPlayerMoveTime = 0;
  private justTeleported = false;
  private health = 100;
  private score = 0;

  // Objetivos e Colecionáveis
  private pacDots = new Set<string>();
  private collectedKeys = new Set<string>();
  private powerPellets = new Set<string>();
  private frightenedUntilTime = 0;

  // Inimigos
  private purpleInterceptTarget: Node | null = null;
  private redEnemy = {
    pos: [1, 1] as Node,
    spawn: [1, 1] as Node,
    renderX: 0,
    renderY: 0,
    facing: [0, 1] as [number, number],
    path: [] as Node[],
    nextMoveTime: 0,
    justTeleported: false,
    lastRecalcTime: 0,
  };

  private purpleEnemy = {
    pos: [1, 1] as Node,
    spawn: [1, 1] as Node,
    renderX: 0,
    renderY: 0,
    facing: [0, 1] as [number, number],
    path: [] as Node[],
    nextMoveTime: 0,
    justTeleported: false,
    lastRecalcTime: 0,
  };

  // Status, Temporização e Simulação
  private simulationSpeed: SimulationSpeed = GAME_SPEED_CONFIG.DEFAULT_SIMULATION_SPEED;
  private simulatedTime = 0;
  private realElapsedTime = 0;
  private countdownRemainingMs = 0;
  private ghostGraceUntilSimTime = 0;
  private statusBeforePause: GameStatus = 'PLAYING';
  private countdownBg!: Phaser.GameObjects.Graphics;
  private countdownText!: Phaser.GameObjects.Text;
  private gameStatus: GameStatus = 'READY';
  private controlMode: ControlMode = 'HUMAN';
  private autonomousAgent = new AutonomousAgent('A*', 'MVM');
  private agentPerception = new AgentPerception();
  private showAgentVisuals = true;
  private enemiesActive = true;
  private showAIPath = false;
  private showGraphXRay = false;
  private solverResult: PathfindingResult | null = null;
  private solverStep = 0;
  private solverVisitedSet = new Set<string>();
  private solverPathList: Node[] = [];

  // Teclado
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keysWASD!: Record<string, Phaser.Input.Keyboard.Key>;

  // Comparativo de Métricas em Tempo Real
  private dijkstraRealtimeNodes = 0;
  private aStarRealtimeNodes = 0;
  private heuristicGainPercent = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { seed?: number }): void {
    const generator = new MazeGenerator(25, 25, data.seed);
    this.world = generator.generateWorld(0.1, 1, 2);
    this.resetState();
  }

  create(): void {
    // 1. Cria camadas gráficas
    this.bgGraphics = this.add.graphics();
    this.wallGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
    this.agentGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();
    this.xrayGraphics = this.add.graphics();

    // 2. Renderiza paredes contínuas
    WallRenderer.renderContinuousWalls(
      this.wallGraphics,
      this.world.grid,
      this.world.grid.length,
      this.world.grid[0].length,
      this.cellSize
    );

    // 3. Configura controles do teclado
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keysWASD = this.input.keyboard.addKeys('W,A,S,D,P,R,N,G,T,ESC,ONE,TWO') as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;

      // Ações discretas no keydown
      this.keysWASD.P.on('down', () => this.togglePause());
      this.keysWASD.R.on('down', () => this.restartCurrentMaze());
      this.keysWASD.N.on('down', () => this.generateNewMaze());
      this.keysWASD.G.on('down', () => this.toggleGraphXRay());
      this.keysWASD.T.on('down', () => this.toggleAIPath());
      this.keysWASD.ONE.on('down', () => this.startSolver('Dijkstra'));
      this.keysWASD.TWO.on('down', () => this.startSolver('A*'));
    }

    // 4. Conecta eventos React via EventBus
    EventBus.on('ui-start-solver', this.startSolver, this);
    EventBus.on('ui-toggle-pause', this.togglePause, this);
    EventBus.on('ui-toggle-xray', this.toggleGraphXRay, this);
    EventBus.on('ui-toggle-ai-path', this.toggleAIPath, this);
    EventBus.on('ui-new-maze', this.generateNewMaze, this);
    EventBus.on('ui-restart-maze', this.restartCurrentMaze, this);
    EventBus.on('ui-clear-solver', this.clearSolver, this);
    EventBus.on('ui-set-control-mode', this.setControlMode, this);
    EventBus.on('ui-set-autonomous-mode', this.setAutonomousMode, this);
    EventBus.on('ui-agent-start', this.startAgent, this);
    EventBus.on('ui-agent-pause', this.pauseAgent, this);
    EventBus.on('ui-agent-resume', this.resumeAgent, this);
    EventBus.on('ui-agent-stop', this.stopAgent, this);
    EventBus.on('ui-agent-set-algorithm', this.setAgentAlgorithm, this);
    EventBus.on('ui-agent-set-strategy', this.setAgentStrategy, this);
    EventBus.on('ui-agent-toggle-visuals', this.toggleAgentVisuals, this);
    EventBus.on('ui-set-simulation-speed', this.setSimulationSpeed, this);
    const removeUiListeners = () => {
      EventBus.off('ui-start-solver', this.startSolver, this);
      EventBus.off('ui-toggle-pause', this.togglePause, this);
      EventBus.off('ui-toggle-xray', this.toggleGraphXRay, this);
      EventBus.off('ui-toggle-ai-path', this.toggleAIPath, this);
      EventBus.off('ui-new-maze', this.generateNewMaze, this);
      EventBus.off('ui-restart-maze', this.restartCurrentMaze, this);
      EventBus.off('ui-clear-solver', this.clearSolver, this);
      EventBus.off('ui-set-control-mode', this.setControlMode, this);
      EventBus.off('ui-set-autonomous-mode', this.setAutonomousMode, this);
      EventBus.off('ui-agent-start', this.startAgent, this);
      EventBus.off('ui-agent-pause', this.pauseAgent, this);
      EventBus.off('ui-agent-resume', this.resumeAgent, this);
      EventBus.off('ui-agent-stop', this.stopAgent, this);
      EventBus.off('ui-agent-set-algorithm', this.setAgentAlgorithm, this);
      EventBus.off('ui-agent-set-strategy', this.setAgentStrategy, this);
      EventBus.off('ui-agent-toggle-visuals', this.toggleAgentVisuals, this);
      EventBus.off('ui-set-simulation-speed', this.setSimulationSpeed, this);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, removeUiListeners);
      this.events.off(Phaser.Scenes.Events.DESTROY, removeUiListeners);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeUiListeners);
    this.events.once(Phaser.Scenes.Events.DESTROY, removeUiListeners);

    // Interatividade de clique / hover para inspeção de nós
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const c = Math.floor(pointer.x / this.cellSize);
      const r = Math.floor(pointer.y / this.cellSize);
      if (r >= 0 && r < this.world.grid.length && c >= 0 && c < this.world.grid[0].length) {
        if (this.world.grid[r][c] === 0) {
          this.emitVertexInspection([r, c]);
        }
      }
    });

    // Camada e texto da contagem regressiva visual
    this.countdownBg = this.add.graphics().setDepth(200);
    const cx = (this.world.cols * this.cellSize) / 2;
    const cy = (this.world.rows * this.cellSize) / 2;
    this.countdownText = this.add.text(cx, cy, '', {
      fontSize: '26px',
      fontFamily: 'monospace, sans-serif',
      fontStyle: 'bold',
      color: '#facc15',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(201).setVisible(false);

    this.startMatchPreparation();

    EventBus.emit('current-scene-ready', this);
  }

  private resetState(): void {
    this.simulatedTime = 0;
    this.realElapsedTime = 0;
    this.isMoving = false;
    this.purpleInterceptTarget = null;
    this.nextPlayerMoveTime = 0;
    this.playerPos = [...this.world.start];
    this.playerRenderX = this.playerPos[1] * this.cellSize + this.cellSize / 2;
    this.playerRenderY = this.playerPos[0] * this.cellSize + this.cellSize / 2;
    this.playerFacing = [0, 1];
    this.nextPlayerFacing = [0, 1];
    this.health = 100;
    this.score = 0;
    this.justTeleported = false;
    this.frightenedUntilTime = 0;

    // Popula Pac-Dots nos pisos normais livres
    const reserved = new Set<string>([
      nodeToKey(this.world.start),
      nodeToKey(this.world.goal),
      ...this.world.keys.map(nodeToKey),
      ...this.world.powerPellets.map(nodeToKey),
    ]);
    for (const [p1, p2] of this.world.portalPairs) {
      reserved.add(nodeToKey(p1));
      reserved.add(nodeToKey(p2));
    }

    this.pacDots = new Set<string>(
      this.world.graph.vertices
        .filter(
          (v) =>
            !reserved.has(nodeToKey(v)) &&
            this.world.terrains.get(nodeToKey(v)) === TerrainType.NORMAL
        )
        .map(nodeToKey)
    );

    this.collectedKeys.clear();
    this.powerPellets = new Set<string>(this.world.powerPellets.map(nodeToKey));

    // Inimigos
    this.redEnemy.pos = [...this.world.enemySpawn];
    this.redEnemy.spawn = [...this.world.enemySpawn];
    this.redEnemy.renderX = this.redEnemy.pos[1] * this.cellSize + this.cellSize / 2;
    this.redEnemy.renderY = this.redEnemy.pos[0] * this.cellSize + this.cellSize / 2;
    this.redEnemy.path = [];
    this.redEnemy.nextMoveTime = 0;
    this.redEnemy.lastRecalcTime = 0;

    this.purpleEnemy.pos = [...this.world.enemySpawn2];
    this.purpleEnemy.spawn = [...this.world.enemySpawn2];
    this.purpleEnemy.renderX = this.purpleEnemy.pos[1] * this.cellSize + this.cellSize / 2;
    this.purpleEnemy.renderY = this.purpleEnemy.pos[0] * this.cellSize + this.cellSize / 2;
    this.purpleEnemy.path = [];
    this.purpleEnemy.nextMoveTime = 0;
    this.purpleEnemy.lastRecalcTime = 0;

    this.clearSolver();
    if (this.controlMode === 'AUTONOMOUS') {
      this.enemiesActive = this.autonomousAgent.getAutonomousMode() === 'MVM';
      if (this.gameStatus === 'PLAYING') {
        this.autonomousAgent.start(this.getPerceptionData());
      }
    } else {
      this.enemiesActive = true;
      this.autonomousAgent.stop();
    }
  }

  private startMatchPreparation(): void {
    this.resetState();
    this.gameStatus = 'COUNTDOWN';
    this.countdownRemainingMs = GAME_SPEED_CONFIG.COUNTDOWN_DURATION_SEC * 1000;
    this.ghostGraceUntilSimTime = GAME_SPEED_CONFIG.GHOST_INITIAL_SPAWN_DELAY_MS;
    this.simulatedTime = 0;
    this.realElapsedTime = 0;
    this.renderCountdownVisual(GAME_SPEED_CONFIG.COUNTDOWN_DURATION_SEC);
    this.updateInstantComparison();
    this.emitGameState();
  }

  private renderCountdownVisual(secLeft: number): void {
    if (!this.countdownBg || !this.countdownText) return;

    const totalWidth = this.world.cols * this.cellSize;
    const totalHeight = this.world.rows * this.cellSize;
    const cx = totalWidth / 2;
    const cy = totalHeight / 2;

    this.countdownBg.clear();
    this.countdownBg.fillStyle(0x0a0f1d, 0.88);
    this.countdownBg.lineStyle(3, 0xfacc15, 0.95);
    this.countdownBg.fillRoundedRect(cx - 150, cy - 65, 300, 130, 14);
    this.countdownBg.strokeRoundedRect(cx - 150, cy - 65, 300, 130, 14);

    this.countdownText.setPosition(cx, cy);
    this.countdownText.setText(`PREPARE-SE!\n\n${secLeft}`);
    this.countdownText.setVisible(true);
  }

  update(time: number, delta: number): void {
    if (this.gameStatus === 'COUNTDOWN') {
      this.countdownRemainingMs = Math.max(0, this.countdownRemainingMs - delta);
      this.simulatedTime = 0; // O tempo simulado e o cronômetro não avançam na contagem

      const secLeft = Math.ceil(this.countdownRemainingMs / 1000);
      if (this.countdownRemainingMs <= 0) {
        this.countdownRemainingMs = 0;
        this.gameStatus = 'PLAYING';
        if (this.countdownText) this.countdownText.setVisible(false);
        if (this.countdownBg) this.countdownBg.clear();
        if (this.controlMode === 'AUTONOMOUS') {
          this.autonomousAgent.start(this.getPerceptionData());
        }
        this.emitGameState();
      } else {
        this.renderCountdownVisual(secLeft);
      }

      this.interpolatePositions(0);
      this.renderFrame(0);
      return;
    }

    if (this.gameStatus === 'PLAYING') {
      const simDelta = delta * this.simulationSpeed;
      this.simulatedTime += simDelta;
      this.realElapsedTime += delta;

      if (this.controlMode === 'HUMAN') {
        this.handlePlayerInput();
      }
      this.updatePlayerMovement(this.simulatedTime);
      this.updateEnemies(this.simulatedTime);
      this.updateSolverAnimation();
    }

    this.interpolatePositions(delta * this.simulationSpeed);
    this.renderFrame(this.simulatedTime);
  }

  private handlePlayerInput(): void {
    if (!this.input.keyboard) return;

    if (this.cursors.up.isDown || this.keysWASD.W.isDown) {
      this.nextPlayerFacing = [-1, 0];
    } else if (this.cursors.down.isDown || this.keysWASD.S.isDown) {
      this.nextPlayerFacing = [1, 0];
    } else if (this.cursors.left.isDown || this.keysWASD.A.isDown) {
      this.nextPlayerFacing = [0, -1];
    } else if (this.cursors.right.isDown || this.keysWASD.D.isDown) {
      this.nextPlayerFacing = [0, 1];
    }
  }

  private updatePlayerMovement(time: number): void {
    if (time < this.nextPlayerMoveTime) return;

    if (this.controlMode === 'AUTONOMOUS') {
      const agentMove = this.autonomousAgent.update(this.getPerceptionData(), this.gameStatus);
      if (agentMove) {
        this.nextPlayerFacing = agentMove;
      }
    }

    // Tenta mover na direção desejada ou continua na atual
    let targetFacing = this.nextPlayerFacing;
    let resolvedTarget = this.world.graph.resolveStep(
      this.playerPos,
      targetFacing[0],
      targetFacing[1]
    );

    if (!resolvedTarget || !this.world.graph.hasEdge(this.playerPos, resolvedTarget)) {
      targetFacing = this.playerFacing;
      resolvedTarget = this.world.graph.resolveStep(
        this.playerPos,
        targetFacing[0],
        targetFacing[1]
      );
    }

    if (resolvedTarget && this.world.graph.hasEdge(this.playerPos, resolvedTarget)) {
      const fromPos = this.playerPos;
      const targetPos = resolvedTarget;
      const entryCell = this.world.graph.transitionEntry(fromPos, targetPos);
      const cost = this.world.graph.getEdgeWeight(fromPos, targetPos) ?? 1.0;

      this.playerPos = targetPos;
      this.playerFacing = targetFacing;
      this.isMoving = true;

      // Teleporte sonoro se usou portal
      if (!nodeEquals(entryCell, targetPos)) {
        soundManager.playTeleportSound();
      }

      // Coleta em ambas as posições (entrada e destino final do passo)
      for (const cell of [entryCell, this.playerPos]) {
        const cKey = nodeToKey(cell);

        // Coleta Pac-Dots
        if (this.pacDots.has(cKey)) {
          this.pacDots.delete(cKey);
          this.score += 10;
          soundManager.playDotSound();
        }

        // Coleta Chaves Douradas
        const keyIdx = this.world.keys.findIndex((k) => nodeEquals(k, cell));
        if (keyIdx >= 0 && !this.collectedKeys.has(cKey)) {
          this.collectedKeys.add(cKey);
          this.score += 100;
          soundManager.playKeySound();
        }

        // Coleta Orbes de Poder (Power Pellets)
        if (this.powerPellets.has(cKey)) {
          this.powerPellets.delete(cKey);
          this.frightenedUntilTime = time + GAME_SPEED_CONFIG.FRIGHTENED_DURATION_MS;
          this.score += 50;
          soundManager.playPowerPelletSound();
        }
      }

      // Dano de Lava e Cooldown Ponderado de Movimento
      const terrain = this.world.terrains.get(nodeToKey(entryCell)) ?? TerrainType.NORMAL;
      const baseCooldown = GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS;
      this.nextPlayerMoveTime = time + Math.floor(baseCooldown * cost);

      if (terrain === TerrainType.LAVA) {
        this.health = Math.max(0, this.health - 10);
        soundManager.playLavaHurtSound();
        if (this.health <= 0) {
          this.triggerGameOver('Você sucumbiu à lava ardente!');
          return;
        }
      }

      // Condição de Vitória: Destino com todas as chaves
      if (nodeEquals(this.playerPos, this.world.goal) && this.collectedKeys.size === this.world.keys.length) {
        this.triggerVictory();
        return;
      }

      this.updateInstantComparison();
      this.checkEnemyCollisions(time);
      this.emitGameState();
    } else {
      this.isMoving = false;
    }
  }

  private getPortalDestination(pos: Node): Node | null {
    for (const [p1, p2] of this.world.portalPairs) {
      if (nodeEquals(pos, p1)) return p2;
      if (nodeEquals(pos, p2)) return p1;
    }
    return null;
  }

  private getInterceptionTarget(): Node {
    const remainingObjectives = this.world.keys.filter((k) => !this.collectedKeys.has(nodeToKey(k)));
    if (remainingObjectives.length === 0) {
      remainingObjectives.push(this.world.goal);
    }
    const pacPlannedPath =
      this.controlMode === 'AUTONOMOUS'
        ? this.autonomousAgent.getRemainingPath(this.playerPos)
        : undefined;

    const interceptRes = calculateInterceptionTarget(
      this.world.graph,
      this.purpleEnemy.pos,
      this.playerPos,
      this.playerFacing,
      pacPlannedPath,
      remainingObjectives,
      this.world.portalPairs,
      GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS,
      GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS
    );
    this.purpleInterceptTarget = interceptRes.target;
    return interceptRes.target;
  }

  private updateEnemies(time: number): void {
    if (!this.enemiesActive) return;

    // Janela Inicial de Reação: Fantasmas permanecem em espera nos seus spawns
    // durante os primeiros GHOST_INITIAL_SPAWN_DELAY_MS (2000 ms) de tempo simulado.
    if (time < this.ghostGraceUntilSimTime) {
      this.redEnemy.pos = [...this.redEnemy.spawn];
      this.purpleEnemy.pos = [...this.purpleEnemy.spawn];
      this.redEnemy.path = [];
      this.purpleEnemy.path = [];
      this.redEnemy.nextMoveTime = this.ghostGraceUntilSimTime;
      this.purpleEnemy.nextMoveTime = this.ghostGraceUntilSimTime;
      return;
    }

    const isFrightened = time < this.frightenedUntilTime;
    const remainingObjectives = this.world.keys.filter((k) => !this.collectedKeys.has(nodeToKey(k)));
    if (remainingObjectives.length === 0) {
      remainingObjectives.push(this.world.goal);
    }
    const pacPlannedPath =
      this.controlMode === 'AUTONOMOUS'
        ? this.autonomousAgent.getRemainingPath(this.playerPos)
        : undefined;

    const enemies = [
      { agent: this.redEnemy, isInterceptor: false },
      { agent: this.purpleEnemy, isInterceptor: true },
    ];

    for (const { agent, isInterceptor } of enemies) {
      if (isFrightened) {
        // Heurística Invertida: escolhe o vizinho que maximiza a distância do jogador
        const nbrs = this.world.graph.neighbors(agent.pos);
        if (nbrs.length > 0) {
          const best = nbrs.reduce((prev, curr) => {
            const dPrev = Math.abs(prev.node[0] - this.playerPos[0]) + Math.abs(prev.node[1] - this.playerPos[1]);
            const dCurr = Math.abs(curr.node[0] - this.playerPos[0]) + Math.abs(curr.node[1] - this.playerPos[1]);
            return dCurr > dPrev ? curr : prev;
          });
          agent.path = [agent.pos, best.node];
        }
      } else {
        const needsRecalc =
          agent.path.length <= 1 ||
          time - (agent.lastRecalcTime ?? 0) >= GAME_SPEED_CONFIG.GHOST_RECALC_INTERVAL_MS ||
          this.world.graph.degree(agent.pos) >= 3;

        if (needsRecalc) {
          if (isInterceptor) {
            const interceptRes = calculateInterceptionTarget(
              this.world.graph,
              agent.pos,
              this.playerPos,
              this.playerFacing,
              pacPlannedPath,
              remainingObjectives,
              this.world.portalPairs,
              GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS,
              GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS
            );
            this.purpleInterceptTarget = interceptRes.target;
            agent.path = interceptRes.path;
            agent.lastRecalcTime = time;
          } else {
            // Fantasma Vermelho: perseguição direta via A* até a posição atual do Pac-Man
            const res = aStar(this.world.graph, agent.pos, this.playerPos, {
              portals: this.world.portalPairs,
              minWeight: 0.3,
            });
            if (res.found) {
              agent.path = res.path;
              agent.lastRecalcTime = time;
            }
          }
        }
      }

      if (time >= agent.nextMoveTime && agent.path.length > 1) {
        const nextCell = agent.path[1];
        const entryCell = this.world.graph.transitionEntry(agent.pos, nextCell);
        const dr = entryCell[0] - agent.pos[0];
        const dc = entryCell[1] - agent.pos[1];
        if (dr !== 0 || dc !== 0) {
          agent.facing = [dr, dc];
        }
        const cost = this.world.graph.getEdgeWeight(agent.pos, nextCell) ?? 1.0;
        agent.pos = nextCell;

        if (!nodeEquals(entryCell, nextCell)) {
          soundManager.playTeleportSound();
        }

        const baseSpeed = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;
        const speedMod = isFrightened ? GAME_SPEED_CONFIG.GHOST_FRIGHTENED_MULTIPLIER : 1.0;
        agent.nextMoveTime = time + Math.floor(baseSpeed * cost * speedMod);
        agent.path = agent.path.slice(1);
      }
    }

    this.checkEnemyCollisions(time);
  }

  private checkEnemyCollisions(time: number): void {
    if (time < this.ghostGraceUntilSimTime) {
      return; // Nenhuma captura durante a janela inicial de reação
    }

    const isFrightened = time < this.frightenedUntilTime;
    const enemies = [this.redEnemy, this.purpleEnemy];

    for (const enemy of enemies) {
      if (nodeEquals(enemy.pos, this.playerPos)) {
        if (isFrightened) {
          enemy.pos = [...enemy.spawn];
          enemy.renderX = enemy.pos[1] * this.cellSize + this.cellSize / 2;
          enemy.renderY = enemy.pos[0] * this.cellSize + this.cellSize / 2;
          enemy.path = [];
          this.score += 200;
          soundManager.playEatGhostSound();
          this.emitGameState();
        } else {
          this.triggerGameOver('Os inimigos te capturaram no labirinto!');
          return;
        }
      }
    }
  }

  private interpolatePositions(delta: number): void {
    const factor = Math.min(1.0, (delta / 1000) * 16);
    const half = this.cellSize / 2;

    const targetPX = this.playerPos[1] * this.cellSize + half;
    const targetPY = this.playerPos[0] * this.cellSize + half;
    this.playerRenderX += (targetPX - this.playerRenderX) * factor;
    this.playerRenderY += (targetPY - this.playerRenderY) * factor;

    for (const e of [this.redEnemy, this.purpleEnemy]) {
      const targetEX = e.pos[1] * this.cellSize + half;
      const targetEY = e.pos[0] * this.cellSize + half;
      e.renderX += (targetEX - e.renderX) * factor;
      e.renderY += (targetEY - e.renderY) * factor;
    }
  }

  private updateSolverAnimation(): void {
    if (!this.solverResult) return;

    const speed = 4;
    for (let s = 0; s < speed; s++) {
      if (this.solverStep < this.solverResult.visitedOrder.length) {
        const node = this.solverResult.visitedOrder[this.solverStep];
        this.solverVisitedSet.add(nodeToKey(node));
        this.solverStep++;
      } else {
        this.solverPathList = this.solverResult.path;
        break;
      }
    }
  }

  private renderFrame(time: number): void {
    const half = this.cellSize / 2;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);

    // 1. Limpa camadas dinâmicas
    this.pathGraphics.clear();
    this.agentGraphics.clear();
    this.entityGraphics.clear();
    this.xrayGraphics.clear();

    // 2. Renderiza Terrenos Ponderados Especiais e Pac-Dots
    for (let r = 0; r < this.world.rows; r++) {
      for (let c = 0; c < this.world.cols; c++) {
        if (this.world.grid[r][c] === 0) {
          const key = `${r},${c}`;
          const terrain = this.world.terrains.get(key) ?? TerrainType.NORMAL;

          if (terrain !== TerrainType.NORMAL) {
            let color = 0x1e293b;
            if (terrain === TerrainType.BOOST) color = 0x00c3d7;
            if (terrain === TerrainType.MUD) color = 0x785230;
            if (terrain === TerrainType.LAVA) color = 0xdc3228;

            this.pathGraphics.fillStyle(color, 0.85);
            this.pathGraphics.fillRect(
              c * this.cellSize + 1,
              r * this.cellSize + 1,
              this.cellSize - 2,
              this.cellSize - 2
            );
          }

          // Pac-Dots
          if (this.pacDots.has(key)) {
            this.entityGraphics.fillStyle(0xfde68a, 1.0);
            this.entityGraphics.fillCircle(c * this.cellSize + half, r * this.cellSize + half, 2);
          }
        }
      }
    }

    // 3. Destino (Cadeado Trancado ou Portal Aberto)
    const goalX = this.world.goal[1] * this.cellSize + half;
    const goalY = this.world.goal[0] * this.cellSize + half;
    if (this.collectedKeys.size === this.world.keys.length) {
      CharacterRenderer.drawExitPortal(this.entityGraphics, goalX, goalY, this.cellSize, pulse);
    } else {
      CharacterRenderer.drawLock(this.entityGraphics, goalX, goalY, this.cellSize);
    }

    // 4. Início (Start)
    const startX = this.world.start[1] * this.cellSize + half;
    const startY = this.world.start[0] * this.cellSize + half;
    this.entityGraphics.fillStyle(0x22c55e, 1.0);
    this.entityGraphics.fillRoundedRect(
      startX - half + 2,
      startY - half + 2,
      this.cellSize - 4,
      this.cellSize - 4,
      4
    );

    // 5. Portais de Teleporte
    for (let i = 0; i < this.world.portalPairs.length; i++) {
      const [p1, p2] = this.world.portalPairs[i];
      const col = i % 2 === 0 ? 0xa66bff : 0xec4899;
      CharacterRenderer.drawPortal(
        this.entityGraphics,
        p1[1] * this.cellSize + half,
        p1[0] * this.cellSize + half,
        this.cellSize,
        col,
        pulse
      );
      CharacterRenderer.drawPortal(
        this.entityGraphics,
        p2[1] * this.cellSize + half,
        p2[0] * this.cellSize + half,
        this.cellSize,
        col,
        pulse
      );
    }

    // 6. Chaves Douradas
    for (const key of this.world.keys) {
      if (!this.collectedKeys.has(nodeToKey(key))) {
        CharacterRenderer.drawKey(
          this.entityGraphics,
          key[1] * this.cellSize + half,
          key[0] * this.cellSize + half,
          this.cellSize,
          pulse
        );
      }
    }

    // 7. Orbes de Poder (Power Pellets)
    for (const pellet of this.world.powerPellets) {
      if (this.powerPellets.has(nodeToKey(pellet))) {
        CharacterRenderer.drawPowerPellet(
          this.entityGraphics,
          pellet[1] * this.cellSize + half,
          pellet[0] * this.cellSize + half,
          this.cellSize,
          pulse
        );
      }
    }

    // 8. Visualização do Solver
    GraphRenderer.renderSolutionPath(
      this.pathGraphics,
      this.world.graph.transitionPoints(this.solverPathList),
      this.cellSize,
      this.solverVisitedSet
    );

    // 8.1 Visualização da Rota do Agente Autônomo
    if (this.controlMode === 'AUTONOMOUS' && this.showAgentVisuals) {
      const remainingPath = this.autonomousAgent.getRemainingPath(this.playerPos);
      const plan = this.autonomousAgent.getPlan();

      // Vértices explorados durante o planejamento
      if (plan && plan.visitedOrder) {
        this.agentGraphics.fillStyle(0x047857, 0.2);
        for (const v of plan.visitedOrder) {
          this.agentGraphics.fillRect(
            v[1] * this.cellSize + 2,
            v[0] * this.cellSize + 2,
            this.cellSize - 4,
            this.cellSize - 4
          );
        }
      }

      // Regiões temporariamente consideradas perigosas (MvM)
      const riskMap = this.autonomousAgent.getCurrentRiskMap();
      if (riskMap.size > 0) {
        this.agentGraphics.fillStyle(0xdc2626, 0.25);
        for (const [key, risk] of riskMap.entries()) {
          if (risk >= 10.0) {
            const node = keyToNode(key);
            this.agentGraphics.fillRect(
              node[1] * this.cellSize + 3,
              node[0] * this.cellSize + 3,
              this.cellSize - 6,
              this.cellSize - 6
            );
          }
        }
      }

      // Linha contínua do trajeto restante de objetivos
      if (remainingPath.length > 1) {
        const transPoints = this.world.graph.transitionPoints(remainingPath);
        this.agentGraphics.lineStyle(4, 0x10b981, 0.9);
        this.agentGraphics.beginPath();
        for (let i = 0; i < transPoints.length; i++) {
          const pt = transPoints[i];
          const px = pt[1] * this.cellSize + half;
          const py = pt[0] * this.cellSize + half;
          if (i === 0) this.agentGraphics.moveTo(px, py);
          else this.agentGraphics.lineTo(px, py);
        }
        this.agentGraphics.strokePath();

        // Marcadores luminosos nos nós restantes
        this.agentGraphics.fillStyle(0x34d399, 0.8);
        for (const pt of remainingPath) {
          this.agentGraphics.fillCircle(
            pt[1] * this.cellSize + half,
            pt[0] * this.cellSize + half,
            3
          );
        }
      }

      // Rota alternativa de fuga (se estiver em estado ESCAPING)
      const status = this.autonomousAgent.getStatusReport(this.getPerceptionData());
      if (status.isEscaping && status.escapePath.length > 1) {
        const escPoints = this.world.graph.transitionPoints(status.escapePath);
        this.agentGraphics.lineStyle(5, 0xf59e0b, 0.95);
        this.agentGraphics.beginPath();
        for (let i = 0; i < escPoints.length; i++) {
          const pt = escPoints[i];
          const px = pt[1] * this.cellSize + half;
          const py = pt[0] * this.cellSize + half;
          if (i === 0) this.agentGraphics.moveTo(px, py);
          else this.agentGraphics.lineTo(px, py);
        }
        this.agentGraphics.strokePath();
      }

      // Marcador do Próximo Alvo
      if (status.nextTarget) {
        const tx = status.nextTarget[1] * this.cellSize + half;
        const ty = status.nextTarget[0] * this.cellSize + half;
        const ringRadius = this.cellSize * (0.45 + 0.1 * Math.sin(time * 0.008));
        this.agentGraphics.lineStyle(2, 0xfacc15, 0.9);
        this.agentGraphics.strokeCircle(tx, ty, ringRadius);
      }
    }

    // 9. Rotas e Alvos da IA
    if (this.showAIPath && time >= this.frightenedUntilTime) {
      const ambushTarget = this.purpleInterceptTarget ?? this.getInterceptionTarget();
      GraphRenderer.renderAIRoutes(
        this.pathGraphics,
        this.redEnemy.path,
        this.purpleEnemy.path,
        ambushTarget,
        this.cellSize
      );
    }

    // 10. Inimigos
    const isFrightened = time < this.frightenedUntilTime;
    const remainingFrightSec = Math.max(0, (this.frightenedUntilTime - time) / 1000);

    if (!this.enemiesActive) {
      this.entityGraphics.alpha = 0.35;
    }

    CharacterRenderer.drawMinotaur(
      this.entityGraphics,
      this.redEnemy.renderX,
      this.redEnemy.renderY,
      Math.floor(this.cellSize * 0.36),
      this.redEnemy.facing,
      isFrightened,
      remainingFrightSec,
      time
    );

    CharacterRenderer.drawGhost(
      this.entityGraphics,
      this.purpleEnemy.renderX,
      this.purpleEnemy.renderY,
      Math.floor(this.cellSize * 0.36),
      this.purpleEnemy.facing,
      isFrightened,
      remainingFrightSec,
      time
    );

    if (!this.enemiesActive) {
      this.entityGraphics.alpha = 1.0;
    }

    // 11. Pac-Man
    CharacterRenderer.drawPacMan(
      this.entityGraphics,
      this.playerRenderX,
      this.playerRenderY,
      Math.floor(this.cellSize * 0.38),
      this.playerFacing,
      time,
      this.isMoving
    );

    // 12. Modo Raio-X do Grafo (Tecla G)
    if (this.showGraphXRay) {
      GraphRenderer.renderGraphXRay(
        this.xrayGraphics,
        this.world.graph,
        this.world.terrains,
        this.cellSize
      );
    }
  }

  private updateInstantComparison(): void {
    const remaining = this.world.keys.filter((k) => !this.collectedKeys.has(nodeToKey(k)));
    const target =
      remaining.length > 0
        ? remaining.reduce((prev, curr) => {
            const dPrev = Math.abs(prev[0] - this.playerPos[0]) + Math.abs(prev[1] - this.playerPos[1]);
            const dCurr = Math.abs(curr[0] - this.playerPos[0]) + Math.abs(curr[1] - this.playerPos[1]);
            return dCurr < dPrev ? curr : prev;
          })
        : this.world.goal;

    const resD = dijkstra(this.world.graph, this.playerPos, target);
    const resA = aStar(this.world.graph, this.playerPos, target, {
      portals: this.world.portalPairs,
      minWeight: 0.3,
    });

    this.dijkstraRealtimeNodes = resD.nodesExpanded;
    this.aStarRealtimeNodes = resA.nodesExpanded;
    this.heuristicGainPercent =
      resD.nodesExpanded > 0
        ? ((resD.nodesExpanded - resA.nodesExpanded) / resD.nodesExpanded) * 100.0
        : 0;
  }

  private startSolver(algorithm: 'Dijkstra' | 'A*'): void {
    this.clearSolver();
    const remainingKeys = this.world.keys.filter((k) => !this.collectedKeys.has(nodeToKey(k)));

    this.solverResult = solveMultiGoal(
      this.world.graph,
      this.playerPos,
      remainingKeys,
      this.world.goal,
      {
        algorithm,
        portals: this.world.portalPairs,
      }
    );
    this.solverStep = 0;
    this.emitGameState();
  }

  private clearSolver(): void {
    this.solverResult = null;
    this.solverStep = 0;
    this.solverVisitedSet.clear();
    this.solverPathList = [];
    this.emitGameState();
  }

  private togglePause(): void {
    if (this.gameStatus === 'PLAYING') {
      this.statusBeforePause = 'PLAYING';
      this.gameStatus = 'PAUSED';
    } else if (this.gameStatus === 'COUNTDOWN') {
      this.statusBeforePause = 'COUNTDOWN';
      this.gameStatus = 'PAUSED';
    } else if (this.gameStatus === 'PAUSED') {
      this.gameStatus = this.statusBeforePause ?? 'PLAYING';
      if (this.gameStatus === 'COUNTDOWN') {
        const secLeft = Math.ceil(this.countdownRemainingMs / 1000);
        this.renderCountdownVisual(secLeft);
      }
    }
    this.emitGameState();
  }

  private toggleGraphXRay(): void {
    this.showGraphXRay = !this.showGraphXRay;
    this.emitGameState();
  }

  private toggleAIPath(): void {
    this.showAIPath = !this.showAIPath;
    this.emitGameState();
  }

  private restartCurrentMaze(): void {
    this.startMatchPreparation();
  }

  private generateNewMaze(seed?: unknown): void {
    let actualSeed: number;
    if (typeof seed === 'number' && Number.isFinite(seed)) {
      actualSeed = seed;
    } else {
      let rand = Math.floor(Math.random() * 1000000) + 1;
      if (this.world && rand === this.world.seed) {
        rand = ((rand + 1) % 1000000) + 1;
      }
      actualSeed = rand;
    }

    const generator = new MazeGenerator(25, 25, actualSeed);
    this.world = generator.generateWorld(0.1, 1, 2);

    WallRenderer.renderContinuousWalls(
      this.wallGraphics,
      this.world.grid,
      this.world.grid.length,
      this.world.grid[0].length,
      this.cellSize
    );

    this.startMatchPreparation();
  }

  private triggerVictory(): void {
    this.gameStatus = 'WON';
    this.score += 500;
    if (this.countdownText) this.countdownText.setVisible(false);
    if (this.countdownBg) this.countdownBg.clear();
    soundManager.playVictorySound();
    this.emitGameState();
  }

  private triggerGameOver(reason: string): void {
    this.gameStatus = 'LOST';
    if (this.countdownText) this.countdownText.setVisible(false);
    if (this.countdownBg) this.countdownBg.clear();
    soundManager.playGameOverSound();
    this.emitGameState();
  }

  private getPerceptionData(): AgentPerceptionData {
    const now = this.simulatedTime;
    return this.agentPerception.readState(
      this.playerPos,
      this.world.graph,
      this.world.keys,
      this.collectedKeys,
      this.world.goal,
      this.world.portalPairs,
      this.world.terrains,
      [
        {
          id: 'red',
          name: 'Fantasma Vermelho (Perseguidor)',
          pos: this.redEnemy.pos,
          spawn: this.redEnemy.spawn,
          facing: this.redEnemy.facing,
          path: this.redEnemy.path,
        },
        {
          id: 'purple',
          name: 'Fantasma Roxo (Interceptor)',
          pos: this.purpleEnemy.pos,
          spawn: this.purpleEnemy.spawn,
          facing: this.purpleEnemy.facing,
          path: this.purpleEnemy.path,
        },
      ],
      this.frightenedUntilTime,
      now,
      this.pacDots,
      this.powerPellets,
      this.health,
      this.score,
      this.world.seed
    );
  }

  private setControlMode(mode: ControlMode, autoMode?: AutonomousMode): void {
    this.controlMode = mode;
    this.autonomousAgent.setControlMode(mode);
    if (autoMode) {
      this.autonomousAgent.setAutonomousMode(autoMode);
    }
    if (mode === 'AUTONOMOUS') {
      const isMvM = this.autonomousAgent.getAutonomousMode() === 'MVM';
      this.enemiesActive = isMvM;
      this.autonomousAgent.start(this.getPerceptionData());
    } else {
      // Retorno ao Modo Humano: restaura os inimigos do Arcade tradicional
      this.enemiesActive = true;
      this.autonomousAgent.stop();
    }
    this.emitGameState();
  }

  private setAutonomousMode(autoMode: AutonomousMode): void {
    this.autonomousAgent.setAutonomousMode(autoMode, this.getPerceptionData());
    if (this.controlMode === 'AUTONOMOUS') {
      this.enemiesActive = autoMode === 'MVM';
    }
    this.emitGameState();
  }

  private setSimulationSpeed(speed: number | string): void {
    const val = Number(speed);
    if (val === 0.5 || val === 1.0 || val === 2.0) {
      this.simulationSpeed = val as SimulationSpeed;
      this.autonomousAgent.setSimulationSpeed(val);
      this.emitGameState();
    }
  }

  private startAgent(): void {
    this.setControlMode('AUTONOMOUS', this.autonomousAgent.getAutonomousMode());
  }

  private pauseAgent(): void {
    this.autonomousAgent.pause();
    this.emitGameState();
  }

  private resumeAgent(): void {
    this.autonomousAgent.resume();
    this.emitGameState();
  }

  private stopAgent(): void {
    this.setControlMode('HUMAN');
  }

  private setAgentAlgorithm(algo: PlanningAlgorithm): void {
    this.autonomousAgent.setAlgorithm(algo, this.getPerceptionData());
    this.emitGameState();
  }

  private setAgentStrategy(strategy: StrategyType): void {
    this.autonomousAgent.setStrategy(strategy, this.getPerceptionData());
    this.emitGameState();
  }

  private toggleAgentVisuals(): void {
    this.showAgentVisuals = !this.showAgentVisuals;
    this.emitGameState();
  }

  private emitGameState(): void {
    const now = this.simulatedTime;
    const isFrightened = now < this.frightenedUntilTime;
    const remainingFright = isFrightened ? Math.max(0, (this.frightenedUntilTime - now) / 1000) : 0;
    const isGhostWaiting = this.enemiesActive && now < this.ghostGraceUntilSimTime;
    const countdownSec = Math.max(0, this.countdownRemainingMs / 1000);
    const ghostGraceSec = isGhostWaiting
      ? Math.max(0, (this.ghostGraceUntilSimTime - now) / 1000)
      : 0;

    const snapshot: GameStateSnapshot = {
      score: this.score,
      health: this.health,
      keysCollected: this.collectedKeys.size,
      totalKeys: this.world.keys.length,
      goalUnlocked: this.collectedKeys.size === this.world.keys.length,
      isFrightened,
      frightenedTimeRemaining: remainingFright,
      gameStatus: this.gameStatus,
      enemiesActive: this.enemiesActive,
      aiPathActive: this.showAIPath,
      graphXRayActive: this.showGraphXRay,
      graphOrder: this.world.graph.order,
      graphSize: this.world.graph.size,
      dijkstraNodesRealtime: this.dijkstraRealtimeNodes,
      aStarNodesRealtime: this.aStarRealtimeNodes,
      heuristicGainPercent: this.heuristicGainPercent,
      solverResult: this.solverResult,
      seed: this.world.seed,
      controlMode: this.controlMode,
      agentStatus: this.autonomousAgent.getStatusReport(this.getPerceptionData()),
      showAgentVisuals: this.showAgentVisuals,
      simulationSpeed: this.simulationSpeed,
      countdownRemainingSec: countdownSec,
      ghostGraceRemainingSec: ghostGraceSec,
      isGhostWaiting,
    };

    EventBus.emit('game-state-updated', snapshot);
  }

  private emitVertexInspection(node: Node): void {
    const key = nodeToKey(node);
    const terrain = this.world.terrains.get(key) ?? TerrainType.NORMAL;
    const nbrs = this.world.graph.neighbors(node).map((n) => ({
      node: n.node,
      weight: n.weight,
      terrain: this.world.terrains.get(nodeToKey(n.node)) ?? TerrainType.NORMAL,
    }));

    EventBus.emit('vertex-inspected', {
      node,
      key,
      terrain,
      terrainName: terrain,
      inDegree: this.world.graph.inDegree(node),
      outDegree: this.world.graph.outDegree(node),
      degree: this.world.graph.degree(node),
      isJunction: this.world.graph.degree(node) >= 3,
      neighbors: nbrs,
    });
  }

  destroy(): void {
    // Os ouvintes desta cena são removidos no evento SHUTDOWN.
  }
}
