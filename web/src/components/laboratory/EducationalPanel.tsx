import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Laboratory.module.css';

interface ConceptItem {
  term: string;
  definition: string;
}

const CONCEPTS: ConceptItem[] = [
  {term:'Vértice',definition:'Cada célula transitável é um vértice, identificado por linha e coluna inteiras.'},
  {term:'Aresta dirigida',definition:'É uma transição permitida entre células livres. Movimentos de ida e volta são arcos distintos e podem ter custos diferentes.'},
  {term:'Peso da transição',definition:'O peso representa o custo da travessia e depende do terreno de entrada. O custo de uma rota é a soma dos pesos de seus arcos.'},
  {term:'Portais',definition:'Conectam posições distantes sem atravessar as células intermediárias. Cruzamentos no desenho não provam que o grafo é não planar.'},
  {term:'Graus de entrada e saída',definition:'O grau de entrada conta arcos que chegam; o de saída, arcos que saem. Mais saídas podem oferecer alternativas de rota.'},
  {term:'Dijkstra',definition:'Prioriza o custo acumulado g(n). Com pesos não negativos, encontra caminhos de custo mínimo.'},
  {term:'A*',definition:'Prioriza f(n) = g(n) + h(n), combinando custo acumulado com uma estimativa até o destino.'},
  {term:'Heurística admissível',definition:'A estimativa h(n) nunca supera o custo mínimo restante. Com busca correta e pesos não negativos, preserva o custo mínimo; não garante menor tempo de processamento.'},
  {term:'Multiobjetivo',definition:'Compara ordens de visita às chaves e combina segmentos até a saída. É diferente de cobrir todos os Pac-Dots, tarefa da estratégia de coleta completa.'},
];

export const EducationalPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.educationalCard}>
      <button className={styles.educationalHeader} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.eduTitleLeft}>
          <BookOpen size={16} className={styles.eduIcon} />
          <h4 className={styles.eduTitle}>Fundamentação Teórica em Grafos</h4>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className={styles.conceptsList}>
          {CONCEPTS.map((c, i) => (
            <div key={i} className={styles.conceptItem}>
              <strong className={styles.conceptTerm}>{c.term}:</strong>{' '}
              <span className={styles.conceptDef}>{c.definition}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

