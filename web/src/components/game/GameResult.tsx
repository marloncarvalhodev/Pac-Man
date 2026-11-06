import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import GlareHover from '../react-bits/GlareHover';
import { SplitText } from '../motion/SplitText';
import type { GameStateSnapshot } from '../../game/core/GameState';
import styles from './GameResult.module.css';

interface Props {
  state: GameStateSnapshot;
  onRestart: () => void;
  onNewMaze: () => void;
}
export const GameResult: React.FC<Props> = ({
  state,
  onRestart,
  onNewMaze,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const won = state.gameStatus === 'WON';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons =
        ref.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', trapFocus);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div className={styles.backdrop}>
      <div
        ref={ref}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-description"
      >
        <GlareHover
          background="#090a10"
          width="100%"
          borderRadius="12px"
          borderColor={won ? '#ffdf3270' : '#ff9ba260'}
          glareColor={won ? '#254cdf' : '#b83c2c'}
          glareOpacity={0.2}
          intro
          style={{ display: 'block' }}
        >
          <div
            className={`${styles.content} ${won ? styles.won : styles.lost}`}
          >
            {won ? (
              <div className={styles.victoryMark}>
                <Trophy size={42} />
              </div>
            ) : (
              <div className={styles.defeatMark} aria-hidden="true">
                <i />
                <b />
                <span />
              </div>
            )}
            <h2 id="result-title">
              <SplitText text={won ? 'Você venceu!' : 'GAME OVER'} />
            </h2>
            <p id="result-description">
              {won
                ? 'Todas as chaves encontradas. O caminho até a saída foi seu.'
                : 'Você ficou sem vida. Um novo caminho começa na próxima tentativa.'}
            </p>
            <div className={styles.score}>
              <span>Pontuação final</span>
              <strong>
                {state.score.toLocaleString('pt-BR')}
                <small>pts</small>
              </strong>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onClick={won ? onNewMaze : onRestart}
              >
                {won ? <ArrowRight size={18} /> : <RotateCcw size={18} />}
                {won ? 'Jogar outro mapa' : 'Tentar novamente'}
              </button>
              <button
                className={styles.secondary}
                onClick={won ? onRestart : onNewMaze}
              >
                {won ? <RotateCcw size={17} /> : <Shuffle size={17} />}
                {won ? 'Repetir este mapa' : 'Gerar novo mapa'}
              </button>
            </div>
          </div>
        </GlareHover>
      </div>
    </div>,
    document.body,
  );
};
