import type { WorldData } from '../graph/MazeGenerator';
import { nodeToKey } from '../graph/GraphTypes';
import { TerrainType } from '../graph/Terrain';

export const SCORE = { dot: 10, key: 100, pellet: 50, ghost: 200, victory: 500 } as const;

export function createPacDots(world: WorldData): Set<string> {
  const reserved = new Set([world.start, world.goal, ...world.keys,
    ...world.powerPellets, ...world.portalPairs.flat()].map(nodeToKey));
  return new Set(world.graph.vertices.map(nodeToKey).filter(key =>
    !reserved.has(key) && world.terrains.get(key) === TerrainType.NORMAL));
}
