import React, { useState } from 'react';
import { EventBus } from '../../game/core/EventBus';
import { LabDisplayMode } from '../../game/scenes/GraphLabScene';
import styles from './Laboratory.module.css';

interface Props {
  algorithm: 'Dijkstra' | 'A*' | 'Multi-Goal';
  displayMode: LabDisplayMode;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  onSelectAlgorithm: (algorithm: 'Dijkstra' | 'A*' | 'Multi-Goal') => void;
  onSelectDisplayMode: (mode: LabDisplayMode) => void;
}
export const SearchControls: React.FC<Props> = ({ algorithm, displayMode, isPlaying, currentStep, totalSteps, onSelectAlgorithm, onSelectDisplayMode }) => {
  const [speed, setSpeed] = useState(5);
  return <div className={styles.toolbar}>
    <div className={styles.group}><span className={styles.label}>Algoritmo</span><div className={styles.segment} role="group" aria-label="Algoritmo">{([['Dijkstra','Dijkstra'],['A*','A*'],['Multi-Goal','Multiobjetivo']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={algorithm === value} onClick={() => onSelectAlgorithm(value)}>{label}</button>)}</div></div>
    <div className={styles.group}><span className={styles.label}>Visualização</span><div className={styles.segment} role="group" aria-label="Visualização">{([['MAZE','Labirinto'],['GRAPH','Grafo'],['OVERLAY','Sobreposição']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={displayMode === value} onClick={() => onSelectDisplayMode(value)}>{label}</button>)}</div></div>
    <div className={`${styles.group} ${styles.playback}`}><span className={styles.label}>Reprodução <span className={styles.progress}>{currentStep} / {totalSteps} passos</span></span><div className={styles.playRow}><button className={styles.primary} type="button" onClick={() => EventBus.emit(isPlaying ? 'lab-pause' : 'lab-play')}>{isPlaying ? 'Pausar' : 'Executar'}</button><button type="button" onClick={() => EventBus.emit('lab-step')}>Próximo passo</button><button type="button" onClick={() => EventBus.emit('lab-reset-search')}>Reiniciar busca</button><label className={styles.speed}>Velocidade <output>{speed}</output><input aria-label="Velocidade da reprodução" type="range" min="1" max="25" value={speed} onChange={e => { const value = Number(e.target.value); setSpeed(value); EventBus.emit('lab-set-speed', value); }}/></label></div></div>
  </div>;
};
