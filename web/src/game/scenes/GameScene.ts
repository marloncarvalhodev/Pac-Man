/**
 * Cena Principal do Jogo Pac-Man (Phaser 3).
 * Responsável pelo ciclo de simulação física, renderização contínua e IA.
 */

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameStatus, GameStateSnapshot } from '../core/GameState';
import { MazeGenerator, WorldData } from '../graph/MazeGenerator';
import { Node, nodeToKey, nodeEquals } from '../graph/GraphTypes';
import { TerrainType, TERRAIN_COSTS } from '../graph/Terrain';
import { WallRenderer } from '../rendering/WallRenderer';
import { CharacterRenderer } from '../rendering/CharacterRenderer';
import { GraphRenderer } from '../rendering/GraphRenderer';
import { soundManager } from '../systems/SoundManager';
import { aStar } from '../algorithms/AStar';
import { dijkstra } from '../algorithms/Dijkstra';
import { solveMultiGoal } from '../algorithms/MultiGoalSolver';
import { PathfindingResult } from '../algorithms/PathfindingTypes';

export class GameScene extends Phaser.Scene {
  private world!: WorldData;
  private cellSize = 28;

  // Camadas de renderização (Graphics)
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;
  private xrayGraphics!: Phaser.GameObjects.Graphics;

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
  private redEnemy = {
    pos: [1, 1] as Node,
    spawn: [1, 1] as Node,
    renderX: 0,
    renderY: 0,
    facing: [0, 1] as [number, number],
    path: [] as Node[],
    nextMoveTime: 0,
    justTeleported: false,
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
  };

  // Status e Controles
  private gameStatus: GameStatus = 'READY';
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
    const removeUiListeners = () => {
      EventBus.off('ui-start-solver', this.startSolver, this);
      EventBus.off('ui-toggle-pause', this.togglePause, this);
      EventBus.off('ui-toggle-xray', this.toggleGraphXRay, this);
      EventBus.off('ui-toggle-ai-path', this.toggleAIPath, this);
      EventBus.off('ui-new-maze', this.generateNewMaze, this);
      EventBus.off('ui-restart-maze', this.restartCurrentMaze, this);
      EventBus.off('ui-clear-solver', this.clearSolver, this);
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

    this.gameStatus = 'PLAYING';
    this.updateInstantComparison();
    this.emitGameState();

    EventBus.emit('current-scene-ready', this);
  }

  private resetState(): void {
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

    this.purpleEnemy.pos = [...this.world.enemySpawn2];
    this.purpleEnemy.spawn = [...this.world.enemySpawn2];
    this.purpleEnemy.renderX = this.purpleEnemy.pos[1] * this.cellSize + this.cellSize / 2;
    this.purpleEnemy.renderY = this.purpleEnemy.pos[0] * this.cellSize + this.cellSize / 2;
    this.purpleEnemy.path = [];
    this.purpleEnemy.nextMoveTime = 0;

    this.clearSolver();
  }

