"""Módulo de Representação Matemática de Grafos e Geração de Labirintos.

Disciplina: Matemática Discreta / Teoria dos Grafos.
Modelagem formal:
    G = (V, E, w)
    onde:
        - V: conjunto de vértices representando coordenadas transitáveis (r, c) in Z^2
        - E: conjunto de arestas representando adjacências ortogonais entre células livres
             e conexões não-planares via portais de teleporte
        - w: E -> R+ função de peso das arestas (custo de travessia conforme o terreno)
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, Iterator, List, Optional, Set, Tuple

# Definição de tipos matemáticos
Node = Tuple[int, int]  # Coordenada (linha, coluna) no plano cartesiano discreto


class TerrainType:
    """Tipos de terrenos no grafo ponderado e seus respectivos identificadores."""

    NORMAL = "NORMAL"      # Piso normal transitável
    MUD = "MUD"            # Pântano / Lama (reduz velocidade)
    BOOST = "BOOST"        # Piso de Aceleração / Esteira (acelera)
    LAVA = "LAVA"          # Área de Lava / Dano (alto custo/risco)


# Função de ponderação w: E -> R+ associada a entrar em cada tipo de célula
TERRAIN_COSTS: Dict[str, float] = {
    TerrainType.NORMAL: 1.0,
    TerrainType.MUD: 4.0,
    TerrainType.BOOST: 0.3,
    TerrainType.LAVA: 8.0,
}


@dataclass
class WorldData:
    """Estrutura completa do ambiente do jogo e do grafo ponderado."""

    grid: List[List[int]]
    graph: Graph
    start: Node
    goal: Node
    terrains: Dict[Node, str] = field(default_factory=dict)
    portal_pairs: List[Tuple[Node, Node]] = field(default_factory=list)
    keys: List[Node] = field(default_factory=list)
    enemy_spawn: Node = (1, 1)


class Graph:
    """Representação formal de um grafo ponderado G = (V, E, w).

    Implementado via Listas de Adjacência utilizando tabelas hash para
    garantir consultas de vizinhança em complexidade média O(1).
    Suporta arestas direcionadas ou bidirecionais com pesos arbitrários não-negativos.
    """

    def __init__(self) -> None:
        # Mapeamento: u -> {v: w(u, v)}
        self._adj: Dict[Node, Dict[Node, float]] = {}

    @property
    def vertices(self) -> Set[Node]:
        """Retorna o conjunto de vértices V do grafo."""
        return set(self._adj.keys())

    @property
    def order(self) -> int:
        """Ordem do grafo |V| (número de vértices)."""
        return len(self._adj)

    @property
    def size(self) -> int:
        """Tamanho do grafo |E| (número de arestas direcionadas ou pares não-dirigidos)."""
        total = sum(len(nbrs) for nbrs in self._adj.values())
        return total // 2

    def add_vertex(self, u: Node) -> None:
        """Adiciona um vértice u pertencente a V, caso ainda não exista."""
        if u not in self._adj:
            self._adj[u] = {}

    def add_edge(
        self, u: Node, v: Node, weight: float = 1.0, bidirectional: bool = True
    ) -> None:
        """Adiciona uma aresta (u, v) com peso w(u, v) ao grafo."""
        self.add_vertex(u)
        self.add_vertex(v)
        self._adj[u][v] = weight
        if bidirectional:
            self._adj[v][u] = weight

    def neighbors(self, u: Node) -> Iterator[Tuple[Node, float]]:
        """Retorna iterador sobre vizinhos de u e o peso da aresta: (v, w(u, v))."""
        if u not in self._adj:
            return iter(())
        return iter(self._adj[u].items())

    def get_edge_weight(self, u: Node, v: Node) -> Optional[float]:
        """Retorna o peso w(u, v) da aresta entre u e v, ou None se não existir."""
        if u in self._adj and v in self._adj[u]:
            return self._adj[u][v]
        return None

    def degree(self, u: Node) -> int:
        """Retorna o grau deg(u) do vértice (número de arestas saindo de u)."""
        return len(self._adj.get(u, {}))

    def has_edge(self, u: Node, v: Node) -> bool:
        """Verifica se existe aresta (u, v) em E."""
        return u in self._adj and v in self._adj[u]

    def clear(self) -> None:
        """Limpa todos os vértices e arestas do grafo."""
        self._adj.clear()


class MazeGenerator:
    """Gerador de labirintos e mundos ponderados baseado em Teoria dos Grafos.

    Constrói labirintos perfeitos (árvores geradoras, grafos conexos e acíclicos)
    através do algoritmo Randomized Depth-First Search (Recursive Backtracker),
    com opção de introduzir ciclos (remover paredes) para permitir caminhos alternativos,
    terrenos com pesos distintos e portais de teleporte (arestas não-planares).
    """

    def __init__(self, rows: int, cols: int, seed: Optional[int] = None) -> None:
        """Inicializa as dimensões da grade do labirinto."""
        self.rows = rows if rows % 2 != 0 else rows + 1
        self.cols = cols if cols % 2 != 0 else cols + 1
        if seed is not None:
            random.seed(seed)

    def generate(self, extra_loops_ratio: float = 0.05) -> Tuple[List[List[int]], Graph, Node, Node]:
        """Gera o labirinto padrão não-ponderado (peso unitário 1.0) para compatibilidade retroativa.

        Retorna:
            grid: Matriz 2D onde 1 = Parede, 0 = Caminho livre
            graph: Instância de Graph contendo nós e arestas transitáveis com peso 1.0
            start: Coordenada de início (1, 1)
            end: Coordenada de objetivo (rows - 2, cols - 2)
        """
        grid = self._carve_maze(extra_loops_ratio)
        start_cell: Node = (1, 1)
        end_cell: Node = (self.rows - 2, self.cols - 2)
        grid[start_cell[0]][start_cell[1]] = 0
        grid[end_cell[0]][end_cell[1]] = 0

        graph = Graph()
        for r in range(self.rows):
            for c in range(self.cols):
                if grid[r][c] == 0:
                    u = (r, c)
                    graph.add_vertex(u)
                    for dr, dc in [(1, 0), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < self.rows and 0 <= nc < self.cols and grid[nr][nc] == 0:
                            v = (nr, nc)
                            graph.add_edge(u, v, weight=1.0, bidirectional=True)

        return grid, graph, start_cell, end_cell

    def _carve_maze(self, extra_loops_ratio: float) -> List[List[int]]:
        """Gera a geometria do labirinto escavando paredes via DFS e adicionando ciclos."""
        grid: List[List[int]] = [[1 for _ in range(self.cols)] for _ in range(self.rows)]
        start_cell: Node = (1, 1)
        grid[start_cell[0]][start_cell[1]] = 0

        stack: List[Node] = [start_cell]
        visited: Set[Node] = {start_cell}
        directions = [(-2, 0), (2, 0), (0, -2), (0, 2)]

        while stack:
            current = stack[-1]
            r, c = current
            unvisited_neighbors: List[Tuple[Node, Node]] = []
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 1 <= nr < self.rows - 1 and 1 <= nc < self.cols - 1:
                    neighbor = (nr, nc)
                    if neighbor not in visited:
                        wall = (r + dr // 2, c + dc // 2)
                        unvisited_neighbors.append((neighbor, wall))

            if unvisited_neighbors:
                next_cell, wall_between = random.choice(unvisited_neighbors)
                grid[wall_between[0]][wall_between[1]] = 0
                grid[next_cell[0]][next_cell[1]] = 0
                visited.add(next_cell)
                stack.append(next_cell)
            else:
                stack.pop()

        # Adiciona ciclos para múltiplos caminhos e rotas alternativas
        if extra_loops_ratio > 0.0:
            for r in range(1, self.rows - 1):
                for c in range(1, self.cols - 1):
                    if grid[r][c] == 1:
                        is_h_divider = (
                            grid[r][c - 1] == 0
                            and grid[r][c + 1] == 0
                            and grid[r - 1][c] == 1
                            and grid[r + 1][c] == 1
                        )
                        is_v_divider = (
                            grid[r - 1][c] == 0
                            and grid[r + 1][c] == 0
                            and grid[r][c - 1] == 1
                            and grid[r][c + 1] == 1
                        )
                        if (is_h_divider or is_v_divider) and random.random() < extra_loops_ratio:
                            grid[r][c] = 0

        return grid

    def generate_world(
        self,
        extra_loops_ratio: float = 0.10,
        num_portal_pairs: int = 1,
        num_keys: int = 2,
    ) -> WorldData:
        """Gera um mundo com terrenos ponderados, portais não-planares e chaves."""
        grid = self._carve_maze(extra_loops_ratio)
        start_cell: Node = (1, 1)
        end_cell: Node = (self.rows - 2, self.cols - 2)
        grid[start_cell[0]][start_cell[1]] = 0
        grid[end_cell[0]][end_cell[1]] = 0

        # Lista de todas as células transitáveis
        open_cells: List[Node] = [
            (r, c)
            for r in range(self.rows)
            for c in range(self.cols)
            if grid[r][c] == 0
        ]

        # Distribuição de Terrenos com Pesos
        terrains: Dict[Node, str] = {cell: TerrainType.NORMAL for cell in open_cells}

        # Gera clusters de Lama (MUD) - peso 4.0
        num_mud_clusters = max(2, (self.rows * self.cols) // 180)
        for _ in range(num_mud_clusters):
            seed_cell = random.choice(open_cells)
            if seed_cell in (start_cell, end_cell):
                continue
            curr = seed_cell
            for _ in range(random.randint(3, 7)):
                terrains[curr] = TerrainType.MUD
                nbrs = [
                    (curr[0] + dr, curr[1] + dc)
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                    if (curr[0] + dr, curr[1] + dc) in terrains
                ]
                if nbrs:
                    curr = random.choice(nbrs)

        # Gera poças de Lava (LAVA) - peso 8.0 (bloqueios caros/perigosos)
        num_lava_pools = max(2, (self.rows * self.cols) // 220)
        for _ in range(num_lava_pools):
            seed_cell = random.choice(open_cells)
            if seed_cell in (start_cell, end_cell):
                continue
            curr = seed_cell
            for _ in range(random.randint(2, 4)):
                if curr not in (start_cell, end_cell):
                    terrains[curr] = TerrainType.LAVA
                nbrs = [
                    (curr[0] + dr, curr[1] + dc)
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                    if (curr[0] + dr, curr[1] + dc) in terrains
                    and (curr[0] + dr, curr[1] + dc) not in (start_cell, end_cell)
                ]
                if nbrs:
                    curr = random.choice(nbrs)

        # Gera esteiras de Aceleração (BOOST) - peso 0.3 (corredores rápidos)
        num_boost_strips = max(2, (self.rows * self.cols) // 200)
        for _ in range(num_boost_strips):
            seed_cell = random.choice(open_cells)
            dr, dc = random.choice([(0, 1), (1, 0)])
            curr = seed_cell
            for _ in range(random.randint(2, 5)):
                if curr in terrains and curr not in (start_cell, end_cell) and terrains[curr] != TerrainType.LAVA:
                    terrains[curr] = TerrainType.BOOST
                next_c = (curr[0] + dr, curr[1] + dc)
                if next_c in terrains:
                    curr = next_c
                else:
                    break

        # Garante piso normal em start e goal
        terrains[start_cell] = TerrainType.NORMAL
        terrains[end_cell] = TerrainType.NORMAL

        # Constrói o Grafo Ponderado G = (V, E, w)
        # O peso de transição u -> v é o custo para entrar no terreno de v
        graph = Graph()
        for cell in open_cells:
            graph.add_vertex(cell)

        for u in open_cells:
            r, c = u
            for dr, dc in [(1, 0), (0, 1), (-1, 0), (0, -1)]:
                nr, nc = r + dr, c + dc
                v = (nr, nc)
                if v in terrains:
                    cost_v = TERRAIN_COSTS[terrains[v]]
                    graph.add_edge(u, v, weight=cost_v, bidirectional=False)

        # Seleciona pares de Portais de Teleporte (Grafos Não-Planares)
        # Portais conectam dois nós distantes com peso 1.0
        candidate_portal_cells = [
            c for c in open_cells
            if c != start_cell and c != end_cell and terrains[c] == TerrainType.NORMAL
        ]
        portal_pairs: List[Tuple[Node, Node]] = []
        min_portal_dist = (self.rows + self.cols) // 3

        for _ in range(num_portal_pairs):
            if len(candidate_portal_cells) < 4:
                break
            p1 = random.choice(candidate_portal_cells)
            distant_candidates = [
                c for c in candidate_portal_cells
                if abs(c[0] - p1[0]) + abs(c[1] - p1[1]) >= min_portal_dist
            ]
            if distant_candidates:
                p2 = random.choice(distant_candidates)
                portal_pairs.append((p1, p2))
                candidate_portal_cells.remove(p1)
                candidate_portal_cells.remove(p2)
                # Adiciona aresta não-planar bidirecional de peso 1.0 no grafo
                graph.add_edge(p1, p2, weight=1.0, bidirectional=True)

        # Seleciona Chaves Colecionáveis Douradas
        portal_nodes = {p for pair in portal_pairs for p in pair}
        candidate_key_cells = [
            c for c in open_cells
            if c != start_cell
            and c != end_cell
            and c not in portal_nodes
            and terrains[c] != TerrainType.LAVA
            and (abs(c[0] - start_cell[0]) + abs(c[1] - start_cell[1]) >= 4)
        ]

        keys: List[Node] = []
        num_keys_to_spawn = min(num_keys, len(candidate_key_cells))
        if num_keys_to_spawn > 0:
            keys = random.sample(candidate_key_cells, num_keys_to_spawn)

        # Posição de Spawn do Inimigo (Minotauro)
        # Spawn em célula transitável distante do início
        reserved_cells = set(keys) | portal_nodes | {start_cell, end_cell}
        enemy_candidates = [
            c for c in open_cells
            if c not in reserved_cells
            and (abs(c[0] - start_cell[0]) + abs(c[1] - start_cell[1]) >= (self.rows + self.cols) // 3)
        ]
        if not enemy_candidates:
            enemy_candidates = [c for c in open_cells if c != start_cell]

        enemy_spawn = random.choice(enemy_candidates) if enemy_candidates else end_cell

        return WorldData(
            grid=grid,
            graph=graph,
            start=start_cell,
            goal=end_cell,
            terrains=terrains,
            portal_pairs=portal_pairs,
            keys=keys,
            enemy_spawn=enemy_spawn,
        )
