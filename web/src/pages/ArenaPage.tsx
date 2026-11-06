import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Swords,
  Play,
  Square,
  Download,
  Trash2,
  Trophy,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SplitText } from '../components/motion/SplitText';
import { AnimatedContent } from '../components/motion/AnimatedContent';
import StarBorder from '../components/react-bits/StarBorder';
import GlareHover from '../components/react-bits/GlareHover';
import { ArenaReplay } from '../components/arena/ArenaReplay';
import { ArenaChart } from '../components/arena/ArenaChart';
import {
  completeRounds,
  compareDuel,
  rankResults,
  readArenaHistory,
  sameRank,
} from '../game/arena/ranking';
import {
  ARENA_HISTORY_KEY,
  TACTICS,
  STATUS_LABELS,
  type ArenaAlgorithm,
  type ArenaTactic,
  type ArenaObjective,
  type RankingMetric,
  type ArenaAgent,
  type ArenaResult,
} from '../game/arena/types';
import styles from './ArenaPage.module.css';

const seconds = (ms: number | null) =>
  ms === null ? '—' : `${(ms / 1000).toFixed(2)}s`;
const number = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const cleanResult = ({ frames, ...result }: ArenaResult): ArenaResult => result;
const allAgents = (): ArenaAgent[] =>
  (Object.keys(TACTICS) as ArenaTactic[]).flatMap((tactic) =>
    (['Dijkstra', 'A*'] as ArenaAlgorithm[]).map((algorithm) => ({
      id: `${algorithm}-${tactic}`,
      name: `${algorithm} · ${TACTICS[tactic].name}`,
      algorithm,
      tactic,
    })),
  );

