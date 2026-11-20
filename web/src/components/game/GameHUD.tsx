import React, { useState } from 'react';
import { Heart, KeyRound, RotateCcw, Shuffle, Pause, Play, Network, Route, X, User, Bot, Square, Swords, Compass, FastForward } from 'lucide-react';
import { GameStateSnapshot } from '../../game/core/GameState';
import { EventBus } from '../../game/core/EventBus';
import styles from './GameHUD.module.css';

interface Props { state: GameStateSnapshot | null; onNewMaze: () => void; onRestartMaze: () => void }
const strategies = { MIN_COST: 'Menor custo', MIN_TIME: 'Menor tempo', SURVIVAL: 'Sobrevivência', MAX_SCORE: 'Maior pontuação', FULL_CLEAR: 'Coleta completa' };
const states: Record<string, string> = { IDLE:'Pronto para iniciar', PLANNING:'Planejando rota', MOVING:'Em movimento', PAUSED:'Agente pausado', COMPLETED:'Objetivo concluído', FAILED:'Rota interrompida' };
const decisions: Record<string, string> = { COLLECTING:'Coletando chaves', ESCAPING:'Evitando ameaça', REPLANNING:'Recalculando caminho', FINISHING:'Seguindo para a saída' };
export const GameHUD: React.FC<Props> = ({ state, onNewMaze, onRestartMaze }) => {
  const [agentView, setAgentView] = useState<'setup'|'follow'>('setup');
  if (!state) return <p className={styles.loading} role="status">Preparando labirinto.</p>;
  const action = (event: string, value?: string) => EventBus.emit(event, value);
  const auto = state.controlMode === 'AUTONOMOUS', agent = state.agentStatus, mvm = agent?.autonomousMode === 'MVM';
  const metrics = agent?.matchMetrics;
  return <div className={styles.hud}>
    <div className={styles.modeBar} role="group" aria-label="Controle do Pac-Man">
      <button aria-pressed={!auto} onClick={() => action('ui-set-control-mode','HUMAN')}><User size={17} /> Modo Humano (Arcade)</button>
      <button aria-pressed={auto} onClick={() => action('ui-set-control-mode','AUTONOMOUS')}><Bot size={17} /> Pac-Man Autônomo</button>
    </div>
    <section className={styles.scoreboard} aria-label="Estado da partida">
      <div className={styles.stats}>
        <div><span>Pontuação</span><strong className={styles.score}>{String(state.score).padStart(5,'0')}</strong></div>
        <div><span><Heart size={13}/> Vida</span><strong>{state.health}%</strong><div className={styles.health}><i style={{width:`${Math.max(0,Math.min(100,state.health))}%`,background:state.health>40?'#91c79a':'#ef8989'}}/></div></div>
        <div><span><KeyRound size={13}/> Chaves</span><strong>{state.keysCollected}<small> / {state.totalKeys}</small></strong></div>
      </div>
      <div className={styles.objective}>
        <div><span>{state.gameStatus === 'COUNTDOWN' ? 'Preparação' : 'Objetivo da partida'}</span>
          <strong>{state.gameStatus === 'COUNTDOWN' ? 'Partida iniciando…' : state.goalUnlocked ? 'Encontre a saída' : 'Encontre as chaves'}</strong>
          <small>{state.gameStatus === 'COUNTDOWN' ? `Começando em ${Math.ceil(state.countdownRemainingSec ?? 3)}s` : state.isGhostWaiting ? `Fantasmas em espera · ${(state.ghostGraceRemainingSec ?? 2).toFixed(1)}s` : state.isFrightened ? `Poder ativo · ${state.frightenedTimeRemaining.toFixed(1)}s` : auto ? mvm ? 'Fantasmas ativos' : 'Demonstração sem perseguição' : 'Desvie dos fantasmas'}</small>
        </div>
        <button className={styles.iconButton} aria-label={state.gameStatus === 'PAUSED' ? 'Retomar partida' : 'Pausar partida'} onClick={() => action('ui-toggle-pause')}>{state.gameStatus === 'PAUSED' ? <Play size={17}/> : <Pause size={17}/>}</button>
      </div>
    </section>
    {auto ? <>
      <div className={styles.agentTabs} role="group" aria-label="Painel do agente">
        <button aria-pressed={agentView === 'setup'} onClick={() => setAgentView('setup')}>Configuração</button>
        <button aria-pressed={agentView === 'follow'} onClick={() => setAgentView('follow')}>Acompanhar</button>
      </div>
      <div className={styles.optionPanel} key={agentView}>
      {agentView === 'setup' ? <>
      <section className={styles.settings} aria-label="Configuração do agente">
        <h2><Compass size={16}/> Configurar agente</h2>
        <fieldset><legend>Ambiente</legend><div className={styles.environments}>
          <button aria-label="Máquina vs. Máquina (Fantasmas Ativos)" aria-pressed={mvm} onClick={() => action('ui-set-autonomous-mode','MVM')}><Swords size={17}/><span><strong>Máquina × máquina</strong><small>Fantasmas ativos</small></span></button>
          <button aria-label="Demonstração (Fantasmas Inativos)" aria-pressed={!mvm} onClick={() => action('ui-set-autonomous-mode','DEMO')}><Route size={17}/><span><strong>Demonstração</strong><small>Fantasmas inativos</small></span></button>
        </div></fieldset>
        <label className={styles.field}>Estratégia<select aria-label="Estratégia do Pac-Man" value={agent?.strategy ?? 'MIN_COST'} onChange={event => action('ui-agent-set-strategy',event.target.value)}>{Object.entries(strategies).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div className={styles.settingColumns}>
          <fieldset><legend>Algoritmo</legend><div className={styles.segment}>{['A*','Dijkstra'].map(value => <button key={value} aria-pressed={agent?.algorithm === value} onClick={() => action('ui-agent-set-algorithm',value)}>{value}</button>)}</div></fieldset>
          <fieldset><legend><FastForward size={13}/> Reprodução</legend><div className={styles.segment}>{[0.5,1,2].map(value => <button key={value} aria-pressed={(state.simulationSpeed ?? 1) === value} onClick={() => action('ui-set-simulation-speed',String(value))}>{value}×</button>)}</div></fieldset>
        </div>
        <button className={styles.routeToggle} aria-pressed={state.showAgentVisuals} onClick={() => action('ui-agent-toggle-visuals')}><Route size={15}/><span>Mostrar rota planejada</span><i aria-hidden="true"/></button>
        <p className={styles.hint}>{mvm ? 'O agente considera ameaças e pode replanejar a rota. Nenhuma estratégia garante a vitória.' : 'Observe o planejamento sem perseguição. Coleta e pontuação usam aproximações.'}</p>
      </section>
      </> : <>
      <section className={styles.execution} aria-label="Execução do agente">
        <div className={styles.executionTitle}><h2>Execução</h2><span>{states[agent?.state ?? 'IDLE']}</span></div>
        <div className={styles.runActions}>
          {(!agent || agent.state === 'IDLE') && <button className={styles.primary} onClick={() => action('ui-agent-start')}><Play size={15}/> Iniciar agente</button>}
          {agent?.state === 'MOVING' && <button className={styles.primary} onClick={() => action('ui-agent-pause')}><Pause size={15}/> Pausar agente</button>}
          {agent?.state === 'PAUSED' && <button className={styles.primary} onClick={() => action('ui-agent-resume')}><Play size={15}/> Continuar</button>}
          <button onClick={() => action('ui-agent-stop')}><Square size={14}/> Parar (Humano)</button>
        </div>
        <dl className={styles.liveMetrics}><div><dt>Próximo objetivo</dt><dd>{agent?.targetDescription || 'Aguardando plano'}</dd></div><div><dt>Decisão atual</dt><dd>{decisions[agent?.strategicState ?? ''] ?? 'Aguardando'}</dd></div><div><dt>Ameaça mais próxima</dt><dd>{agent?.mostDangerousEnemy ? `${agent.mostDangerousEnemy.name} · ${agent.mostDangerousEnemy.distance.toFixed(1)} no grafo` : 'Nenhuma ativa'}</dd></div><div><dt>Progresso da rota</dt><dd>{agent?.currentStepIndex ?? 0} / {agent?.totalSteps ?? 0}</dd></div></dl>
        <details className={styles.telemetry}><summary>Métricas da execução</summary><dl className={styles.liveMetrics}>
          {Object.entries({ 'Semente': state.seed, 'Replanejamentos': agent?.replanCount ?? 0, 'Custo percorrido':metrics?.traversedCost.toFixed(2) ?? '0,00', 'Movimentos':metrics?.moves ?? 0, 'Vértices expandidos':metrics?.nodesExpanded ?? 0, 'Pac-Dots':metrics?.pacDots ?? 0, 'Chaves':`${metrics?.keys ?? 0} / ${state.totalKeys}`, 'Tempo simulado':`${(metrics?.simulatedTime ?? metrics?.time ?? 0).toFixed(1)} s`, 'Tempo real':`${(metrics?.realTime ?? metrics?.time ?? 0).toFixed(1)} s`, 'Resultado':metrics?.outcome === 'WON' ? 'Vitória' : metrics?.outcome === 'LOST' ? 'Derrota' : 'Em andamento' }).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl></details>
      </section>
      </>}
      </div>
    </> : <section className={styles.tools} aria-label="Controles e visualização"><p><kbd>W A S D</kbd> ou <kbd>setas</kbd> para mover · <kbd>P</kbd> pausa</p>
      <details><summary>Ferramentas do grafo</summary><p className={styles.hint}>{state.graphOrder} vértices · {state.graphSize} arcos · Dijkstra {state.dijkstraNodesRealtime} / A* {state.aStarNodesRealtime} expandidos</p>
        <div className={styles.toolButtons}><button onClick={() => action('ui-start-solver','Dijkstra')}>Dijkstra</button><button onClick={() => action('ui-start-solver','A*')}>A*</button><button aria-pressed={state.graphXRayActive} onClick={() => action('ui-toggle-xray')}><Network size={14}/> Raio-X</button><button aria-pressed={state.aiPathActive} onClick={() => action('ui-toggle-ai-path')}><Route size={14}/> Rotas</button><button onClick={() => action('ui-clear-solver')}><X size={14}/> Limpar</button></div>
      </details></section>}
    <div className={styles.mapActions}><button onClick={onRestartMaze}><RotateCcw size={15}/> Reiniciar</button><button onClick={onNewMaze}><Shuffle size={15}/> Novo mapa</button></div>
  </div>;
};
