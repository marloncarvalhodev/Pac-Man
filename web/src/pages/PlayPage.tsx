import React, { useState, useEffect } from 'react';
import { PhaserGame } from '../game/PhaserGame';
import { GameHUD } from '../components/game/GameHUD';
import { EventBus } from '../game/core/EventBus';
import { GameStateSnapshot } from '../game/core/GameState';
import { Trophy, Skull, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './PlayPage.module.css';

export const PlayPage: React.FC = () => {
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
    EventBus.emit('ui-new-maze');
  };

  const handleRestartMaze = () => {
    EventBus.emit('ui-restart-maze');
  };

  const sendDirection = (key: string, down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, code: key, keyCode: ({ ArrowUp: 38, ArrowLeft: 37, ArrowDown: 40, ArrowRight: 39 } as Record<string, number>)[key], bubbles: true }));
  };
  const directionButton = (key: string, label: string, className: string, icon: React.ReactNode) => (
    <button className={className} aria-label={label}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); sendDirection(key, true); }}
      onPointerUp={() => sendDirection(key, false)} onPointerCancel={() => sendDirection(key, false)}
      onLostPointerCapture={() => sendDirection(key, false)}>{icon}</button>
  );

  return (
    <div className={styles.playContainer}>
      <GameHUD state={gameState} onNewMaze={handleNewMaze} onRestartMaze={handleRestartMaze} />
      {/* Área do Labirinto (Canvas Phaser) */}
      <div className={styles.canvasWrapper}>
        <PhaserGame sceneType="GameScene" />

        {/* Modal de Vitória */}
        {gameState?.gameStatus === 'WON' && (
          <div className={styles.overlayModal}>
            <div className={styles.modalCardSuccess}>
              <Trophy size={48} className={styles.victoryIcon} />
              <h2 className={styles.modalTitle}>VITÓRIA!</h2>
              <p className={styles.modalText}>
                Você coletou todas as chaves e superou o labirinto ponderado!
              </p>
              <div className={styles.scoreHighlight}>
                Pontuação Final: <strong>{gameState.score} pts</strong>
              </div>
              <button className={styles.modalBtnSuccess} onClick={handleNewMaze}>
                <RotateCcw size={16} /> Jogar Novamente
              </button>
            </div>
          </div>
        )}

        {/* Modal de Derrota (Game Over) */}
        {gameState?.gameStatus === 'LOST' && (
          <div className={styles.overlayModal}>
            <div className={styles.modalCardDanger}>
              <Skull size={48} className={styles.dangerIcon} />
              <h2 className={styles.modalTitleDanger}>GAME OVER</h2>
              <p className={styles.modalText}>
                {gameState.health <= 0
                  ? 'Você sucumbiu à lava ardente (-10 HP repetidamente)!'
                  : 'Os inimigos guiados pelo A* te capturaram no labirinto!'}
              </p>
              <div className={styles.scoreHighlight}>
                Pontuação: <strong>{gameState.score} pts</strong>
              </div>
              <button className={styles.modalBtnDanger} onClick={handleRestartMaze}>
                <RotateCcw size={16} /> Tentar Novamente
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.touchControls} aria-label="Controles de movimento">
        {directionButton('ArrowUp', 'Mover para cima', styles.up, <ChevronUp />)}
        {directionButton('ArrowLeft', 'Mover para esquerda', styles.left, <ChevronLeft />)}
        {directionButton('ArrowDown', 'Mover para baixo', styles.down, <ChevronDown />)}
        {directionButton('ArrowRight', 'Mover para direita', styles.right, <ChevronRight />)}
      </div>
    </div>
  );
};
