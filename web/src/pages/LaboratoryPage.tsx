import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  HelpCircle,
  X,
  Crosshair,
  BarChart3,
  Shuffle,
} from 'lucide-react';
import { PhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/core/EventBus';
import { LabDisplayMode } from '../game/scenes/GraphLabScene';
import { PathfindingResult } from '../game/algorithms/PathfindingTypes';
import { VertexInspectionData } from '../game/core/GameState';
import { AlgorithmComparison } from '../components/laboratory/AlgorithmComparison';
import { VertexInspector } from '../components/laboratory/VertexInspector';
import { EducationalPanel } from '../components/laboratory/EducationalPanel';
import styles from './LaboratoryPage.module.css';

export const LaboratoryPage: React.FC = () => {
  const [activeDrawer, setActiveDrawer] = useState<'results' | 'cells' | 'help' | null>(null);
  const [algorithm, setAlgorithm] = useState<'Dijkstra' | 'A*' | 'Multi-Goal'>('A*');
  const [displayMode, setDisplayMode] = useState<LabDisplayMode>('MAZE');
  const [includeRisk, setIncludeRisk] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [dijkstraRes, setDijkstraRes] = useState<PathfindingResult | null>(null);
  const [astarRes, setAstarRes] = useState<PathfindingResult | null>(null);
  const [activeResult, setActiveResult] = useState<PathfindingResult | null>(null);
  const [gainPercent, setGainPercent] = useState(0);
  const [inspectedVertex, setInspectedVertex] = useState<VertexInspectionData | null>(null);
  const [seedInput, setSeedInput] = useState('42');
  const [target, setTarget] = useState<'start' | 'goal' | 'inspect'>('start');
  const [row, setRow] = useState('');
  const [column, setColumn] = useState('');
  const [coordinateMessage, setCoordinateMessage] = useState('');

  useEffect(() => {
    const comparison = (data: {
      dijkstra: PathfindingResult;
      astar: PathfindingResult;
      gainPercent: number;
      activeResult: PathfindingResult;
    }) => {
      setDijkstraRes(data.dijkstra);
      setAstarRes(data.astar);
      setGainPercent(data.gainPercent);
      setActiveResult(data.activeResult);
      setTotalSteps(data.activeResult.visitedOrder.length);
      setCurrentStep(0);
    };
    const progress = (data: { currentStep: number; totalSteps: number; isPlaying: boolean }) => {
      setCurrentStep(data.currentStep);
      setTotalSteps(data.totalSteps);
      setIsPlaying(data.isPlaying);
    };
    const inspect = (data: VertexInspectionData) => setInspectedVertex(data);
    const coordinateStatus = (valid: boolean) =>
      setCoordinateMessage(valid ? 'Célula selecionada.' : 'Escolha uma célula transitável entre 0 e 24.');

    EventBus.on('lab-comparison-ready', comparison);
    EventBus.on('lab-search-progress', progress);
    EventBus.on('vertex-inspected', inspect);
    EventBus.on('lab-coordinate-status', coordinateStatus);

    return () => {
      EventBus.off('lab-comparison-ready', comparison);
      EventBus.off('lab-search-progress', progress);
      EventBus.off('vertex-inspected', inspect);
      EventBus.off('lab-coordinate-status', coordinateStatus);
    };
  }, []);

  useEffect(() => {
    if (!activeDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDrawer(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer]);

  const loadSeed = (seed: number) => {
    if (!Number.isFinite(seed)) return;
    setSeedInput(String(seed));
    setInspectedVertex(null);
    EventBus.emit('lab-new-graph', seed);
  };

  const selectAlgorithm = (next: 'Dijkstra' | 'A*' | 'Multi-Goal') => {
    setAlgorithm(next);
    EventBus.emit('lab-select-algorithm', next);
  };

  const selectDisplayMode = (mode: LabDisplayMode) => {
    setDisplayMode(mode);
    EventBus.emit('lab-set-mode', mode);
  };

  const toggleRisk = () => {
    const next = !includeRisk;
    setIncludeRisk(next);
    EventBus.emit('lab-ghost-risk', next);
  };

  const observations =
    algorithm === 'Dijkstra'
      ? [
          'Prioriza o menor custo acumulado conhecido.',
          'Expande vértices conforme a fila de prioridade.',
        ]
      : algorithm === 'A*'
      ? [
          'Combina custo acumulado e uma estimativa heurística até o destino.',
          'Pode reduzir expansões sem necessariamente reduzir o tempo computacional.',
        ]
      : [
          'Planeja a visita às chaves antes da saída.',
          'Avalia a ordem de coleta e os custos dos segmentos.',
        ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1>Laboratório de Grafos</h1>
            <p>Explore e compare algoritmos de busca.</p>
          </div>
          <button
            type="button"
            className={styles.helpBtn}
            onClick={() => setActiveDrawer('help')}
            aria-label="Ajuda e legenda"
            title="Ajuda e legenda"
          >
            <HelpCircle size={18} aria-hidden="true" />
            <span>Ajuda</span>
          </button>
        </header>

        <div className={styles.workspace}>
          {/* Coluna do Tabuleiro (sem container envolvente) */}
          <section className={styles.boardColumn} aria-label="Visualização do grafo">
            <div className={styles.displaySegment} role="group" aria-label="Visualização">
              {(
                [
                  ['MAZE', 'Labirinto'],
                  ['GRAPH', 'Grafo'],
                  ['OVERLAY', 'Sobreposição'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={displayMode === value}
                  onClick={() => selectDisplayMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.canvasFrame}>
              <PhaserGame sceneType="GraphLabScene" />
            </div>

            <div className={styles.playbackToolbar} aria-label="Controles de execução da busca">
              <div className={styles.playbackActions}>
                <button
                  type="button"
                  className={styles.primaryExecBtn}
                  onClick={() => EventBus.emit(isPlaying ? 'lab-pause' : 'lab-play')}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={18} aria-hidden="true" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} aria-hidden="true" />
                      <span>Executar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={styles.secondaryExecBtn}
                  onClick={() => EventBus.emit('lab-step')}
                >
                  <SkipForward size={18} aria-hidden="true" />
                  <span>Próximo passo</span>
                </button>

                <button
                  type="button"
                  className={styles.secondaryExecBtn}
                  onClick={() => EventBus.emit('lab-reset-search')}
                >
                  <RotateCcw size={18} aria-hidden="true" />
                  <span>Reiniciar</span>
                </button>
              </div>

              <div className={styles.progressStatus} aria-label="Progresso da busca">
                <span className={styles.progressLabel}>Passos</span>
                <strong className={styles.progressValue}>
                  {currentStep} / {totalSteps}
                </strong>
              </div>
            </div>

            <div className={styles.legend} aria-label="Legenda do grafo">
              <span>
                <i className={styles.start} />
                Origem
              </span>
              <span>
                <i className={styles.goal} />
                Destino
              </span>
              <span>
                <i className={styles.path} />
                Caminho
              </span>
              <span>
                <i className={styles.expanded} />
                Expandidos
              </span>
              <span>
                <i className={styles.portal} />
                Portais
              </span>
            </div>
          </section>

          {/* Painel Direito: única superfície #111725, borda 1px, radius 10px, padding 20px */}
          <aside className={styles.sidePanel} aria-label="Configuração e resultados">
            <h2 className={styles.panelTitle}>Configuração da busca</h2>

            <div className={styles.fieldGroup}>
              <label htmlFor="lab-seed" className={styles.fieldLabel}>
                Semente
              </label>
              <div className={styles.seedGroup}>
                <input
                  id="lab-seed"
                  aria-label="Semente do laboratório"
                  type="number"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.seedBtn}
                  onClick={() => {
                    if (seedInput.trim()) loadSeed(Number(seedInput));
                  }}
                >
                  Carregar
                </button>
                <button
                  type="button"
                  className={styles.seedIconBtn}
                  onClick={() => loadSeed(Math.floor(Math.random() * 900000 + 100000))}
                  aria-label="Gerar novo mapa"
                  title="Gerar novo mapa"
                >
                  <Shuffle size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Algoritmo</span>
              <select
                aria-label="Algoritmo"
                className={styles.selectInput}
                value={algorithm}
                onChange={(e) => selectAlgorithm(e.target.value as 'Dijkstra' | 'A*' | 'Multi-Goal')}
              >
                <option value="Dijkstra">Dijkstra</option>
                <option value="A*">A*</option>
                <option value="Multi-Goal">Multiobjetivo</option>
              </select>
            </label>

            <button
              type="button"
              className={styles.switchRow}
              role="switch"
              aria-checked={includeRisk}
              onClick={toggleRisk}
            >
              <span>Incluir risco dos fantasmas</span>
              <i className={styles.switchTrack} aria-hidden="true" />
            </button>

            <label className={styles.speedRow}>
              <div className={styles.speedHeader}>
                <span className={styles.fieldLabel}>Velocidade</span>
                <output className={styles.speedValue}>{speed}×</output>
              </div>
              <input
                aria-label="Velocidade da reprodução"
                type="range"
                min="1"
                max="25"
                value={speed}
                className={styles.rangeInput}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setSpeed(value);
                  EventBus.emit('lab-set-speed', value);
                }}
              />
            </label>

            <hr className={styles.divider} />

            <h2 className={styles.panelTitle}>Resultados</h2>

            <div className={styles.quickResults}>
              <div>
                <span>Custo da rota</span>
                <strong>{activeResult?.found ? activeResult.cost.toFixed(1) : '—'}</strong>
              </div>
              <div>
                <span>Vértices expandidos</span>
                <strong>{activeResult?.nodesExpanded ?? '—'}</strong>
              </div>
            </div>

            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.fullSecondaryBtn}
                onClick={() => setActiveDrawer('results')}
              >
                <BarChart3 size={18} aria-hidden="true" />
                <span>Comparar Dijkstra e A*</span>
              </button>

              <button
                type="button"
                className={styles.fullSecondaryBtn}
                onClick={() => setActiveDrawer('cells')}
              >
                <Crosshair size={18} aria-hidden="true" />
                <span>Inspecionar células</span>
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Drawer sob demanda para Resultados, Células e Ajuda */}
      {activeDrawer && (
        <div className={styles.drawerBackdrop} onClick={() => setActiveDrawer(null)}>
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={
              activeDrawer === 'results'
                ? 'Resultados detalhados'
                : activeDrawer === 'cells'
                ? 'Inspeção de células'
                : 'Ajuda e conceitos'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <h2>
                {activeDrawer === 'results'
                  ? 'Comparação e Resultados'
                  : activeDrawer === 'cells'
                  ? 'Inspeção de Células'
                  : 'Ajuda e Conceitos'}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveDrawer(null)}
                aria-label="Fechar painel"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {activeDrawer === 'results' && (
                <AlgorithmComparison
                  dijkstraRes={dijkstraRes}
                  astarRes={astarRes}
                  activeResult={activeResult}
                  algorithm={algorithm}
                  gainPercent={gainPercent}
                />
              )}

              {activeDrawer === 'cells' && (
                <div className={styles.cellsPanel}>
                  <p className={styles.note}>
                    Escolha a ação e toque no mapa ou informe linha e coluna, de 0 a 24.
                  </p>
                  <div className={styles.selection}>
                    <label htmlFor="lab-target">Ação no mapa</label>
                    <select
                      id="lab-target"
                      value={target}
                      onChange={(e) => {
                        const value = e.target.value as typeof target;
                        setTarget(value);
                        EventBus.emit('lab-pointer-action', value);
                      }}
                    >
                      <option value="start">Definir origem</option>
                      <option value="goal">Definir destino</option>
                      <option value="inspect">Inspecionar vértice</option>
                    </select>
                    <label htmlFor="lab-row">Linha</label>
                    <input
                      id="lab-row"
                      type="number"
                      min="0"
                      max="24"
                      value={row}
                      onChange={(e) => setRow(e.target.value)}
                    />
                    <label htmlFor="lab-column">Coluna</label>
                    <input
                      id="lab-column"
                      type="number"
                      min="0"
                      max="24"
                      value={column}
                      onChange={(e) => setColumn(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.applyCoordBtn}
                      onClick={() => {
                        if (row.trim() && column.trim()) {
                          EventBus.emit('lab-select-coordinate', {
                            row: Number(row),
                            column: Number(column),
                            action: target,
                          });
                        } else {
                          setCoordinateMessage('Informe linha e coluna.');
                        }
                      }}
                    >
                      Aplicar
                    </button>
                    <span role="status" className={styles.coordStatus}>
                      {coordinateMessage}
                    </span>
                  </div>
                  <VertexInspector data={inspectedVertex} />
                </div>
              )}

              {activeDrawer === 'help' && (
                <div className={styles.helpPanel}>
                  <h3>Leia o que está acontecendo</h3>
                  <ul className={styles.observations}>
                    {observations.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                  <p className={styles.note}>
                    O anel ciano indica a próxima expansão. Os contornos vermelhos mostram risco
                    calculado a partir das posições iniciais dos fantasmas. Esse risco adiciona uma
                    penalidade ao custo e não é uma probabilidade de sobrevivência.
                  </p>
                  <EducationalPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
