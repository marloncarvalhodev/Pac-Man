"""Interface Gráfica Interativa em Pygame - Pac-Man com Teoria dos Grafos.

Mecânicas Avançadas:
- Grafos Ponderados Reais: Terrenos com diferentes custos de transição
  (Normal: 1.0, Lama: 4.0, Aceleração: 0.3, Lava: 8.0).
- Estética Arcade Dark & Pac-Dots (+10 pts por coleta).
- Cooldown Ponderado de Movimento: Pesos afetam a física dos passos.
- Inimigos com IA em Tempo Real:
  * Minotauro Vermelho: Caçador direto via A* ponderado.
  * Fantasma Roxo: Emboscador tático (mira 3 passos à frente do jogador com mira visual).
- Orbes de Poder (Power Pellets):
  * Ativam o modo FRIGHTENED por 7 segundos (Inimigos azuis).
  * Escolhem localmente o vizinho de maior distância Manhattan do jogador.
  * Permitem banir inimigos de volta ao spawn.
- Comparativo Instantâneo em Tempo Real: Dijkstra vs A* no Card 3.
- Modo "Raio-X do Grafo" (Tecla G): Visualização explícita de V, E, bifurcações (deg >= 3) e pesos.
- HUD Moderno em Cards: Margem simétrica de 16px, sem sobreposições e sem cortes.
"""

from __future__ import annotations

import math
import os
import sys
import time
from typing import Dict, List, Optional, Set, Tuple

# Suprimir mensagem de boas-vindas do Pygame
os.environ["PYGAME_HIDE_SUPPORT_PROMPT"] = "1"
import pygame

# Importação dos módulos do projeto
try:
    from .graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
    from .pathfinding import a_star, dijkstra, PathfindingResult, solve_multi_goal
except ImportError:
    from graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
    from pathfinding import a_star, dijkstra, PathfindingResult, solve_multi_goal


# ==============================================================================
# Paleta de Cores Arcade Dark Moderna
# ==============================================================================
COLOR_BG = (9, 13, 22)                  # #090d16 Fundo geral arcade
COLOR_PANEL_BG = (13, 17, 23)          # #0d1117 Fundo do painel lateral
COLOR_CARD_BG = (22, 27, 34)           # #161b22 Fundo dos cards arredondados
COLOR_CARD_BORDER = (48, 54, 61)       # #30363d Borda dos cards

# Labirinto Arcade
COLOR_WALL = (9, 13, 22)               # Interior escuro da parede
COLOR_WALL_BORDER = (37, 99, 235)      # #2563eb Borda neon azul clássica do Pac-Man
COLOR_TERRAIN_NORMAL = (30, 41, 59)    # #1e293b Piso normal escuro e elegante
COLOR_TERRAIN_GRID = (38, 52, 75)      # Grade sutil do piso
COLOR_PAC_DOT = (253, 230, 138)        # #fde68a Ponto amarelo pastel de coleta

# Terrenos Ponderados Especiais
COLOR_TERRAIN_MUD = (120, 82, 48)      # Custo 4.0 (Marrom / Pântano)
COLOR_TERRAIN_BOOST = (0, 195, 215)    # Custo 0.3 (Ciano / Esteira)
COLOR_TERRAIN_LAVA = (220, 50, 40)     # Custo 8.0 (Vermelho alaranjado / Lava)

# Entidades e Mecânicas
COLOR_START = (34, 197, 94)            # Verde Esmeralda
COLOR_GOAL_LOCKED = (185, 28, 28)      # Vermelho Fechado
COLOR_GOAL_OPEN = (34, 197, 94)        # Verde Brilhante
COLOR_PACMAN = (250, 204, 21)          # #facc15 Amarelo vibrante do Pac-Man
COLOR_KEY = (250, 204, 21)             # Dourado Chave
COLOR_POWER_PELLET = (6, 182, 212)     # Ciano Orbe de Poder
COLOR_PORTAL_A = (168, 85, 247)        # Roxo Ametista
COLOR_PORTAL_B = (236, 72, 153)        # Rosa Magenta

# Inimigos
COLOR_ENEMY_RED = (239, 68, 68)        # Vermelho (Minotauro Caçador)
COLOR_ENEMY_PURPLE = (168, 85, 247)    # Roxo (Fantasma Emboscador)
COLOR_ENEMY_FRIGHTENED = (37, 99, 235) # Azul Royal (Assustado)
COLOR_AMBUSH_TARGET = (192, 132, 252)  # Mira do Fantasma Emboscador

# Visualização de Busca e IA
COLOR_VISITED = (147, 51, 234)         # Roxo de Exploração
COLOR_OPTIMAL = (250, 204, 21)         # Amarelo Ouro de Rota Ótima
COLOR_AI_RED_ROUTE = (239, 68, 68)     # Linha de perseguição do Minotauro
COLOR_AI_PURPLE_ROUTE = (168, 85, 247) # Linha de perseguição do Emboscador

# Raio-X do Grafo
COLOR_XRAY_EDGE = (56, 189, 248)       # Arestas topológicas ciano
COLOR_XRAY_VERTEX = (125, 211, 252)    # Vértices topológicos
COLOR_XRAY_JUNCTION = (250, 204, 21)   # Vértices com grau >= 3 (cruzamentos)

# Tipografia e HUD
COLOR_TEXT = (240, 246, 252)
COLOR_TEXT_MUTED = (139, 148, 158)
COLOR_ACCENT = (56, 189, 248)
COLOR_ALERT = (248, 113, 113)


class EnemyAgent:
    """Representa um inimigo com IA autônoma e comportamento tático específico."""

    def __init__(self, name: str, base_color: Tuple[int, int, int], spawn_pos: Node, behavior: str) -> None:
        self.name = name
        self.base_color = base_color
        self.spawn_pos = spawn_pos
        self.pos = spawn_pos
        self.behavior = behavior  # "DIRECT" (Minotauro) ou "AMBUSH" (Emboscador)
        self.respawn_until_tick = 0
        self.next_move_tick = 0
        self.planned_path: List[Node] = []


