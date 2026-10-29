import React, { useState } from 'react';
import { EventBus } from '../../game/core/EventBus';
import { LabDisplayMode } from '../../game/scenes/GraphLabScene';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  Network,
  Grid,
  RefreshCw,
} from 'lucide-react';
import styles from './Laboratory.module.css';

interface SearchControlsProps {
  algorithm: 'Dijkstra' | 'A*' | 'Multi-Goal';
  displayMode: LabDisplayMode;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  onSelectAlgorithm: (algo: 'Dijkstra' | 'A*' | 'Multi-Goal') => void;
  onSelectDisplayMode: (mode: LabDisplayMode) => void;
  onNewGraph: (seed?: number) => void;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  algorithm,
  displayMode,
  isPlaying,
  currentStep,
  totalSteps,
  onSelectAlgorithm,
  onSelectDisplayMode,
  onNewGraph,
}) => {
  const [speed, setSpeed] = useState<number>(5);
  const [seedInput, setSeedInput] = useState<string>('42');

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = parseInt(e.target.value, 10);
    setSpeed(s);
    EventBus.emit('lab-set-speed', s);
  };

  const handleGenerateSeed = () => {
    const s = parseInt(seedInput, 10);
    onNewGraph(isNaN(s) ? undefined : s);
  };

  const handleRandomSeed = () => {
    const rand = Math.floor(Math.random() * 900000 + 100000);
    setSeedInput(rand.toString());
    onNewGraph(rand);
  };

  return (
    <div className={styles.controlsCard}>
      {/* 1. Seleção de Algoritmo */}
      <div className={styles.controlGroup}>
        <span className={styles.groupLabel}>Algoritmo de Busca:</span>
        <div className={styles.algoButtonGroup}>
          <button
            className={`${styles.algoBtn} ${algorithm === 'A*' ? styles.algoBtnActive : ''}`}
            onClick={() => onSelectAlgorithm('A*')}
          >
            A* (Manhattan)
          </button>
          <button
            className={`${styles.algoBtn} ${algorithm === 'Dijkstra' ? styles.algoBtnActive : ''}`}
            onClick={() => onSelectAlgorithm('Dijkstra')}
          >
            Dijkstra
          </button>
          <button
            className={`${styles.algoBtn} ${algorithm === 'Multi-Goal' ? styles.algoBtnActive : ''}`}
            onClick={() => onSelectAlgorithm('Multi-Goal')}
          >
            Multi-Goal (Chaves)
          </button>
        </div>
      </div>

      {/* 2. Modo de Exibição */}
      <div className={styles.controlGroup}>
        <span className={styles.groupLabel}>Modo de Renderização:</span>
        <div className={styles.modeButtonGroup}>
          <button
            className={`${styles.modeBtn} ${displayMode === 'OVERLAY' ? styles.modeBtnActive : ''}`}
            onClick={() => onSelectDisplayMode('OVERLAY')}
            title="Sobreposição de labirinto e grafo"
          >
            <Layers size={14} /> Sobreposição
          </button>
          <button
            className={`${styles.modeBtn} ${displayMode === 'GRAPH' ? styles.modeBtnActive : ''}`}
            onClick={() => onSelectDisplayMode('GRAPH')}
            title="Apenas rede topológica do grafo"
          >
            <Network size={14} /> Grafo Puro
          </button>
          <button
            className={`${styles.modeBtn} ${displayMode === 'MAZE' ? styles.modeBtnActive : ''}`}
            onClick={() => onSelectDisplayMode('MAZE')}
            title="Apenas labirinto geométrico"
          >
            <Grid size={14} /> Labirinto
          </button>
        </div>
      </div>

      {/* 3. Controles Passo-a-Passo */}
      <div className={styles.controlGroup}>
        <div className={styles.stepProgressHeader}>
          <span className={styles.groupLabel}>Visualização Progressiva:</span>
          <span className={styles.stepCounter}>
            {currentStep} / {totalSteps} passos
          </span>
        </div>

        <div className={styles.playbackRow}>
          {isPlaying ? (
            <button
              className={styles.playBtn}
              onClick={() => EventBus.emit('lab-pause')}
              title="Pausar busca"
            >
              <Pause size={16} /> Pausar
            </button>
          ) : (
            <button
              className={styles.playBtn}
              onClick={() => EventBus.emit('lab-play')}
              title="Executar busca progressiva"
            >
              <Play size={16} /> Executar
            </button>
          )}

          <button
            className={styles.stepBtn}
            onClick={() => EventBus.emit('lab-step')}
            title="Avançar 1 nó na fila de prioridade"
          >
            <SkipForward size={16} /> Passo
          </button>

          <button
            className={styles.stepBtn}
            onClick={() => EventBus.emit('lab-reset-search')}
            title="Reiniciar animação"
          >
            <RotateCcw size={16} /> Reiniciar
          </button>
        </div>

        {/* Slider de Velocidade */}
        <div className={styles.speedRow}>
          <span className={styles.speedLabel}>Velocidade: {speed}x</span>
          <input
            type="range"
            min="1"
            max="25"
            value={speed}
            onChange={handleSpeedChange}
            className={styles.speedSlider}
          />
        </div>
      </div>

      {/* 4. Semente e Novo Grafo */}
      <div className={styles.controlGroup}>
        <span className={styles.groupLabel}>Geração Determinística (PRNG Seed):</span>
        <div className={styles.seedInputRow}>
          <input
            type="number"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            className={styles.seedField}
            placeholder="Semente..."
          />
          <button className={styles.seedBtn} onClick={handleGenerateSeed} title="Recriar grafo com esta semente">
            Carregar
          </button>
          <button className={styles.randomBtn} onClick={handleRandomSeed} title="Gerar semente aleatória">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className={styles.interactivityTip}>
        <strong>Interatividade no Mapa:</strong> Clique com o botão esquerdo para alterar a <em>Origem (S)</em>. Pressione <em>Shift + Clique</em> para alterar o <em>Destino (T)</em>!
      </div>
    </div>
  );
};
