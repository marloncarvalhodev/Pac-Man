import React, { useEffect, useState } from 'react';
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
 const [algorithm,setAlgorithm] = useState<'Dijkstra'|'A*'|'Multi-Goal'>('A*');
 const [displayMode,setDisplayMode] = useState<LabDisplayMode>('MAZE');
 const [isPlaying,setIsPlaying] = useState(false);
 const [currentStep,setCurrentStep] = useState(0); const [totalSteps,setTotalSteps] = useState(0);
 const [dijkstraRes,setDijkstraRes] = useState<PathfindingResult|null>(null); const [astarRes,setAstarRes] = useState<PathfindingResult|null>(null); const [activeResult,setActiveResult] = useState<PathfindingResult|null>(null); const [gainPercent,setGainPercent] = useState(0);
 const [inspectedVertex,setInspectedVertex] = useState<VertexInspectionData|null>(null);
 const [seedInput,setSeedInput] = useState('42'); const [currentSeed,setCurrentSeed] = useState(42);
 const [target,setTarget] = useState<'start'|'goal'|'inspect'>('start');
 const [row,setRow] = useState(''); const [column,setColumn] = useState(''); const [coordinateMessage,setCoordinateMessage] = useState('');
 useEffect(() => {
  const comparison = (data: {dijkstra:PathfindingResult;astar:PathfindingResult;gainPercent:number;activeResult:PathfindingResult}) => {setDijkstraRes(data.dijkstra);setAstarRes(data.astar);setGainPercent(data.gainPercent);setActiveResult(data.activeResult);setTotalSteps(data.activeResult.visitedOrder.length);setCurrentStep(0);};
  const progress = (data: {currentStep:number;totalSteps:number;isPlaying:boolean}) => {setCurrentStep(data.currentStep);setTotalSteps(data.totalSteps);setIsPlaying(data.isPlaying);};
  const inspect = (data:VertexInspectionData) => setInspectedVertex(data);
  const coordinateStatus = (valid:boolean) => setCoordinateMessage(valid ? 'Célula selecionada.' : 'Escolha uma célula transitável entre 0 e 24.');
  EventBus.on('lab-comparison-ready',comparison);EventBus.on('lab-search-progress',progress);EventBus.on('vertex-inspected',inspect);EventBus.on('lab-coordinate-status',coordinateStatus);
  return () => {EventBus.off('lab-comparison-ready',comparison);EventBus.off('lab-search-progress',progress);EventBus.off('vertex-inspected',inspect);EventBus.off('lab-coordinate-status',coordinateStatus);};
 },[]);
 const loadSeed = (seed:number) => {if (!Number.isFinite(seed)) return; setCurrentSeed(seed);setSeedInput(String(seed));setInspectedVertex(null);EventBus.emit('lab-new-graph',seed);};
 const observations = algorithm === 'Dijkstra' ? ['Prioriza o menor custo acumulado conhecido.','Expande vértices conforme a fila de prioridade.'] : algorithm === 'A*' ? ['Combina custo acumulado e uma estimativa heurística até o destino.','Pode reduzir expansões sem necessariamente reduzir o tempo computacional.'] : ['Planeja a visita às chaves antes da saída.','Avalia a ordem de coleta e os custos dos segmentos.'];
 return <div className={styles.page}>
  <header className={styles.header}><div><h1>Laboratório de Grafos</h1><p>Explore o labirinto, acompanhe as buscas e descubra como os algoritmos encontram caminhos.</p></div><div className={styles.seed}><label htmlFor="lab-seed">Semente atual: {currentSeed}</label><div><input id="lab-seed" type="number" value={seedInput} onChange={e => setSeedInput(e.target.value)}/><button type="button" onClick={() => {if (seedInput.trim() !== '') loadSeed(Number(seedInput));}}>Carregar</button><button type="button" onClick={() => loadSeed(Math.floor(Math.random()*900000+100000))}>Nova semente</button></div></div></header>
  <SearchControls algorithm={algorithm} displayMode={displayMode} isPlaying={isPlaying} currentStep={currentStep} totalSteps={totalSteps} onSelectAlgorithm={a=>{setAlgorithm(a);EventBus.emit('lab-select-algorithm',a);}} onSelectDisplayMode={m=>{setDisplayMode(m);EventBus.emit('lab-set-mode',m);}}/>
  <main className={styles.mainArea}><section className={styles.visual} aria-label="Visualização do grafo"><div className={styles.canvasFrame}><PhaserGame sceneType="GraphLabScene"/></div><div className={styles.legend} aria-label="Legenda do grafo"><span><i className={styles.start}/>Origem</span><span><i className={styles.goal}/>Destino</span><span><i className={styles.path}/>Caminho</span><span><i className={styles.expanded}/>Vértices expandidos</span><span><i className={styles.portal}/>Portais</span></div><p className={styles.note}>A fronteira completa da fila não é desenhada; o anel ciano indica a próxima expansão registrada.</p></section><AlgorithmComparison dijkstraRes={dijkstraRes} astarRes={astarRes} activeResult={activeResult} algorithm={algorithm} gainPercent={gainPercent}/></main>
  <section className={styles.observe}><h2>O que observar nesta execução?</h2><ul>{observations.map(text=><li key={text}>{text}</li>)}</ul><p>Clique no mapa para definir a origem ou use Shift + clique para o destino. No toque, escolha a ação abaixo.</p><div className={styles.selection}><label htmlFor="lab-target">Ação no mapa</label><select id="lab-target" value={target} onChange={e=>{const v=e.target.value as typeof target;setTarget(v);EventBus.emit('lab-pointer-action',v);}}><option value="start">Definir origem</option><option value="goal">Definir destino</option><option value="inspect">Inspecionar vértice</option></select><label htmlFor="lab-row">Linha</label><input id="lab-row" type="number" min="0" max="24" value={row} onChange={e=>setRow(e.target.value)}/><label htmlFor="lab-column">Coluna</label><input id="lab-column" type="number" min="0" max="24" value={column} onChange={e=>setColumn(e.target.value)}/><button type="button" onClick={()=>{if(row.trim() && column.trim()) EventBus.emit('lab-select-coordinate',{row:Number(row),column:Number(column),action:target}); else setCoordinateMessage('Informe linha e coluna.');}}>Aplicar</button><span role="status">{coordinateMessage}</span></div></section>
  <VertexInspector data={inspectedVertex}/><div className={styles.theory}><EducationalPanel/></div>
 </div>;
};
