import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Laboratory.module.css';

interface ConceptItem {
  term: string;
  definition: string;
}

const CONCEPTS: ConceptItem[] = [
  {
    term: 'Vértice (v ∈ V)',
    definition: 'Representa uma coordenada transitável (r, c) ∈ Z² no labirinto.',
  },
  {
    term: 'Aresta (e ∈ E)',
    definition: 'Conexão transitável ortogonal entre células livres ou conexão especial de teleporte.',
  },
  {
    term: 'Grafo Ponderado G = (V, E, w)',
    definition: 'Associa a cada transição um peso w(u, v) correspondente ao custo de atrito do terreno de destino.',
  },
  {
    term: 'Portais (Conexões Não Locais)',
    definition: 'Portais conectam posições distantes. O desenho dessas conexões não demonstra, por si só, que o grafo é não planar.',
  },
  {
    term: 'Grau do Vértice deg(v)',
    definition: 'Quantidade de arestas conectadas ao nó. Vértices com deg(v) ≥ 3 são bifurcações e decisões táticas de rota.',
  },
  {
    term: 'Algoritmo de Dijkstra',
    definition: 'Busca uniforme cega que expande em ondas isotropicamente ordenadas por custo acumulado g(u).',
  },
  {
    term: 'Algoritmo A* (A-Star)',
    definition: 'Busca heurística informada orientada pela função f(n) = g(n) + h(n), usando uma estimativa heurística para orientar a busca.',
  },
  {
    term: 'Heurística Admissível',
    definition: 'Cota inferior que nunca superestima o custo real (h(n) ≤ c*(n)), garantindo optimalidade matemática idêntica ao Dijkstra.',
  },
  {
    term: 'Multi-Goal Pathfinding',
    definition: 'Subproblema do Caixeiro Viajante: avalia permutações para ordenar a rota ótima passando por todas as chaves antes do destino final.',
  },
];

export const EducationalPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.educationalCard}>
      <button className={styles.educationalHeader} onClick={() => setIsOpen(!isOpen)}>
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
