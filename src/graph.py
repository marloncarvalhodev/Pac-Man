"""Módulo de Representação Matemática de Grafos e Geração de Labirintos.

Disciplina: Matemática Discreta / Teoria dos Grafos.
Modelagem formal:
    G = (V, E, w)
    onde:
        - V: conjunto de vértices representando coordenadas transitáveis (r, c) in Z^2
        - E: arcos de comandos ortogonais entre posições estáveis, incluindo
             entrada e teleporte automático nas conexões não locais
        - w: E -> R>=0, custo do terreno de entrada (positivo nos mundos gerados)
"""

from __future__ import annotations

import random
import math
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
    enemy_spawn2: Node = (1, 1)
    power_pellets: List[Node] = field(default_factory=list)


class Graph:
    """Representação formal de um grafo ponderado G = (V, E, w).

    Implementado via Listas de Adjacência utilizando tabelas hash para
    garantir consultas de vizinhança em complexidade média O(1).
    Suporta arestas direcionadas ou bidirecionais com pesos arbitrários não-negativos.
    """

    def __init__(self) -> None:
        # Mapeamento: u -> {v: w(u, v)}
        self._adj: Dict[Node, Dict[Node, float]] = {}
        self._steps: Dict[Tuple[Node, Node], Node] = {}
        self._entries: Dict[Tuple[Node, Node], Node] = {}

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
        """Tamanho |E|: número de arcos da representação direcionada."""
        return sum(len(nbrs) for nbrs in self._adj.values())

    @property
    def connection_count(self) -> int:
        """Pares conectados ignorando orientação; laços contam uma vez."""
        return len({frozenset((u, v)) for u in self._adj for v in self._adj[u]})

    @property
    def bidirectional_count(self) -> int:
        """Pares distintos com arcos em ambos os sentidos (pesos podem diferir)."""
        return sum(u < v and self.has_edge(v, u) for u in self._adj for v in self._adj[u])

    def add_vertex(self, u: Node) -> None:
        """Adiciona um vértice u pertencente a V, caso ainda não exista."""
        if u not in self._adj:
            self._adj[u] = {}

    def add_edge(
        self, u: Node, v: Node, weight: float = 1.0, bidirectional: bool = True
    ) -> None:
        """Adiciona uma aresta (u, v) com peso w(u, v) ao grafo."""
        if not math.isfinite(weight) or weight < 0:
            raise ValueError("O peso deve ser finito e não negativo")
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
        self._steps.clear()
        self._entries.clear()

    def resolve_step(self, u: Node, dr: int, dc: int) -> Optional[Node]:
        """Destino estável de um comando ortogonal, incluindo teleporte na entrada."""
        if abs(dr) + abs(dc) != 1:
            return None
        entry = (u[0] + dr, u[1] + dc)
        return self._steps.get((u, entry))

    def transition_entry(self, u: Node, v: Node) -> Node:
        """Célula atravessada antes de chegar a v; permite desenhar o salto real."""
        return self._entries.get((u, v), v)

    def transition_points(self, path: List[Node]) -> List[Node]:
        """Expande arcos compostos apenas para desenho, sem alterar custo/movimentos."""
        points = path[:1]
        for u, v in zip(path, path[1:]):
            entry = self.transition_entry(u, v)
            if entry != v:
                points.append(entry)
            points.append(v)
        return points


def build_movement_graph(terrains: Dict[Node, str], portal_pairs: List[Tuple[Node, Node]]) -> Graph:
    """Cada arco é um comando: entra no piso e, se portal, sai no par.

    Custa o terreno de entrada. A chegada ao par não dispara outro teleporte.
    Os vértices representam posições estáveis após concluir um comando.
    """
    portals = {}
    for a, b in portal_pairs:
        if a == b or a not in terrains or b not in terrains or a in portals or b in portals:
            raise ValueError("Extremidades de portais devem ser transitáveis e únicas")
        portals[a], portals[b] = b, a
    graph = Graph()
    for u in terrains:
        graph.add_vertex(u)
        for dr, dc in ((1, 0), (0, 1), (-1, 0), (0, -1)):
            entry = (u[0] + dr, u[1] + dc)
            if entry in terrains:
                v = portals.get(entry, entry)
                cost = TERRAIN_COSTS[terrains[entry]]
                graph._steps[u, entry] = v
                # Uma grade com pares disjuntos produz um destino único por comando.
                graph.add_edge(u, v, cost, bidirectional=False)
                graph._entries[u, v] = entry
    return graph


