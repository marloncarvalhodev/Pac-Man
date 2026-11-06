import type { Graph } from '../graph/Graph';
import type { Node } from '../graph/GraphTypes';
import { searchGraph, type SearchOptions } from './SearchEngine';
export function dijkstra(
  graph: Graph,
  start: Node,
  goal: Node,
  options: Pick<SearchOptions, 'recordFrontier'> = {},
) {
  return searchGraph(graph, start, [goal], 'Dijkstra', options);
}
