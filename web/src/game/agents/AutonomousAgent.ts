import { Node, NodeKey, nodeToKey, nodeEquals } from '../graph/GraphTypes';
import { GameStatus } from '../core/GameState';
import {
  AgentPerceptionData,
  AgentPlan,
  AgentState,
  AgentStatusReport,
  AutonomousMode,
  ControlMode,
  EnemyPerception,
  PlanningAlgorithm,
  StrategicState,
  StrategyType,
  MatchMetrics,
} from './AgentTypes';
import { AgentPerception } from './AgentPerception';
import { AgentPlanner } from './AgentPlanner';
import { AgentExecution } from './AgentExecution';
import { RiskAssessment } from './RiskAssessment';
import { GAME_SPEED_CONFIG } from '../config/GameConfig';

/**
 * Controlador Principal do Pac-Man Autônomo.
 * Orquestra percepção, estratégias modulares de planejamento (MIN_COST, MIN_TIME, SURVIVAL, MAX_SCORE, FULL_CLEAR),
 * avaliação dinâmica de risco, evasão e telemetria de métricas por partida.
 */
export class AutonomousAgent {
  private state: AgentState = 'IDLE';
  private controlMode: ControlMode = 'HUMAN';
  private autonomousMode: AutonomousMode = 'MVM';
  private strategicState: StrategicState = 'COLLECTING';
  private algorithm: PlanningAlgorithm = 'A*';
  private strategy: StrategyType = 'MIN_COST';
  private simulationSpeed: number = GAME_SPEED_CONFIG.DEFAULT_SIMULATION_SPEED;

  private perception = new AgentPerception();
  private planner = new AgentPlanner();
  private execution = new AgentExecution();
  private riskAssessment = new RiskAssessment();

  // Rastreamento separado de tempo simulado e tempo real
  private executionStartSimulatedTime: number | null = null;
  private executionStartRealTime: number | null = null;
  private totalPausedSimulatedMs = 0;
  private totalPausedRealMs = 0;
  private pauseStartSimulatedTime: number | null = null;
  private pauseStartRealTime: number | null = null;
  private lastSimulatedTime = 0;
  private pausedByGame = false;

  private replanCount = 0;
  private lastReplanTimestamp = 0;
  private currentRiskMap = new Map<NodeKey, number>();
  private recentPositions: NodeKey[] = [];
  private escapeStartedAtSimTime: number | null = null;

  // Métricas reais da partida
  private traversedCost = 0;
  private movesCount = 0;
  private totalNodesExpanded = 0;
  private lastPosition: Node | null = null;
  private initialPacDotsCount = 0;
  private matchSeed = 0;
  private matchOutcome: 'IN_PROGRESS' | 'WON' | 'LOST' | 'TIMEOUT' = 'IN_PROGRESS';

  constructor(
    defaultAlgorithm: PlanningAlgorithm = 'A*',
    defaultMode: AutonomousMode = 'MVM',
    defaultStrategy: StrategyType = 'MIN_COST'
  ) {
    this.algorithm = defaultAlgorithm;
    this.autonomousMode = defaultMode;
    this.strategy = defaultStrategy;
  }

  getSimulationSpeed(): number {
    return this.simulationSpeed;
  }

  setSimulationSpeed(speed: number): void {
    this.simulationSpeed = speed;
  }

  getState(): AgentState {
    return this.state;
  }

  getControlMode(): ControlMode {
    return this.controlMode;
  }

  setControlMode(mode: ControlMode): void {
    this.controlMode = mode;
    if (mode === 'HUMAN') {
      this.stop();
    }
  }

  getAutonomousMode(): AutonomousMode {
    return this.autonomousMode;
  }

  setAutonomousMode(mode: AutonomousMode, perceptionData?: AgentPerceptionData): void {
    this.autonomousMode = mode;
    if (this.state === 'MOVING' || this.state === 'PLANNING') {
      if (perceptionData) {
        this.replan(perceptionData);
      }
    }
  }

  getStrategicState(): StrategicState {
    return this.strategicState;
  }

  getAlgorithm(): PlanningAlgorithm {
    return this.algorithm;
  }

