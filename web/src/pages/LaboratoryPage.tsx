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
import styles from './LaboratoryPage.module.css';

export const LaboratoryPage: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<'Dijkstra' | 'A*' | 'Multi-Goal'>('A*');
  const [displayMode, setDisplayMode] = useState<LabDisplayMode>('OVERLAY');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);

  const [dijkstraRes, setDijkstraRes] = useState<PathfindingResult | null>(null);
  const [astarRes, setAstarRes] = useState<PathfindingResult | null>(null);
  const [activeResult, setActiveResult] = useState<PathfindingResult | null>(null);
  const [gainPercent, setGainPercent] = useState<number>(0);

  const [inspectedVertex, setInspectedVertex] = useState<VertexInspectionData | null>(null);

  useEffect(() => {
    const handleComparison = (data: {
      dijkstra: PathfindingResult;
      astar: PathfindingResult;
      gainPercent: number;
      activeResult: PathfindingResult;
      algorithmName: string;
    }) => {
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

    EventBus.on('lab-comparison-ready', handleComparison);
    EventBus.on('lab-search-progress', handleProgress);
    EventBus.on('vertex-inspected', handleVertexInspected);

    return () => {
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

  const handleNewGraph = (seed?: number) => {
    EventBus.emit('lab-new-graph', seed);
  };

  return (
    <div className={styles.labLayout}>
      {/* 1. Painel Esquerdo: Controles & Teoria */}
      <aside className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Controles do Laboratório</h3>
          <p className={styles.panelSubtitle}>Simulação e Demonstração Algorítmica</p>
        </div>

        <SearchControls
          algorithm={algorithm}
          displayMode={displayMode}
          isPlaying={isPlaying}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onSelectAlgorithm={handleSelectAlgorithm}
          onSelectDisplayMode={handleSelectDisplayMode}
          onNewGraph={handleNewGraph}
        />

        <EducationalPanel />
      </aside>

      {/* 2. Região Central: Visualização do Grafo (Canvas Phaser) */}
      <section className={styles.centerCanvasRegion} aria-label="Visualização do grafo">
        <div className={styles.canvasHead}><div><h2>Visualização do grafo</h2><p>Explore o mapa e acompanhe a busca.</p></div><span>{algorithm}</span></div>
        <div className={styles.canvasFrame}><PhaserGame sceneType="GraphLabScene" /></div>
        <div className={styles.legend} aria-label="Legenda da visualização"><span><i className={styles.expanded}/>Expandido</span><span><i className={styles.next}/>Próxima expansão</span><span><i className={styles.path}/>Caminho</span><span><i className={styles.start}/>Origem</span><span><i className={styles.goal}/>Destino</span><span><i className={styles.portal}/>Portal</span></div>
        <p className={styles.frontierNote}>A fronteira completa não é registrada; o anel ciano indica a próxima expansão disponível na ordem gravada.</p>
        <div className={styles.context}><strong>{algorithm === 'Dijkstra' ? 'Dijkstra · custo acumulado' : algorithm === 'A*' ? 'A* · custo + estimativa' : 'Múltiplos objetivos · chaves e saída'}</strong><p>{activeResult ? (activeResult.found ? `Esta execução encontrou custo ${activeResult.cost.toFixed(1)} e registrou ${activeResult.nodesExpanded} expansões.` : 'Não foi encontrado caminho para os objetivos selecionados.') : 'Aguardando o resultado da busca.'} A comparação lateral considera origem e destino selecionados.</p></div>
      </section>

      {/* 3. Painel Direito: Análise Científica & Inspeção */}
      <aside className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Análise & Inspeção</h3>
          <p className={styles.panelSubtitle}>Métricas Reais de Desempenho no Grafo</p>
        </div>

        <AlgorithmComparison
          dijkstraRes={dijkstraRes}
          astarRes={astarRes}
          gainPercent={gainPercent}
        />

        <VertexInspector data={inspectedVertex} />
      </aside>
    </div>
  );
};
