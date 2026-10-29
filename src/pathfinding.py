"""Módulo de Algoritmos de Busca em Grafos (Pathfinding).

Disciplina: Matemática Discreta / Teoria dos Grafos.
Implementação dos algoritmos:
    1. Dijkstra (Algoritmo de caminhos mínimos de fonte única)
    2. A* (A-Star: busca heurística informada ponderada)
    3. Multi-Goal Pathfinding (Caminho Composto para coleta de chaves e objetivo trancado)

Ambos utilizam fila de prioridade (Min-Heap binário via heapq) garantindo
complexidade assintótica O((|V| + |E|) log |V|).
"""

from __future__ import annotations

import heapq
import itertools
import math
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Set, Tuple

try:
    from .graph import Graph, Node
except ImportError:
    from graph import Graph, Node


@dataclass
class PathfindingResult:
    """Estrutura para armazenar métricas e resultados do algoritmo de busca."""

    path: List[Node] = field(default_factory=list)
    cost: float = float("inf")
    nodes_expanded: int = 0
    visited_order: List[Node] = field(default_factory=list)
    execution_time_ms: float = 0.0
    algorithm_name: str = ""

    @property
    def found(self) -> bool:
        """Indica se um caminho válido até o destino foi encontrado."""
        return len(self.path) > 0 and self.cost < float("inf")


def manhattan_distance(u: Node, v: Node) -> float:
    """Heurística de Manhattan h(u, v) = |r1 - r2| + |c1 - c2|."""
    return float(abs(u[0] - v[0]) + abs(u[1] - v[1]))


def euclidean_distance(u: Node, v: Node) -> float:
    """Heurística Euclidiana h(u, v) = sqrt((r1 - r2)^2 + (c1 - c2)^2)."""
    return math.hypot(u[0] - v[0], u[1] - v[1])


def weighted_manhattan(
    u: Node,
    v: Node,
    min_weight: float = 0.3,
    portals: Optional[List[Tuple[Node, Node]]] = None,
) -> float:
    """Heurística admissível para grafos com pesos arbitrários e portais.

    Como qualquer aresta do grid custa pelo menos min_weight (0.3 no piso de aceleração),
    o custo direto é limitado inferiormente por min_weight * manhattan(u, v).
    Se existirem portais com peso unitário 1.0, o atalho não-planar é considerado
    na cota inferior para garantir estrita admissibilidade h(u) <= h*(u).
    """
    direct = min_weight * (abs(u[0] - v[0]) + abs(u[1] - v[1]))
    if not portals:
        return direct

    best = direct
    for p1, p2 in portals:
        # Cota inferior passando pelo portal p1 -> p2
        cost_p1_p2 = (
            min_weight * (abs(u[0] - p1[0]) + abs(u[1] - p1[1]))
            + 1.0
            + min_weight * (abs(p2[0] - v[0]) + abs(p2[1] - v[1]))
        )
        # Cota inferior passando pelo portal p2 -> p1
        cost_p2_p1 = (
            min_weight * (abs(u[0] - p2[0]) + abs(u[1] - p2[1]))
            + 1.0
            + min_weight * (abs(p1[0] - v[0]) + abs(p1[1] - v[1]))
        )
        if cost_p1_p2 < best:
            best = cost_p1_p2
        if cost_p2_p1 < best:
            best = cost_p2_p1

    return best


def dijkstra(graph: Graph, start: Node, goal: Node) -> PathfindingResult:
    """Executa o algoritmo de Dijkstra em grafo ponderado G = (V, E, w).

    Equivale ao A* com heurística nula h(n) = 0.
    Explora isotropicamente em ordem de menor custo acumulado g(n).

    Complexidade:
        Tempo: O((|V| + |E|) log |V|)
        Espaço: O(|V|)
    """
    start_time = time.perf_counter()

    dist: Dict[Node, float] = {start: 0.0}
    came_from: Dict[Node, Node] = {}
    counter = 0
    pq: List[Tuple[float, int, Node]] = [(0.0, counter, start)]
    visited_order: List[Node] = []
    settled: Set[Node] = set()

    while pq:
        current_dist, _, current = heapq.heappop(pq)

        if current in settled:
            continue
        settled.add(current)
        visited_order.append(current)

        if current == goal:
            break

        for neighbor, weight in graph.neighbors(current):
            new_cost = current_dist + weight
            if new_cost < dist.get(neighbor, float("inf")):
                dist[neighbor] = new_cost
                came_from[neighbor] = current
                counter += 1
                heapq.heappush(pq, (new_cost, counter, neighbor))

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    path: List[Node] = []
    if goal in came_from or start == goal:
        curr: Optional[Node] = goal
        while curr is not None:
            path.append(curr)
            curr = came_from.get(curr)
        path.reverse()
        total_cost = dist.get(goal, float("inf"))
    else:
        total_cost = float("inf")

    return PathfindingResult(
        path=path,
        cost=total_cost,
        nodes_expanded=len(visited_order),
        visited_order=visited_order,
        execution_time_ms=elapsed_ms,
        algorithm_name="Dijkstra",
    )


