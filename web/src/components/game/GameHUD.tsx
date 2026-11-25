import React from 'react';
import {
  Network,
  Route,
  X,
  Swords,
  FastForward,
  ChevronDown,
} from 'lucide-react';
import { GameStateSnapshot } from '../../game/core/GameState';
import { EventBus } from '../../game/core/EventBus';
import styles from './GameHUD.module.css';

interface Props {
  state: GameStateSnapshot | null;
  open: boolean;
  activeTab: 'setup' | 'follow';
  onTabChange: (tab: 'setup' | 'follow') => void;
  onClose: () => void;
}

const strategies: Record<string, string> = {
  MIN_COST: 'Menor custo',
  MIN_TIME: 'Menor tempo',
  SURVIVAL: 'Sobrevivência',
  MAX_SURVIVAL_TIME: 'Permanência máxima',
  MAX_SCORE: 'Maior pontuação',
  FULL_CLEAR: 'Coleta completa',
};

const states: Record<string, string> = {
  IDLE: 'Pronto para iniciar',
  PLANNING: 'Planejando rota',
  MOVING: 'Em movimento',
  PAUSED: 'Agente pausado',
  COMPLETED: 'Objetivo concluído',
  FAILED: 'Rota interrompida',
};

const decisions: Record<string, string> = {
  COLLECTING: 'Coletando chaves',
  ESCAPING: 'Evitando ameaça',
  REPLANNING: 'Recalculando caminho',
  FINISHING: 'Seguindo para a saída',
};

