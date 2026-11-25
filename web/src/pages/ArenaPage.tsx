import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Play, Square, Route, Timer, Shield, Trophy, Scan, BarChart3, Hourglass } from 'lucide-react';
import type { StrategyType } from '../game/agents/strategies';
import type { ExperimentConfig, ExperimentResult } from '../game/experiment/Experiment';
import { clearHistory, mean, median, percent, readHistory, saveHistory } from '../game/experiment/results';
import styles from './ArenaPage.module.css';
import { ExperimentCharts } from '../components/ExperimentCharts';

const strategies: Record<StrategyType, string> = {
  MIN_COST: 'Menor custo', MIN_TIME: 'Menor tempo', SURVIVAL: 'Sobrevivência',
  MAX_SURVIVAL_TIME: 'Permanência máxima',
  MAX_SCORE: 'Maior pontuação', FULL_CLEAR: 'Coleta completa',
};
const strategyDetails = {
  MIN_COST: { Icon: Route, hint: 'Prioriza o custo da rota.' },
  MIN_TIME: { Icon: Timer, hint: 'Busca concluir mais rápido.' },
  SURVIVAL: { Icon: Shield, hint: 'Considera risco e ameaças.' },
  MAX_SURVIVAL_TIME: { Icon: Hourglass, hint: 'Evasão contínua para maximizar tempo vivo.' },
  MAX_SCORE: { Icon: Trophy, hint: 'Busca oportunidades de pontos.' },
  FULL_CLEAR: { Icon: Scan, hint: 'Tenta recolher todos os pontos.' },
};
const objectives = { exit: 'Saída com chaves', time: 'Tempo de conclusão', survival: 'Sobrevivência',
  score: 'Pontuação', dots: 'Coleta completa' };
const outcomes = { WON: 'Vitória', LOST: 'Derrota', TIMEOUT: 'Tempo excedido',
  BLOCKED: 'Rota inviável', ERROR: 'Erro técnico' };
const number = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
type Metric = 'time' | 'survival_time' | 'cost' | 'score' | 'dots' | 'wins';

