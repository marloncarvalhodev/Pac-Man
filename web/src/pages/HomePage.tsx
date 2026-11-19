import React from 'react';
import styles from './HomePage-new.module.css';

interface HomePageProps { onNavigate: (page: 'play' | 'lab' | 'how-to-play') => void; }

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div className={styles.homeContainer}>
    <div className={styles.gridBg}></div>

    <main>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <span className={styles.titlePrimary}>Explore o labirinto,</span>
            <span className={styles.titleAccent}>domine os grafos.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Algoritmos clássicos de busca, inteligência artificial e caminhos ótimos em uma experiência arcade viva e interativa.
          </p>

          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onNavigate('play')}>
              Jogar Arcade
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onNavigate('lab')}>
              Abrir Laboratório
            </button>
          </div>
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