  setAlgorithm(algorithm: PlanningAlgorithm, perceptionData?: AgentPerceptionData): void {
    this.algorithm = algorithm;
    if ((this.state === 'MOVING' || this.state === 'PLANNING') && perceptionData) {
      this.replan(perceptionData);
    }
  }

  getStrategy(): StrategyType {
    return this.strategy;
  }

  setStrategy(strategy: StrategyType, perceptionData?: AgentPerceptionData): void {
    this.strategy = strategy;
    if ((this.state === 'MOVING' || this.state === 'PLANNING') && perceptionData) {
      this.replan(perceptionData);
    }
  }

  getPlan(): AgentPlan | null {
    return this.execution.getPlan();
  }

  getRemainingPath(currentPos: Node): Node[] {
    return this.execution.getRemainingPath(currentPos);
  }

  getEscapePath(): Node[] {
    return this.execution.getEscapePath() ?? [];
  }

  getCurrentRiskMap(): Map<NodeKey, number> {
    return this.currentRiskMap;
  }

  start(perceptionData: AgentPerceptionData): boolean {
    this.controlMode = 'AUTONOMOUS';
    this.state = 'PLANNING';
    this.strategicState = perceptionData.remainingKeys.length === 0 ? 'FINISHING' : 'COLLECTING';
    const currentTime = perceptionData.currentTime ?? 0;
    this.executionStartSimulatedTime = currentTime;
    this.executionStartRealTime = Date.now();
    this.totalPausedSimulatedMs = 0;
    this.totalPausedRealMs = 0;
    this.pauseStartSimulatedTime = null;
    this.pauseStartRealTime = null;
    this.lastSimulatedTime = currentTime;
    this.replanCount = 0;
    this.lastReplanTimestamp = currentTime;
    this.recentPositions = [nodeToKey(perceptionData.currentPos)];
    this.escapeStartedAtSimTime = null;

    // Inicialização das métricas reais da partida
    this.traversedCost = 0;
    this.movesCount = 0;
    this.totalNodesExpanded = 0;
    this.lastPosition = [perceptionData.currentPos[0], perceptionData.currentPos[1]];
    this.initialPacDotsCount = perceptionData.pacDots?.size ?? 0;
    this.matchSeed = perceptionData.seed ?? 0;
    this.matchOutcome = 'IN_PROGRESS';

    // Avalia mapa de risco se estiver no modo Máquina vs. Máquina
    if (this.autonomousMode === 'MVM' && (perceptionData.enemies?.length ?? 0) > 0) {
      this.currentRiskMap = this.riskAssessment.buildRiskMap(
        perceptionData.graph,
        perceptionData.enemies,
        perceptionData.currentPos
      );
    } else {
      this.currentRiskMap.clear();
    }

    const plan = this.planner.plan(
      perceptionData,
      this.algorithm,
      this.currentRiskMap,
      this.strategy
    );

    if (!plan) {
      this.state = 'FAILED';
      this.execution.setPlan(null);
      return false;
    }

    this.totalNodesExpanded += plan.totalNodesExpanded;
    this.execution.setPlan(plan);
    this.state = 'MOVING';
    return true;
  }

  pause(byGame = false): void {
    if (this.state === 'MOVING') {
      this.state = 'PAUSED';
      this.pausedByGame = byGame;
      this.pauseStartSimulatedTime = this.lastSimulatedTime;
      this.pauseStartRealTime = Date.now();
    }
  }

  resume(): void {
    if (this.state === 'PAUSED') {
      if (this.pauseStartSimulatedTime !== null) {
        this.totalPausedSimulatedMs += Math.max(0, this.lastSimulatedTime - this.pauseStartSimulatedTime);
        this.pauseStartSimulatedTime = null;
      }
      if (this.pauseStartRealTime !== null) {
        this.totalPausedRealMs += Math.max(0, Date.now() - this.pauseStartRealTime);
        this.pauseStartRealTime = null;
      }
      this.pausedByGame = false;
      this.state = 'MOVING';
    }
  }

  stop(): void {
    this.state = 'IDLE';
    this.pausedByGame = false;
    this.execution.setPlan(null);
    this.execution.clearEscapePath();
    this.executionStartSimulatedTime = null;
    this.executionStartRealTime = null;
    this.pauseStartSimulatedTime = null;
    this.pauseStartRealTime = null;
    this.totalPausedSimulatedMs = 0;
    this.totalPausedRealMs = 0;
    this.currentRiskMap.clear();
    this.recentPositions = [];
    this.escapeStartedAtSimTime = null;
  }

