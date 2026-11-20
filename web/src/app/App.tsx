import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HomePage } from '../pages/HomePage';
import { MazeIcon as Home, ArcadeIcon as Gamepad2, GraphIcon as FlaskConical, ArenaIcon as Swords, GuideIcon as BookOpen } from '../components/ProjectIcons';
import StaggeredMenu from '../components/react-bits/StaggeredMenu';
import styles from './App.module.css';
import { LoadingState } from '../components/LoadingState';

const ArenaPage = lazy(() => import('../pages/ArenaPage').then(module => ({ default: module.ArenaPage })));

const PlayPage = lazy(() => import('../pages/PlayPage').then(module => ({ default: module.PlayPage })));

const LaboratoryPage = lazy(() => import('../pages/LaboratoryPage').then(module => ({ default: module.LaboratoryPage })));

const HowToPlayPage = lazy(() => import('../pages/HowToPlayPage').then(module => ({ default: module.HowToPlayPage })));

export type PageTab = 'home' | 'play' | 'lab' | 'arena' | 'how-to-play';

export const App: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(() => window.matchMedia('(min-width: 851px)').matches);
  const [activeTab, setActiveTab] = useState<PageTab>('home');

  const main = useRef<HTMLElement>(null);
  const previous = useRef(activeTab);
  useEffect(() => {
    if (previous.current === activeTab) return;
    previous.current = activeTab;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [activeTab]);

  return (
    <div className={styles.appContainer} data-menu-open={menuOpen}>
      <a href="#conteudo" className={styles.skipLink}>Pular para o conteúdo</a>
      <StaggeredMenu open={menuOpen} onToggle={() => setMenuOpen(value => !value)}
        onClose={() => setMenuOpen(false)} active={activeTab}
        onSelect={id => setActiveTab(id as PageTab)}
        items={[
          { id: 'home', label: 'Início', Icon: Home },
          { id: 'play', label: 'Arcade', Icon: Gamepad2 },
          { id: 'lab', label: 'Laboratório', Icon: FlaskConical },
          { id: 'arena', label: 'Arena', Icon: Swords },
          { id: 'how-to-play', label: 'Manual', Icon: BookOpen },
        ]} />

      <main id="conteudo" className={styles.mainContent} ref={main} tabIndex={-1}>
        <Suspense fallback={<LoadingState label="Preparando a página"/>}>
        {activeTab === 'home' && (
          <HomePage onNavigate={(page) => setActiveTab(page)} />
        )}
        {activeTab === 'play' && <PlayPage />}
        {activeTab === 'lab' && <LaboratoryPage />}
        {activeTab === 'arena' && <ArenaPage />}
        {activeTab === 'how-to-play' && (
          <HowToPlayPage onStartPlaying={() => setActiveTab('play')} onOpenLaboratory={() => setActiveTab('lab')} />
        )}
        </Suspense>
      </main>
    </div>
  );
};

