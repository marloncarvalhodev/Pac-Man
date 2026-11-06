import React, { useEffect, useMemo, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { makeArenaWorld, getArenaDots } from '../../game/arena/simulation';
import { CanvasGraphics } from '../../game/arena/canvasGraphics';
import { CharacterRenderer } from '../../game/rendering/CharacterRenderer';
import { WallRenderer } from '../../game/rendering/WallRenderer';
import { nodeToKey } from '../../game/graph/GraphTypes';
import { TERRAIN_METADATA, TerrainType } from '../../game/graph/Terrain';
import {
  STATUS_LABELS,
  TACTICS,
  type ArenaResult,
} from '../../game/arena/types';
import styles from '../../pages/ArenaPage.module.css';

function frameAt(result: ArenaResult, time: number) {
  const frames = result.frames!;
  let low = 0,
    high = frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (frames[mid].timeMs <= time) low = mid;
    else high = mid - 1;
  }
  return { frame: frames[low], index: low };
}
function ReplayBoard({ result, time }: { result: ArenaResult; time: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useMemo(() => makeArenaWorld(result.seed), [result.seed]);
  const wallLayer = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (ctx)
      WallRenderer.renderContinuousWalls(
        new CanvasGraphics(ctx) as unknown as Phaser.GameObjects.Graphics,
        world.grid,
        25,
        25,
        28,
      );
    return canvas;
  }, [world]);
  const { frame, index } = frameAt(result, time);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 700, 700);
    ctx.drawImage(wallLayer, 0, 0);
    const g = new CanvasGraphics(ctx) as unknown as Phaser.GameObjects.Graphics;
    for (const [key, terrain] of world.terrains)
      if (terrain !== TerrainType.NORMAL) {
        const [r, c] = key.split(',').map(Number);
        ctx.fillStyle = TERRAIN_METADATA[terrain].colorHex;
        ctx.fillRect(c * 28 + 2, r * 28 + 2, 24, 24);
      }
    const visited = new Set(
      result.frames!.slice(0, index + 1).map((f) => nodeToKey(f.player)),
    );
    for (const key of getArenaDots(world))
      if (!visited.has(key)) {
        const [r, c] = key.split(',').map(Number);
        ctx.fillStyle = '#f9d98b';
        ctx.beginPath();
        ctx.arc(c * 28 + 14, r * 28 + 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    for (const key of world.keys)
      if (!visited.has(nodeToKey(key)))
        CharacterRenderer.drawKey(
          g,
          key[1] * 28 + 14,
          key[0] * 28 + 14,
          28,
          0.5,
        );
    for (const pellet of world.powerPellets)
      if (!visited.has(nodeToKey(pellet)))
        CharacterRenderer.drawPowerPellet(
          g,
          pellet[1] * 28 + 14,
          pellet[0] * 28 + 14,
          28,
          0.5,
        );
    for (const pair of world.portalPairs)
      for (const node of pair)
        CharacterRenderer.drawPortal(
          g,
          node[1] * 28 + 14,
          node[0] * 28 + 14,
          28,
          0xa66bff,
          0.5,
        );
    if (frame.keys === world.keys.length)
      CharacterRenderer.drawExitPortal(
        g,
        world.goal[1] * 28 + 14,
        world.goal[0] * 28 + 14,
        22,
        0.5,
      );
    else
      CharacterRenderer.drawLock(
        g,
        world.goal[1] * 28 + 14,
        world.goal[0] * 28 + 14,
        18,
      );
    CharacterRenderer.drawPacMan(
      g,
      frame.player[1] * 28 + 14,
      frame.player[0] * 28 + 14,
      11,
      frame.facing,
      time,
      time < result.elapsedMs,
    );
    frame.enemies.forEach((node, i) => {
      const draw =
        i === 0
          ? CharacterRenderer.drawMinotaur.bind(CharacterRenderer)
          : CharacterRenderer.drawGhost.bind(CharacterRenderer);
      draw(
        g,
        node[1] * 28 + 14,
        node[0] * 28 + 14,
        11,
        [0, 1],
        frame.powered,
        7,
        time,
      );
    });
  }, [frame, index, result, world, wallLayer, time]);
  return (
    <figure className={styles.replayBoard}>
      <figcaption>
        <strong>{result.agent.name}</strong>
        <span>
          {result.agent.algorithm} · {TACTICS[result.agent.tactic].name}
        </span>
      </figcaption>
      <canvas
        ref={ref}
        width={700}
        height={700}
        aria-label={`Replay de ${result.agent.name} no mapa ${result.seed}, ${frame.score} pontos`}
      />
      <div className={styles.replayStats}>
        <span>
          <b>{frame.score}</b> pontos
        </span>
        <span>
          <b>
            {frame.dots}/{result.totalDots}
          </b>{' '}
          coletas
        </span>
        <span>
          <b>{frame.health}%</b> vida
        </span>
      </div>
      <p className={styles.resultStatus}>
        {time >= result.elapsedMs
          ? STATUS_LABELS[result.status]
          : 'Em percurso'}{' '}
        · {(Math.min(time, result.elapsedMs) / 1000).toFixed(2)}s
      </p>
    </figure>
  );
}
export function ArenaReplay({ results }: { results: ArenaResult[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(4);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false);
    });
    if (sectionRef.current) observer.observe(sectionRef.current);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const duration = Math.max(...results.map((r) => r.elapsedMs), 1);
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      last = 0;
    const frame = (now: number) => {
      if (document.hidden) last = 0;
      else if (last)
        setTime((t) =>
          Math.min(duration, t + Math.min(now - last, 100) * speed),
        );
      last = document.hidden ? 0 : now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [playing, speed, duration]);
  useEffect(() => {
    if (time >= duration) setPlaying(false);
  }, [time, duration]);
  return (
    <section
      ref={sectionRef}
      className={styles.replay}
      aria-labelledby="replay-title"
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="replay-title">Veja as máquinas em ação</h2>
          <p>Replay sincronizado da primeira rodada · mapa {results[0].seed}</p>
        </div>
      </div>
      <div className={styles.replayControls}>
        <button
          className={styles.secondary}
          onClick={() => {
            if (time >= duration) setTime(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
          {playing ? 'Pausar replay' : 'Reproduzir duelo'}
        </button>
        <button
          className={styles.iconButton}
          aria-label="Reiniciar replay"
          onClick={() => {
            setTime(0);
            setPlaying(false);
          }}
        >
          <RotateCcw size={17} />
        </button>
        <label>
          Velocidade{' '}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={1}>1×</option>
            <option value={4}>4×</option>
            <option value={16}>16×</option>
          </select>
        </label>
        <span className={styles.numeric}>
          {(time / 1000).toFixed(1)} / {(duration / 1000).toFixed(1)}s
        </span>
        <input
          className={styles.timeline}
          type="range"
          min={0}
          max={duration}
          step={20}
          value={time}
          aria-label="Instante do replay"
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.target.value));
          }}
        />
      </div>
      <div className={styles.replayGrid}>
        {results.map((result) => (
          <ReplayBoard key={result.id} result={result} time={time} />
        ))}
      </div>
    </section>
  );
}