  replan(perceptionData: AgentPerceptionData, useRisk = true): boolean {
    this.replanCount++;
    const currentTime = perceptionData.currentTime ?? 0;
    this.lastReplanTimestamp = currentTime;

    if (this.autonomousMode === 'MVM' && useRisk && (perceptionData.enemies?.length ?? 0) > 0) {
      this.currentRiskMap = this.riskAssessment.buildRiskMap(
        perceptionData.graph,
        perceptionData.enemies,
        perceptionData.currentPos
      );
    } else {
      this.currentRiskMap.clear();
    }

    const plan = this.planner.plan(
      perceptionData,
      this.algorithm,
      this.currentRiskMap,
      this.strategy
    );

    if (!plan) {
      this.state = 'FAILED';
      this.execution.setPlan(null);
      return false;
    }

    this.totalNodesExpanded += plan.totalNodesExpanded;
    this.execution.setPlan(plan);
    this.state = 'MOVING';
    this.strategicState = perceptionData.remainingKeys.length === 0 ? 'FINISHING' : 'COLLECTING';
    return true;
  }

  /**
   * Ciclo de atualização de tomada de decisão e movimentação do agente.
   */
  update(perceptionData: AgentPerceptionData, gameStatus: GameStatus): [number, number] | null {
    if (this.controlMode !== 'AUTONOMOUS' || gameStatus === 'COUNTDOWN' || gameStatus === 'READY') {
      return null;
    }

    if (gameStatus === 'WON') {
      this.state = 'COMPLETED';
      this.matchOutcome = 'WON';
      return null;
    }

    if (gameStatus === 'LOST') {
      this.state = 'FAILED';
      this.matchOutcome = 'LOST';
      return null;
    }

    if (gameStatus === 'TIMEOUT') {
      this.state = 'COMPLETED';
      this.matchOutcome = 'TIMEOUT';
      return null;
    }

    if (gameStatus === 'PAUSED') {
      if (this.state === 'MOVING') {
        this.pause(true);
      }
      return null;
    }

    if (this.state === 'PAUSED') {
      if (this.pausedByGame && gameStatus === 'PLAYING') {
        this.resume();
      } else {
        return null;
      }
    }

    if (
      this.state === 'IDLE' ||
      this.state === 'PAUSED' ||
      this.state === 'COMPLETED' ||
      this.state === 'FAILED'
    ) {
      return null;
    }

    // Monitora deslocamento físico real para métricas da partida e memória de vértices recentes
    if (this.lastPosition && !nodeEquals(this.lastPosition, perceptionData.currentPos)) {
      this.movesCount++;
      const edgeWeight =
        perceptionData.graph.getEdgeWeight(this.lastPosition, perceptionData.currentPos) ?? 1.0;
      this.traversedCost += edgeWeight;
      this.lastPosition = [perceptionData.currentPos[0], perceptionData.currentPos[1]];
      this.recentPositions.push(nodeToKey(perceptionData.currentPos));
      if (this.recentPositions.length > 6) {
        this.recentPositions.shift();
      }
    }

    // Se concluiu todas as chaves e chegou à saída (exceto MAX_SURVIVAL_TIME que busca permanência contínua)
    if (
      this.strategy !== 'MAX_SURVIVAL_TIME' &&
      this.execution.isComplete(perceptionData.currentPos) &&
      perceptionData.remainingKeys.length === 0 &&
      (this.strategy !== 'FULL_CLEAR' || !perceptionData.pacDots?.size)
    ) {
      this.state = 'COMPLETED';
      return null;
    }

    // =========================================================================
    // Tomada de Decisão Estratégica em Modo Máquina vs. Máquina
    // =========================================================================
    if (this.autonomousMode === 'MVM' && (perceptionData.enemies?.length ?? 0) > 0) {
      const activeEnemies = (perceptionData.enemies ?? []).filter((e) => e.dangerLevel > 0.05);

      // Localiza a ameaça mais próxima
      let closestEnemy: EnemyPerception | null = null;
      let minDistance = Infinity;
      for (const e of activeEnemies) {
        if (e.graphDistance < minDistance) {
          minDistance = e.graphDistance;
          closestEnemy = e;
        }
      }

      // 1. CONDICIONAL DE FUGA IMINENTE (ESCAPING)
      if (closestEnemy && minDistance <= RiskAssessment.IMMEDIATE_THREAT_DISTANCE) {
        if (this.strategicState !== 'ESCAPING') {
          this.escapeStartedAtSimTime = perceptionData.currentTime;
        }
        this.strategicState = 'ESCAPING';

        const escapeDecision = this.riskAssessment.calculateEscapeDecision(
          perceptionData.graph,
          perceptionData.currentPos,
          perceptionData.enemies,
          this.execution.getLastFacing(),
          perceptionData.terrains,
          this.recentPositions
        );

        if (escapeDecision.nextMove) {
          this.execution.setEscapePath(escapeDecision.escapePath);
          return escapeDecision.nextMove;
        }
      }

      // 2. RETOMADA DE COLETA/FINALIZAÇÃO APÓS AMEAÇA DIMINUIR (com margem +2.5 e permanência >= 600ms)
      if (this.strategicState === 'ESCAPING') {
        const escapeElapsed =
          this.escapeStartedAtSimTime === null
            ? 600
            : perceptionData.currentTime - this.escapeStartedAtSimTime;
        if (
          escapeElapsed >= 600 &&
          (!closestEnemy || minDistance > RiskAssessment.IMMEDIATE_THREAT_DISTANCE + 2.5)
        ) {
          this.execution.clearEscapePath();
          this.replan(perceptionData, true);
          const nextSteps = this.execution.getRemainingPath(perceptionData.currentPos).slice(1, 3);
          const leadsIntoThreat = nextSteps.some((step) =>
            activeEnemies.some(
              (e) =>
                Math.abs(step[0] - e.pos[0]) + Math.abs(step[1] - e.pos[1]) <=
                RiskAssessment.IMMEDIATE_THREAT_DISTANCE
            )
          );
          if (!leadsIntoThreat) {
            this.escapeStartedAtSimTime = null;
          }
        }
      }

      // 3. REPLANEJAMENTO PREVENTIVO (REPLANNING)
      // Se não está em fuga imediata, mas a rota planejada cruza zona de alto risco
      if (
        this.strategicState !== 'ESCAPING' &&
        closestEnemy &&
        minDistance <= RiskAssessment.CAUTION_THREAT_DISTANCE
      ) {
        const nowSim =
          perceptionData.currentTime;
        // Cooldown de replanejamento (anti-oscilação no tempo simulado)
        if (nowSim - this.lastReplanTimestamp >= GAME_SPEED_CONFIG.AGENT_REPLAN_COOLDOWN_MS) {
          const remainingPath = this.execution.getRemainingPath(perceptionData.currentPos);
          const riskMap = this.riskAssessment.buildRiskMap(
            perceptionData.graph,
            perceptionData.enemies,
            perceptionData.currentPos
          );

          // Verifica se algum vértice do trajeto restante possui risco severo
          let pathHasSevereRisk = false;
          for (const node of remainingPath) {
            const risk = riskMap.get(nodeToKey(node)) ?? 0;
            if (risk >= 15.0) {
              pathHasSevereRisk = true;
              break;
            }
          }

          if (pathHasSevereRisk) {
            this.strategicState = 'REPLANNING';
            this.replan(perceptionData, true);
          }
        }
      }
    } else {
      // Modo Demonstração (Sem Fantasmas Ativos)
      this.strategicState = perceptionData.remainingKeys.length === 0 ? 'FINISHING' : 'COLLECTING';
    }

    // =========================================================================
    // Execução do Movimento Ortogonal
    // =========================================================================
    let move = this.execution.getNextMove(perceptionData.currentPos, perceptionData.graph);

    // Se o movimento for nulo mas ainda não completou os objetivos, tenta replanejar
    if (move === null && (this.strategy === 'MAX_SURVIVAL_TIME' || !this.execution.isComplete(perceptionData.currentPos) ||
      (this.strategy === 'FULL_CLEAR' && perceptionData.pacDots?.size))) {
      const ok = this.replan(perceptionData);
      if (ok) {
        move = this.execution.getNextMove(perceptionData.currentPos, perceptionData.graph);
      }
    }

    if (move === null && !this.execution.isComplete(perceptionData.currentPos)) {
      this.state = 'FAILED';
      return null;
    }

    return move;
  }