export function ArenaPage({ seed }: { seed: number }) {
  const [seedInput, setSeedInput] = useState(String(seed)),
    [roundsInput, setRoundsInput] = useState('5');
  const [objective, setObjective] = useState<ArenaObjective>('exit'),
    [metric, setMetric] = useState<RankingMetric>('time'),
    [ghosts, setGhosts] = useState(true);
  const [mode, setMode] = useState<'duel' | 'benchmark'>('duel');
  const [agents, setAgents] = useState<ArenaAgent[]>([
    { id: 'A', name: 'Máquina A', algorithm: 'Dijkstra', tactic: 'fast' },
    { id: 'B', name: 'Máquina B', algorithm: 'A*', tactic: 'fast' },
  ]);
  const [results, setResults] = useState<ArenaResult[]>([]),
    [history, setHistory] = useState<ArenaResult[]>(() => {
      try {
        return readArenaHistory(window.localStorage);
      } catch {
        return [];
      }
    });
  const [source, setSource] = useState<'series' | 'history'>('series'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [storageError, setStorageError] = useState(false);
  const [expected, setExpected] = useState(0),
    [runLabel, setRunLabel] = useState(''),
    [resultFilter, setResultFilter] = useState('all');
  const [resultPage, setResultPage] = useState(0);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => { const active=worker.current;worker.current=null;active?.terminate(); }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        ARENA_HISTORY_KEY,
        JSON.stringify(history.map(cleanResult)),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [history]);
  const eligible = useMemo(
    () =>
      completeRounds(
        (source === 'series' ? results : history).filter(
          (r) => r.objective === objective && r.ghosts === ghosts,
        ),
      ),
    [results, history, source, objective, ghosts],
  );
  const ranking = useMemo(
    () => rankResults(eligible, metric),
    [eligible, metric],
  );
  const fastest = useMemo(() => rankResults(eligible, 'time'), [eligible]);
  const highestScore = useMemo(
    () => rankResults(eligible, 'score'),
    [eligible],
  );
  const duelScore = useMemo(() => {
    const paired = completeRounds(results).filter((r) => r.fieldSize === 2);
    const score = { a: 0, b: 0, ties: 0, rounds: paired.length / 2 };
    for (const a of paired.filter((r) => r.agent.id === 'A')) {
      const b = paired.find((r) => r.round === a.round && r.agent.id === 'B');
      if (!b) continue;
      const verdict = compareDuel(a, b, metric);
      if (verdict > 0) score.a++;
      else if (verdict < 0) score.b++;
      else score.ties++;
    }
    return score;
  }, [results, metric]);
  const replay = results
    .filter((r) => r.round === 1 && r.frames?.length)
    .slice(0, 2);
  const visibleResults = eligible.filter(
    (r) =>
      resultFilter === 'all' ||
      `${r.agent.algorithm}:${r.agent.tactic}` === resultFilter,
  );
  const pageCount = Math.max(1, Math.ceil(visibleResults.length / 20));
  const currentPage = Math.min(resultPage, pageCount - 1);
  const displayedResults = visibleResults.slice(
    currentPage * 20,
    currentPage * 20 + 20,
  );
  const progress = expected ? Math.round((results.length / expected) * 100) : 0;
  const start = () => {
    const runSeed = Number(seedInput),
      rounds = Number(roundsInput);
    if (
      !seedInput.trim() ||
      !Number.isInteger(runSeed) ||
      runSeed < 0 ||
      runSeed > 4294967295 ||
      !Number.isInteger(rounds) ||
      rounds < 1 ||
      rounds > 100
    ) {
      setError(
        'Informe uma semente inteira de 0 a 4294967295 e de 1 a 100 rodadas.',
      );
      return;
    }
    worker.current?.terminate();
    const lineup = mode === 'benchmark' ? allAgents() : agents;
    const batchId = `${Date.now()}-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    setError('');
    setResults([]);
    setBusy(true);
    setSource('series');
    setResultFilter('all');
    setExpected(rounds * lineup.length);
    setRunLabel(
      `${rounds} rodadas · ${lineup.length} máquinas · sementes ${runSeed} a ${(runSeed + rounds - 1) >>> 0}`,
    );
    try {
      const instance = new Worker(
        new URL('../game/arena/arena.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = instance;
      const fail = (message: string) => {
        if(worker.current!==instance)return;
        instance.terminate();
        worker.current = null;
        setBusy(false);
        setError(message);
      };
      instance.onerror = () =>
        fail(
          'Não foi possível executar a simulação. Os resultados concluídos foram preservados. Tente iniciar outra série.',
        );
      instance.onmessage = (
        event: MessageEvent<{
          type: string;
          result?: ArenaResult;
          message?: string;
        }>,
      ) => {
        if(worker.current!==instance)return;
        if (event.data.type === 'result' && event.data.result) {
          const result = event.data.result;
          setResults((previous) => [...previous, result]);
          setHistory((previous) =>
            [...previous, cleanResult(result)].slice(-2000),
          );
        } else if (event.data.type === 'done') {
          instance.terminate();
          worker.current = null;
          setBusy(false);
        } else if (event.data.type === 'error')
          fail(event.data.message ?? 'Falha ao executar a série.');
      };
      instance.postMessage({
        config: { seed: runSeed, rounds, objective, ghosts, agents: lineup },
        batchId,
      });
    } catch {
      setBusy(false);
      setError(
        'Este navegador não conseguiu iniciar o processamento da Arena. Tente uma versão recente com suporte a Web Workers.',
      );
    }
  };
  const stop = () => {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setRunLabel((label) => `${label} · interrompida`);
  };
  const updateAgent = (index: number, patch: Partial<ArenaAgent>) =>
    setAgents((previous) =>
      previous.map((agent, i) =>
        i === index ? { ...agent, ...patch } : agent,
      ),
    );
  const exportCSV = () => {
    const header = [
      'modelo',
      'serie',
      'rodada',
      'semente',
      'maquina',
      'algoritmo',
      'tatica',
      'objetivo',
      'fantasmas',
      'resultado',
      'pontos',
      'tempo_simulado_s',
      'busca_ms',
      'nos_expandidos',
      'pontos_coletados',
      'pontos_totais',
      'chaves',
      'vida',
    ];
    const rows = eligible.map((r) => [
      r.modelVersion,
      r.batchId,
      r.round,
      r.seed,
      r.agent.name,
      r.agent.algorithm,
      TACTICS[r.agent.tactic].name,
      r.objective,
      r.ghosts,
      STATUS_LABELS[r.status],
      r.score,
      r.elapsedMs / 1000,
      r.searchMs,
      r.nodesExpanded,
      r.dotsCollected,
      r.totalDots,
      r.keysCollected,
      r.health,
    ]);
    const csv =
      '\ufeff' +
      [header, ...rows]
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';'),
        )
        .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `pacman-arena-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const recommendation = (list: typeof ranking) => {
    if (!list.length) return 'Execute uma série para descobrir.';
    const tied = list.filter((r) =>
      sameRank(r, list[0], list === fastest ? 'time' : 'score'),
    );
    return tied.length > 1
      ? `Empate entre ${tied.map((r) => `${r.algorithm} · ${TACTICS[r.tactic].name}`).join(' e ')}.`
      : `${list[0].algorithm} · ${TACTICS[list[0].tactic].name}`;
  };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>
            <SplitText text="Arena de máquinas" />
          </h1>
          <p>
            Dois algoritmos. O mesmo labirinto. Resultados que você pode
            comparar.
          </p>
        </div>
        <Swords size={32} aria-hidden="true" />
      </header>
      <section className={styles.setup} aria-labelledby="setup-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="setup-title">Prepare a competição</h2>
            <p>
              Compare duas máquinas ou teste todas as combinações de algoritmo e
              tática.
            </p>
          </div>
        </div>
        <fieldset className={styles.fieldset} disabled={busy}>
          <legend className={styles.srOnly}>Configuração da competição</legend>
          <div
            className={styles.modeSwitch}
            role="group"
            aria-label="Formato da competição"
          >
            <button
              aria-pressed={mode === 'duel'}
              onClick={() => setMode('duel')}
            >
              Duelo A × B
            </button>
            <button
              aria-pressed={mode === 'benchmark'}
              onClick={() => setMode('benchmark')}
            >
              Comparar 6 estratégias
            </button>
          </div>
          <div className={styles.configGrid}>
            <label>
              Semente inicial
              <input
                type="number"
                min={0}
                max={4294967295}
                step={1}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
              />
            </label>
            <label>
              Rodadas (X partidas)
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={roundsInput}
                onChange={(e) => setRoundsInput(e.target.value)}
              />
            </label>
            <label>
              Objetivo
              <select
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value as ArenaObjective);
                  setResultFilter('all');
                }}
              >
                <option value="exit">Chaves e saída</option>
                <option value="dots">Todos os pontos e saída</option>
              </select>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={ghosts}
                onChange={(e) => setGhosts(e.target.checked)}
              />
              <span>
                Fantasmas ativos
                <small>Desative para isolar o planejamento de rotas.</small>
              </span>
            </label>
          </div>
          {mode === 'duel' ? (
            <div className={styles.agentGrid}>
              {agents.map((agent, i) => (
                <div className={styles.agentSetup} key={agent.id}>
                  <h3>
                    <span className={i ? styles.cyan : styles.yellow}>
                      {agent.id}
                    </span>
                    {agent.name}
                  </h3>
                  <label>
                    Algoritmo de busca
                    <select
                      value={agent.algorithm}
                      onChange={(e) =>
                        updateAgent(i, {
                          algorithm: e.target.value as ArenaAlgorithm,
                        })
                      }
                    >
                      <option>Dijkstra</option>
                      <option>A*</option>
                    </select>
                  </label>
                  <label>
                    Tática
                    <select
                      value={agent.tactic}
                      onChange={(e) =>
                        updateAgent(i, {
                          tactic: e.target.value as ArenaTactic,
                        })
                      }
                    >
                      {Object.entries(TACTICS).map(([value, tactic]) => (
                        <option key={value} value={value}>
                          {tactic.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>{TACTICS[agent.tactic].description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.benchmarkNote}>
              Dijkstra e A* serão testados com rota rápida, coleta gulosa e rota
              cautelosa em cada mapa. O replay mostrará as duas máquinas de rota
              rápida da primeira rodada.
            </p>
          )}
        </fieldset>
        <div className={styles.runActions}>
          {busy ? (
            <button className={styles.stop} onClick={stop}>
              <Square size={16} />
              Interromper série
            </button>
          ) : (
            <StarBorder
              className={styles.primary}
              backgroundColor="#ffdf32"
              textColor="#080a0f"
              color="#fff7b0"
              radius={6}
              glow={0.25}
              onClick={start}
            >
              <Play size={18} fill="currentColor" />
              Iniciar competição
            </StarBorder>
          )}
          <p>
            Mesma semente por rodada para todas as máquinas. Limite: 180
            segundos simulados por partida.
          </p>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={18} />
            {error}
          </p>
        )}
        {expected > 0 && (
          <div className={styles.progress}>
            <div>
              <span role="status">
                {busy
                  ? 'Executando'
                  : progress === 100
                    ? 'Série concluída'
                    : 'Série interrompida'}{' '}
                · {results.length}/{expected} partidas
              </span>
              <span>{progress}%</span>
            </div>
            <progress
              max={expected}
              value={results.length}
              aria-label="Progresso da série"
            />
            <p>{runLabel}. Rodadas incompletas ficam fora da comparação.</p>
          </div>
        )}
      </section>
      {duelScore.rounds > 0 && (
        <div className={styles.duelScore} aria-label="Placar do duelo">
          <span>
            Máquina A <b>{duelScore.a}</b>
          </span>
          <span>
            {duelScore.ties} empates · {duelScore.rounds} rodadas
          </span>
          <span>
            <b>{duelScore.b}</b> Máquina B
          </span>
        </div>
      )}
      {replay.length === 2 && (
        <ArenaReplay key={replay[0].batchId} results={replay} />
      )}
      <section className={styles.results} aria-labelledby="ranking-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="ranking-title">
              <Trophy size={22} />
              Ranking de estratégias
            </h2>
            <p>
              Resultados do objetivo “
              {objective === 'exit'
                ? 'Chaves e saída'
                : 'Todos os pontos e saída'}
              ”, com fantasmas {ghosts ? 'ativos' : 'desativados'}.
            </p>
          </div>
          <div className={styles.resultActions}>
            <button
              className={styles.secondary}
              disabled={!eligible.length}
              onClick={exportCSV}
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
        </div>
        <div className={styles.resultToolbar}>
          <div
            className={styles.modeSwitch}
            role="group"
            aria-label="Origem dos resultados"
          >
            <button
              aria-pressed={source === 'series'}
              onClick={() => setSource('series')}
            >
              Série atual
            </button>
            <button
              aria-pressed={source === 'history'}
              onClick={() => setSource('history')}
            >
              Histórico local
            </button>
          </div>
          <label>
            Classificar por
            <select
              aria-label="Classificar por"
              value={metric}
              onChange={(e) => setMetric(e.target.value as RankingMetric)}
            >
              <option value="time">Conclusão e menor tempo</option>
              <option value="score">Maior pontuação</option>
            </select>
          </label>
        </div>
        {source === 'history' && (
          <p className={styles.note}>
            O histórico reúne séries com mapas diferentes neste navegador (até
            2.000 partidas). Use “Série atual” para uma comparação controlada.
            Mudar objetivo ou fantasmas acima filtra os resultados.
          </p>
        )}
        {storageError && (
          <p className={styles.note} role="status">
            O navegador não permitiu salvar o histórico. A série atual e a
            exportação continuam disponíveis.
          </p>
        )}
        {ranking.length === 0 ? (
          <div className={styles.empty}>
            <Swords size={36} />
            <h3>A próxima disputa começa aqui.</h3>
            <p>
              Inicie uma série. O ranking aparece quando todas as máquinas de
              uma rodada terminam; falhas e capturas também são registradas.
            </p>
          </div>
        ) : (
          <>
            <AnimatedContent>
              <div className={styles.verdicts}>
                <GlareHover
                  width="100%"
                  background="#10121c"
                  borderColor="transparent"
                  glareColor="#ffdf32"
                  glareOpacity={0.12}
                  style={{ display: 'block' }}
                >
                  <div className={styles.verdict}>
                    <h3>Para terminar mais rápido</h3>
                    <strong>
                      {fastest[0].completed
                        ? recommendation(fastest)
                        : 'Nenhuma estratégia concluiu ainda.'}
                    </strong>
                    <p>
                      {fastest[0].completed
                        ? `${seconds(fastest[0].time)} em média nas conclusões. A taxa de conclusão vem primeiro.`
                        : 'Aumente a amostra ou teste rotas cautelosas. O ranking mantém as tentativas.'}
                    </p>
                  </div>
                </GlareHover>
                <div className={styles.verdict}>
                  <h3>Para marcar mais pontos</h3>
                  <strong>{recommendation(highestScore)}</strong>
                  <p>
                    {number(highestScore[0].score)} pontos por partida, em
                    média. Uma pontuação maior não garante conclusão.
                  </p>
                </div>
              </div>
            </AnimatedContent>
            <div
              className={styles.tableWrap}
              tabIndex={0}
              aria-label="Ranking; role horizontalmente para ver todas as métricas"
            >
              <table>
                <caption className={styles.srOnly}>
                  Ranking calculado sobre {eligible.length} partidas de rodadas
                  completas
                </caption>
                <thead>
                  <tr>
                    <th>Posição / estratégia</th>
                    <th>Concluiu</th>
                    <th>Pontos médios</th>
                    <th>Tempo de conclusão</th>
                    <th>Busca média</th>
                    <th>Nós expandidos</th>
                    <th>Coleta média</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.key}>
                      <th scope="row">
                        <b>
                          {i > 0 && sameRank(r, ranking[i - 1], metric)
                            ? '='
                            : i + 1}
                        </b>
                        <span>
                          {r.algorithm}
                          <small>{TACTICS[r.tactic].name}</small>
                        </span>
                      </th>
                      <td>
                        {r.completed}/{r.games}
                        <small>{number((r.completed / r.games) * 100)}%</small>
                      </td>
                      <td>{number(r.score)}</td>
                      <td>{seconds(r.time)}</td>
                      <td>{r.searchMs.toFixed(2)}ms</td>
                      <td>{number(r.expanded)}</td>
                      <td>{number(r.coverage * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              Tempo: maior taxa de conclusão como critério principal; depois,
              menor tempo médio das conclusões, maior coleta e pontuação.
              Pontuação: maior média; depois, conclusão e tempo. “Busca” mede só
              o processamento das rotas do Pac-Man, sem renderização nem IA dos
              fantasmas. Varia conforme o dispositivo.
            </p>
            <div className={styles.algorithmSummary}>
              <h3>Melhor algoritmo por tática</h3>
              {(Object.keys(TACTICS) as ArenaTactic[]).map((tactic) => {
                const subset = ranking.filter((r) => r.tactic === tactic);
                const efficient = [...subset].sort(
                  (a, b) => a.expanded - b.expanded || a.searchMs - b.searchMs,
                )[0];
                return (
                  <p key={tactic}>
                    <strong>{TACTICS[tactic].name}</strong>
                    <span>
                      {subset.length < 2
                        ? 'Compare Dijkstra e A* nesta tática para concluir.'
                        : sameRank(subset[0], subset[1], metric)
                          ? 'Empate nos critérios selecionados.'
                          : `${subset[0].algorithm} lidera nesta amostra.`}
                      {subset.length >= 2 && (
                        <small className={styles.searchInsight}>
                          Na busca: {efficient.algorithm} registrou{' '}
                          {number(efficient.expanded)} nós expandidos e{' '}
                          {efficient.searchMs.toFixed(2)}ms, em média. Compare
                          ambas as métricas na tabela.
                        </small>
                      )}
                    </span>
                  </p>
                );
              })}
              <p className={styles.note}>
                O resultado vale para as táticas, mapas e condições testados.
                Não é uma prova de superioridade universal nem de rota global
                ótima para coletar todos os pontos.
              </p>
            </div>
            <ArenaChart results={eligible} />
            <div className={styles.sectionHead}>
              <div>
                <h2>Partida por partida</h2>
                <p>
                  {visibleResults.length} resultados · tempo simulado e busca
                  medidos separadamente
                </p>
              </div>
              <label>
                Filtrar estratégia
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                >
                  <option value="all">Todas</option>
                  {ranking.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.algorithm} · {TACTICS[r.tactic].name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.tableWrap} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>Rodada / mapa</th>
                    <th>Máquina</th>
                    <th>Resultado</th>
                    <th>Pontos</th>
                    <th>Tempo simulado</th>
                    <th>Busca</th>
                    <th>Coleta</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedResults.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.round}
                        <small>Mapa {r.seed}</small>
                      </td>
                      <td>
                        {r.agent.algorithm}
                        <small>{TACTICS[r.agent.tactic].name}</small>
                      </td>
                      <td>
                        <span
                          className={
                            r.status === 'COMPLETED'
                              ? styles.success
                              : styles.failure
                          }
                        >
                          {r.status === 'COMPLETED' && (
                            <CheckCircle2 size={14} />
                          )}
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td>{r.score}</td>
                      <td>{seconds(r.elapsedMs)}</td>
                      <td>{r.searchMs.toFixed(2)}ms</td>
                      <td>
                        {r.dotsCollected}/{r.totalDots}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleResults.length > 20 && (
              <div className={styles.pagination}>
                <button
                  className={styles.secondary}
                  disabled={currentPage === 0}
                  onClick={() => setResultPage(currentPage - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {currentPage + 1} de {pageCount} ·{' '}
                  {visibleResults.length} partidas
                </span>
                <button
                  className={styles.secondary}
                  disabled={currentPage + 1 >= pageCount}
                  onClick={() => setResultPage(currentPage + 1)}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
        {source === 'history' && history.length > 0 && (
          <button
            className={styles.clearHistory}
            disabled={busy}
            onClick={() => setHistory([])}
          >
            <Trash2 size={16} />
            Limpar histórico deste navegador
          </button>
        )}
      </section>
      <details className={styles.method}>
        <summary>Como a comparação funciona</summary>
        <div>
          <p>
            Esta Arena executa uma simulação determinística sobre o grafo do
            mesmo gerador 25 × 25 do Arcade e do Laboratório, em passos de 20ms.
            Cada máquina tem uma cópia independente dos pontos, vida e
            fantasmas. As rodadas usam sementes consecutivas e as máquinas
            alternam a ordem de processamento. O loop roda em um Web Worker, sem
            bloquear a interface.
          </p>
          <p>
            Uma transição custa 135ms × peso da aresta (arredondada ao passo da
            simulação). Entrar em um portal leva diretamente à outra ponta, como
            no Arcade e no Laboratório. A Arena usa um relógio determinístico de
            20ms; a velocidade do replay não altera os resultados. O vermelho
            persegue e o roxo antecipa até quatro movimentos válidos do Pac-Man.
            Alternam 4 segundos de patrulha e 20 de perseguição. Evitam
            reversões desnecessárias e o destino do companheiro. Sob poder,
            fogem por distância de grafo; depois de comidos, têm 600ms de
            recuperação. Fantasmas se movem com base de 340ms, e têm intervalo
            de movimento 30% maior sob poder.
          </p>
          <p>
            Ponto: +10; chave: +100; poder: +50 por 7 segundos; fantasma sob
            poder: +200; conclusão: +500. Lava retira 10 de vida. “Todos os
            pontos” exige todos os Pac-Dots, todas as chaves e a saída. Limite
            por partida: 180 segundos simulados. Coleta e cautela usam
            heurísticas de tática, sem garantia de solução global ótima.
          </p>
          <p>
            Para comparar os algoritmos isoladamente, mantenha a mesma tática
            nas duas máquinas e desative os fantasmas. O torneio de seis
            estratégias testa ambos os algoritmos em cada tática. CPU mede
            buscas reais no navegador; pequenos valores devem ser avaliados em
            várias rodadas. Empates são exibidos.
          </p>
        </div>
      </details>
    </div>
  );
}
