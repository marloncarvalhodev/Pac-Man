/**
 * Componente React de integração com o motor Phaser 3.
 * Responsável pelo ciclo de vida do canvas, redimensionamento e limpeza.
 */

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { LoadingState } from '../components/LoadingState';
import { GraphLabScene } from './scenes/GraphLabScene';

export interface PhaserGameProps {
  sceneType: 'GameScene' | 'GraphLabScene';
  seed?: number;
  onSceneReady?: (scene: Phaser.Scene) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ sceneType, seed, onSceneReady }) => {
  const [ready,setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setReady(false);

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
    let resizeObserver: ResizeObserver | undefined;

    // Inicia a cena solicitada passando dados iniciais
    game.events.once('ready', () => {
      if (sceneType === 'GraphLabScene' && containerRef.current) {
        resizeObserver = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) game.scale.setParentSize(width, height);
        });
        resizeObserver.observe(containerRef.current);
      }
      const Scene = sceneType === 'GameScene' ? GameScene : GraphLabScene;
      const activeScene = game.scene.add(sceneType, Scene, true, { seed });
      setReady(true);
      if (activeScene && onSceneReady) {
        onSceneReady(activeScene);
      }
    });

    return () => {
      resizeObserver?.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sceneType, seed]);

  return (
    <div style={{position:'relative',width:'100%',height:'100%'}}>
    {!ready&&<div style={{position:'absolute',inset:0,zIndex:2,background:'#090d16',overflow:'hidden'}}><LoadingState compact label="Preparando o mapa"/></div>}
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: sceneType === 'GraphLabScene' ? 'block' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
    </div>
  );
};
