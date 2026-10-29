import React, { useState } from 'react';
import { HomePage } from '../pages/HomePage';
import { PlayPage } from '../pages/PlayPage';
import { LaboratoryPage } from '../pages/LaboratoryPage';
import { HowToPlayPage } from '../pages/HowToPlayPage';
import { soundManager } from '../game/systems/SoundManager';
import { Gamepad2, FlaskConical, BookOpen, Volume2, VolumeX, Home } from 'lucide-react';
import styles from './App.module.css';

export type PageTab = 'home' | 'play' | 'lab' | 'how-to-play';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.isMuted);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.navbar}>
        <button className={styles.brand} onClick={() => setActiveTab('home')} aria-label="Ir para início">
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
            <span className={styles.navLong}>Jogar Arcade</span><span className={styles.navShort}>Arcade</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'lab' ? styles.active : ''}`}
            aria-current={activeTab === 'lab' ? 'page' : undefined}
            onClick={() => setActiveTab('lab')}
          >
            <FlaskConical size={16} />
            <span>Laboratório</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'how-to-play' ? styles.active : ''}`}
            aria-current={activeTab === 'how-to-play' ? 'page' : undefined}
            onClick={() => setActiveTab('how-to-play')}
          >
            <BookOpen size={16} />
            <span className={styles.navLong}>Manual & Teoria</span><span className={styles.navShort}>Manual</span>
          </button>
        </nav>

        <div className={styles.rightActions}>
          <button
            className={`${styles.soundBtn} ${isMuted ? styles.muted : ''}`}
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Ativar áudio' : 'Desativar áudio'}
            title={isMuted ? 'Ativar áudio' : 'Desativar áudio'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className={styles.academicTag}>Teoria dos Grafos & IA</div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {activeTab === 'home' && (
          <HomePage onNavigate={(page) => setActiveTab(page)} />
        )}
        {activeTab === 'play' && <PlayPage />}
        {activeTab === 'lab' && <LaboratoryPage />}
        {activeTab === 'how-to-play' && (
          <HowToPlayPage onStartPlaying={() => setActiveTab('play')} />
        )}
      </main>
    </div>
  );
};
