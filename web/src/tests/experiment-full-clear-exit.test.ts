import { describe, expect, it, vi } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator, type WorldData } from '../game/graph/MazeGenerator';
import { TerrainType } from '../game/graph/Terrain';
import { runMatch, type ExperimentConfig } from '../game/experiment/Experiment';

describe('coleta completa ao cruzar a saída', () => {
  it('atravessa a saída sem encerrar até coletar o ponto além dela', () => {
    const graph = new Graph();
    for (let column=0;column<3;column++) {
      graph.addEdge([0,column],[0,column+1],1);
      graph.addEdge([0,column+1],[0,column],1);
      graph.addStep([0,column],[0,column+1],[0,column+1]);
      graph.addStep([0,column+1],[0,column],[0,column]);
    }
    const world:WorldData={rows:1,cols:4,grid:[[0,0,0,0]],graph,start:[0,0],goal:[0,2],
      keys:[[0,1]],powerPellets:[],portalPairs:[],enemySpawn:[0,3],enemySpawn2:[0,3],seed:42,
      terrains:new Map([['0,0',TerrainType.NORMAL],['0,1',TerrainType.NORMAL],['0,2',TerrainType.NORMAL],['0,3',TerrainType.NORMAL]])};
    const stub=vi.spyOn(MazeGenerator.prototype,'generateWorld').mockReturnValue(world);
    const config:ExperimentConfig={id:'cross-exit',seeds:[42],repetitions:1,strategies:['FULL_CLEAR'],
      algorithm:'Dijkstra',mode:'DEMO',objective:'exit',limitMs:20000};
    try {
      const result=runMatch(config,42,1,'FULL_CLEAR');
      expect(result.outcome).toBe('WON');
      expect(result.dots).toBe(result.initial.dots);
      expect(result.dots).toBe(1);
      expect(result.moves).toBe(4);
    } finally {stub.mockRestore();}
  });
});