  private computeSimulatedTime(currentSimTime?: number): number {
    if (this.executionStartSimulatedTime === null) return 0;
    const now = this.pauseStartSimulatedTime ?? (currentSimTime ?? this.lastSimulatedTime);
    const diff = now - this.executionStartSimulatedTime - this.totalPausedSimulatedMs;
    if (diff > 0) {
      return diff / 1000;
    }
    const realSec = this.computeRealTime();
    return Number((realSec * this.simulationSpeed).toFixed(2));
  }

  private computeRealTime(): number {
    if (this.executionStartRealTime === null) return 0;
    const now = this.pauseStartRealTime ?? Date.now();
    return Math.max(0, (now - this.executionStartRealTime - this.totalPausedRealMs) / 1000);
  }

  getMatchMetrics(perceptionData: AgentPerceptionData): MatchMetrics {
    const simTime = this.computeSimulatedTime(perceptionData.currentTime);
    const realTime = this.computeRealTime();
    const remainingDots = perceptionData.pacDots?.size ?? 0;
    const eatenDots = Math.max(0, this.initialPacDotsCount - remainingDots);
    const keysCount = perceptionData.collectedKeys?.size ?? 0;

    return {
      strategy: this.strategy,
      algorithm: this.algorithm,
      seed: this.matchSeed || (perceptionData.seed ?? 0),
      time: Number(simTime.toFixed(2)),
      simulatedTime: Number(simTime.toFixed(2)),
      realTime: Number(realTime.toFixed(2)),
      simulationSpeed: this.simulationSpeed,
      traversedCost: Number(this.traversedCost.toFixed(2)),
      score: perceptionData.score ?? 0,
      pacDots: eatenDots,
      keys: keysCount,
      moves: this.movesCount,
      nodesExpanded: this.totalNodesExpanded,
      replanCount: this.replanCount,
      outcome: this.matchOutcome,
    };
  }

