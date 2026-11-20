import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
} from 'lucide-react';
import { GraphIcon as FlaskConical, GuideIcon as BookOpen, ArenaIcon as Swords } from '../components/ProjectIcons';
import StarBorder from '../components/react-bits/StarBorder';
import GlitchText from '../components/react-bits/GlitchText';
import { CharacterParade } from '../components/home/CharacterParade';
import styles from './HomePage.module.css';
import { LoadingState } from '../components/LoadingState';
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
  const [mounted, setMounted] = useState(false);
  const [showModes, setShowModes] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const loading = <LoadingState compact label="Preparando o labirinto"/>;
  return (
    <div className={styles.home}>
      <section className={styles.poster} aria-label="Jogar e explorar">
        <div className={styles.posterCopy}>
          <div className={styles.posterTop}>
            <h1>PAC-MAN / GRAPH LAB</h1>

          </div>
          <GlitchText
            className={styles.posterWordmark}
            trigger="hover"
            color="#ffdf32"
            fontSize="clamp(2.4rem,4.5vw,4.5rem)"
            fontWeight={400}
            offset={3}
            intensity={0.2}
          >
            JOGUE.
          </GlitchText>
          <div className={styles.parade}>
            <CharacterParade paused={false} />
          </div>
          <p>Um labirinto.<br />Diferentes decisões.</p>
          <span className={styles.introNote}>Assuma o controle ou descubra os caminhos da inteligência artificial.</span>
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
            <div className={styles.moreAccesses}>
              <button className={styles.accessToggle} aria-expanded={showModes} aria-controls="home-extra-modes" onClick={() => setShowModes(value => !value)}>Explorar outros modos <span aria-hidden="true">+</span></button>
              <div className={styles.extraCollapse} data-open={showModes} id="home-extra-modes" aria-hidden={!showModes} ref={node => {if (node) node.inert = !showModes;}}>
              <div className={styles.collapseClip}><div className={styles.extraOptions}>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('lab')}
            >
              <FlaskConical size={18} />
              <span><strong>Laboratório</strong><small>Explore o grafo e compare caminhos</small></span>
              <ArrowRight size={18} />
            </button>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('arena')}
            >
              <Swords size={18} />
              <span><strong>Arena de estratégias</strong><small>Coloque os agentes à prova</small></span>
              <ArrowRight size={18} />
            </button>
            <button
              className={styles.cardAccess}
              onClick={() => onNavigate('how-to-play')}
            >
              <BookOpen size={17} />
              <span><strong>Manual & teoria</strong><small>Entenda as regras e os algoritmos</small></span>
              <ArrowRight size={18} />
            </button>
              </div></div></div>
            </div>
          </div>
        </div>
        <div className={styles.demo}>
          {mounted ? (
            <Suspense fallback={loading}>
              <ArcadeIntro
                seed={seed}
                paused={false}
              />
            </Suspense>
          ) : (
            loading
          )}
        </div>
      </section>
    </div>
  );
};
