import React from 'react';
import {
  ArrowRight,
  Play,
  FlaskConical,
  BookOpen,
  MoveUpRight,
  Network,
  Route,
} from 'lucide-react';
import { MazePreview } from '../components/home/MazePreview';
import styles from './HomePage.module.css';

interface HomePageProps {
  onNavigate: (page: 'play' | 'lab' | 'how-to-play') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div className={styles.home}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.copy}>
        <h1 id="home-title">
          <span>Entre no jogo.</span>
          <br />
          Encontre
          <br />
          <em>seu caminho.</em>
        </h1>
        <p className={styles.intro}>
          O clássico encontra a teoria dos grafos. Desvie dos inimigos no Arcade
          ou descubra como os algoritmos escolhem uma rota.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => onNavigate('play')}>
            <Play size={17} fill="currentColor" /> Jogar Arcade{' '}
            <ArrowRight size={19} />
          </button>
          <button
            className={styles.secondary}
            onClick={() => onNavigate('lab')}
          >
            <FlaskConical size={18} /> Abrir laboratório
          </button>
        </div>
        <button
          className={styles.manual}
          onClick={() => onNavigate('how-to-play')}
        >
          <BookOpen size={16} /> Manual & teoria <MoveUpRight size={15} />
        </button>
      </div>
      <MazePreview />
    </section>
    <section className={styles.explore} aria-labelledby="explore-title">
      <div className={styles.exploreIntro}>
        <h2 id="explore-title">
          Jogue por diversão.
          <br />
          <span>Explore por curiosidade.</span>
        </h2>
        <p>O mesmo labirinto, duas formas de descobrir.</p>
      </div>
      <button className={styles.experience} onClick={() => onNavigate('play')}>
        <Play size={22} />
        <div>
          <h3>O desafio é seu.</h3>
          <p>Encontre as chaves, enfrente os terrenos e alcance a saída.</p>
          <span>
            Entrar no Arcade <ArrowRight size={16} />
          </span>
        </div>
        <MoveUpRight size={22} className={styles.experienceArrow} />
      </button>
      <button
        className={`${styles.experience} ${styles.labExperience}`}
        onClick={() => onNavigate('lab')}
      >
        <Network size={24} />
        <div>
          <h3>Entenda cada escolha.</h3>
          <p>
            Compare Dijkstra e A*, inspecione vértices e avance passo a passo.
          </p>
          <span>
            Explorar o laboratório <ArrowRight size={16} />
          </span>
        </div>
        <MoveUpRight size={22} className={styles.experienceArrow} />
      </button>
    </section>
    <footer className={styles.footer}>
      <span>
        <Route size={15} /> Pac-Man: Graph Lab
      </span>
      <span>Matemática Discreta II · IFBA</span>
      <button onClick={() => onNavigate('how-to-play')}>
        Conheça a teoria <ArrowRight size={14} />
      </button>
    </footer>
  </div>
);
