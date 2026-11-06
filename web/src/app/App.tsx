import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HomePage } from '../pages/HomePage';
import { PlayPage } from '../pages/PlayPage';
import { LaboratoryPage } from '../pages/LaboratoryPage';
import { HowToPlayPage } from '../pages/HowToPlayPage';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/core/EventBus';
import type { GameStateSnapshot } from '../game/core/GameState';
import {
  Swords,
  Gamepad2,
  FlaskConical,
  BookOpen,
  Volume2,
  VolumeX,
  Home,
} from 'lucide-react';
import styles from './App.module.css';

const ArenaPage = lazy(() =>
  import('../pages/ArenaPage').then((m) => ({ default: m.ArenaPage })),
);
export type PageTab = 'home' | 'play' | 'lab' | 'arena' | 'how-to-play';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [mazeSeed, setMazeSeed] = useState(42);
  const newMaze = (seed?: number) =>
    setMazeSeed(seed ?? Math.floor(Math.random() * 900000 + 100000));
  useEffect(() => {
    const syncSeed = (state: GameStateSnapshot) => setMazeSeed(state.seed);
    EventBus.on('game-state-updated', syncSeed);
    return () => {
      EventBus.off('game-state-updated', syncSeed);
    };
  }, []);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.isMuted);
  const mainRef = useRef<HTMLElement>(null);
  const previousTab = useRef<PageTab>(activeTab);

  useEffect(() => {
    if (previousTab.current === activeTab) return;
    previousTab.current = activeTab;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [activeTab]);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className={styles.appContainer}>
      <a href="#main-content" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <header className={styles.navbar}>
        <button
          className={styles.brand}
          onClick={() => setActiveTab('home')}
          aria-label="Ir para início"
        >
          <div className={styles.brandLogo} />
          <div className={styles.brandTitle}>
            PAC-MAN <span style={{ color: 'var(--color-pacman)' }}>LAB</span>
            <span className={styles.brandBadge}>MD2</span>
          </div>
        </button>

        <nav className={styles.navLinks} aria-label="Navegação principal">
          <button
            className={`${styles.navBtn} ${activeTab === 'home' ? styles.active : ''}`}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            onClick={() => setActiveTab('home')}
          >
            <Home size={16} />
            <span>Início</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'play' ? styles.active : ''}`}
            aria-current={activeTab === 'play' ? 'page' : undefined}
            onClick={() => setActiveTab('play')}
          >
            <Gamepad2 size={16} />
            <span className={styles.navLong}>Jogar Arcade</span>
            <span className={styles.navShort}>Arcade</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'lab' ? styles.active : ''}`}
            aria-current={activeTab === 'lab' ? 'page' : undefined}
            onClick={() => setActiveTab('lab')}
            aria-label="Laboratório"
          >
            <FlaskConical size={16} />
            <span className={styles.labLabel}>Laboratório</span>
            <span className={styles.labShort}>Lab</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'arena' ? styles.active : ''}`}
            aria-current={activeTab === 'arena' ? 'page' : undefined}
            onClick={() => setActiveTab('arena')}
          >
            <Swords size={16} />
            <span>Arena</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'how-to-play' ? styles.active : ''}`}
            aria-current={activeTab === 'how-to-play' ? 'page' : undefined}
            onClick={() => setActiveTab('how-to-play')}
          >
            <BookOpen size={16} />
            <span className={styles.navLong}>Manual & Teoria</span>
            <span className={styles.navShort}>Manual</span>
          </button>
        </nav>

        <div className={styles.rightActions}>
          <button
            className={`${styles.soundBtn} ${isMuted ? styles.muted : ''}`}
            onClick={handleToggleSound}
            aria-pressed={!isMuted}
            aria-label={isMuted ? 'Ativar áudio' : 'Desativar áudio'}
            title={isMuted ? 'Ativar áudio' : 'Desativar áudio'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className={styles.academicTag}>Teoria dos Grafos & IA</div>
        </div>
      </header>

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={styles.mainContent}
      >
        {activeTab === 'home' && (
          <HomePage seed={mazeSeed} onNavigate={(page) => setActiveTab(page)} />
        )}
        {activeTab === 'play' && (
          <PlayPage key={mazeSeed} seed={mazeSeed} onNewMaze={newMaze} />
        )}
        {activeTab === 'lab' && (
          <LaboratoryPage
            key={mazeSeed}
            seed={mazeSeed}
            onNewGraph={newMaze}
            onOpenArena={() => setActiveTab('arena')}
          />
        )}
        {activeTab === 'arena' && (
          <Suspense
            fallback={
              <div role="status" style={{ padding: 32 }}>
                Preparando a Arena…
              </div>
            }
          >
            <ArenaPage seed={mazeSeed} />
          </Suspense>
        )}
        {activeTab === 'how-to-play' && (
          <HowToPlayPage
            onStartPlaying={() => setActiveTab('play')}
            onOpenLaboratory={() => setActiveTab('lab')}
            onOpenArena={() => setActiveTab('arena')}
          />
        )}
      </main>
    </div>
  );
};
