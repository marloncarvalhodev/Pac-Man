import React, { useState, useEffect } from 'react';
import { PhaserGame } from '../game/PhaserGame';
import { GameResult } from '../components/game/GameResult';
import { GameHUD } from '../components/game/GameHUD';
import { EventBus } from '../game/core/EventBus';
import { GameStateSnapshot } from '../game/core/GameState';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SplitText } from '../components/motion/SplitText';
import { AnimatedContent } from '../components/motion/AnimatedContent';
import styles from './PlayPage.module.css';

export const PlayPage: React.FC<{ seed: number; onNewMaze: () => void }> = ({
  seed,
  onNewMaze,
}) => {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);

  useEffect(() => {
    const handleStateUpdated = (state: GameStateSnapshot) => {
      setGameState({ ...state });
    };

    EventBus.on('game-state-updated', handleStateUpdated);

    return () => {
      EventBus.off('game-state-updated', handleStateUpdated);
    };
  }, []);

  const handleNewMaze = () => {
    onNewMaze();
  };

  const handleRestartMaze = () => {
    EventBus.emit('ui-restart-maze');
  };

  const sendDirection = (key: string, down: boolean) => {
    window.dispatchEvent(
      new KeyboardEvent(down ? 'keydown' : 'keyup', {
        key,
        code: key,
        keyCode: (
          {
            ArrowUp: 38,
            ArrowLeft: 37,
            ArrowDown: 40,
            ArrowRight: 39,
          } as Record<string, number>
        )[key],
        bubbles: true,
      }),
    );
  };
  const directionButton = (
    key: string,
    label: string,
    className: string,
    icon: React.ReactNode,
  ) => (
    <button
      className={className}
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        sendDirection(key, true);
      }}
      onPointerUp={() => sendDirection(key, false)}
      onPointerCancel={() => sendDirection(key, false)}
      onLostPointerCapture={() => sendDirection(key, false)}
    >
      {icon}
    </button>
  );

  return (
    <div className={styles.playContainer}>
      <header className={styles.pageHeader}>
        <div>
          <h1>
            <SplitText text="Modo Arcade" />
            <span>Jogue. Explore. Encontre a saída.</span>
          </h1>
        </div>
        <span className={styles.modeTag}>
          <span /> Partida local
        </span>
      </header>
      <AnimatedContent className={styles.statusPanel}>
        <GameHUD
          state={gameState}
          onNewMaze={handleNewMaze}
          onRestartMaze={handleRestartMaze}
        />
        <p className={styles.seedNote}>
          Mapa {gameState?.seed ?? seed} · o mesmo no Laboratório
        </p>
      </AnimatedContent>
      {/* Área do Labirinto (Canvas Phaser) */}
      <div className={styles.canvasWrapper}>
        <PhaserGame sceneType="GameScene" seed={seed} />
      </div>

      {gameState &&
        (gameState.gameStatus === 'WON' || gameState.gameStatus === 'LOST') && (
          <GameResult
            state={gameState}
            onRestart={handleRestartMaze}
            onNewMaze={handleNewMaze}
          />
        )}

      <div className={styles.touchControls} aria-label="Controles de movimento">
        {directionButton(
          'ArrowUp',
          'Mover para cima',
          styles.up,
          <ChevronUp />,
        )}
        {directionButton(
          'ArrowLeft',
          'Mover para esquerda',
          styles.left,
          <ChevronLeft />,
        )}
        {directionButton(
          'ArrowDown',
          'Mover para baixo',
          styles.down,
          <ChevronDown />,
        )}
        {directionButton(
          'ArrowRight',
          'Mover para direita',
          styles.right,
          <ChevronRight />,
        )}
      </div>
    </div>
  );
};