  getStatusReport(perceptionData: AgentPerceptionData): AgentStatusReport {
    const plan = this.execution.getPlan();
    const objective = this.execution.getNextObjective(
      perceptionData.remainingKeys,
      perceptionData.goal
    );

    const simTime = this.computeSimulatedTime(perceptionData.currentTime);
    const realTime = this.computeRealTime();

    // Identifica inimigo mais perigoso
    let mostDangerousEnemy: { name: string; distance: number; danger: number } | null = null;
    let minD = Infinity;
    for (const e of perceptionData.enemies ?? []) {
      if (e.dangerLevel > 0.05 && e.graphDistance < minD) {
        minD = e.graphDistance;
        mostDangerousEnemy = {
          name: e.name,
          distance: e.graphDistance,
          danger: e.dangerLevel,
        };
      }
    }

    const matchMetrics = this.getMatchMetrics(perceptionData);

    return {
      controlMode: this.controlMode,
      autonomousMode: this.autonomousMode,
      state: this.state,
      strategicState: this.strategicState,
      algorithm: this.algorithm,
      strategy: this.strategy,
      matchMetrics,
      totalCost: plan?.totalCost ?? 0,
      totalNodesExpanded: plan?.totalNodesExpanded ?? 0,
      nextTarget: objective.target,
      targetDescription: objective.description,
      remainingObjectivesCount:
        perceptionData.remainingKeys.length + (this.state === 'COMPLETED' ? 0 : 1),
      currentStepIndex: this.execution.getCurrentStepIndex(),
      totalSteps: plan?.fullPath.length ? Math.max(0, plan.fullPath.length - 1) : 0,
      isExperimentalNoGhosts: this.autonomousMode === 'DEMO',
      elapsedExecutionTimeSec: simTime,
      survivalTimeSec: simTime,
      realExecutionTimeSec: realTime,
      simulationSpeed: this.simulationSpeed,
      replanCount: this.replanCount,
      mostDangerousEnemy,
      dangerNodesCount: this.currentRiskMap.size,
      isEscaping: this.strategicState === 'ESCAPING',
      escapePath: this.execution.getEscapePath() ?? [],
    };
  }
}
