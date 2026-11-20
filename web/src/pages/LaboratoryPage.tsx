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
 const [readoutView,setReadoutView] = useState<'search'|'results'|'cells'|'help'>('search');
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
  <header className={styles.header}>
    <div><h1>Laboratório de Grafos</h1><p>Explore o mapa, execute a busca e compare as decisões.</p></div>
    <div className={styles.seed}><label htmlFor="lab-seed">Semente {currentSeed}</label><div><input id="lab-seed" aria-label="Semente do laboratório" type="number" value={seedInput} onChange={e=>setSeedInput(e.target.value)}/><button type="button" onClick={()=>{if(seedInput.trim())loadSeed(Number(seedInput));}}>Carregar</button><button type="button" onClick={()=>loadSeed(Math.floor(Math.random()*900000+100000))}>Nova semente</button></div></div>
  </header>
  <div className={styles.workspace}>
    <section className={styles.visual} aria-label="Visualização do grafo">
      <div className={styles.mapTop}><label className={styles.riskToggle}><input type="checkbox" defaultChecked onChange={e=>EventBus.emit('lab-ghost-risk',e.target.checked)}/> Incluir risco dos fantasmas</label><button type="button" onClick={()=>setReadoutView('help')} aria-label="Entender a legenda e o risco">?</button></div>
      <div className={styles.canvasFrame}><PhaserGame sceneType="GraphLabScene"/></div>
      <div className={styles.legend} aria-label="Legenda do grafo"><span><i className={styles.start}/>Origem</span><span><i className={styles.goal}/>Destino</span><span><i className={styles.path}/>Caminho</span><span><i className={styles.expanded}/>Expandidos</span><span><i className={styles.portal}/>Portais</span></div>
      <p className={styles.mapHint}>Clique: origem · Shift + clique: destino · Selecione coordenadas em <button onClick={()=>setReadoutView('cells')}>Células</button>.</p>
    </section>
    <aside className={styles.sidePanel} aria-label="Ferramentas do laboratório">
      <nav className={styles.tabs} aria-label="Painel do laboratório">{([['search','Busca'],['results','Resultados'],['cells','Células'],['help','Ajuda']] as const).map(([id,label])=><button key={id} aria-pressed={readoutView===id} onClick={()=>setReadoutView(id)}>{label}</button>)}</nav>
      <div className={styles.panelBody} hidden={readoutView!=='search'}>
        <h2>Configurar busca</h2>
        <SearchControls algorithm={algorithm} displayMode={displayMode} isPlaying={isPlaying} currentStep={currentStep} totalSteps={totalSteps} onSelectAlgorithm={a=>{setAlgorithm(a);EventBus.emit('lab-select-algorithm',a);}} onSelectDisplayMode={m=>{setDisplayMode(m);EventBus.emit('lab-set-mode',m);}}/>
        <div className={styles.quickResults}><div><span>Custo da rota</span><strong>{activeResult?.found?activeResult.cost.toFixed(1):'—'}</strong></div><div><span>Vértices expandidos</span><strong>{activeResult?.nodesExpanded??'—'}</strong></div></div>
        <button className={styles.compareLink} onClick={()=>setReadoutView('results')}>Comparar Dijkstra e A* <span aria-hidden="true">→</span></button>
      </div>
      <div className={styles.panelBody} hidden={readoutView!=='results'}><AlgorithmComparison dijkstraRes={dijkstraRes} astarRes={astarRes} activeResult={activeResult} algorithm={algorithm} gainPercent={gainPercent}/></div>
      <div className={styles.panelBody} hidden={readoutView!=='cells'}>
        <h2>Selecionar célula</h2><p className={styles.note}>Escolha a ação e toque no mapa ou informe linha e coluna, de 0 a 24.</p>
        <div className={styles.selection}><label htmlFor="lab-target">Ação no mapa</label><select id="lab-target" value={target} onChange={e=>{const value=e.target.value as typeof target;setTarget(value);EventBus.emit('lab-pointer-action',value);}}><option value="start">Definir origem</option><option value="goal">Definir destino</option><option value="inspect">Inspecionar vértice</option></select>
          <label htmlFor="lab-row">Linha</label><input id="lab-row" type="number" min="0" max="24" value={row} onChange={e=>setRow(e.target.value)}/><label htmlFor="lab-column">Coluna</label><input id="lab-column" type="number" min="0" max="24" value={column} onChange={e=>setColumn(e.target.value)}/>
          <button type="button" onClick={()=>{if(row.trim()&&column.trim())EventBus.emit('lab-select-coordinate',{row:Number(row),column:Number(column),action:target});else setCoordinateMessage('Informe linha e coluna.');}}>Aplicar</button><span role="status">{coordinateMessage}</span></div>
        <VertexInspector data={inspectedVertex}/>
      </div>
      <div className={styles.panelBody} hidden={readoutView!=='help'}>
        <h2>Leia o que está acontecendo</h2><ul className={styles.observations}>{observations.map(text=><li key={text}>{text}</li>)}</ul>
        <p className={styles.note}>O anel ciano indica a próxima expansão. Os contornos vermelhos mostram risco calculado a partir das posições iniciais dos fantasmas. Esse risco adiciona uma penalidade ao custo e não é uma probabilidade de sobrevivência.</p>
        <EducationalPanel/>
      </div>
    </aside>
  </div>
 </div>;
};