class MazeGame:
    """Controlador principal do jogo Pac-Man e visualizador de grafos ponderados."""

    def __init__(self, rows: int = 25, cols: int = 25, cell_size: int = 28) -> None:
        pygame.init()
        pygame.font.init()

        self.rows = rows if rows % 2 else rows + 1
        self.cols = cols if cols % 2 else cols + 1
        self.cell_size = cell_size

        # Dimensões exatas: Labirinto 700x700 à esquerda, HUD 440px à direita (Sem faixas pretas)
        self.maze_width = self.cols * self.cell_size
        self.maze_height = self.rows * self.cell_size
        self.panel_width = 440
        self.window_width = self.maze_width + self.panel_width
        self.window_height = self.maze_height

        self.screen = pygame.display.set_mode((self.window_width, self.window_height))
        pygame.display.set_caption("Pac-Man: Teoria dos Grafos & IA de Pathfinding (Dijkstra vs A*)")
        self.clock = pygame.time.Clock()

        # Fontes do sistema
        self.font_title = pygame.font.SysFont("Segoe UI, Arial", 18, bold=True)
        self.font_bold = pygame.font.SysFont("Segoe UI, Arial", 12, bold=True)
        self.font_normal = pygame.font.SysFont("Segoe UI, Arial", 11)
        self.font_small = pygame.font.SysFont("Segoe UI, Arial", 10)
        self.font_tiny = pygame.font.SysFont("Segoe UI, Arial", 9, bold=True)

        # Estado do Mundo / Grafo Ponderado
        self.grid: List[List[int]] = []
        self.graph: Graph = Graph()
        self.start_pos: Node = (1, 1)
        self.goal_pos: Node = (self.rows - 2, self.cols - 2)
        self.terrains: Dict[Node, str] = {}
        self.portal_pairs: List[Tuple[Node, Node]] = []
        self.all_keys: List[Node] = []
        self.collected_keys: Set[Node] = set()

        # Pac-Dots & Placar
        self.pac_dots: Set[Node] = set()
        self.score: int = 0

        # Orbes de Poder (Power Pellets)
        self.power_pellets: Set[Node] = set()
        self.frightened_until_tick: int = 0

        # Estado do Jogador (Pac-Man)
        self.player_pos: Node = (1, 1)
        self.player_facing: Tuple[int, int] = (0, 1)  # (dr, dc) inicial para a direita
        self.player_health: int = 100
        self.next_player_move_tick: int = 0
        self.player_base_cooldown_ms: int = 140

        # Inimigos com IA
        self.enemies: List[EnemyAgent] = []
        self.enemies_active: bool = True
        self.show_ai_path: bool = True       # Tecla T: exibição da rota traçada pela IA
        self.show_graph_xray: bool = False   # Tecla G: modo Raio-X do Grafo
        self.enemy_base_cooldown_ms: int = 340

        # Estado da Busca / Animação (Solver)
        self.mode = "PLAYER"  # "PLAYER" ou "SOLVER"
        self.active_algorithm = "A*"
        self.last_result: Optional[PathfindingResult] = None
        self.animating = False
        self.animation_step = 0
        self.animation_speed = 6  # Nós expandidos por frame
        self.visited_set: Set[Node] = set()
        self.solution_path_list: List[Node] = []
        self.solution_path_set: Set[Node] = set()

        # Métricas do comparativo instantâneo Dijkstra vs A* em tempo real
        self.comp_dijkstra_nodes: int = 0
        self.comp_astar_nodes: int = 0
        self.comp_gain_percent: float = 0.0

        # Fim de Jogo
        self.game_over: bool = False
        self.game_won: bool = False

        self.reset_maze()

    @property
    def is_frightened(self) -> bool:
        """Indica se os inimigos estão atualmente em modo assustado/fuga."""
        return pygame.time.get_ticks() < self.frightened_until_tick

    @property
    def frightened_remaining_sec(self) -> float:
        """Tempo restante de efeito do Power Pellet em segundos."""
        if not self.is_frightened:
            return 0.0
        return max(0.0, (self.frightened_until_tick - pygame.time.get_ticks()) / 1000.0)

    @property
    def remaining_keys(self) -> List[Node]:
        """Retorna lista de chaves ainda não coletadas pelo jogador."""
        return [k for k in self.all_keys if k not in self.collected_keys]

    @property
    def is_goal_unlocked(self) -> bool:
        """Destino só abre quando todas as chaves forem coletadas."""
        return len(self.remaining_keys) == 0

    def reset_maze(self, new_world: bool = True) -> None:
        """Reinicia a partida; opcionalmente gera novo mundo procedural."""
        if new_world or not hasattr(self, "initial_world"):
            generator = MazeGenerator(self.rows, self.cols)
            self.initial_world = generator.generate_world(
                extra_loops_ratio=0.10, num_portal_pairs=1, num_keys=2)
        world_data = self.initial_world

        self.grid = world_data.grid
        self.graph = world_data.graph
        self.start_pos = world_data.start
        self.goal_pos = world_data.goal
        self.terrains = world_data.terrains
        self.portal_pairs = world_data.portal_pairs
        self.all_keys = list(world_data.keys)
        self.collected_keys.clear()

        # Configura Orbes de Poder
        self.power_pellets = set(world_data.power_pellets)
        self.frightened_until_tick = 0

        # Gera Pac-Dots em pisos normais livres de itens especiais
        reserved_cells = set(self.all_keys) | self.power_pellets | {self.start_pos, self.goal_pos}
        for p1, p2 in self.portal_pairs:
            reserved_cells.add(p1)
            reserved_cells.add(p2)

        self.pac_dots = {
            v for v in self.graph.vertices
            if v not in reserved_cells and self.terrains.get(v, TerrainType.NORMAL) == TerrainType.NORMAL
        }
        self.score = 0

        # Jogador
        self.player_pos = self.start_pos
        self.player_facing = (0, 1)
        self.player_health = 100
        self.next_player_move_tick = 0

        # Configura Inimigos (1: Minotauro Vermelho Caçador, 2: Fantasma Roxo Emboscador)
        self.enemies = [
            EnemyAgent("Minotauro", COLOR_ENEMY_RED, world_data.enemy_spawn, "DIRECT"),
            EnemyAgent("Espectro", COLOR_ENEMY_PURPLE, world_data.enemy_spawn2, "AMBUSH"),
        ]
        now = pygame.time.get_ticks()
        for e in self.enemies:
            e.next_move_tick = now + 400

        self.game_over = False
        self.game_won = False
        self.mode = "PLAYER"
        self.enemies_active = True

        self.clear_solution()
        self.update_instant_comparison()

    def clear_solution(self) -> None:
        """Limpa as marcações de busca visual."""
        self.last_result = None
        self.mode = "PLAYER"
        self.animating = False
        self.animation_step = 0
        self.visited_set.clear()
        self.solution_path_list.clear()
        self.solution_path_set.clear()

    def update_instant_comparison(self) -> None:
        """Calcula silenciosamente o comparativo Dijkstra vs A* até o próximo objetivo."""
        target = self.goal_pos
        if self.remaining_keys:
            target = min(
                self.remaining_keys,
                key=lambda k: abs(k[0] - self.player_pos[0]) + abs(k[1] - self.player_pos[1]),
            )

        res_d = dijkstra(self.graph, self.player_pos, target)
        res_a = a_star(self.graph, self.player_pos, target, portals=self.portal_pairs, min_weight=0.3)

        self.comparison_target = target
        self.comparison_dijkstra = res_d
        self.comparison_astar = res_a
        self.comp_dijkstra_nodes = res_d.nodes_expanded
        self.comp_astar_nodes = res_a.nodes_expanded
        if res_d.nodes_expanded > 0:
            self.comp_gain_percent = (
                (res_d.nodes_expanded - res_a.nodes_expanded) / res_d.nodes_expanded
            ) * 100.0
        else:
            self.comp_gain_percent = 0.0

    def start_solving(self, algorithm_name: str) -> None:
        """Executa o algoritmo escolhido considerando terrenos ponderados e chaves."""
        if self.game_over or self.game_won:
            return
        self.clear_solution()
        self.active_algorithm = algorithm_name
        self.mode = "SOLVER"

        # Multi-goal pathfinding: Início -> Chaves restantes -> Destino
        self.last_result = solve_multi_goal(
            graph=self.graph,
            start=self.player_pos,
            keys=self.remaining_keys,
            goal=self.goal_pos,
            algorithm=algorithm_name,
            portals=self.portal_pairs,
        )

        self.animating = True
        self.animation_step = 0

    def move_player(self, dr: int, dc: int) -> None:
        """Move o jogador pelas arestas do grafo respeitando a física dos terrenos."""
        if self.game_over or self.game_won:
            return

        now = pygame.time.get_ticks()
        # Física dos pesos das arestas: cooldown antes de dar o próximo passo
        if now < self.next_player_move_tick:
            return

        if abs(dr) + abs(dc) != 1:
            return
        self.player_facing = (dr, dc)

        if self.mode != "PLAYER":
            self.mode = "PLAYER"
            self.clear_solution()

        origin = self.player_pos
        target = self.graph.resolve_step(origin, dr, dc)

        # Verifica se existe aresta válida no grafo
        if target is not None and self.graph.has_edge(origin, target):
            cost = self.graph.get_edge_weight(origin, target)
            entry = self.graph.transition_entry(origin, target)
            self.player_pos = target

            # Coleta de Pac-Dots (+10 pts)
            if self.player_pos in self.pac_dots:
                self.pac_dots.remove(self.player_pos)
                self.score += 10

            # Coleta de Chaves
            if self.player_pos in self.all_keys and self.player_pos not in self.collected_keys:
                self.collected_keys.add(self.player_pos)
                self.score += 100

            # Coleta de Orbes de Poder (Power Pellets)
            if self.player_pos in self.power_pellets:
                self.power_pellets.remove(self.player_pos)
                self.frightened_until_tick = now + 7000  # 7 segundos de medo
                self.score += 50

            # O próprio arco já inclui o teleporte, sem gatilho na chegada.
            terrain_type = self.terrains.get(entry, TerrainType.NORMAL)

            # Aplica cooldown ponderado (Esteira: veloz 0.3x; Lama: lento 4.0x)
            self.next_player_move_tick = now + int(self.player_base_cooldown_ms * cost)

            if terrain_type == TerrainType.LAVA:
                self.player_health = max(0, self.player_health - 10)
                if self.player_health <= 0:
                    self.game_over = True

            # Dano/colisão têm precedência; não é possível vencer morto.
            if not self.game_over:
                self.check_enemy_collisions()
            if not self.game_over and self.player_pos == self.goal_pos and self.is_goal_unlocked:
                self.game_won = True
                self.score += 500
            self.update_instant_comparison()

    def check_enemy_collisions(self) -> None:
        """Verifica colisões entre o jogador e os inimigos nos dois estados."""
        if self.game_over or self.game_won:
            return
        now = pygame.time.get_ticks()
        for enemy in self.enemies:
            if enemy.pos == self.player_pos and now >= enemy.respawn_until_tick:
                if self.is_frightened:
                    # Inimigo é banido de volta para o ponto de spawn inicial
                    enemy.pos = enemy.spawn_pos
                    enemy.respawn_until_tick = now + 1000
                    enemy.next_move_tick = now + 1000
                    enemy.planned_path.clear()
                    self.score += 200
                else:
                    self.game_over = True
                    break

    def get_ambush_target(self) -> Node:
        """Calcula o alvo do Fantasma Emboscador (3 passos à frente do jogador)."""
        dr, dc = self.player_facing
        target = (self.player_pos[0] + 3 * dr, self.player_pos[1] + 3 * dc)
        if 0 <= target[0] < self.rows and 0 <= target[1] < self.cols and self.grid[target[0]][target[1]] == 0:
            return target
        best_node = self.player_pos
        best_dist = float("inf")
        for v in self.graph.vertices:
            d = abs(v[0] - target[0]) + abs(v[1] - target[1])
            if d < best_dist:
                best_dist = d
                best_node = v
        return best_node

    def update_enemies(self) -> None:
        """Atualiza a IA dos inimigos (Perseguição direta, Emboscada e Fuga)."""
        if not self.enemies_active or self.game_over or self.game_won:
            return

        now = pygame.time.get_ticks()
        frightened = self.is_frightened

        self.check_enemy_collisions()
        if self.game_over:
            return
        for enemy in self.enemies:
            if now < enemy.respawn_until_tick:
                continue
            # 1. Determina o alvo e calcula a rota da IA em tempo real
            if frightened:
                # Heurística Invertida: vizinho que maximiza distância do jogador
                nbrs = [v for v, _ in self.graph.neighbors(enemy.pos)]
                if nbrs:
                    best_nbr = max(
                        nbrs,
                        key=lambda n: abs(n[0] - self.player_pos[0]) + abs(n[1] - self.player_pos[1]),
                    )
                    enemy.planned_path = [enemy.pos, best_nbr]
                else:
                    enemy.planned_path = [enemy.pos]
            else:
                target_node = self.player_pos if enemy.behavior == "DIRECT" else self.get_ambush_target()
                path_res = a_star(
                    graph=self.graph,
                    start=enemy.pos,
                    goal=target_node,
                    portals=self.portal_pairs,
                    min_weight=0.3,
                )
                if path_res.found:
                    enemy.planned_path = path_res.path
                else:
                    enemy.planned_path = [enemy.pos]

            # 2. Executa o passo se o tempo de cooldown ponderado tiver expirado
            if now >= enemy.next_move_tick:
                if len(enemy.planned_path) > 1:
                    next_cell = enemy.planned_path[1]
                    cost = self.graph.get_edge_weight(enemy.pos, next_cell)
                    if cost is None:
                        enemy.planned_path.clear()
                        continue
                    enemy.pos = next_cell
                    enemy.planned_path = enemy.planned_path[1:]

                    speed_mod = 1.25 if frightened else 1.0
                    enemy.next_move_tick = now + int(self.enemy_base_cooldown_ms * cost * speed_mod)
                    self.check_enemy_collisions()
                    if self.game_over:
                        return

        self.check_enemy_collisions()

    def update(self) -> None:
        """Atualiza a IA e a animação do solver."""
        self.update_enemies()

        if self.animating and self.last_result:
            for _ in range(self.animation_speed):
                if self.animation_step < len(self.last_result.visited_order):
                    node = self.last_result.visited_order[self.animation_step]
                    self.visited_set.add(node)
                    self.animation_step += 1
                else:
                    self.animating = False
                    self.solution_path_list = self.graph.transition_points(self.last_result.path)
                    self.solution_path_set = set(self.last_result.path)
                    break

    def draw_maze(self) -> None:
        """Renderiza as células do labirinto no estilo Arcade Dark, entidades e Pac-Dots."""
        ticks = pygame.time.get_ticks()
        pulse = 0.5 + 0.5 * math.sin(ticks * 0.008)

        # 1. Terrenos e Paredes no estilo Arcade Dark
        for r in range(self.rows):
            for c in range(self.cols):
                rect = pygame.Rect(
                    c * self.cell_size,
                    r * self.cell_size,
                    self.cell_size,
                    self.cell_size,
                )
                node: Node = (r, c)

                if self.grid[r][c] == 1:
                    # Paredes com preenchimento escuro e borda azul neon arcade
                    pygame.draw.rect(self.screen, COLOR_WALL, rect)
                    pygame.draw.rect(self.screen, COLOR_WALL_BORDER, rect, 1)
                else:
                    terrain = self.terrains.get(node, TerrainType.NORMAL)
                    if terrain == TerrainType.MUD:
                        base_color = COLOR_TERRAIN_MUD
                    elif terrain == TerrainType.BOOST:
                        base_color = COLOR_TERRAIN_BOOST
                    elif terrain == TerrainType.LAVA:
                        lava_pulse = int(18 * math.sin(ticks * 0.006 + (r + c)))
                        base_color = (
                            min(255, COLOR_TERRAIN_LAVA[0] + lava_pulse),
                            max(0, COLOR_TERRAIN_LAVA[1] - lava_pulse),
                            COLOR_TERRAIN_LAVA[2],
                        )
                    else:
                        base_color = COLOR_TERRAIN_NORMAL

                    # Sobreposição de nós visitados na busca
                    if node in self.visited_set and node not in self.solution_path_set:
                        color = (
                            int(base_color[0] * 0.45 + COLOR_VISITED[0] * 0.55),
                            int(base_color[1] * 0.45 + COLOR_VISITED[1] * 0.55),
                            int(base_color[2] * 0.45 + COLOR_VISITED[2] * 0.55),
                        )
                    else:
                        color = base_color

                    pygame.draw.rect(self.screen, color, rect)
                    pygame.draw.rect(self.screen, COLOR_TERRAIN_GRID, rect, 1)

                    # Textura sutil para esteiras
                    if terrain == TerrainType.BOOST:
                        cx = c * self.cell_size + self.cell_size // 2
                        cy = r * self.cell_size + self.cell_size // 2
                        pygame.draw.line(self.screen, (255, 255, 255), (cx - 4, cy), (cx + 4, cy), 1)
                        pygame.draw.line(self.screen, (255, 255, 255), (cx, cy - 4), (cx, cy + 4), 1)

        # 2. Pac-Dots luminosos (pequenos pontos colecionáveis de 2px)
        for dot in self.pac_dots:
            cx = dot[1] * self.cell_size + self.cell_size // 2
            cy = dot[0] * self.cell_size + self.cell_size // 2
            pygame.draw.circle(self.screen, COLOR_PAC_DOT, (cx, cy), 2)

        # 3. Caminho Ótimo do Solver
        if self.solution_path_list:
            for i in range(len(self.solution_path_list) - 1):
                n1 = self.solution_path_list[i]
                n2 = self.solution_path_list[i + 1]
                is_portal_jump = (abs(n1[0] - n2[0]) + abs(n1[1] - n2[1])) > 1
                p1 = (n1[1] * self.cell_size + self.cell_size // 2, n1[0] * self.cell_size + self.cell_size // 2)
                p2 = (n2[1] * self.cell_size + self.cell_size // 2, n2[0] * self.cell_size + self.cell_size // 2)
                if is_portal_jump:
                    pygame.draw.line(self.screen, (244, 114, 182), p1, p2, 2)
                else:
                    pygame.draw.line(self.screen, COLOR_OPTIMAL, p1, p2, 4)
                    pygame.draw.circle(self.screen, (255, 255, 255), p1, 3)

        # 4. Linhas de Perseguição da IA (Tecla T)
        if self.show_ai_path and not self.is_frightened:
            for enemy in self.enemies:
                line_color = COLOR_AI_RED_ROUTE if enemy.behavior == "DIRECT" else COLOR_AI_PURPLE_ROUTE
                if len(enemy.planned_path) > 1:
                    pts = [
                        (c * self.cell_size + self.cell_size // 2, r * self.cell_size + self.cell_size // 2)
                        for r, c in self.graph.transition_points(enemy.planned_path)
                    ]
                    for i in range(len(pts) - 1):
                        p1, p2 = pts[i], pts[i + 1]
                        jump = abs(pts[i][0] - pts[i+1][0]) + abs(pts[i][1] - pts[i+1][1]) > self.cell_size
                        pygame.draw.line(self.screen, COLOR_PORTAL_B if jump else line_color, p1, p2, 2)


        # 5. Marcador do Alvo de Emboscada (Fantasma Roxo)
        if self.show_ai_path and not self.is_frightened:
            ambush_t = self.get_ambush_target()
            at_cx = ambush_t[1] * self.cell_size + self.cell_size // 2
            at_cy = ambush_t[0] * self.cell_size + self.cell_size // 2
            # Mira roxa estilizada (X com anel)
            pygame.draw.line(self.screen, COLOR_AMBUSH_TARGET, (at_cx - 5, at_cy - 5), (at_cx + 5, at_cy + 5), 2)
            pygame.draw.line(self.screen, COLOR_AMBUSH_TARGET, (at_cx - 5, at_cy + 5), (at_cx + 5, at_cy - 5), 2)
            pygame.draw.circle(self.screen, COLOR_AMBUSH_TARGET, (at_cx, at_cy), 8, 1)

        # 6. Portais de Teleporte
        for idx, (p1, p2) in enumerate(self.portal_pairs):
            col = COLOR_PORTAL_A if idx % 2 == 0 else COLOR_PORTAL_B
            for p in (p1, p2):
                cx = p[1] * self.cell_size + self.cell_size // 2
                cy = p[0] * self.cell_size + self.cell_size // 2
                radius_out = int(self.cell_size * (0.36 + 0.12 * pulse))
                radius_in = max(2, int(radius_out * 0.5))
                pygame.draw.circle(self.screen, col, (cx, cy), radius_out, 2)
                pygame.draw.circle(self.screen, (255, 255, 255), (cx, cy), radius_in)

        # 7. Orbes de Poder (Power Pellets)
        for pellet in self.power_pellets:
            pr, pc = pellet
            pcx = pc * self.cell_size + self.cell_size // 2
            pcy = pr * self.cell_size + self.cell_size // 2
            r_out = int(self.cell_size * 0.28 * (0.8 + 0.3 * pulse))
            pygame.draw.circle(self.screen, COLOR_POWER_PELLET, (pcx, pcy), r_out)
            pygame.draw.circle(self.screen, (255, 255, 255), (pcx, pcy), max(2, r_out // 2))

        # 8. Chaves Douradas
        for key_node in self.all_keys:
            if key_node not in self.collected_keys:
                kr, kc = key_node
                kcx = kc * self.cell_size + self.cell_size // 2
                kcy = kr * self.cell_size + self.cell_size // 2
                radius = int(self.cell_size * 0.22 * (0.85 + 0.2 * pulse))
                pygame.draw.circle(self.screen, COLOR_KEY, (kcx, kcy - 3), radius)
                pygame.draw.circle(self.screen, (255, 255, 255), (kcx, kcy - 3), max(1, radius // 2))
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy - 3), (kcx, kcy + 7), 2)
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy + 3), (kcx + 3, kcy + 3), 2)
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy + 6), (kcx + 3, kcy + 6), 2)

        # 9. Vértice Início (Start)
        sr, sc = self.start_pos
        s_rect = pygame.Rect(sc * self.cell_size + 2, sr * self.cell_size + 2, self.cell_size - 4, self.cell_size - 4)
        pygame.draw.rect(self.screen, COLOR_START, s_rect, border_radius=4)
        st_txt = self.font_small.render("S", True, (255, 255, 255))
        self.screen.blit(st_txt, (sc * self.cell_size + 9, sr * self.cell_size + 6))

        # 10. Vértice Destino (Ícone Geométrico Limpo: Cadeado ou Portal Aberto)
        gr, gc = self.goal_pos
        g_rect = pygame.Rect(gc * self.cell_size + 2, gr * self.cell_size + 2, self.cell_size - 4, self.cell_size - 4)
        if self.is_goal_unlocked:
            # Portal Aberto Verde Brilhante
            pygame.draw.rect(self.screen, COLOR_GOAL_OPEN, g_rect, border_radius=5)
            pygame.draw.rect(self.screen, (255, 255, 255), g_rect, 1, border_radius=5)
            gcx, gcy = g_rect.centerx, g_rect.centery
            r_star = int((self.cell_size // 2) * (0.7 + 0.25 * pulse))
            pygame.draw.circle(self.screen, (255, 255, 255), (gcx, gcy), max(2, r_star // 2))
            pygame.draw.circle(self.screen, (187, 247, 208), (gcx, gcy), r_star, 2)
        else:
            # Cadeado Geométrico Fechado
            pygame.draw.rect(self.screen, COLOR_GOAL_LOCKED, g_rect, border_radius=4)
            pygame.draw.rect(self.screen, (248, 113, 113), g_rect, 1, border_radius=4)
            gcx, gcy = g_rect.centerx, g_rect.centery
            body_w, body_h = 12, 9
            body_r = pygame.Rect(gcx - body_w // 2, gcy - 1, body_w, body_h)
            pygame.draw.rect(self.screen, (250, 204, 21), body_r, border_radius=2)
            shackle_r = pygame.Rect(gcx - 5, gcy - 8, 10, 8)
            pygame.draw.arc(self.screen, (250, 204, 21), shackle_r, 0, math.pi, 2)
            pygame.draw.circle(self.screen, (30, 30, 30), (gcx, gcy + 3), 2)

        # 11. Inimigos
        frightened = self.is_frightened
        for enemy in self.enemies:
            er, ec = enemy.pos
            ecx = ec * self.cell_size + self.cell_size // 2
            ecy = er * self.cell_size + self.cell_size // 2
            radius = max(5, self.cell_size // 3)

            if frightened:
                color = COLOR_ENEMY_FRIGHTENED
                if self.frightened_remaining_sec < 2.0 and int(ticks // 200) % 2 == 0:
                    color = (240, 240, 240)
                pygame.draw.circle(self.screen, color, (ecx, ecy), radius)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx - 3, ecy - 2), 3)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx + 3, ecy - 2), 3)
                pygame.draw.circle(self.screen, (30, 58, 138), (ecx - 3, ecy - 2), 1)
                pygame.draw.circle(self.screen, (30, 58, 138), (ecx + 3, ecy - 2), 1)
            else:
                pygame.draw.circle(self.screen, enemy.base_color, (ecx, ecy), radius)
                h_left = [(ecx - radius, ecy), (ecx - radius - 3, ecy - 7), (ecx - radius + 2, ecy - 3)]
                h_right = [(ecx + radius, ecy), (ecx + radius + 3, ecy - 7), (ecx + radius - 2, ecy - 3)]
                pygame.draw.polygon(self.screen, (255, 255, 255), h_left)
                pygame.draw.polygon(self.screen, (255, 255, 255), h_right)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx - 3, ecy - 2), 2)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx + 3, ecy - 2), 2)

        # 12. Jogador (Pac-Man Amarelo com Boca Animada)
        pr, pc = self.player_pos
        cx = pc * self.cell_size + self.cell_size // 2
        cy = pr * self.cell_size + self.cell_size // 2
        p_radius = max(4, int(self.cell_size * 0.38))

        dr, dc = self.player_facing
        base_angle = math.atan2(dr, dc)
        mouth_amp = 0.65
        mouth_rad = 0.08 + mouth_amp * abs(math.sin(ticks * 0.018))

        points = [(cx, cy)]
        steps = 20
        start_a = base_angle + mouth_rad
        end_a = base_angle + 2 * math.pi - mouth_rad
        for i in range(steps + 1):
            a = start_a + (end_a - start_a) * (i / steps)
            px = cx + p_radius * math.cos(a)
            py = cy + p_radius * math.sin(a)
            points.append((px, py))

        pygame.draw.polygon(self.screen, COLOR_PACMAN, points)

        eye_angle = base_angle + math.pi / 2.3
        eye_dist = p_radius * 0.55
        ex = int(cx + eye_dist * math.cos(eye_angle))
        ey = int(cy + eye_dist * math.sin(eye_angle))
        pygame.draw.circle(self.screen, (15, 17, 26), (ex, ey), max(2, p_radius // 5))

        # 13. Modo Raio-X do Grafo (Tecla G)
        if self.show_graph_xray:
            self.draw_graph_xray()

    def draw_graph_xray(self) -> None:
        """Renderiza a topologia explícita do Grafo G = (V, E, w) e cruzamentos críticos."""
        # Cada arco mantém sua orientação, seu peso e a entrada real do portal.
        for u in self.graph.vertices:
            u_pt = (u[1] * self.cell_size + self.cell_size // 2, u[0] * self.cell_size + self.cell_size // 2)
            for v, w in self.graph.neighbors(u):
                entry = self.graph.transition_entry(u, v)
                entry_pt = (entry[1] * self.cell_size + self.cell_size // 2, entry[0] * self.cell_size + self.cell_size // 2)
                v_pt = (v[1] * self.cell_size + self.cell_size // 2, v[0] * self.cell_size + self.cell_size // 2)
                pygame.draw.line(self.screen, COLOR_XRAY_EDGE, u_pt, entry_pt, 1)
                dx, dy = entry_pt[0] - u_pt[0], entry_pt[1] - u_pt[1]
                length = math.hypot(dx, dy)
                if length:
                    dx, dy = dx / length, dy / length
                    tip = (u_pt[0] + dx * length * .7, u_pt[1] + dy * length * .7)
                    pygame.draw.lines(self.screen, COLOR_XRAY_EDGE, False, [
                        (tip[0] - 4*dx - 2*dy, tip[1] - 4*dy + 2*dx), tip,
                        (tip[0] - 4*dx + 2*dy, tip[1] - 4*dy - 2*dx)], 1)
                if entry != v:
                    pygame.draw.line(self.screen, COLOR_PORTAL_B, entry_pt, v_pt, 1)

        # Desenha os vértices e destaca cruzamentos (grau >= 3)
        for v in self.graph.vertices:
            v_pt = (v[1] * self.cell_size + self.cell_size // 2, v[0] * self.cell_size + self.cell_size // 2)
            deg = self.graph.degree(v)
            pygame.draw.circle(self.screen, COLOR_XRAY_VERTEX, v_pt, 3)

            # Destaca com anel dourado os vértices de cruzamento / decisões táticas
            if deg >= 3:
                pygame.draw.circle(self.screen, COLOR_XRAY_JUNCTION, v_pt, 7, 1)

            # Exibe o número do peso sobre terrenos especiais
            terrain = self.terrains.get(v, TerrainType.NORMAL)
            if terrain != TerrainType.NORMAL:
                cost = TERRAIN_COSTS[terrain]
                lbl = self.font_tiny.render(f"{cost:.1f}", True, (255, 255, 255))
                self.screen.blit(lbl, (v_pt[0] - lbl.get_width() // 2, v_pt[1] - 12))

    def draw_hud(self) -> None:
        """Desenha o painel lateral com margem de 16px, cards modernos e sem sobreposições."""
        hud_rect = pygame.Rect(self.maze_width, 0, self.panel_width, self.window_height)
        pygame.draw.rect(self.screen, COLOR_PANEL_BG, hud_rect)
        pygame.draw.line(self.screen, COLOR_CARD_BORDER, (self.maze_width, 0), (self.maze_width, self.window_height), 1)

        # Margem de 16px exata em ambos os lados: esquerda e direita
        x = self.maze_width + 16
        card_w = self.panel_width - 32
        y = 12

        # Cabeçalho Principal do Jogo
        title_surf = self.font_title.render("Pac-Man (Grafos)", True, COLOR_PACMAN)
        self.screen.blit(title_surf, (x, y))
        y += 22
        sub_surf = self.font_small.render("Matemática Discreta | Teoria dos Grafos & IA", True, COLOR_ACCENT)
        self.screen.blit(sub_surf, (x, y))
        y += 22

        def draw_card(cy: int, ch: int) -> None:
            c_rect = pygame.Rect(x, cy, card_w, ch)
            pygame.draw.rect(self.screen, COLOR_CARD_BG, c_rect, border_radius=8)
            pygame.draw.rect(self.screen, COLOR_CARD_BORDER, c_rect, 1, border_radius=8)

        # ======================================================================
        # CARD 1: Status da Partida & Score
        # ======================================================================
        c1_h = 104
        draw_card(y, c1_h)
        cy = y + 7

        lbl1 = self.font_bold.render("Status da Partida", True, COLOR_TEXT)
        score_lbl = self.font_bold.render(f"Score: {self.score:05d} pts", True, COLOR_PACMAN)
        self.screen.blit(lbl1, (x + 10, cy))
        self.screen.blit(score_lbl, (x + card_w - score_lbl.get_width() - 10, cy))
        cy += 18

        # Barra de HP
        hp_col = COLOR_START if self.player_health > 40 else COLOR_ALERT
        hp_s = self.font_normal.render(f"Vida: {self.player_health}%", True, hp_col)
        self.screen.blit(hp_s, (x + 10, cy))
        pygame.draw.rect(self.screen, (40, 45, 55), (x + 85, cy + 2, 85, 9), border_radius=3)
        pygame.draw.rect(self.screen, hp_col, (x + 85, cy + 2, max(0, int(85 * (self.player_health / 100))), 9), border_radius=3)

        # Chaves
        k_count = f"Chaves: {len(self.collected_keys)} / {len(self.all_keys)}"
        k_tag = "[PORTÃO ABERTO!]" if self.is_goal_unlocked else "[CADEADO FECHADO]"
        k_col = COLOR_START if self.is_goal_unlocked else COLOR_KEY
        k_s = self.font_normal.render(f"{k_count}  {k_tag}", True, k_col)
        self.screen.blit(k_s, (x + 195, cy))
        cy += 18

        # Modo Poder / Power Pellet
        if self.is_frightened:
            power_txt = f"Modo Poder: ATIVO ({self.frightened_remaining_sec:.1f}s) - Caça Invertida!"
            power_col = COLOR_ACCENT
        else:
            pellets_left = len(self.power_pellets)
            dots_left = len(self.pac_dots)
            power_txt = f"Orbes: {pellets_left}  |  Pac-Dots Restantes: {dots_left}"
            power_col = COLOR_TEXT_MUTED
        p_surf = self.font_normal.render(power_txt, True, power_col)
        self.screen.blit(p_surf, (x + 10, cy))
        cy += 17

        # Inimigos
        e_status = "PERSEGUINDO" if self.enemies_active else "PAUSADOS [P]"
        e_col = COLOR_ALERT if self.enemies_active else COLOR_TEXT_MUTED
        if self.is_frightened:
            e_status = "ASSUSTADOS (Fuga local)"
            e_col = COLOR_ACCENT
        e_s = self.font_normal.render(f"Inimigos (Minotauro + Fantasma): {e_status}", True, e_col)
        self.screen.blit(e_s, (x + 10, cy))
        y += c1_h + 8

        # ======================================================================
        # CARD 2: Estrutura do Grafo G = (V, E, w)
        # ======================================================================
        c2_h = 82
        draw_card(y, c2_h)
        cy = y + 7

        lbl2 = self.font_bold.render("Grafo direcionado e ponderado G = (V, E, w)", True, COLOR_TEXT)
        self.screen.blit(lbl2, (x + 10, cy))
        cy += 17

        g_line1 = f"Vértices |V|: {self.graph.order}   |   Arcos |E|: {self.graph.size}"
        g_line2 = f"Portais: {len(self.portal_pairs)} par (entrada 1.0)   |   Orbes: {len(self.power_pellets)}"
        s1 = self.font_normal.render(g_line1, True, COLOR_TEXT_MUTED)
        s2 = self.font_normal.render(g_line2, True, COLOR_TEXT_MUTED)
        self.screen.blit(s1, (x + 10, cy))
        self.screen.blit(s2, (x + 10, cy + 15))
        walls = sum(cell == 1 for row in self.grid for cell in row)
        s3 = self.font_small.render(f"Paredes: {walls} | Pares conectados: {self.graph.connection_count}", True, COLOR_TEXT_MUTED)
        self.screen.blit(s3, (x + 10, cy + 30))
        y += c2_h + 8

        # ======================================================================
        # CARD 3: Algoritmo de Busca & Comparativo em Tempo Real
        # ======================================================================
        c3_h = 158
        draw_card(y, c3_h)
        cy = y + 7

        lbl3 = self.font_bold.render("Algoritmo de Busca (Multi-Goal Solver)", True, COLOR_TEXT)
        self.screen.blit(lbl3, (x + 10, cy))
        cy += 17

        if self.last_result:
            m1 = f"{self.active_algorithm}: custo {self.last_result.cost:.1f} | {self.last_result.moves} movimentos"
        else:
            m1 = "Modo: Jogo Manual (Pac-Man)   |   Dica: [1] ou [2]"
        s_m1 = self.font_normal.render(m1, True, COLOR_TEXT_MUTED)
        self.screen.blit(s_m1, (x + 10, cy))
        cy += 17
        if self.last_result:
            r = self.last_result
            details = f"Expansões: {r.nodes_expanded} rota / {r.total_nodes_expanded} total | {r.execution_time_ms:.2f} ms"
        else:
            details = "Solver: rota completa pelas chaves até a saída"
        self.screen.blit(self.font_small.render(details, True, COLOR_TEXT_MUTED), (x + 10, cy))
        cy += 17

        # Linha Comparativa em Tempo Real Dijkstra vs A*
        target_kind = "chave escolhida por Manhattan" if self.remaining_keys else "saída"
        lbl_comp_title = self.font_small.render(f"Comparação parcial: posição -> {target_kind}", True, COLOR_ACCENT)
        self.screen.blit(lbl_comp_title, (x + 10, cy))
        cy += 16

        comp_line = (
            f"Dijkstra: {self.comp_dijkstra_nodes} nós  |  A*: {self.comp_astar_nodes} nós  "
            f"(Redução de expansões: {self.comp_gain_percent:.1f}%)"
        )
        s_comp = self.font_small.render(comp_line, True, COLOR_START if self.comp_gain_percent > 0 else COLOR_TEXT)
        self.screen.blit(s_comp, (x + 10, cy))
        cy += 16
        for label, r in (("Dijkstra", self.comparison_dijkstra), ("A*", self.comparison_astar)):
            metrics = f"{label}: custo {r.cost:.1f} | {r.moves} movimentos | {r.execution_time_ms:.2f} ms"
            self.screen.blit(self.font_small.render(metrics, True, COLOR_TEXT_MUTED), (x + 10, cy))
            cy += 16

        hint_xray = f"Modo Raio-X do Grafo: {'ATIVADO [G]' if self.show_graph_xray else 'DESATIVADO [G]'}"
        s_xray = self.font_small.render(hint_xray, True, COLOR_KEY if self.show_graph_xray else COLOR_TEXT_MUTED)
        self.screen.blit(s_xray, (x + 10, cy))
        y += c3_h + 8

        # ======================================================================
        # CARD 4: Pesos das Arestas w(u, v) (2 Colunas Fixas Sem Sobreposição)
        # ======================================================================
        c4_h = 88
        draw_card(y, c4_h)
        cy = y + 7

        lbl4 = self.font_bold.render("Pesos das Arestas w(u, v) & Física", True, COLOR_TEXT)
        self.screen.blit(lbl4, (x + 10, cy))
        cy += 18

        # Coluna 1 em x + 10; Coluna 2 em x + 205
        col1_x = x + 10
        col2_x = x + 205

        # Linha 1
        pygame.draw.rect(self.screen, COLOR_TERRAIN_NORMAL, (col1_x, cy + 2, 10, 10), border_radius=2)
        pygame.draw.rect(self.screen, COLOR_WALL_BORDER, (col1_x, cy + 2, 10, 10), 1, border_radius=2)
        t1 = self.font_normal.render("Piso Normal: 1.0 (Padrão)", True, COLOR_TEXT)
        self.screen.blit(t1, (col1_x + 15, cy))

        pygame.draw.rect(self.screen, COLOR_TERRAIN_BOOST, (col2_x, cy + 2, 10, 10), border_radius=2)
        t2 = self.font_normal.render("Esteira: 0.3 (Rápido)", True, COLOR_TEXT)
        self.screen.blit(t2, (col2_x + 15, cy))
        cy += 18

        # Linha 2
        pygame.draw.rect(self.screen, COLOR_TERRAIN_MUD, (col1_x, cy + 2, 10, 10), border_radius=2)
        t3 = self.font_normal.render("Lama: 4.0 (Lento)", True, COLOR_TEXT)
        self.screen.blit(t3, (col1_x + 15, cy))

        pygame.draw.rect(self.screen, COLOR_TERRAIN_LAVA, (col2_x, cy + 2, 10, 10), border_radius=2)
        t4 = self.font_normal.render("Lava: 8.0 (-10 HP)", True, COLOR_TEXT)
        self.screen.blit(t4, (col2_x + 15, cy))
        cy += 18

        # Linha 3 (entrada e teleporte)
        pygame.draw.rect(self.screen, COLOR_PORTAL_A, (col1_x, cy + 2, 10, 10), border_radius=2)
        t5 = self.font_normal.render("Portal: entrada 1.0 + teleporte automático", True, COLOR_TEXT)
        self.screen.blit(t5, (col1_x + 15, cy))
        y += c4_h + 8

        # ======================================================================
        # CARD 5: Teclas de Controle (2 Colunas Compactas e 100% Visível)
        # ======================================================================
        c5_h = 104
        draw_card(y, c5_h)
        cy = y + 7

        lbl5 = self.font_bold.render("Teclas de Controle", True, COLOR_TEXT)
        self.screen.blit(lbl5, (x + 10, cy))
        cy += 17

        col1_controls = [
            ("[WASD]", "Mover (+ setas)"),
            ("[1]", "Solver Dijkstra"),
            ("[2]", "Solver A*"),
            ("[T]", f"Rota IA: {'ON' if self.show_ai_path else 'OFF'}"),
            ("[G]", f"Raio-X: {'ON' if self.show_graph_xray else 'OFF'}"),
        ]
        col2_controls = [
            ("[P]", "Pausar IA"),
            ("[R]/[N]", "Reiniciar/Novo"),
            ("[C]", "Limpar Rota"),
            ("[+] / [-]", f"Vel. Busca: {self.animation_speed}x"),
            ("[ESC]", "Sair"),
        ]

        c_w2 = card_w // 2 - 6
        for idx, (k, d) in enumerate(col1_controls):
            row_y = cy + idx * 15
            k_s = self.font_bold.render(k, True, COLOR_ACCENT)
            d_s = self.font_small.render(f"- {d}", True, COLOR_TEXT_MUTED)
            self.screen.blit(k_s, (x + 10, row_y))
            self.screen.blit(d_s, (x + 75, row_y + 1))

        for idx, (k, d) in enumerate(col2_controls):
            row_y = cy + idx * 15
            k_s = self.font_bold.render(k, True, COLOR_ACCENT)
            d_s = self.font_small.render(f"- {d}", True, COLOR_TEXT_MUTED)
            self.screen.blit(k_s, (x + c_w2 + 10, row_y))
            self.screen.blit(d_s, (x + c_w2 + 82, row_y + 1))

    def draw_game_over_overlay(self) -> None:
        """Exibe tela translúcida de Game Over ou Vitória."""
        if not (self.game_over or self.game_won):
            return

        overlay = pygame.Surface((self.window_width, self.window_height), pygame.SRCALPHA)
        overlay.fill((10, 12, 18, 220))
        self.screen.blit(overlay, (0, 0))

        box_width = 460
        box_height = 210
        box_x = (self.window_width - box_width) // 2
        box_y = (self.window_height - box_height) // 2

        pygame.draw.rect(self.screen, COLOR_CARD_BG, (box_x, box_y, box_width, box_height), border_radius=10)
        border_col = COLOR_START if self.game_won else COLOR_ALERT
        pygame.draw.rect(self.screen, border_col, (box_x, box_y, box_width, box_height), 2, border_radius=10)

        if self.game_won:
            title_text = "VITÓRIA!"
            msg1 = f"Você coletou todas as chaves com {self.score} pontos!"
            msg2 = "O Pac-Man superou a Teoria dos Grafos com maestria."
            text_color = COLOR_START
        else:
            title_text = "GAME OVER!"
            if self.player_health <= 0:
                msg1 = "Você sucumbiu à lava ardente!"
            else:
                msg1 = "Os inimigos te capturaram no labirinto!"
            msg2 = "A perseguição via A* em grafos ponderados foi implacável."
            text_color = COLOR_ALERT

        t_surf = self.font_title.render(title_text, True, text_color)
        m1_surf = self.font_normal.render(msg1, True, COLOR_TEXT)
        m2_surf = self.font_small.render(msg2, True, COLOR_TEXT_MUTED)
        restart_surf = self.font_bold.render("Pressione [R] para Novo Labirinto ou [ESC] para Sair", True, COLOR_ACCENT)

        self.screen.blit(t_surf, (box_x + (box_width - t_surf.get_width()) // 2, box_y + 30))
        self.screen.blit(m1_surf, (box_x + (box_width - m1_surf.get_width()) // 2, box_y + 75))
        self.screen.blit(m2_surf, (box_x + (box_width - m2_surf.get_width()) // 2, box_y + 105))
        self.screen.blit(restart_surf, (box_x + (box_width - restart_surf.get_width()) // 2, box_y + 150))

    def run(self) -> None:
        """Loop principal da aplicação Pygame."""
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif event.key in (pygame.K_w, pygame.K_UP):
                        self.move_player(-1, 0)
                    elif event.key in (pygame.K_s, pygame.K_DOWN):
                        self.move_player(1, 0)
                    elif event.key in (pygame.K_a, pygame.K_LEFT):
                        self.move_player(0, -1)
                    elif event.key in (pygame.K_d, pygame.K_RIGHT):
                        self.move_player(0, 1)
                    elif event.key == pygame.K_1:
                        self.start_solving("Dijkstra")
                    elif event.key == pygame.K_2:
                        self.start_solving("A*")
                    elif event.key == pygame.K_p:
                        self.enemies_active = not self.enemies_active
                    elif event.key == pygame.K_t:
                        self.show_ai_path = not self.show_ai_path
                    elif event.key == pygame.K_g:
                        self.show_graph_xray = not self.show_graph_xray
                    elif event.key == pygame.K_r:
                        self.reset_maze(new_world=False)
                    elif event.key == pygame.K_n:
                        self.reset_maze()
                    elif event.key == pygame.K_c:
                        self.clear_solution()
                    elif event.key in (pygame.K_PLUS, pygame.K_EQUALS, pygame.K_KP_PLUS):
                        self.animation_speed = min(50, self.animation_speed + 2)
                    elif event.key in (pygame.K_MINUS, pygame.K_KP_MINUS):
                        self.animation_speed = max(1, self.animation_speed - 2)

            self.update()

            self.screen.fill(COLOR_BG)
            self.draw_maze()
            self.draw_hud()
            self.draw_game_over_overlay()

            pygame.display.flip()
            self.clock.tick(60)

        pygame.quit()


def main() -> None:
    """Ponto de entrada do jogo."""
    game = MazeGame(rows=25, cols=25, cell_size=28)
    game.run()


if __name__ == "__main__":
    main()
