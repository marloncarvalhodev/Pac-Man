import React from 'react';
import { Play, FlaskConical } from 'lucide-react';
import { CharacterParade } from '../components/home/CharacterParade';
import styles from './HomePage.module.css';

interface Props {
  seed?: number;
  onNavigate: (page: 'play' | 'lab' | 'arena' | 'how-to-play') => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-label="Apresentação do Pac-Man Graph Lab">
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.overlay} aria-hidden="true" />

        <div className={styles.content}>
          <span className={styles.eyebrow}>PAC-MAN / GRAPH LAB</span>

          <h1 className={styles.title}>
            <span className={styles.titleLine}>EXPLORE O LABIRINTO,</span>
            <span className={styles.titleAccent}>DOMINE OS GRAFOS.</span>
          </h1>

          <div className={styles.parade} aria-hidden="true">
            <CharacterParade paused={false} />
          </div>

          <div className={styles.actions} aria-label="Acessos principais">
            <button
              type="button"
              className={`${styles.cta} ${styles.ctaPrimary}`}
              onClick={() => onNavigate('play')}
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              <span>Jogar Arcade</span>
            </button>

            <button
              type="button"
              className={`${styles.cta} ${styles.ctaSecondary}`}
              onClick={() => onNavigate('lab')}
            >
              <FlaskConical size={16} aria-hidden="true" />
              <span>Abrir Laboratório</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
