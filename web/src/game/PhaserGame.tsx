/**
 * Componente React de integração com o motor Phaser 3.
 * Responsável pelo ciclo de vida do canvas, redimensionamento e limpeza.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GraphLabScene } from './scenes/GraphLabScene';

export interface PhaserGameProps {
  sceneType: 'GameScene' | 'GraphLabScene';
  seed?: number;
  onSceneReady?: (scene: Phaser.Scene) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({
  sceneType,
  seed,
  onSceneReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuração do Phaser 3 Canvas
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 700,
      height: 700,
      backgroundColor: '#090D16',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Inicia a cena solicitada passando dados iniciais
    game.events.once('ready', () => {
      // Register without auto-starting GameScene: only the requested view emits state.
      game.scene.add('GameScene', GameScene, false);
      game.scene.add('GraphLabScene', GraphLabScene, false);
      game.scene.start(sceneType, { seed });
      const activeScene = game.scene.getScene(sceneType);
      if (activeScene && onSceneReady) {
        onSceneReady(activeScene);
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sceneType, seed]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
};
