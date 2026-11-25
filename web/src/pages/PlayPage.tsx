import React, { useState, useEffect } from 'react';
import { PhaserGame } from '../game/PhaserGame';
import { GameHUD } from '../components/game/GameHUD';
import { EventBus } from '../game/core/EventBus';
import { GameStateSnapshot } from '../game/core/GameState';
import {
  Trophy,
  Skull,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  KeyRound,
  User,
  Bot,
  Play,
  Pause,
  Shuffle,
  SlidersHorizontal,
  Activity,
} from 'lucide-react';
import styles from './PlayPage.module.css';

const strategyLabels: Record<string, string> = {
  MIN_COST: 'Menor custo',
  MIN_TIME: 'Menor tempo',
  SURVIVAL: 'Sobrevivência',
  MAX_SURVIVAL_TIME: 'Permanência máxima',
  MAX_SCORE: 'Maior pontuação',
  FULL_CLEAR: 'Coleta completa',
};

export const PlayPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'setup' | 'follow'>('setup');

  useEffect(() => {
    const handleStateUpdated = (state: GameStateSnapshot) => {
      setGameState({ ...state });
    };

    EventBus.on('game-state-updated', handleStateUpdated);

    return () => {
      EventBus.off('game-state-updated', handleStateUpdated);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const action = (event: string, value?: string) => EventBus.emit(event, value);

  const handleNewMaze = () => {
    EventBus.emit('ui-new-maze');
  };

  const handleRestartMaze = () => {
    EventBus.emit('ui-restart-maze');
  };

  const openDrawer = (tab: 'setup' | 'follow') => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const sendDirection = (key: string, down: boolean) => {
    window.dispatchEvent(
      new KeyboardEvent(down ? 'keydown' : 'keyup', {
        key,
        code: key,
        keyCode: ({ ArrowUp: 38, ArrowLeft: 37, ArrowDown: 40, ArrowRight: 39 } as Record<string, number>)[key],
        bubbles: true,
      })
    );
  };

  const directionButton = (key: string, label: string, className: string, icon: React.ReactNode) => (
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

  const auto = gameState?.controlMode === 'AUTONOMOUS';
  const agent = gameState?.agentStatus;
  const mvm = agent?.autonomousMode === 'MVM';
  const isFinished =
    gameState?.gameStatus === 'WON' ||
    gameState?.gameStatus === 'LOST' ||
    gameState?.gameStatus === 'TIMEOUT';

  const renderPrimaryButton = () => {
    if (!auto) {
      if (isFinished) {
        return (
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
            onClick={handleRestartMaze}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Reiniciar</span>
          </button>
        );
      }
      if (gameState?.gameStatus === 'PAUSED') {
        return (
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
            onClick={() => action('ui-toggle-pause')}
          >
            <Play size={15} aria-hidden="true" />
            <span>Retomar</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => action('ui-toggle-pause')}
        >
          <Pause size={15} aria-hidden="true" />
          <span>Pausar</span>
        </button>
      );
    }

    if (gameState?.gameStatus === 'PAUSED') {
      return (
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
          onClick={() => action('ui-toggle-pause')}
        >
          <Play size={15} aria-hidden="true" />
          <span>Continuar</span>
        </button>
      );
    }
    if (isFinished || agent?.state === 'COMPLETED' || agent?.state === 'FAILED') {
      return (
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
          onClick={() => action('ui-agent-start')}
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reiniciar Agente</span>
        </button>
      );
    }
    if (gameState?.gameStatus === 'PLAYING' || gameState?.gameStatus === 'COUNTDOWN') {
      return (
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => action('ui-toggle-pause')}
        >
          <Pause size={15} aria-hidden="true" />
          <span>Pausar</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
        onClick={() => action('ui-agent-start')}
      >
        <Play size={15} aria-hidden="true" />
        <span>Iniciar</span>
      </button>
    );
  };

  return (
    <div className={styles.playContainer}>
      <header className={styles.playHeader}>
        <h1>Arcade</h1>
        <div className={styles.modeSelector} role="group" aria-label="Modo de jogo">
          <button
            type="button"
            aria-pressed={!auto}
            onClick={() => action('ui-set-control-mode', 'HUMAN')}
          >
            <User size={15} aria-hidden="true" />
            <span>Humano</span>
          </button>
          <button
            type="button"
            aria-pressed={auto}
            onClick={() => action('ui-set-control-mode', 'AUTONOMOUS')}
          >
            <Bot size={15} aria-hidden="true" />
            <span>Autônomo</span>
          </button>
        </div>
      </header>

      <main className={styles.boardStage}>
        <section className={styles.board} aria-label="Tabuleiro do Labirinto">
          {/* Faixa horizontal compacta alinhada à largura do tabuleiro */}
          <div className={styles.statusBar} aria-label="Status do jogador">
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Pontuação</span>
              <strong className={`${styles.statusValue} ${styles.scoreValue}`}>
                {gameState ? String(gameState.score).padStart(5, '0') : '00000'}
              </strong>
            </div>

            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>
                <Heart size={13} className={styles.heartIcon} /> Vida
              </span>
              <div className={styles.healthWrap}>
                <strong className={styles.statusValue}>{gameState?.health ?? 100}%</strong>
                <div className={styles.healthBar}>
                  <i
                    style={{
                      width: `${Math.max(0, Math.min(100, gameState?.health ?? 100))}%`,
                      background: (gameState?.health ?? 100) > 40 ? '#4ade80' : '#f87171',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>
                <KeyRound size={13} className={styles.keyIcon} /> Chaves
              </span>
              <strong className={styles.statusValue}>
                {gameState?.keysCollected ?? 0}
                <small className={styles.statusTotal}> / {gameState?.totalKeys ?? 0}</small>
              </strong>
            </div>
          </div>

          {/* Canvas do Labirinto (Phaser 3) */}
          <div className={styles.canvasWrapper}>
            <PhaserGame sceneType="GameScene" />

            {/* Modal de Vitória */}
            {gameState?.gameStatus === 'WON' && (
              <div className={styles.overlayModal} role="region" aria-label="Resultado da partida">
                <div className={styles.modalCardSuccess}>
                  <Trophy size={42} className={styles.victoryIcon} />
                  <h2 className={styles.modalTitle}>VITÓRIA!</h2>
                  <p className={styles.modalText}>
                    Você coletou todas as chaves e superou o labirinto ponderado!
                  </p>
                  <div className={styles.scoreHighlight}>
                    Pontuação Final: <strong>{gameState.score} pts</strong>
                  </div>
                  <button className={styles.modalBtnYellow} onClick={handleNewMaze}>
                    <RotateCcw size={16} /> Jogar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Modal Compacto de Derrota (Game Over) */}
            {gameState?.gameStatus === 'LOST' && (
              <div className={styles.overlayModal} role="region" aria-label="Resultado da partida">
                <div className={styles.modalCardDanger}>
                  <Skull size={34} className={styles.dangerIcon} />
                  <h2 className={styles.modalTitleDanger}>GAME OVER</h2>
                  <p className={styles.modalText}>
                    {gameState.health <= 0
                      ? 'Você sucumbiu à lava ardente!'
                      : 'Os inimigos te capturaram!'}
                  </p>
                  <div className={styles.modalStatsRow}>
                    <span>Pontuação: <strong>{gameState.score} pts</strong></span>
                    <span className={styles.modalStatsDivider}>•</span>
                    <span>Chaves: <strong>{gameState.keysCollected} / {gameState.totalKeys}</strong></span>
                  </div>
                  <button className={styles.modalBtnYellow} onClick={handleRestartMaze}>
                    <RotateCcw size={15} /> Tentar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Modal de Limite Temporal */}
            {gameState?.gameStatus === 'TIMEOUT' && (
              <div className={styles.overlayModal} role="region" aria-label="Resultado da partida">
                <div className={styles.modalCardSuccess}>
                  <Trophy size={42} className={styles.victoryIcon} />
                  <h2 className={styles.modalTitle}>LIMITE TEMPORAL</h2>
                  <p className={styles.modalText}>
                    O agente sobreviveu até o limite temporal de{' '}
                    {(gameState.agentStatus?.matchMetrics?.simulatedTime ?? 120).toFixed(1)} s!
                  </p>
                  <div className={styles.scoreHighlight}>
                    Pontuação Final: <strong>{gameState.score} pts</strong>
                  </div>
                  <button className={styles.modalBtnYellow} onClick={handleNewMaze}>
                    <RotateCcw size={16} /> Jogar Novamente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toolbar horizontal abaixo do tabuleiro */}
          <div className={styles.toolbar} aria-label="Ações da partida">
            {renderPrimaryButton()}

            <button type="button" className={styles.toolBtn} onClick={handleRestartMaze}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Reiniciar</span>
            </button>

            <button type="button" className={styles.toolBtn} onClick={handleNewMaze}>
              <Shuffle size={15} aria-hidden="true" />
              <span>Novo mapa</span>
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              aria-expanded={drawerOpen && drawerTab === 'setup'}
              onClick={() => openDrawer('setup')}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>Configurar</span>
            </button>

            {auto && (
              <button
                type="button"
                className={styles.toolBtn}
                aria-expanded={drawerOpen && drawerTab === 'follow'}
                onClick={() => openDrawer('follow')}
              >
                <Activity size={15} aria-hidden="true" />
                <span>Acompanhar</span>
              </button>
            )}
          </div>

          {/* Resumo textual compacto abaixo da toolbar */}
          <p className={styles.configSummary}>
            {auto ? (
              <>
                {mvm ? 'Máquina vs. Máquina' : 'Demonstração'} &bull;{' '}
                {strategyLabels[agent?.strategy ?? 'MIN_COST'] ?? 'Menor custo'} &bull;{' '}
                {agent?.algorithm ?? 'A*'} &bull; {gameState?.simulationSpeed ?? 1}×
              </>
            ) : (
              <>
                Modo Humano &bull; <kbd>WASD</kbd> ou <kbd>Setas</kbd> para mover &bull;{' '}
                <kbd>P</kbd> para pausar
              </>
            )}
          </p>

          {/* Controles de toque móveis */}
          {!auto && (
            <div className={styles.touchControls} aria-label="Controles de movimento">
              {directionButton('ArrowUp', 'Mover para cima', styles.up, <ChevronUp />)}
              {directionButton('ArrowLeft', 'Mover para esquerda', styles.left, <ChevronLeft />)}
              {directionButton('ArrowDown', 'Mover para baixo', styles.down, <ChevronDown />)}
              {directionButton('ArrowRight', 'Mover para direita', styles.right, <ChevronRight />)}
            </div>
          )}
        </section>
      </main>

      {/* Drawer Lateral (fechado por padrão) */}
      <GameHUD
        state={gameState}
        open={drawerOpen}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