export const GameHUD: React.FC<Props> = ({
  state,
  open,
  activeTab,
  onTabChange,
  onClose,
}) => {
  if (!open || !state) return null;

  const action = (event: string, value?: string) => EventBus.emit(event, value);
  const auto = state.controlMode === 'AUTONOMOUS';
  const agent = state.agentStatus;
  const mvm = agent?.autonomousMode === 'MVM';
  const metrics = agent?.matchMetrics;

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Configurações e ferramentas do Arcade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <h2>{auto ? 'Configurações & Agente' : 'Configurações'}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar painel"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {auto && (
          <div className={styles.agentTabs} role="tablist" aria-label="Painel do agente">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'setup'}
              aria-pressed={activeTab === 'setup'}
              onClick={() => onTabChange('setup')}
            >
              Configuração
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'follow'}
              aria-pressed={activeTab === 'follow'}
              onClick={() => onTabChange('follow')}
            >
              Acompanhar
            </button>
          </div>
        )}

        <div className={styles.drawerBody}>
          {(!auto || activeTab === 'setup') ? (
            <div className={styles.sectionStack}>
              {auto && (
                <>
                  {/* Ambiente: Máquina vs. Máquina / Demonstração */}
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Ambiente</span>
                    <div className={styles.envGrid}>
                      <button
                        type="button"
                        aria-pressed={mvm}
                        onClick={() => action('ui-set-autonomous-mode', 'MVM')}
                        className={styles.envButton}
                      >
                        <Swords size={16} aria-hidden="true" />
                        <div className={styles.envText}>
                          <strong>Máquina vs. Máquina</strong>
                          <small>Fantasmas ativos</small>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-pressed={!mvm}
                        onClick={() => action('ui-set-autonomous-mode', 'DEMO')}
                        className={styles.envButton}
                      >
                        <Route size={16} aria-hidden="true" />
                        <div className={styles.envText}>
                          <strong>Demonstração</strong>
                          <small>Sem perseguição</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Estratégia */}
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Estratégia</span>
                    <select
                      aria-label="Estratégia do Pac-Man"
                      value={agent?.strategy ?? 'MIN_COST'}
                      onChange={(event) => action('ui-agent-set-strategy', event.target.value)}
                      className={styles.selectInput}
                    >
                      {Object.entries(strategies).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Algoritmo e Velocidade */}
                  <div className={styles.rowTwoCols}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Algoritmo</span>
                      <div className={styles.segmentedControl}>
                        {['A*', 'Dijkstra'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            aria-pressed={agent?.algorithm === val}
                            onClick={() => action('ui-agent-set-algorithm', val)}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>
                        <FastForward size={12} aria-hidden="true" /> Velocidade
                      </span>
                      <div className={styles.segmentedControl}>
                        {[0.5, 1, 2].map((val) => (
                          <button
                            key={val}
                            type="button"
                            aria-pressed={(state.simulationSpeed ?? 1) === val}
                            onClick={() => action('ui-set-simulation-speed', String(val))}
                          >
                            {val}×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggle de Rota Planejada */}
                  <button
                    type="button"
                    className={styles.routeToggleBtn}
                    aria-pressed={state.showAgentVisuals}
                    onClick={() => action('ui-agent-toggle-visuals')}
                  >
                    <Route size={15} aria-hidden="true" />
                    <span>Mostrar rota planejada</span>
                    <i className={styles.switchIndicator} aria-hidden="true" />
                  </button>
                </>
              )}

              {/* Ferramentas do Grafo Recolhíveis */}
              <details className={styles.graphToolsDetails} open={!auto}>
                <summary className={styles.graphToolsSummary}>
                  <span className={styles.graphToolsTitle}>
                    <Network size={15} aria-hidden="true" />
                    <span>Ferramentas do Grafo</span>
                  </span>
                  <ChevronDown size={15} className={styles.toolsChevron} aria-hidden="true" />
                </summary>
                <div className={styles.graphToolsBody}>
                  <p className={styles.hintText}>
                    {state.graphOrder} vértices · {state.graphSize} arcos · Dijkstra{' '}
                    {state.dijkstraNodesRealtime} / A* {state.aStarNodesRealtime} expandidos
                  </p>
                  <div className={styles.graphToolButtons}>
                    <button
                      type="button"
                      className={styles.smallToolBtn}
                      onClick={() => action('ui-start-solver', 'Dijkstra')}
                    >
                      Dijkstra
                    </button>
                    <button
                      type="button"
                      className={styles.smallToolBtn}
                      onClick={() => action('ui-start-solver', 'A*')}
                    >
                      A*
                    </button>
                    <button
                      type="button"
                      className={styles.smallToolBtn}
                      aria-pressed={state.graphXRayActive}
                      onClick={() => action('ui-toggle-xray')}
                    >
                      <Network size={13} aria-hidden="true" />
                      <span>Raio-X</span>
                    </button>
                    <button
                      type="button"
                      className={styles.smallToolBtn}
                      aria-pressed={state.aiPathActive}
                      onClick={() => action('ui-toggle-ai-path')}
                    >
                      <Route size={13} aria-hidden="true" />
                      <span>Rotas</span>
                    </button>
                    <button
                      type="button"
                      className={styles.smallToolBtn}
                      onClick={() => action('ui-clear-solver')}
                    >
                      <X size={13} aria-hidden="true" />
                      <span>Limpar</span>
                    </button>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className={styles.sectionStack}>
              <div className={styles.followHeader}>
                <span className={styles.fieldLabel}>Status da Execução</span>
                <span className={styles.agentStateBadge}>
                  {states[agent?.state ?? 'IDLE']}
                </span>
              </div>

              <dl className={styles.metricsGrid}>
                <div className={styles.metricItem}>
                  <dt>Próximo objetivo</dt>
                  <dd>{agent?.targetDescription || 'Aguardando plano'}</dd>
                </div>
                <div className={styles.metricItem}>
                  <dt>Decisão atual</dt>
                  <dd>{decisions[agent?.strategicState ?? ''] ?? 'Aguardando'}</dd>
                </div>
                <div className={styles.metricItem}>
                  <dt>Ameaça mais próxima</dt>
                  <dd>
                    {agent?.mostDangerousEnemy
                      ? `${agent.mostDangerousEnemy.name} · ${agent.mostDangerousEnemy.distance.toFixed(1)} dist.`
                      : 'Nenhuma ativa'}
                  </dd>
                </div>
                <div className={styles.metricItem}>
                  <dt>Progresso da rota</dt>
                  <dd>
                    {agent?.currentStepIndex ?? 0} / {agent?.totalSteps ?? 0}
                  </dd>
                </div>
              </dl>

              <details className={styles.telemetryDetails} open>
                <summary className={styles.telemetrySummary}>Métricas da execução</summary>
                <dl className={styles.telemetryGrid}>
                  {Object.entries({
                    'Semente': state.seed,
                    'Replanejamentos': agent?.replanCount ?? 0,
                    'Custo percorrido': metrics?.traversedCost.toFixed(2) ?? '0,00',
                    'Movimentos': metrics?.moves ?? 0,
                    'Vértices expandidos': metrics?.nodesExpanded ?? 0,
                    'Pac-Dots': metrics?.pacDots ?? 0,
                    'Chaves': `${metrics?.keys ?? 0} / ${state.totalKeys}`,
                    'Tempo simulado': `${(metrics?.simulatedTime ?? metrics?.time ?? 0).toFixed(1)} s`,
                    'Tempo real': `${(metrics?.realTime ?? metrics?.time ?? 0).toFixed(1)} s`,
                    'Resultado':
                      metrics?.outcome === 'WON'
                        ? 'Vitória'
                        : metrics?.outcome === 'LOST'
                        ? 'Derrota'
                        : metrics?.outcome === 'TIMEOUT'
                        ? 'Limite temporal'
                        : 'Em andamento',
                  }).map(([label, value]) => (
                    <div key={label} className={styles.telemetryItem}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
