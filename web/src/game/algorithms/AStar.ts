import type { Graph } from '../graph/Graph';
import type { Node } from '../graph/GraphTypes';
import { searchGraph, type SearchOptions } from './SearchEngine';
export interface AStarOptions extends SearchOptions {
  portals?: Array<[Node, Node]>;
}
export function aStar(
  graph: Graph,
  start: Node,
  goal: Node,
  options: AStarOptions = {},
) {
  return searchGraph(graph, start, [goal], 'A*', options);
}
