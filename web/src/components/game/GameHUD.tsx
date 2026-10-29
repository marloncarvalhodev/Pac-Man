import React from 'react';
import { GameStateSnapshot } from '../../game/core/GameState';
import { EventBus } from '../../game/core/EventBus';
import { Heart, KeyRound, RotateCcw, Shuffle, Pause, Play, Network, Route, X } from 'lucide-react';
import styles from './GameHUD.module.css';

interface GameHUDProps { state: GameStateSnapshot | null; onNewMaze: () => void; onRestartMaze: () => void; }
export const GameHUD: React.FC<GameHUDProps> = ({ state, onNewMaze, onRestartMaze }) => {
  if (!state) return <div className={styles.loading} role="status">Preparando labirinto…</div>;
  const action = (event: string, value?: string) => EventBus.emit(event, value);
  return (
    <div className={styles.hud}>
      <div className={styles.topline}>
        <div className={styles.stat}><span>PONTUAÇÃO</span><strong className={styles.score}>{state.score.toString().padStart(5,'0')}</strong></div>
        <div className={styles.stat}><span><Heart size={14}/> VIDA</span><strong>{state.health}%</strong><div className={styles.health}><i style={{width:`${Math.max(0,Math.min(100,state.health))}%`,background:state.health>40?'#55dca9':'#ef6666'}}/></div></div>
        <div className={styles.stat}><span><KeyRound size={14}/> CHAVES</span><strong>{state.keysCollected}<small> / {state.totalKeys}</small></strong></div>
        <div className={styles.objective}><span>OBJETIVO</span><strong>{state.goalUnlocked?'Encontre a saída':'Encontre as chaves'}</strong><small>{state.isFrightened ? `Poder ativo · ${state.frightenedTimeRemaining.toFixed(1)}s` : 'Desvie dos inimigos'}</small></div>
        <button className={styles.pause} onClick={() => action('ui-toggle-pause')} aria-label={state.gameStatus === 'PAUSED' ? 'Retomar partida' : 'Pausar partida'}>{state.gameStatus === 'PAUSED'?<Play size={17}/>:<Pause size={17}/>}<span>{state.gameStatus === 'PAUSED'?'Retomar':'Pausar'}</span></button>
      </div>
      <div className={styles.tools}>
        <p><kbd>W A S D</kbd> ou <kbd>setas</kbd> para mover <span>·</span> <kbd>P</kbd> pausa</p>
        <details className={styles.details}>
          <summary>Ferramentas do grafo <span>+</span></summary>
          <div className={styles.detailContent}>
            <p>{state.graphOrder} vértices · {state.graphSize} arcos · Dijkstra {state.dijkstraNodesRealtime} / A* {state.aStarNodesRealtime} expandidos</p>
            <div className={styles.toolButtons}>
              <button onClick={() => action('ui-start-solver','Dijkstra')}>Dijkstra <kbd>1</kbd></button><button onClick={() => action('ui-start-solver','A*')}>A* <kbd>2</kbd></button>
              <button onClick={() => action('ui-toggle-xray')} aria-pressed={state.graphXRayActive}><Network size={15}/> Raio-X {state.graphXRayActive?'ligado':'desligado'}</button>
              <button onClick={() => action('ui-toggle-ai-path')} aria-pressed={state.aiPathActive}><Route size={15}/> Rotas {state.aiPathActive?'ligadas':'desligadas'}</button>
              <button onClick={() => action('ui-clear-solver')}><X size={15}/> Limpar</button>
            </div>
          </div>
        </details>
        <div className={styles.mapActions}><button onClick={onRestartMaze}><RotateCcw size={15}/> Reiniciar</button><button onClick={onNewMaze}><Shuffle size={15}/> Novo mapa</button></div>
      </div>
    </div>
  );
};