export function ArenaPage() {
  const [view, setView] = useState<'config' | 'results' | 'ranking'>('config');
  const [selected, setSelected] = useState<StrategyType[]>(Object.keys(strategies) as StrategyType[]);
  const [seedText, setSeedText] = useState('42, 73, 101');
  const [reps, setReps] = useState(2);
  const [mode, setMode] = useState<ExperimentConfig['mode']>('MVM');
  const [algorithm, setAlgorithm] = useState<ExperimentConfig['algorithm']>('A*');
  const [objective, setObjective] = useState<ExperimentConfig['objective']>('exit');
  const [limit, setLimit] = useState(120);
  const [history, setHistory] = useState(readHistory);
  const [latest, setLatest] = useState<ExperimentResult[]>([]);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [group, setGroup] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [metric, setMetric] = useState<Metric>('time');
  const [confirmClear, setConfirmClear] = useState(false);
  const worker = useRef<Worker>();
  useEffect(() => () => worker.current?.terminate(), []);

  function start(event: FormEvent) {
    event.preventDefault();
    if (worker.current) return;
    const tokens = seedText.split(',').map(s => s.trim());
    const seeds = [...new Set(tokens.map(Number))];
    if (selected.length < 2 || seeds.length > 20 || tokens.some(s => !/^-?\d+$/.test(s)) ||
      seeds.some(s => !Number.isInteger(s) || s < 0 || s > 0x7fffffff)) {
      setNotice('Escolha pelo menos duas estratégias e informe de 1 a 20 sementes inteiras válidas.');
      return;
    }
    const config: ExperimentConfig = { id: crypto.randomUUID(), seeds, repetitions: reps,
      strategies: selected, algorithm, mode, objective, limitMs: limit * 1000 };
    const results: ExperimentResult[] = [];
    const process = new Worker(new URL('../game/experiment/experiment.worker.ts', import.meta.url), { type: 'module' });
    worker.current = process;
    setLatest([]);
    setNotice('');
    setTotal(seeds.length * reps * selected.length);
    setRunning(true);
    process.onmessage = ({ data }) => {
      if (data.result) {
        results.push(data.result);
        setLatest([...results]);
      }
      if (data.done) {
        process.terminate();
        worker.current = undefined;
        setRunning(false);
        try { setHistory(saveHistory(readHistory(), results)); }
        catch { setNotice('O navegador não conseguiu salvar. Exporte os resultados para guardar uma cópia.'); }
      }
    };
    process.onerror = () => {
      process.terminate(); worker.current = undefined; setRunning(false);
      setNotice('O processamento foi interrompido por um erro. O lote parcial ficou fora do ranking.');
    };
    process.postMessage(config);
  }

  function cancel() {
    worker.current?.terminate(); worker.current = undefined; setRunning(false);
    setNotice('Lote cancelado. As partidas concluídas podem ser exportadas e ficaram fora do ranking.');
  }

  function exportResults() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'pacman-experimento.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const scenario = (r: ExperimentResult) => [r.objective, r.seed, r.mode, r.limitMs].join('/');
  const groups = new Map(history.map(r => [scenario(r), r]));
  const activeGroup = groups.has(group) ? group : groups.keys().next().value;
  const candidateRows = history.filter(r => scenario(r) === activeGroup && r.outcome !== 'ERROR' && r.outcome !== 'BLOCKED');
  const batches = new Map(candidateRows.map(r => [r.batch, r.date]));
  const comparable = batches.has(batchFilter)
    ? candidateRows.filter(r => r.batch === batchFilter)
    : candidateRows;
  const ranked = comparable.filter(r => {
    if (metric === 'survival_time') return r.outcome === 'WON' || r.outcome === 'LOST' || r.outcome === 'TIMEOUT';
    if (['time', 'cost'].includes(metric)) return r.outcome === 'WON';
    return true;
  });
  const value = (r: ExperimentResult) => ({
    time: r.simulatedMs / 1000,
    survival_time: r.simulatedMs / 1000,
    cost: r.cost,
    score: r.score,
    dots: percent(r)
  })[metric as Exclude<Metric, 'wins'>];
  const byAgent = new Map<string, ExperimentResult[]>();
  for (const r of comparable) {
    const key = r.strategy + '/' + r.algorithm;
    const rows = byAgent.get(key);
    if (rows) rows.push(r);
    else byAgent.set(key, [r]);
  }
  const winRanking = [...byAgent.values()].map(rows => ({
    label: strategies[rows[0].strategy] + ' · ' + rows[0].algorithm,
    wins: rows.filter(r => r.outcome === 'WON').length, total: rows.length,
  })).sort((a, b) => b.wins / b.total - a.wins / a.total || a.label.localeCompare(b.label));
  const displayRows = [...ranked].sort((a, b) => {
    if (metric === 'time' || metric === 'cost') {
      return (value(a) - value(b)) || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    }
    // Para survival_time, score, dots: maior valor primeiro
    return (value(b) - value(a)) || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  });

  return <div className={styles.arena}>
    <header className={styles.header}>
      <h1>Arena de estratégias</h1>
      <p>Rode as cinco estratégias sob as mesmas condições e compare os resultados por mapa.</p>
    </header>
    {notice && <p className={styles.runStatus} role="status">{notice}</p>}
    {total > 0 && <div className={styles.runStatus}><span role="status">{latest.length} de {total} partidas concluídas.</span>{running && <button type="button" onClick={cancel}><Square size={14} aria-hidden="true" /> Cancelar lote</button>}</div>}
    <nav className={styles.sectionLinks} aria-label="Seções da Arena">
      <button type="button" aria-current={view === 'config' ? 'step' : undefined} onClick={() => setView('config')}>Configuração</button>
      <button type="button" aria-current={view === 'results' ? 'step' : undefined} onClick={() => setView('results')}>Resultados</button>
      <button type="button" aria-current={view === 'ranking' ? 'step' : undefined} onClick={() => setView('ranking')}>Ranking</button>
    </nav>
    <form id="arena-config" hidden={view !== 'config'} onSubmit={start} className={styles.config}>
      <fieldset disabled={running}>
        <legend>Estratégias</legend>
        {(Object.keys(strategies) as StrategyType[]).map(strategy => {
          const { Icon, hint } = strategyDetails[strategy];
          return <label key={strategy} className={styles.strategyOption} data-selected={selected.includes(strategy)}>
            <Icon size={21} aria-hidden="true" />
            <span><strong>{strategies[strategy]}</strong><small>{hint}</small></span>
            <input type="checkbox" aria-label={strategies[strategy]} checked={selected.includes(strategy)} onChange={e =>
              setSelected(e.target.checked ? [...selected, strategy] : selected.filter(s => s !== strategy))} />
          </label>;
        })}
      </fieldset>
      <fieldset disabled={running} className={styles.scenario}>
        <legend>Cenário</legend>
        <label>Sementes separadas por vírgula<input value={seedText} onChange={e => setSeedText(e.target.value)} required /></label>
        <label>Repetições<input type="number" min="1" max="10" required value={reps} onChange={e => setReps(+e.target.value)} /></label>
        <label>Modo<select value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
          <option value="MVM">Máquina × máquina</option><option value="DEMO">Demonstração</option>
        </select></label>
        <label>Objetivo<select value={objective} onChange={e => {
          const next = e.target.value as typeof objective;
          setObjective(next); if (next === 'survival') setMode('MVM');
        }}>{Object.entries(objectives).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label>Algoritmo<select value={algorithm} onChange={e => setAlgorithm(e.target.value as typeof algorithm)}>
          <option>A*</option><option>Dijkstra</option>
        </select></label>
        <label>Limite simulado em segundos<input type="number" min="5" max="300" value={limit}
          required onChange={e => setLimit(+e.target.value)} /></label>
      </fieldset>
      <div className={styles.batchPreview} aria-label="Resumo do lote">
        <div><strong>{selected.length}</strong><span>estratégias</span></div>
        <div><strong>{new Set(seedText.split(',').filter(value => value.trim())).size}</strong><span>mapas</span></div>
        <div><strong>{selected.length * new Set(seedText.split(',').filter(value => value.trim())).size * reps}</strong><span>partidas previstas</span></div>
      </div>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={running || (objective === 'survival' && mode !== 'MVM')}><Play size={17} /> Executar comparação</button>
        {latest.length > 0 && <button type="button" onClick={() => setView('results')}>Ver resultados</button>}
      </div>
      <p>Menor custo e menor tempo podem coincidir quando a duração é proporcional ao peso. Coleta completa usa uma heurística gulosa sem garantia de ótimo global.</p>
      {running && <progress value={latest.length} max={total} aria-label="Andamento do experimento" />}
    </form>
    <section id="arena-resultados" hidden={view !== 'results'} className={styles.section}>
      <div className={styles.resultHeading}>
        <h2>Resultados do lote</h2>
        {latest.length > 0 && <div className={styles.actions}><button type="button" onClick={exportResults}><Download size={17} /> Exportar JSON</button></div>}
      </div>
      <p>Tempo de conclusão considera as vitórias. Derrotas, limites, bloqueios e erros aparecem separadamente. Processamento mede tempo real do simulador.</p>
      {latest.length === 0 ? <div className={styles.emptyState}><BarChart3 size={32} aria-hidden="true" /><h3>Sua comparação começa no cenário.</h3><p>Execute uma comparação para ver os resultados.</p><button type="button" onClick={() => setView('config')}>Configurar experimento</button></div> : <>
        <div className={styles.resultOverview} aria-label="Resumo dos resultados">
          <div><span>Partidas concluídas</span><strong>{latest.length}</strong></div>
          <div><span>Taxa de vitória do lote</span><strong>{number(100 * latest.filter(row => row.outcome === 'WON').length / latest.length)}<small>%</small></strong></div>
          <div><span>Mapas comparados</span><strong>{new Set(latest.map(row => row.seed)).size}</strong></div>
        </div>
        <ExperimentCharts results={latest}/>
        <details className={styles.fullMetrics}><summary>Tabela completa de métricas</summary>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Resumo por estratégia">
          <table><thead><tr>{['Estratégia', 'Vitórias', 'Derrotas', 'Limites', 'Bloqueios', 'Erros', 'Taxa de vitória', 'Tempo médio (s)', 'Mediana (s)', 'Faixa das vitórias (s)', 'Custo médio', 'Pontos médios', 'Coleta média', 'Expansões', 'Replanos', 'Processamento (ms)'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{Object.entries(strategies).map(([strategy, label]) => {
              const rows = latest.filter(r => r.strategy === strategy);
              if (!rows.length) return null;
              const wins = rows.filter(r => r.outcome === 'WON');
              const times = wins.map(r => r.simulatedMs / 1000);
              return <tr key={strategy}><th scope="row">{label}</th><td>{wins.length}</td>
                {(['LOST', 'TIMEOUT', 'BLOCKED', 'ERROR'] as const).map(x => <td key={x}>{rows.filter(r => r.outcome === x).length}</td>)}
                <td>{number(100 * wins.length / rows.length)}%</td><td>{number(mean(times))}</td><td>{number(median(times))}</td><td>{times.length ? number(Math.min(...times)) + ' a ' + number(Math.max(...times)) : '—'}</td>
                {[mean(rows.map(r => r.cost)), mean(rows.map(r => r.score)), mean(rows.map(percent)),
                  mean(rows.map(r => r.expanded)), mean(rows.map(r => r.replans)), mean(rows.map(r => r.processingMs))]
                  .map((n, i) => <td key={i}>{number(n)}{i === 2 && '%'}</td>)}</tr>;
            })}</tbody></table>
        </div>
        </details>
        <details><summary>Ver partidas individuais</summary><div className={styles.scroll} tabIndex={0} role="region" aria-label="Partidas individuais">
          <table><thead><tr><th>Semente</th><th>Rodada</th><th>Estratégia</th><th>Resultado</th><th>Tempo (s)</th><th>Pontos</th></tr></thead>
            <tbody>{latest.map(r => <tr key={r.id}><td>{r.seed}</td><td>{r.repetition}</td><td>{strategies[r.strategy]}</td>
              <td>{outcomes[r.outcome]} · {r.reason}</td><td>{number(r.simulatedMs / 1000)}</td><td>{r.score}</td></tr>)}</tbody></table>
        </div></details>
      </>}
    </section>
    <section id="arena-ranking" hidden={view !== 'ranking'} className={styles.section}>
      <h2>Ranking local</h2>
      <p>Salvo neste navegador. Cada classificação usa o mesmo objetivo, semente, modo e limite. Empates individuais favorecem o registro mais antigo. Na taxa de vitória, empates são ordenados pelo nome.</p>
      {!groups.size ? <div className={styles.emptyState}><Trophy size={32} aria-hidden="true" /><h3>A primeira disputa ainda está por vir.</h3><p>Nenhum lote completo salvo.</p><button type="button" onClick={() => setView('config')}>Preparar comparação</button></div> : <>
        <div className={styles.filters}>
          <label>Cenário<select value={activeGroup} onChange={e => { setGroup(e.target.value); setBatchFilter('all'); }}>
            {[...groups].map(([key, r]) => <option key={key} value={key}>{objectives[r.objective]} · {r.seed} · {r.mode} · {r.limitMs / 1000}s</option>)}
          </select></label>
          <label>Lote<select aria-label="Lote" value={batches.has(batchFilter) ? batchFilter : 'all'} onChange={e => setBatchFilter(e.target.value)}>
            <option value="all">Todos os lotes do cenário</option>
            {[...batches].reverse().map(([id, date], i) => <option key={id} value={id}>
              {new Date(date).toLocaleString('pt-BR')} · lote {batches.size - i}
            </option>)}
          </select></label>
          <label>Classificar por<select value={metric} onChange={e => setMetric(e.target.value as Metric)}>
            <option value="survival_time">Maior tempo de permanência (inclusive derrotas/limites)</option>
            <option value="time">Menor tempo entre vitórias</option><option value="cost">Menor custo entre vitórias</option>
            <option value="score">Maior pontuação</option><option value="dots">Maior coleta (%)</option><option value="wins">Taxa de vitória</option>
          </select></label>
        </div>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Ranking">
          <table><thead><tr><th>Estratégia e algoritmo</th><th>Resultado</th><th>Medida</th></tr></thead>
            <tbody>{metric === 'wins' ? winRanking.map(r => <tr key={r.label}><th scope="row">{r.label}</th>
              <td>{r.wins}/{r.total} vitórias</td><td>{number(100 * r.wins / r.total)}%</td></tr>) :
              displayRows.slice(0, 20).map(r => <tr key={r.id}><th scope="row">{strategies[r.strategy]} · {r.algorithm}</th>
                <td>{outcomes[r.outcome]}{r.outcome === 'TIMEOUT' ? ' (Limite temporal)' : ''}</td><td>{number(value(r))}{metric === 'dots' ? '%' : (metric === 'time' || metric === 'survival_time') ? ' s' : ''}</td></tr>)}</tbody></table>
          {metric !== 'wins' && displayRows.length === 0 && <p>Sem partidas elegíveis para este critério.</p>}
        </div>
        <div className={styles.actions}>
          {confirmClear ? <><button onClick={() => {
            try { clearHistory(); setHistory([]); setConfirmClear(false); }
            catch { setNotice('Não foi possível limpar o histórico.'); }
          }}>Confirmar limpeza</button><button onClick={() => setConfirmClear(false)}>Voltar</button></> :
            <button onClick={() => setConfirmClear(true)}>Limpar histórico</button>}
        </div>
      </>}
    </section>
  </div>;
}
