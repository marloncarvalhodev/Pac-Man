import { useState } from 'react';
import type { ExperimentResult } from '../game/experiment/Experiment';
import { mean, median, percent } from '../game/experiment/results';
import styles from './ExperimentCharts.module.css';

type Metric = 'wins' | 'time' | 'cost' | 'score' | 'dots';
const labels = { MIN_COST:'Menor custo', MIN_TIME:'Menor tempo', SURVIVAL:'Sobrevivência', MAX_SCORE:'Maior pontuação', FULL_CLEAR:'Coleta completa' };
const outcomes = { WON:'Vitória', LOST:'Derrota', TIMEOUT:'Tempo excedido', BLOCKED:'Rota inviável', ERROR:'Erro técnico' };
const metrics: Record<Metric,{ label:string; unit:string; note:string }> = {
  wins:{label:'Taxa de vitória',unit:'%',note:'Vitórias divididas por todas as partidas de cada estratégia.'},
  time:{label:'Tempo de conclusão',unit:' s',note:'Ponto: mediana entre vitórias. Linha: menor e maior tempo de vitória. Sem vitória, não há tempo de conclusão válido.'},
  cost:{label:'Custo médio',unit:'',note:'Média de todas as partidas, inclusive derrotas. Uma rota interrompida pode ter custo baixo sem atingir o objetivo.'},
  score:{label:'Pontuação média',unit:' pts',note:'Média de todas as partidas executadas, inclusive derrotas.'},
  dots:{label:'Coleta média',unit:'%',note:'Porcentagem média dos Pac-Dots físicos recolhidos em cada partida.'},
};
const format = (value:number) => value.toLocaleString('pt-BR',{maximumFractionDigits:1});

export function ExperimentCharts({results}:{results:ExperimentResult[]}) {
  const [metric,setMetric] = useState<Metric>('wins');
  const groups = Object.entries(labels).flatMap(([key,label]) => {
    const rows=results.filter(row=>row.strategy===key);if(!rows.length)return [];
    const wins=rows.filter(row=>row.outcome==='WON');const times=wins.map(row=>row.simulatedMs/1000);
    return [{key,label,rows,wins,times,values:{wins:100*wins.length/rows.length,time:median(times),cost:mean(rows.map(row=>row.cost)),score:mean(rows.map(row=>row.score)),dots:mean(rows.map(percent))}}];
  });
  const maximum = metric==='wins'||metric==='dots' ? 100 : Math.max(1,...groups.map(group=>metric==='time'?Math.max(0,...group.times):group.values[metric]??0));
  const eligible = groups.filter(group=>group.values[metric]!==null);
  const values=eligible.map(group=>group.values[metric] as number);
  const best=values.length ? (metric==='time'||metric==='cost'?Math.min(...values):Math.max(...values)) : null;
  const leaders=eligible.filter(group=>Math.abs((group.values[metric] as number)-(best??0))<1e-8);
  const totalWins=results.filter(row=>row.outcome==='WON').length;
  const maps=new Set(results.map(row=>row.seed)).size;
  const repetitions=new Set(results.map(row=>row.repetition)).size;
  const names=leaders.length>2?`${leaders.length} estratégias`:leaders.map(group=>group.label).join(' e ');
  let interpretation='';
  if(groups.length===1) interpretation='Apenas uma estratégia possui resultados até agora. Aguarde as demais partidas para fazer uma comparação; este resultado parcial não permite eleger uma melhor estratégia.';
  else if(metric==='wins' && !totalWins) interpretation='Nenhuma estratégia venceu neste lote. Não há tempo de conclusão para comparar; observe os tipos de falha e teste outros mapas ou limites antes de tirar conclusões.';
  else if(!eligible.length) interpretation='Não houve vitória neste lote. O gráfico de tempo fica sem valores porque derrotas e limites não são conclusões bem-sucedidas.';
  else if(leaders.length===groups.length) interpretation=`As estratégias empataram nesta medida (${format(best??0)}${metrics[metric].unit}). Este lote não distingue uma melhor estratégia por esse critério.`;
  else interpretation=`${names} ${leaders.length===1?'teve':'tiveram'} ${metric==='cost'||metric==='time'?'o menor':'o maior'} valor neste lote: ${format(best??0)}${metrics[metric].unit}. ${metric==='wins'?'A vantagem vale para as condições observadas; não demonstra superioridade em outros mapas.':metric==='cost'?'Leia o custo junto com a taxa de vitória: perder cedo pode reduzir o custo acumulado.':'Compare também a taxa de vitória e as condições do experimento.'}`;
  return <section className={styles.charts} aria-label="Gráficos e interpretação do experimento">
    <div className={styles.metricTabs} role="group" aria-label="Métrica do gráfico">{Object.entries(metrics).map(([key,value])=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key as Metric)}>{value.label}</button>)}</div>
    <figure className={styles.figure} key={metric}>
      <figcaption>{metrics[metric].label} por estratégia</figcaption><p className={styles.note}>{metrics[metric].note}</p>
      <div className={styles.plot}>
        {groups.map(group=>{const value=group.values[metric];return <div className={styles.row} key={group.key}>
          <div className={styles.rowHeading}><span>{group.label}</span><strong>{value===null?'Sem vitória':format(value)+metrics[metric].unit}</strong></div>
          <div className={styles.track} aria-hidden="true">{value!==null && (metric==='time'?<><i className={styles.range} style={{left:`${100*Math.min(...group.times)/maximum}%`,width:`${100*(Math.max(...group.times)-Math.min(...group.times))/maximum}%`}}/><i className={styles.point} style={{left:`${100*value/maximum}%`}}/></>:<i className={styles.bar} style={{width:`${100*value/maximum}%`}}/>)}</div>
          <small>{group.wins.length} {group.wins.length===1?'vitória':'vitórias'} em {group.rows.length} {group.rows.length===1?'partida':'partidas'}{metric==='time'&&group.times.length>0?` · faixa: ${format(Math.min(...group.times))} a ${format(Math.max(...group.times))} s`:''}</small>
        </div>})}
      </div>{eligible.length>0&&<div className={styles.axis} aria-hidden="true"><span>0</span><span>{format(maximum)}{metrics[metric].unit}</span></div>}
    </figure>
    <aside className={styles.interpretation} aria-label="Interpretação dos resultados"><h3>O que este lote mostra</h3><p>{interpretation}</p><small>{maps} {maps===1?'mapa':'mapas'} · {repetitions} {repetitions===1?'repetição':'repetições'} · {results.length} partidas. {maps<3||repetitions<2?'Amostra curta: amplie as sementes e repetições para uma comparação acadêmica mais robusta.':'Mantenha sementes, modo, objetivo e limite iguais ao comparar as estratégias.'}</small></aside>
    <figure className={styles.outcomes}><figcaption>Como as partidas terminaram</figcaption><div className={styles.outcomeBar} aria-hidden="true">{Object.keys(outcomes).map(key=><i key={key} data-outcome={key} style={{width:`${100*results.filter(row=>row.outcome===key).length/results.length}%`}}/>)}</div><ul>{Object.entries(outcomes).map(([key,label])=><li key={key}><i data-outcome={key} aria-hidden="true"/><span>{label}</span><strong>{results.filter(row=>row.outcome===key).length}</strong></li>)}</ul></figure>
  </section>;
}
