import React from 'react';
import styles from './HomePage-new.module.css';

interface HomePageProps { onNavigate: (page: 'play' | 'lab' | 'how-to-play') => void; }

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div className={styles.homeContainer}>
    <div className={styles.gridBg}></div>

    <main>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span>Matemática Discreta · IFBA</span>
        </div>

       <h1>
        <span className={styles.titleA}>Explore o</span>
        <span className={styles.titleB}>labirinto,</span>
        <span className={styles.titleC}>domine os</span>
        <span className={styles.titleD}>grafos.</span>
       </h1>


        <div className={styles.heroActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onNavigate('play')}>
            Jogar Arcade
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onNavigate('lab')}>
            Abrir Laboratório
          </button>
        </div>
      </section>

      <section className={styles.gamesSection}>
        <div className={styles.sectionHeader}>
          <h2>Três modos, uma teoria</h2>
          <p>Descubra como grafos ponderados, algoritmos de busca e inteligência artificial se conectam em cada experiência.</p>
        </div>

        <div className={styles.gamesGrid}>
          <div className={styles.gameCard} onClick={() => onNavigate('play')}>
            <div className={styles.cardIcon}>🎮</div>
            <h3 className={styles.cardTitle}>Modo Arcade</h3>
            <p className={styles.cardDescription}>Enfrente inimigos inteligentes, colete chaves e navegue por labirintos gerados proceduralmente.</p>
          </div>

          <div className={styles.gameCard} onClick={() => onNavigate('lab')}>
            <div className={styles.cardIcon}>🧪</div>
            <h3 className={styles.cardTitle}>Laboratório de Grafos</h3>
            <p className={styles.cardDescription}>Visualize vértices, arestas e custos em tempo real. Execute Dijkstra e A* passo a passo.</p>
          </div>

          <div className={styles.gameCard} onClick={() => onNavigate('how-to-play')}>
            <div className={styles.cardIcon}>📖</div>
            <h3 className={styles.cardTitle}>Manual & Teoria</h3>
            <p className={styles.cardDescription}>Aprenda os fundamentos: grafos ponderados, heurísticas admissíveis e geração procedural.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
);
