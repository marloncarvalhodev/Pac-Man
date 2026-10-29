"""Buscas ótimas em grafos direcionados com pesos finitos não negativos."""
from __future__ import annotations

import heapq
import itertools
import math
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

try:
    from .graph import Graph, Node
except ImportError:
    from graph import Graph, Node


@dataclass
class PathfindingResult:
    path: List[Node] = field(default_factory=list)
    cost: float = float("inf")
    nodes_expanded: int = 0
    visited_order: List[Node] = field(default_factory=list)
    execution_time_ms: float = 0.0
    algorithm_name: str = ""
    key_order: List[Node] = field(default_factory=list)
    segments: List[PathfindingResult] = field(default_factory=list)
    search_results: List[PathfindingResult] = field(default_factory=list)

    @property
    def found(self) -> bool:
        return bool(self.path) and math.isfinite(self.cost)

    @property
    def moves(self) -> int:
        return max(0, len(self.path) - 1)

    @property
    def total_nodes_expanded(self) -> int:
        """Todas as buscas realmente executadas, incluindo ordens descartadas."""
        return sum(r.nodes_expanded for r in self.search_results) if self.search_results else self.nodes_expanded


def manhattan_distance(u: Node, v: Node) -> float:
    return float(abs(u[0] - v[0]) + abs(u[1] - v[1]))


def euclidean_distance(u: Node, v: Node) -> float:
    return math.hypot(u[0] - v[0], u[1] - v[1])


def weighted_manhattan(u: Node, v: Node, min_weight: float = 0.3,
                       portals: Optional[List[Tuple[Node, Node]]] = None) -> float:
    """Cota para grade ortogonal; com portais sem grafo, usa a cota segura zero."""
    return 0.0 if portals else min_weight * manhattan_distance(u, v)


def graph_manhattan_scale(graph: Graph, min_weight: Optional[float] = None) -> float:
    """alpha = min w(u,v)/L1(u,v), para todo arco não laço.

    Pela desigualdade triangular, alpha*L1(u,alvo) <= w(u,v)+alpha*L1(v,alvo).
    Portanto h é consistente e admissível, mesmo com atalhos, pesos assimétricos
    e múltiplos portais. Arcos de custo zero podem reduzir alpha a zero.
    """
    scale = min((w / manhattan_distance(u, v)
                 for u in graph.vertices for v, w in graph.neighbors(u) if u != v), default=0.0)
    if min_weight is not None:
        if not math.isfinite(min_weight) or min_weight < 0:
            raise ValueError("Escala heurística deve ser finita e não negativa")
        scale = min(scale, min_weight)
    return scale


def _search(graph: Graph, start: Node, goal: Node,
            heuristic: Callable[[Node, Node], float], name: str) -> PathfindingResult:
    start_time = time.perf_counter()
    result = PathfindingResult(algorithm_name=name)
    if start not in graph.vertices or goal not in graph.vertices:
        result.execution_time_ms = (time.perf_counter() - start_time) * 1000
        return result
    dist: Dict[Node, float] = {start: 0.0}
    came_from: Dict[Node, Node] = {}
    counter = 0
    # Guarda g na fila para ignorar entradas obsoletas e permitir reaberturas.
    pq = [(heuristic(start, goal), counter, 0.0, start)]
    while pq:
        _, _, current_dist, current = heapq.heappop(pq)
        if current_dist != dist.get(current):
            continue
        result.visited_order.append(current)
        if current == goal:
            result.cost = current_dist
            result.path = [goal]
            while result.path[-1] != start:
                result.path.append(came_from[result.path[-1]])
            result.path.reverse()
            break
        for neighbor, weight in graph.neighbors(current):
            new_cost = current_dist + weight
            if new_cost < dist.get(neighbor, float("inf")):
                dist[neighbor] = new_cost
                came_from[neighbor] = current
                counter += 1
                heapq.heappush(pq, (new_cost + heuristic(neighbor, goal), counter, new_cost, neighbor))
    result.nodes_expanded = len(result.visited_order)
    result.execution_time_ms = (time.perf_counter() - start_time) * 1000
    return result


def dijkstra(graph: Graph, start: Node, goal: Node) -> PathfindingResult:
    """Fila min-heap, relaxamento e reconstrução; conta retiradas válidas (inclui alvo)."""
    return _search(graph, start, goal, lambda u, v: 0.0, "Dijkstra")


def a_star(graph: Graph, start: Node, goal: Node,
           heuristic: Optional[Callable[[Node, Node], float]] = None,
           portals: Optional[List[Tuple[Node, Node]]] = None,
           min_weight: Optional[float] = None) -> PathfindingResult:
    """A* com escala obtida dos arcos reais; portais são parte do próprio grafo.

    Heurística externa deve ser admissível e valer zero no alvo. Reaberturas
    permitem heurísticas admissíveis inconsistentes. Tempo inclui preparo de h.
    """
    start_time = time.perf_counter()
    if heuristic is None:
        scale = graph_manhattan_scale(graph, min_weight)
        heuristic = lambda u, v: scale * manhattan_distance(u, v)
    result = _search(graph, start, goal, heuristic, "A*")
    result.execution_time_ms = (time.perf_counter() - start_time) * 1000
    return result


def solve_multi_goal(graph: Graph, start: Node, keys: List[Node], goal: Node,
                     algorithm: str = "A*",
                     portals: Optional[List[Tuple[Node, Node]]] = None) -> PathfindingResult:
    """Enumera ordens de chaves com cache de segmentos direcionados.

    Animação/expansões referem-se aos segmentos escolhidos. search_results e
    total_nodes_expanded guardam o trabalho de todas as alternativas; o tempo
    abrange a otimização completa. key_order segue a primeira coleta na rota.
    """
    started = time.perf_counter()
    if algorithm not in ("A*", "Dijkstra"):
        raise ValueError("Algoritmo desconhecido")
    cache = {}
    best_segments = []
    best_cost = float("inf")
    unique_keys = list(dict.fromkeys(keys))
    for order in itertools.permutations(unique_keys):
        waypoints = [start, *order, goal]
        segments = []
        for s, g in zip(waypoints, waypoints[1:]):
            if (s, g) not in cache:
                cache[s, g] = dijkstra(graph, s, g) if algorithm == "Dijkstra" else a_star(graph, s, g, portals=portals)
            res = cache[s, g]
            if not res.found:
                break
            segments.append(res)
        else:
            cost = sum(r.cost for r in segments)
            if cost < best_cost:
                best_cost, best_segments = cost, segments
    path = []
    visited = []
    for res in best_segments:
        path.extend(res.path[1:] if path else res.path)
        visited.extend(res.visited_order)
    encountered = set()
    key_order = []
    for node in path:
        if node in unique_keys and node not in encountered:
            encountered.add(node)
            key_order.append(node)
    return PathfindingResult(
        path=path, cost=best_cost, nodes_expanded=len(visited), visited_order=visited,
        execution_time_ms=(time.perf_counter() - started) * 1000,
        algorithm_name=f"{algorithm} (Chaves -> Saída)", key_order=key_order,
        segments=best_segments, search_results=list(cache.values()))
