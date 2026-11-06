import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Pause, Play, MoveRight } from 'lucide-react';
import { MazeGenerator } from '../../game/graph/MazeGenerator';
import { dijkstra } from '../../game/algorithms/Dijkstra';
import type { Node } from '../../game/graph/GraphTypes';
import { CharacterRenderer } from '../../game/rendering/CharacterRenderer';
import { WallRenderer } from '../../game/rendering/WallRenderer';
import GlareHover from '../react-bits/GlareHover';
import styles from './ArcadeIntro.module.css';

export const ArcadeIntro: React.FC<{
  seed: number;
  onPlay: () => void;
  paused: boolean;
  onTogglePause: () => void;
}> = ({ seed, onPlay, paused, onTogglePause }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Phaser.Scene | null>(null);
  const allowedRef = useRef<(() => void) | null>(null);
  const pausedRef = useRef(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    allowedRef.current?.();
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const updatePlayback = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (
        pausedRef.current ||
        preference.matches ||
        !visible ||
        document.hidden
      )
        scene.scene.pause();
      else scene.scene.resume();
    };
    allowedRef.current = updatePlayback;
    const preferenceChanged = () => {
      setReduced(preference.matches);
      updatePlayback();
    };
    setReduced(preference.matches);

    class IntroScene extends Phaser.Scene {
      private characters!: Phaser.GameObjects.Graphics;
      private elapsed = 0;
      private routes: Node[][] = [];
      constructor() {
        super('ArcadeIntro');
      }
      create() {
        const world = new MazeGenerator(25, 25, seed).generateWorld(0.1, 1, 2);
        const walls = this.add.graphics();
        WallRenderer.renderContinuousWalls(
          walls,
          world.grid,
          world.rows,
          world.cols,
          28,
        );
        const dots = this.add.graphics();
        dots.fillStyle(0xffe7ac, 0.9);
        world.graph.vertices.forEach(([r, c]) =>
          dots.fillCircle(c * 28 + 14, r * 28 + 14, 1.7),
        );
        this.routes = [
          dijkstra(world.graph, world.start, world.goal).path,
          dijkstra(world.graph, world.enemySpawn, world.start).path,
          dijkstra(world.graph, world.enemySpawn2, world.goal).path,
        ];
        this.characters = this.add.graphics();
        sceneRef.current = this;
        this.paint();
        updatePlayback();
      }
      private position(route: Node[], offset: number) {
        if (route.length < 2)
          return {
            x: (route[0]?.[1] ?? 1) * 28 + 14,
            y: (route[0]?.[0] ?? 1) * 28 + 14,
            facing: [0, 1] as Node,
          };
        const length = route.length - 1;
        const lap = (this.elapsed * 0.006 + offset) % (length * 2);
        const progress = lap <= length ? lap : length * 2 - lap;
        const index = Math.min(length - 1, Math.floor(progress));
        const a = route[index],
          b = route[index + 1];
        const mix = progress - index,
          direction = lap <= length ? 1 : -1;
        return {
          x: (a[1] + (b[1] - a[1]) * mix) * 28 + 14,
          y: (a[0] + (b[0] - a[0]) * mix) * 28 + 14,
          facing: [
            (b[0] - a[0]) * direction,
            (b[1] - a[1]) * direction,
          ] as Node,
        };
      }
      private paint() {
        this.characters.clear();
        this.routes.forEach((route, i) => {
          const p = this.position(route, i * 5);
          if (i === 0)
            CharacterRenderer.drawPacMan(
              this.characters,
              p.x,
              p.y,
              12,
              p.facing,
              this.elapsed,
              true,
            );
          else if (i === 1)
            CharacterRenderer.drawMinotaur(
              this.characters,
              p.x,
              p.y,
              11.5,
              p.facing,
              false,
              0,
              this.elapsed,
            );
          else
            CharacterRenderer.drawGhost(
              this.characters,
              p.x,
              p.y,
              11.5,
              p.facing,
              false,
              0,
              this.elapsed,
            );
        });
      }
      update(_time: number, delta: number) {
        this.elapsed += Math.min(delta, 50);
        this.paint();
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: 700,
      height: 700,
      backgroundColor: '#070b14',
      pixelArt: true,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [IntroScene],
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.1 },
    );
    observer.observe(container);
    preference.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', updatePlayback);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', updatePlayback);
      allowedRef.current = null;
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [seed]);

  return (
    <figure className={styles.intro}>
      <GlareHover
        style={{ display: 'block', minWidth: 0 }}
        width="100%"
        height="auto"
        borderRadius="18px"
        borderColor="#294575"
        glareColor="#8dc6ff"
        glareOpacity={0.18}
        intro
        transitionDuration={1100}
      >
        <div
          className={styles.stage}
          ref={containerRef}
          role="img"
          aria-label="Pac-Man e dois fantasmas percorrem o labirinto. Demonstração animada do mapa atual."
        />
      </GlareHover>
      <figcaption className={styles.caption}>
        <div>
          <strong>O labirinto espera por você.</strong>
          <span>VISUALIZAÇÃO ILUSTRATIVA · mapa {seed}</span>
        </div>
        <button
          onClick={onTogglePause}
          disabled={reduced}
          aria-label={paused ? 'Retomar animação' : 'Pausar animação'}
          aria-pressed={paused}
        >
          {paused || reduced ? <Play size={15} /> : <Pause size={15} />}
          {reduced ? 'Movimento reduzido' : paused ? 'Retomar' : 'Pausar'}
        </button>
      </figcaption>
      <button className={styles.playLink} onClick={onPlay}>
        Sua vez de jogar <MoveRight size={17} />
      </button>
    </figure>
  );
};