  update(time: number, delta: number): void {
    if (this.gameStatus === 'PLAYING') {
      this.handlePlayerInput();
      this.updatePlayerMovement(time);
      this.updateEnemies(time);
      this.updateSolverAnimation();
    }

    this.interpolatePositions(delta);
    this.renderFrame(time);
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

    // Tenta mover na direção desejada ou continua na atual
    let targetFacing = this.nextPlayerFacing;
    let targetPos: Node = [
      this.playerPos[0] + targetFacing[0],
      this.playerPos[1] + targetFacing[1],
    ];

    if (!this.world.graph.hasEdge(this.playerPos, targetPos)) {
      targetFacing = this.playerFacing;
      targetPos = [
        this.playerPos[0] + targetFacing[0],
        this.playerPos[1] + targetFacing[1],
      ];
    }

    if (this.world.graph.hasEdge(this.playerPos, targetPos)) {
      this.playerPos = targetPos;
      this.playerFacing = targetFacing;
      this.isMoving = true;

      const pKey = nodeToKey(this.playerPos);

      // Coleta Pac-Dots
      if (this.pacDots.has(pKey)) {
        this.pacDots.delete(pKey);
        this.score += 10;
        soundManager.playDotSound();
      }

      // Coleta Chaves Douradas
      const keyIdx = this.world.keys.findIndex((k) => nodeEquals(k, this.playerPos));
      if (keyIdx >= 0 && !this.collectedKeys.has(pKey)) {
        this.collectedKeys.add(pKey);
        this.score += 100;
        soundManager.playKeySound();
      }

      // Coleta Orbes de Poder (Power Pellets)
      if (this.powerPellets.has(pKey)) {
        this.powerPellets.delete(pKey);
        this.frightenedUntilTime = time + 7000;
        this.score += 50;
        soundManager.playPowerPelletSound();
      }

      // Teleporte de Portal
      const portalDest = this.getPortalDestination(this.playerPos);
      if (portalDest) {
        if (!this.justTeleported) {
          this.playerPos = portalDest;
          this.justTeleported = true;
          soundManager.playTeleportSound();
        }
      } else {
        this.justTeleported = false;
      }

      // Dano de Lava e Cooldown Ponderado de Movimento
      const terrain = this.world.terrains.get(pKey) ?? TerrainType.NORMAL;
      const weight = TERRAIN_COSTS[terrain];
      const baseCooldown = 135;
      this.nextPlayerMoveTime = time + Math.floor(baseCooldown * weight);

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

  private getAmbushTarget(): Node {
    const [dr, dc] = this.playerFacing;
    const target: Node = [this.playerPos[0] + 3 * dr, this.playerPos[1] + 3 * dc];

    if (
      target[0] >= 0 &&
      target[0] < this.world.rows &&
      target[1] >= 0 &&
      target[1] < this.world.cols &&
      this.world.grid[target[0]][target[1]] === 0
    ) {
      return target;
    }

    let best = this.playerPos;
    let minDist = Infinity;
    for (const v of this.world.graph.vertices) {
      const d = Math.abs(v[0] - target[0]) + Math.abs(v[1] - target[1]);
      if (d < minDist) {
        minDist = d;
        best = v;
      }
    }
    return best;
  }

  private updateEnemies(time: number): void {
    if (!this.enemiesActive) return;

    const isFrightened = time < this.frightenedUntilTime;
    const enemies = [
      { agent: this.redEnemy, isAmbush: false },
      { agent: this.purpleEnemy, isAmbush: true },
    ];

    for (const { agent, isAmbush } of enemies) {
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
        const targetNode = isAmbush ? this.getAmbushTarget() : this.playerPos;
        const res = aStar(this.world.graph, agent.pos, targetNode, {
          portals: this.world.portalPairs,
          minWeight: 0.3,
        });
        if (res.found) {
          agent.path = res.path;
        }
      }

      if (time >= agent.nextMoveTime && agent.path.length > 1) {
        const nextCell = agent.path[1];
        agent.facing = [nextCell[0] - agent.pos[0], nextCell[1] - agent.pos[1]];
        agent.pos = nextCell;

        // Portal para inimigo
        const pDest = this.getPortalDestination(agent.pos);
        if (pDest) {
          if (!agent.justTeleported) {
            agent.pos = pDest;
            agent.justTeleported = true;
          }
        } else {
          agent.justTeleported = false;
        }

        const terrain = this.world.terrains.get(nodeToKey(agent.pos)) ?? TerrainType.NORMAL;
        const weight = TERRAIN_COSTS[terrain];
        const baseSpeed = 340;
        const speedMod = isFrightened ? 1.3 : 1.0;
        agent.nextMoveTime = time + Math.floor(baseSpeed * weight * speedMod);
      }
    }

    this.checkEnemyCollisions(time);
  }

  private checkEnemyCollisions(time: number): void {
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
      this.solverPathList,
      this.cellSize,
      this.solverVisitedSet
    );

    // 9. Rotas e Alvos da IA
    if (this.showAIPath && time >= this.frightenedUntilTime) {
      const ambushTarget = this.getAmbushTarget();
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
      this.gameStatus = 'PAUSED';
    } else if (this.gameStatus === 'PAUSED') {
      this.gameStatus = 'PLAYING';
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
    this.resetState();
    this.gameStatus = 'PLAYING';
    this.updateInstantComparison();
    this.emitGameState();
  }

  private generateNewMaze(seed?: number): void {
    const generator = new MazeGenerator(25, 25, seed);
    this.world = generator.generateWorld(0.1, 1, 2);

    WallRenderer.renderContinuousWalls(
      this.wallGraphics,
      this.world.grid,
      this.world.grid.length,
      this.world.grid[0].length,
      this.cellSize
    );

    this.resetState();
    this.gameStatus = 'PLAYING';
    this.updateInstantComparison();
    this.emitGameState();
  }

  private triggerVictory(): void {
    this.gameStatus = 'WON';
    this.score += 500;
    soundManager.playVictorySound();
    this.emitGameState();
  }

  private triggerGameOver(reason: string): void {
    this.gameStatus = 'LOST';
    soundManager.playGameOverSound();
    this.emitGameState();
  }

  private emitGameState(): void {
    const now = this.time.now;
    const isFrightened = now < this.frightenedUntilTime;
    const remainingFright = isFrightened ? Math.max(0, (this.frightenedUntilTime - now) / 1000) : 0;

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