def a_star(
    graph: Graph,
    start: Node,
    goal: Node,
    heuristic: Optional[Callable[[Node, Node], float]] = None,
    portals: Optional[List[Tuple[Node, Node]]] = None,
    min_weight: Optional[float] = None,
) -> PathfindingResult:
    """Executa o algoritmo A* (A-Star) ponderado com heurística admissível.

    Função de avaliação: f(n) = g(n) + h(n)
        g(n): custo exato acumulado da origem até n pelas arestas ponderadas
        h(n): estimativa heurística admissível do custo de n até o destino
    """
    start_time = time.perf_counter()

    if heuristic is None:
        effective_min_w = min_weight if min_weight is not None else (0.3 if portals else 1.0)
        h_fn = lambda u, v: weighted_manhattan(u, v, min_weight=effective_min_w, portals=portals)
    else:
        h_fn = heuristic

    g_score: Dict[Node, float] = {start: 0.0}
    f_score: Dict[Node, float] = {start: h_fn(start, goal)}

    came_from: Dict[Node, Node] = {}
    counter = 0
    pq: List[Tuple[float, int, Node]] = [(f_score[start], counter, start)]
    visited_order: List[Node] = []
    settled: Set[Node] = set()

    while pq:
        _, _, current = heapq.heappop(pq)

        if current in settled:
            continue
        settled.add(current)
        visited_order.append(current)

        if current == goal:
            break

        for neighbor, weight in graph.neighbors(current):
            tentative_g = g_score[current] + weight
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_val = tentative_g + h_fn(neighbor, goal)
                f_score[neighbor] = f_val
                counter += 1
                heapq.heappush(pq, (f_val, counter, neighbor))

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    path: List[Node] = []
    if goal in came_from or start == goal:
        curr: Optional[Node] = goal
        while curr is not None:
            path.append(curr)
            curr = came_from.get(curr)
        path.reverse()
        total_cost = g_score.get(goal, float("inf"))
    else:
        total_cost = float("inf")

    return PathfindingResult(
        path=path,
        cost=total_cost,
        nodes_expanded=len(visited_order),
        visited_order=visited_order,
        execution_time_ms=elapsed_ms,
        algorithm_name="A*",
    )


def solve_multi_goal(
    graph: Graph,
    start: Node,
    keys: List[Node],
    goal: Node,
    algorithm: str = "A*",
    portals: Optional[List[Tuple[Node, Node]]] = None,
) -> PathfindingResult:
    """Calcula o caminho ótimo composto passando por todas as chaves pendentes antes do destino final.

    Se houver chaves pendentes, resolve o problema de ordenação ótima (Traveling Salesperson sub-problem):
    Para |K| <= 2, avalia todas as permutações da ordem de visitação e seleciona
    a cadeia de menor custo ponderado total: Start -> Key_i -> Key_j -> Goal.

    Retorna um PathfindingResult consolidado contendo:
    - O caminho completo contínuo
    - Custo acumulado total
    - Ordem de nós explorados na busca para animação
    """
    start_time = time.perf_counter()

    def single_search(s: Node, g: Node) -> PathfindingResult:
        if algorithm == "Dijkstra":
            return dijkstra(graph, s, g)
        return a_star(graph, s, g, portals=portals)

    # Caso base: sem chaves pendentes, caminho direto até o destino
    if not keys:
        res = single_search(start, goal)
        res.algorithm_name = f"{algorithm} (Multi-Goal)"
        return res

    best_total_cost = float("inf")
    best_full_path: List[Node] = []
    combined_visited_order: List[Node] = []
    total_expanded = 0

    # Avalia permutações da ordem de coleta das chaves
    key_permutations = list(itertools.permutations(keys))

    for perm in key_permutations:
        waypoints = [start] + list(perm) + [goal]
        current_perm_cost = 0.0
        current_perm_path: List[Node] = []
        possible = True

        for i in range(len(waypoints) - 1):
            sub_res = single_search(waypoints[i], waypoints[i + 1])
            if not sub_res.found:
                possible = False
                break
            current_perm_cost += sub_res.cost
            # Evita duplicar o vértice de conexão na junção
            if current_perm_path:
                current_perm_path.extend(sub_res.path[1:])
            else:
                current_perm_path.extend(sub_res.path)

        if possible and current_perm_cost < best_total_cost:
            best_total_cost = current_perm_cost
            best_full_path = current_perm_path

    # Para animação visual: realiza as buscas correspondentes à melhor permutação
    # e compila a sequência dos nós expandidos
    if best_full_path and keys:
        # Descobre a melhor permutação encontrada
        curr = start
        remaining_keys = set(keys)
        ordered_waypoints = [start]
        while remaining_keys:
            # Encontra a chave da rota correspondente
            next_k = min(
                remaining_keys,
                key=lambda k: single_search(curr, k).cost
            )
            sub_res = single_search(curr, next_k)
            combined_visited_order.extend(sub_res.visited_order)
            total_expanded += sub_res.nodes_expanded
            ordered_waypoints.append(next_k)
            remaining_keys.remove(next_k)
            curr = next_k

        sub_final = single_search(curr, goal)
        combined_visited_order.extend(sub_final.visited_order)
        total_expanded += sub_final.nodes_expanded

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return PathfindingResult(
        path=best_full_path,
        cost=best_total_cost,
        nodes_expanded=total_expanded if total_expanded > 0 else len(combined_visited_order),
        visited_order=combined_visited_order,
        execution_time_ms=elapsed_ms,
        algorithm_name=f"{algorithm} (Chaves -> Destino)",
    )