class MazeGenerator:
    """Gerador de labirintos e mundos ponderados baseado em Teoria dos Grafos.

    Constrói labirintos perfeitos (árvores geradoras, grafos conexos e acíclicos)
    através do algoritmo Randomized Depth-First Search (Recursive Backtracker),
    com opção de introduzir ciclos (remover paredes) para permitir caminhos alternativos,
    terrenos com pesos distintos e portais de teleporte (transições não locais).
    """

    def __init__(self, rows: int, cols: int, seed: Optional[int] = None) -> None:
        """Inicializa as dimensões da grade do labirinto."""
        self.rows = rows if rows % 2 != 0 else rows + 1
        self.cols = cols if cols % 2 != 0 else cols + 1
        if self.rows < 5 or self.cols < 5:
            raise ValueError("O labirinto deve ter pelo menos 5 linhas e colunas")
        self.rng = random.Random(seed)

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
                next_cell, wall_between = self.rng.choice(unvisited_neighbors)
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
                        if (is_h_divider or is_v_divider) and self.rng.random() < extra_loops_ratio:
                            grid[r][c] = 0

        return grid

    def generate_world(
        self,
        extra_loops_ratio: float = 0.10,
        num_portal_pairs: int = 1,
        num_keys: int = 2,
    ) -> WorldData:
        """Gera um mundo fortemente conexo com terrenos, portais automáticos e chaves."""
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
            seed_cell = self.rng.choice(open_cells)
            if seed_cell in (start_cell, end_cell):
                continue
            curr = seed_cell
            for _ in range(self.rng.randint(3, 7)):
                terrains[curr] = TerrainType.MUD
                nbrs = [
                    (curr[0] + dr, curr[1] + dc)
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                    if (curr[0] + dr, curr[1] + dc) in terrains
                ]
                if nbrs:
                    curr = self.rng.choice(nbrs)

        # Gera poças de Lava (LAVA) - peso 8.0 (bloqueios caros/perigosos)
        num_lava_pools = max(2, (self.rows * self.cols) // 220)
        for _ in range(num_lava_pools):
            seed_cell = self.rng.choice(open_cells)
            if seed_cell in (start_cell, end_cell):
                continue
            curr = seed_cell
            for _ in range(self.rng.randint(2, 4)):
                if curr not in (start_cell, end_cell):
                    terrains[curr] = TerrainType.LAVA
                nbrs = [
                    (curr[0] + dr, curr[1] + dc)
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                    if (curr[0] + dr, curr[1] + dc) in terrains
                    and (curr[0] + dr, curr[1] + dc) not in (start_cell, end_cell)
                ]
                if nbrs:
                    curr = self.rng.choice(nbrs)

        # Gera esteiras de Aceleração (BOOST) - peso 0.3 (corredores rápidos)
        num_boost_strips = max(2, (self.rows * self.cols) // 200)
        for _ in range(num_boost_strips):
            seed_cell = self.rng.choice(open_cells)
            dr, dc = self.rng.choice([(0, 1), (1, 0)])
            curr = seed_cell
            for _ in range(self.rng.randint(2, 5)):
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

        # Seleciona pares de Portais de Teleporte (Conexões Não Locais)
        # Entrar no piso normal do portal custa 1.0 e termina na outra extremidade
        candidate_portal_cells = [
            c for c in open_cells
            if c != start_cell and c != end_cell and terrains[c] == TerrainType.NORMAL
        ]
        portal_pairs: List[Tuple[Node, Node]] = []
        min_portal_dist = (self.rows + self.cols) // 3

        for _ in range(num_portal_pairs):
            # Reserva início, saída e quatro posições para orbes/inimigos.
            if len(open_cells) - 2 - 2 * (len(portal_pairs) + 1) < 4:
                break
            if len(candidate_portal_cells) < 4:
                break
            p1 = self.rng.choice(candidate_portal_cells)
            distant_candidates = [
                c for c in candidate_portal_cells
                if abs(c[0] - p1[0]) + abs(c[1] - p1[1]) >= min_portal_dist
            ]
            if distant_candidates:
                p2 = self.rng.choice(distant_candidates)
                portal_pairs.append((p1, p2))
                # Portais automáticos podem isolar regiões, sobretudo quando há
                # vários pares adjacentes. Aceita apenas transições fortemente conexas.
                proposed = build_movement_graph(terrains, portal_pairs)
                reverse = {u: [] for u in open_cells}
                for u in open_cells:
                    for v, _weight in proposed.neighbors(u):
                        reverse[v].append(u)
                valid = True
                for backwards in (False, True):
                    seen = {start_cell}
                    stack = [start_cell]
                    while stack:
                        u = stack.pop()
                        neighbors = reverse[u] if backwards else [v for v, _ in proposed.neighbors(u)]
                        for v in neighbors:
                            if v not in seen:
                                seen.add(v)
                                stack.append(v)
                    if len(seen) != len(open_cells):
                        valid = False
                        break
                if not valid:
                    portal_pairs.pop()
                    continue
                candidate_portal_cells.remove(p1)
                candidate_portal_cells.remove(p2)

        graph = build_movement_graph(terrains, portal_pairs)

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
        num_keys_to_spawn = min(num_keys, len(candidate_key_cells),
                                max(0, len(open_cells) - len(portal_nodes) - 6))
        if num_keys_to_spawn > 0:
            keys = self.rng.sample(candidate_key_cells, num_keys_to_spawn)

        # Orbes de Poder (Power Pellets) em cantos estratégicos (NE e SW)
        portal_nodes = {p for pair in portal_pairs for p in pair}
        reserved_for_pellets = set(keys) | portal_nodes | {start_cell, end_cell}
        corner_ne = (1, self.cols - 2)
        corner_sw = (self.rows - 2, 1)

        def find_closest_open(target: Node) -> Optional[Node]:
            sorted_cells = sorted(
                [c for c in open_cells if c not in reserved_for_pellets and terrains[c] != TerrainType.LAVA],
                key=lambda c: abs(c[0] - target[0]) + abs(c[1] - target[1]),
            )
            return sorted_cells[0] if sorted_cells else None

        pellet1 = find_closest_open(corner_ne)
        reserved_for_pellets.add(pellet1)
        pellet2 = find_closest_open(corner_sw)
        reserved_for_pellets.add(pellet2)
        power_pellets = [p for p in (pellet1, pellet2) if p is not None]

        # Posição de Spawn dos Inimigos (1: Minotauro Vermelho, 2: Fantasma Roxo)
        # Spawn em células transitáveis distantes do início
        reserved_cells = set(keys) | portal_nodes | set(power_pellets) | {start_cell, end_cell}
        enemy_candidates = [
            c for c in open_cells
            if c not in reserved_cells
            and (abs(c[0] - start_cell[0]) + abs(c[1] - start_cell[1]) >= (self.rows + self.cols) // 3)
        ]
        if not enemy_candidates:
            enemy_candidates = [c for c in open_cells if c not in reserved_cells]

        enemy_spawn = self.rng.choice(enemy_candidates) if enemy_candidates else end_cell
        enemy_candidates_2 = [c for c in enemy_candidates if c != enemy_spawn]
        if not enemy_candidates_2:
            enemy_candidates_2 = [c for c in open_cells if c not in reserved_cells and c != enemy_spawn]
        enemy_spawn2 = self.rng.choice(enemy_candidates_2) if enemy_candidates_2 else end_cell

        return WorldData(
            grid=grid,
            graph=graph,
            start=start_cell,
            goal=end_cell,
            terrains=terrains,
            portal_pairs=portal_pairs,
            keys=keys,
            enemy_spawn=enemy_spawn,
            enemy_spawn2=enemy_spawn2,
            power_pellets=power_pellets,
        )
