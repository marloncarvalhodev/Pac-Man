import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  FlaskConical,
  BookOpen,
  Network,
  Swords,
} from 'lucide-react';
import StarBorder from '../components/react-bits/StarBorder';
import GlitchText from '../components/react-bits/GlitchText';
import { SplitText } from '../components/motion/SplitText';
import { AnimatedContent } from '../components/motion/AnimatedContent';
import { CharacterParade } from '../components/home/CharacterParade';
import styles from './HomePage.module.css';
const ArcadeIntro = lazy(() =>
  import('../components/home/ArcadeIntro').then((module) => ({
    default: module.ArcadeIntro,
  })),
);
interface Props {
  seed?: number;
  onNavigate: (page: 'play' | 'lab' | 'arena' | 'how-to-play') => void;
}
export const HomePage: React.FC<Props> = ({ seed = 42, onNavigate }) => {
  const [mounted, setMounted] = useState(false),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const loading = (
    <div className={styles.demoLoading}>
      <span>Preparando o labirinto.</span>
      <small>VISUALIZAÇÃO ILUSTRATIVA</small>
    </div>
  );
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div>
          <h1 id="home-title">
            <SplitText text="Siga a sua" />
            <br />
            <em>
              <SplitText text="curiosidade." delay={140} />
            </em>
          </h1>
        </div>
      </section>
      <section className={styles.poster} aria-label="Demonstração do Pac-Man">
        <div className={styles.posterCopy}>
          <div className={styles.posterTop}>
            <span>PAC-MAN / GRAPH LAB</span>
            <span>IFBA · MD II</span>
          </div>
          <GlitchText
            className={styles.posterWordmark}
            trigger="hover"
            color="#ffdf32"
            fontSize="clamp(2.5rem,5vw,4.5rem)"
            fontWeight={400}
            offset={3}
            intensity={0.2}
          >
            PLAY.
          </GlitchText>
          <div className={styles.parade}>
            <CharacterParade paused={paused} />
          </div>
          <p>
            O clássico continua.
            <br />
            <span>A descoberta é sua.</span>
          </p>
          <div className={styles.cardAccesses} aria-label="Acessos do projeto">
            <StarBorder
              color="#fff7b0"
              trailColor="#ffdf32"
              backgroundColor="#ffdf32"
              textColor="#080a0f"
              borderColor="#ffdf32"
              duration={6}
              radius={6}
              glow={0.3}
              hover="lap"
              className={styles.posterLink}
              onClick={() => onNavigate('play')}
            >
              <Play size={18} fill="currentColor" /> Jogar Arcade{' '}
              <ArrowUpRight size={21} />
            </StarBorder>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('lab')}
            >
              <FlaskConical size={18} />
              <span>Abrir laboratório</span>
              <ArrowRight size={18} />
            </button>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('arena')}
            >
              <Swords size={18} />
              <span>Máquina × máquina</span>
              <ArrowRight size={18} />
            </button>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('how-to-play')}
            >
              <BookOpen size={17} />
              <span>Manual & teoria</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className={styles.demo}>
          {mounted ? (
            <Suspense fallback={loading}>
              <ArcadeIntro
                seed={seed}
                onPlay={() => onNavigate('play')}
                paused={paused}
                onTogglePause={() => setPaused((v) => !v)}
              />
            </Suspense>
          ) : (
            loading
          )}
        </div>
      </section>
      <section className={styles.explore} aria-labelledby="explore-title">
        <header>
          <h2 id="explore-title">Instinto ou lógica?</h2>
          <p>Você escolhe por onde começar.</p>
        </header>
        <AnimatedContent>
          <button className={styles.pathway} onClick={() => onNavigate('play')}>
            <Play size={23} />
            <h3>Sinta o jogo.</h3>
            <p>Encontre as chaves, desvie dos fantasmas e alcance a saída.</p>
            <ArrowUpRight size={28} />
          </button>
        </AnimatedContent>
        <AnimatedContent delay={90}>
          <button className={styles.pathway} onClick={() => onNavigate('lab')}>
            <Network size={24} />
            <h3>Entenda o caminho.</h3>
            <p>O mesmo mapa, visto por Dijkstra e A*. Compare cada decisão.</p>
            <ArrowUpRight size={28} />
          </button>
        </AnimatedContent>
      </section>
      <footer className={styles.footer}>
        <strong>Jogar também é aprender.</strong>
        <span>Matemática Discreta II · IFBA</span>
        <button onClick={() => onNavigate('how-to-play')}>
          Conheça a teoria <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
};
