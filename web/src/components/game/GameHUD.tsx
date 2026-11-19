import React from 'react';
import { GameStateSnapshot } from '../../game/core/GameState';
import { EventBus } from '../../game/core/EventBus';
import {
  Heart,
  KeyRound,
  RotateCcw,
  Shuffle,
  Pause,
  Play,
  Network,
  Route,
  X,
  User,
  Bot,
  Square,
  Sparkles,
  Swords,
  ShieldAlert,
  Compass,
  FastForward,
} from 'lucide-react';
import styles from './GameHUD.module.css';

interface GameHUDProps {
  state: GameStateSnapshot | null;
  onNewMaze: () => void;
  onRestartMaze: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ state, onNewMaze, onRestartMaze }) => {
  if (!state) return <div className={styles.loading} role="status">Preparando labirinto…</div>;

  const action = (event: string, value?: string) => EventBus.emit(event, value);
  const isAutonomous = state.controlMode === 'AUTONOMOUS';
  const agent = state.agentStatus;
  const isMvM = agent?.autonomousMode === 'MVM';

  const strategicLabels: Record<string, string> = {
    COLLECTING: 'Coleta de Chaves',
    ESCAPING: 'Evasão / Fuga Ativa',
    REPLANNING: 'Replanejamento',
    FINISHING: 'Rota para Saída',
  };

  return (
    <div className={styles.hud}>
      {/* Barra de Seleção de Modo Principal */}
      <div className={styles.modeBar}>
        <button
          className={`${styles.modeBtn} ${!isAutonomous ? styles.activeMode : ''}`}
          onClick={() => action('ui-set-control-mode', 'HUMAN')}
        >
          <User size={15} /> Modo Humano (Arcade)
        </button>
        <button
          className={`${styles.modeBtn} ${isAutonomous ? styles.activeModeAutonomous : ''}`}
          onClick={() => action('ui-set-control-mode', 'AUTONOMOUS')}
        >
          <Bot size={15} /> Pac-Man Autônomo
        </button>
      </div>

      {/* Topline com Métricas Principais da Partida */}
      <div className={styles.topline}>
        <div className={styles.stat}>
          <span>PONTUAÇÃO</span>
          <strong className={styles.score}>{state.score.toString().padStart(5, '0')}</strong>
        </div>
        <div className={styles.stat}>
          <span><Heart size={14} /> VIDA</span>
          <strong>{state.health}%</strong>
          <div className={styles.health}>
            <i style={{
              width: `${Math.max(0, Math.min(100, state.health))}%`,
              background: state.health > 40 ? '#55dca9' : '#ef6666',
            }} />
          </div>
        </div>
        <div className={styles.stat}>
          <span><KeyRound size={14} /> CHAVES</span>
          <strong>{state.keysCollected}<small> / {state.totalKeys}</small></strong>
        </div>
        <div className={styles.objective}>
          {state.gameStatus === 'COUNTDOWN' ? (
            <>
              <span style={{ color: '#facc15' }}>PREPARAÇÃO</span>
              <strong style={{ color: '#facc15' }}>Partida iniciando...</strong>
              <small>Começando em {Math.ceil(state.countdownRemainingSec ?? 3)}s</small>
            </>
          ) : (
            <>
              <span>OBJETIVO</span>
              <strong>{state.goalUnlocked ? 'Encontre a saída' : 'Encontre as chaves'}</strong>
              <small>
                {state.isGhostWaiting
                  ? `Fantasmas em espera · ${(state.ghostGraceRemainingSec ?? 2).toFixed(1)}s`
                  : isAutonomous
                    ? isMvM
                      ? 'Máquina vs. Máquina em andamento'
                      : 'Demonstração de rotas (sem fantasmas)'
                    : state.isFrightened
                      ? `Poder ativo · ${state.frightenedTimeRemaining.toFixed(1)}s`
                      : 'Desvie dos inimigos'}
              </small>
            </>
          )}
        </div>
        <button
          className={styles.pause}
          onClick={() => action('ui-toggle-pause')}
          aria-label={state.gameStatus === 'PAUSED' ? 'Retomar partida' : 'Pausar partida'}
        >
          {state.gameStatus === 'PAUSED' ? <Play size={17} /> : <Pause size={17} />}
          <span>{state.gameStatus === 'PAUSED' ? 'Retomar' : 'Pausar'}</span>
        </button>
      </div>

      {/* Painel do Pac-Man Autônomo */}
      {isAutonomous && (
        <div className={styles.agentPanel}>
          {/* Sub-Modo: Demonstração vs. Máquina vs. Máquina */}
          <div className={styles.subModeBar}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Execução:</span>
            <button
              className={`${styles.subModeBtn} ${isMvM ? styles.activeSubMode : ''}`}
              onClick={() => action('ui-set-autonomous-mode', 'MVM')}
            >
              <Swords size={13} /> Máquina vs. Máquina (Fantasmas Ativos)
            </button>
            <button
              className={`${styles.subModeBtn} ${!isMvM ? styles.activeSubMode : ''}`}
              onClick={() => action('ui-set-autonomous-mode', 'DEMO')}
            >
              <Sparkles size={13} /> Demonstração (Fantasmas Inativos)
            </button>
          </div>

          {/* Seletor de Estratégias Inteligentes */}
          <div className={styles.strategyBar}>
            <span className={styles.sectionLabel}><Compass size={13} /> Estratégia:</span>
            <button
              className={`${styles.strategyBtn} ${agent?.strategy === 'MIN_COST' ? styles.activeStrategy : ''}`}
              onClick={() => action('ui-agent-set-strategy', 'MIN_COST')}
              title="Minimiza o custo ponderado total das arestas"
            >
              Menor Custo
            </button>
            <button
              className={`${styles.strategyBtn} ${agent?.strategy === 'MIN_TIME' ? styles.activeStrategy : ''}`}
              onClick={() => action('ui-agent-set-strategy', 'MIN_TIME')}
              title="Minimiza o tempo estimado de conclusão (isomórfico ao menor custo)"
            >
              Menor Tempo
            </button>
            <button
              className={`${styles.strategyBtn} ${agent?.strategy === 'SURVIVAL' ? styles.activeStrategy : ''}`}
              onClick={() => action('ui-agent-set-strategy', 'SURVIVAL')}
              title="Prioriza segurança: evita lava, emboscadas e usa orbes defensivas"
            >
              Sobrevivência
            </button>
            <button
              className={`${styles.strategyBtn} ${agent?.strategy === 'MAX_SCORE' ? styles.activeStrategy : ''}`}
              onClick={() => action('ui-agent-set-strategy', 'MAX_SCORE')}
              title="Busca orbes, caça fantasmas vulneráveis e maximiza pontuação"
            >
              Pontuação Máx.
            </button>
            <button
              className={`${styles.strategyBtn} ${agent?.strategy === 'FULL_CLEAR' ? styles.activeStrategy : ''}`}
              onClick={() => action('ui-agent-set-strategy', 'FULL_CLEAR')}
              title="Coleta 100% dos Pac-Dots antes de finalizar, via heurística anti-fatorial"
            >
              Limpeza Total
            </button>
          </div>

          {/* Seletor de Velocidade da Simulação */}
          <div className={styles.speedBar}>
            <span className={styles.sectionLabel}><FastForward size={13} /> Velocidade da Simulação:</span>
            {[0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                className={`${styles.speedBtn} ${(state.simulationSpeed ?? 1.0) === spd ? styles.activeSpeedBtn : ''}`}
                onClick={() => action('ui-set-simulation-speed', spd.toString())}
                title={`Visualizar em velocidade ${spd}×`}
              >
                {spd}×
              </button>
            ))}
          </div>

          <div className={styles.agentNotice}>
            {isMvM ? (
              <>
                <ShieldAlert size={14} color="#f87171" />
                <span>Modo Máquina vs. Máquina:</span>
                <small>Fantasmas perseguem via A* com emboscada. Pac-Man avalia risco topológico e executa manobras de evasão.</small>
              </>
            ) : (
              <>
                <Sparkles size={14} color="#34d399" />
                <span>Demonstração de Planejamento de Rotas:</span>
                <small>Fantasmas dormentes. Demonstração de percurso ótimo sem pressão de inimigos.</small>
              </>
            )}
          </div>

          <div className={styles.agentBar}>
            <div className={styles.agentControls}>
              <span className={`${styles.agentStateBadge} ${styles['badge' + (agent?.state ?? 'IDLE')]}`}>
                {agent?.state ?? 'IDLE'}
              </span>

              {agent && (
                <span className={`${styles.agentStateBadge} ${styles['badge' + agent.strategicState]}`}>
                  {strategicLabels[agent.strategicState] ?? agent.strategicState}
                </span>
              )}

              {agent?.state === 'IDLE' && (
                <button className={styles.agentBtn} onClick={() => action('ui-agent-start')}>
                  <Play size={14} /> Iniciar
                </button>
              )}
              {agent?.state === 'MOVING' && (
                <button className={styles.agentBtn} onClick={() => action('ui-agent-pause')}>
                  <Pause size={14} /> Pausar
                </button>
              )}
              {agent?.state === 'PAUSED' && (
                <button className={styles.agentBtn} onClick={() => action('ui-agent-resume')}>
                  <Play size={14} /> Continuar
                </button>
              )}
              <button
                className={`${styles.agentBtn} ${styles.agentBtnStop}`}
                onClick={() => action('ui-agent-stop')}
                title="Interrompe o agente e devolve o controle ao jogador humano"
              >
                <Square size={14} /> Parar (Humano)
              </button>

              <button
                className={`${styles.agentBtn} ${agent?.algorithm === 'A*' ? styles.activeAlgo : ''}`}
                onClick={() => action('ui-agent-set-algorithm', 'A*')}
              >
                A*
              </button>
              <button
                className={`${styles.agentBtn} ${agent?.algorithm === 'Dijkstra' ? styles.activeAlgo : ''}`}
                onClick={() => action('ui-agent-set-algorithm', 'Dijkstra')}
              >
                Dijkstra
              </button>

              <button
                className={styles.agentBtn}
                onClick={() => action('ui-agent-toggle-visuals')}
                aria-pressed={state.showAgentVisuals}
              >
                <Route size={14} /> Rota {state.showAgentVisuals ? 'Ligada' : 'Desligada'}
              </button>
            </div>

            <div className={styles.mapActions}>
              <button onClick={onRestartMaze}><RotateCcw size={15} /> Reiniciar</button>
              <button onClick={onNewMaze}><Shuffle size={15} /> Novo mapa</button>
            </div>
          </div>

          {/* Telemetria e Métricas Matemáticas do Agente */}
          <div className={styles.agentMetrics}>
            <div className={styles.metricItem}>
              <span>Próximo Alvo</span>
              <strong className={styles.metricHighlight}>{agent?.targetDescription ?? '—'}</strong>
            </div>
            <div className={styles.metricItem}>
              <span>Ameaça Próxima</span>
              <strong className={agent?.mostDangerousEnemy ? styles.dangerHighlight : ''}>
                {agent?.mostDangerousEnemy
                  ? `${agent.mostDangerousEnemy.name} (${agent.mostDangerousEnemy.distance.toFixed(1)} nós)`
                  : 'Nenhuma ativa'}
              </strong>
            </div>
            <div className={styles.metricItem}>
              <span>Replanejamentos</span>
              <strong>{agent?.replanCount ?? 0}</strong>
            </div>
            <div className={styles.metricItem}>
              <span>Custo do Grafo</span>
              <strong>{agent?.totalCost ? agent.totalCost.toFixed(2) : '0.00'}</strong>
            </div>
            <div className={styles.metricItem}>
              <span>Sobrevivência</span>
              <strong>{agent?.survivalTimeSec ? `${agent.survivalTimeSec.toFixed(1)}s` : '0.0s'}</strong>
            </div>
            <div className={styles.metricItem}>
              <span>Progresso</span>
              <strong>{agent?.currentStepIndex ?? 0} / {agent?.totalSteps ?? 0}</strong>
            </div>
          </div>

          {/* Painel de Métricas Reais da Partida */}
          {agent?.matchMetrics && (
            <div className={styles.matchMetricsGrid}>
              <div className={styles.metricItem}>
                <span>Semente</span>
                <strong>#{agent.matchMetrics.seed}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Custo Percorrido</span>
                <strong className={styles.metricHighlight}>{agent.matchMetrics.traversedCost.toFixed(2)}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Passos / Movimentos</span>
                <strong>{agent.matchMetrics.moves}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Nós Expandidos</span>
                <strong>{agent.matchMetrics.nodesExpanded}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Pac-Dots</span>
                <strong>{agent.matchMetrics.pacDots}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Chaves</span>
                <strong>{agent.matchMetrics.keys} / {state.totalKeys}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Tempo Simulado</span>
                <strong>{(agent.matchMetrics.simulatedTime ?? agent.matchMetrics.time).toFixed(1)}s</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Tempo Real</span>
                <strong>{(agent.matchMetrics.realTime ?? agent.matchMetrics.time).toFixed(1)}s</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Resultado</span>
                <strong
                  className={
                    agent.matchMetrics.outcome === 'WON'
                      ? styles.metricOutcomeWon
                      : agent.matchMetrics.outcome === 'LOST'
                      ? styles.metricOutcomeLost
                      : styles.metricOutcomeProgress
                  }
                >
                  {agent.matchMetrics.outcome === 'WON'
                    ? 'Vitória'
                    : agent.matchMetrics.outcome === 'LOST'
                    ? 'Derrota'
                    : 'Em andamento'}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controles Tradicionais do Modo Humano */}
      {!isAutonomous && (
        <div className={styles.tools}>
          <p><kbd>W A S D</kbd> ou <kbd>setas</kbd> para mover <span>·</span> <kbd>P</kbd> pausa</p>
          <details className={styles.details}>
            <summary>Ferramentas do grafo <span>+</span></summary>
            <div className={styles.detailContent}>
              <p>
                {state.graphOrder} vértices · {state.graphSize} arcos · Dijkstra {state.dijkstraNodesRealtime} / A* {state.aStarNodesRealtime} expandidos
              </p>
              <div className={styles.toolButtons}>
                <button onClick={() => action('ui-start-solver', 'Dijkstra')}>Dijkstra <kbd>1</kbd></button>
                <button onClick={() => action('ui-start-solver', 'A*')}>A* <kbd>2</kbd></button>
                <button onClick={() => action('ui-toggle-xray')} aria-pressed={state.graphXRayActive}>
                  <Network size={15} /> Raio-X {state.graphXRayActive ? 'ligado' : 'desligado'}
                </button>
                <button onClick={() => action('ui-toggle-ai-path')} aria-pressed={state.aiPathActive}>
                  <Route size={15} /> Rotas {state.aiPathActive ? 'ligadas' : 'desligadas'}
                </button>
                <button onClick={() => action('ui-clear-solver')}><X size={15} /> Limpar</button>
              </div>
            </div>
          </details>
          <div className={styles.mapActions}>
            <button onClick={onRestartMaze}><RotateCcw size={15} /> Reiniciar</button>
            <button onClick={onNewMaze}><Shuffle size={15} /> Novo mapa</button>
          </div>
        </div>
      )}
    </div>
  );
};
