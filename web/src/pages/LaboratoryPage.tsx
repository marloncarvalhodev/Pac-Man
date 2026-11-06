import { Swords } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { PhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/core/EventBus';
import { LabDisplayMode } from '../game/scenes/GraphLabScene';
import { PathfindingResult } from '../game/algorithms/PathfindingTypes';
import { VertexInspectionData } from '../game/core/GameState';
import { SearchControls } from '../components/laboratory/SearchControls';
import { AlgorithmComparison } from '../components/laboratory/AlgorithmComparison';
import { VertexInspector } from '../components/laboratory/VertexInspector';
import { EducationalPanel } from '../components/laboratory/EducationalPanel';
import { SplitText } from '../components/motion/SplitText';
import { AnimatedContent } from '../components/motion/AnimatedContent';
import styles from './LaboratoryPage.module.css';

export const LaboratoryPage: React.FC<{
  seed: number;
  onOpenArena?: () => void;
  onNewGraph: (seed?: number) => void;
}> = ({ seed, onNewGraph, onOpenArena }) => {
  const [algorithm, setAlgorithm] = useState<'Dijkstra' | 'A*' | 'Multi-Goal'>(
    'A*',
  );
  const [considerGhosts, setConsiderGhosts] = useState(true);
  const [displayMode, setDisplayMode] = useState<LabDisplayMode>('OVERLAY');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);

  const [dijkstraRes, setDijkstraRes] = useState<PathfindingResult | null>(
    null,
  );
  const [astarRes, setAstarRes] = useState<PathfindingResult | null>(null);
  const [activeResult, setActiveResult] = useState<PathfindingResult | null>(
    null,
  );
  const [travelCost, setTravelCost] = useState<number | null>(null);
  const [gainPercent, setGainPercent] = useState<number>(0);

  const [inspectedVertex, setInspectedVertex] =
    useState<VertexInspectionData | null>(null);

  useEffect(() => {
    const handleComparison = (data: {
      dijkstra: PathfindingResult;
      astar: PathfindingResult;
      gainPercent: number;
      activeResult: PathfindingResult;
      algorithmName: string;
      considersGhosts: boolean;
      travelCost: number | null;
    }) => {
      setConsiderGhosts(data.considersGhosts);
      setTravelCost(data.travelCost);
      setActiveResult(data.activeResult);
      setDijkstraRes(data.dijkstra);
      setAstarRes(data.astar);
      setGainPercent(data.gainPercent);
      setTotalSteps(data.activeResult.visitedOrder.length);
      setCurrentStep(0);
    };

    const handleProgress = (data: {
      currentStep: number;
      totalSteps: number;
      isFinished: boolean;
      isPlaying: boolean;
    }) => {
      setCurrentStep(data.currentStep);
      setTotalSteps(data.totalSteps);
      setIsPlaying(data.isPlaying);
    };

    const handleVertexInspected = (data: VertexInspectionData) => {
      setInspectedVertex(data);
    };

    const reflectPlay = () => setIsPlaying(true);
    const reflectPause = () => setIsPlaying(false);
    EventBus.on('lab-play', reflectPlay);
    EventBus.on('lab-pause', reflectPause);
    EventBus.on('lab-comparison-ready', handleComparison);
    EventBus.on('lab-search-progress', handleProgress);
    EventBus.on('vertex-inspected', handleVertexInspected);

    return () => {
      EventBus.off('lab-play', reflectPlay);
      EventBus.off('lab-pause', reflectPause);
      EventBus.off('lab-comparison-ready', handleComparison);
      EventBus.off('lab-search-progress', handleProgress);
      EventBus.off('vertex-inspected', handleVertexInspected);
    };
  }, []);

  const handleSelectAlgorithm = (algo: 'Dijkstra' | 'A*' | 'Multi-Goal') => {
    setAlgorithm(algo);
    EventBus.emit('lab-select-algorithm', algo);
  };

  const handleSelectDisplayMode = (mode: LabDisplayMode) => {
    setDisplayMode(mode);
    EventBus.emit('lab-set-mode', mode);
  };

  const handleNewGraph = (nextSeed?: number) => {
    if (nextSeed === seed) EventBus.emit('lab-new-graph', nextSeed);
    else onNewGraph(nextSeed);
  };

  return (
    <div className={styles.labLayout}>
      <header className={styles.pageHeader}>
        <div>
          <h1>
            <SplitText text="Laboratório de grafos" />
          </h1>
          <p>Veja como cada algoritmo encontra seu caminho.</p>
        </div>
        <button
          className={styles.arenaLink}
          onClick={onOpenArena}
          disabled={!onOpenArena}
        >
          <Swords size={17} />
          Comparar máquinas
        </button>
      </header>
      {/* 1. Painel Esquerdo: Controles & Teoria */}
      <AnimatedContent className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Controles do Laboratório</h3>
          <p className={styles.panelSubtitle}>
            Simulação e Demonstração Algorítmica
          </p>
        </div>

        <SearchControls
          seed={seed}
          algorithm={algorithm}
          displayMode={displayMode}
          isPlaying={isPlaying}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onSelectAlgorithm={handleSelectAlgorithm}
          onSelectDisplayMode={handleSelectDisplayMode}
          onNewGraph={handleNewGraph}
        />

        <div className={styles.threatControls}>
          <h3>Fantasmas na rota</h3>
          <button className={styles.arenaLink} aria-pressed={considerGhosts}
            onClick={() => EventBus.emit('lab-set-ghosts', !considerGhosts)}>
            {considerGhosts ? 'Risco dos fantasmas: ligado' : 'Risco dos fantasmas: desligado'}
          </button>
          <p>O vermelho indica perigo. A busca considera as posições atuais e a previsão dos próximos passos dos fantasmas. Use “Fantasmas” em Editar no mapa para reposicioná-los.</p>
        </div>
        <EducationalPanel />
      </AnimatedContent>

      {/* 2. Região Central: Visualização do Grafo (Canvas Phaser) */}
      <section
        className={styles.centerCanvasRegion}
        aria-label="Visualização do grafo"
      >
        <div className={styles.canvasHead}>
          <p>Mapa {seed} · o mesmo do Arcade</p>
          <span>{algorithm}</span>
        </div>
        <div className={styles.canvasFrame}>
          <PhaserGame sceneType="GraphLabScene" seed={seed} />
        </div>
        <div className={styles.legend} aria-label="Legenda da visualização">
          <span>
            <i className={styles.expanded} />
            Expandido
          </span>
          <span>
            <i className={styles.next} />
            Fronteira aberta
          </span>
          <span>
            <i className={styles.path} />
            Caminho
          </span>
          <span>
            <i className={styles.start} />
            Origem
          </span>
          <span>
            <i className={styles.goal} />
            Destino
          </span>
          <span>
            <i className={styles.portal} />
            Portal
          </span>
        </div>
        <p className={styles.frontierNote}>
          {considerGhosts && 'Custo = deslocamento + risco dos fantasmas. Esta é uma análise de posições fixas com previsão curta; não é uma partida em movimento. '}
          Anéis cianos mostram a fronteira real após cada expansão. O anel
          amarelo marca o próximo nó. Em Multi-Goal, ambos os algoritmos visitam
          as mesmas chaves antes da saída.
        </p>
        {considerGhosts && travelCost !== null && activeResult?.found && (
          <p className={styles.frontierNote}>
            Deslocamento: {travelCost.toFixed(1)} · Penalidade de risco: {(activeResult.cost - travelCost).toFixed(1)}
          </p>
        )}
        <div className={styles.context}>
          <strong>
            {algorithm === 'Dijkstra'
              ? 'Dijkstra · custo acumulado'
              : algorithm === 'A*'
                ? 'A* · custo + estimativa'
                : 'Múltiplos objetivos · chaves e saída'}
          </strong>
          <p>
            {activeResult
              ? activeResult.found
                ? `Esta execução encontrou custo ${activeResult.cost.toFixed(1)} e registrou ${activeResult.nodesExpanded} expansões.`
                : 'Não foi encontrado caminho para os objetivos selecionados.'
              : 'Aguardando o resultado da busca.'}{' '}
            {algorithm === 'Multi-Goal'
              ? 'A comparação inclui todas as chaves e o destino, para ambos os algoritmos.'
              : 'A comparação considera a mesma origem e destino.'}
          </p>
        </div>
      </section>

      {/* 3. Painel Direito: Análise Científica & Inspeção */}
      <AnimatedContent className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Análise & Inspeção</h3>
          <p className={styles.panelSubtitle}>
            Métricas Reais de Desempenho no Grafo
          </p>
        </div>

        <AlgorithmComparison
          dijkstraRes={dijkstraRes}
          astarRes={astarRes}
          gainPercent={gainPercent}
        />

        <VertexInspector data={inspectedVertex} />
      </AnimatedContent>
    </div>
  );
};
