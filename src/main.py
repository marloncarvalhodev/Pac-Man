"""Interface Gráfica Interativa em Pygame - Pac-Man com Teoria dos Grafos.

Mecânicas Avançadas:
- Grafos Ponderados Reais: Terrenos com diferentes custos de transição
  (Normal: 1.0, Lama: 4.0, Aceleração: 0.3, Lava: 8.0).
- Cooldown Ponderado de Movimento: Pesos afetam a física e velocidade dos passos.
- Inimigos com IA em Tempo Real:
  * Minotauro Vermelho: Caçador direto via A* ponderado.
  * Fantasma Roxo: Emboscador tático (mira 3 passos à frente do jogador).
- Orbes de Poder (Power Pellets):
  * Ativam o modo FRIGHTENED por 7 segundos (Inimigos azuis).
  * Invertem a heurística de busca (maximizar distância em grafo).
  * Permitem banir inimigos de volta ao spawn.
- Portais de Teleporte (Grafos Não-Planares): Arestas de peso 1.0 entre nós distantes.
- Multi-Goal Pathfinding: Rota ótima Início -> Chaves -> Destino Trancado.
- HUD Moderno em Cards: Design escuro, layout responsivo e sem cortes.
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
# Paleta de Cores Moderna (Dark UI / Cyberpunk Pac-Man)
# ==============================================================================
COLOR_BG = (13, 17, 23)                # #0d1117 Fundo geral
COLOR_PANEL_BG = (13, 17, 23)          # Fundo do painel lateral
COLOR_CARD_BG = (22, 27, 34)           # #161b22 Fundo dos cards arredondados
COLOR_CARD_BORDER = (48, 54, 61)       # #30363d Borda dos cards
COLOR_WALL = (30, 36, 50)              # Cor da parede

# Terrenos e Pesos
COLOR_TERRAIN_NORMAL = (225, 230, 240)      # Custo 1.0 (Piso claro)
COLOR_TERRAIN_MUD = (120, 82, 48)           # Custo 4.0 (Marrom / Pântano)
COLOR_TERRAIN_BOOST = (0, 195, 215)         # Custo 0.3 (Ciano / Esteira)
COLOR_TERRAIN_LAVA = (220, 50, 40)          # Custo 8.0 (Vermelho alaranjado / Lava)

# Entidades e Mecânicas
COLOR_START = (34, 197, 94)                 # Verde Esmeralda
COLOR_GOAL_LOCKED = (185, 28, 28)           # Vermelho Fechado
COLOR_GOAL_OPEN = (34, 197, 94)             # Verde Brilhante
COLOR_PACMAN = (250, 204, 21)               # #facc15 Amarelo vibrante do Pac-Man
COLOR_KEY = (250, 204, 21)                  # Dourado Chave
COLOR_POWER_PELLET = (6, 182, 212)          # Ciano Orbe de Poder
COLOR_PORTAL_A = (168, 85, 247)             # Roxo Ametista
COLOR_PORTAL_B = (236, 72, 153)             # Rosa Magenta

# Inimigos
COLOR_ENEMY_RED = (239, 68, 68)             # Vermelho (Minotauro Caçador)
COLOR_ENEMY_PURPLE = (168, 85, 247)         # Roxo (Fantasma Emboscador)
COLOR_ENEMY_FRIGHTENED = (37, 99, 235)      # Azul Royal (Assustado)

# Visualização de Busca e IA
COLOR_VISITED = (147, 51, 234)              # Roxo Translúcido de Exploração
COLOR_OPTIMAL = (250, 204, 21)              # Amarelo Ouro de Rota Ótima
COLOR_AI_RED_ROUTE = (239, 68, 68)          # Linha de perseguição do Minotauro
COLOR_AI_PURPLE_ROUTE = (168, 85, 247)      # Linha de perseguição do Emboscador

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
        self.just_teleported = False
        self.next_move_tick = 0
        self.planned_path: List[Node] = []


class MazeGame:
    """Controlador principal do jogo Pac-Man e visualizador de grafos ponderados."""

    def __init__(self, rows: int = 25, cols: int = 25, cell_size: int = 28) -> None:
        pygame.init()
        pygame.font.init()

        self.rows = rows
        self.cols = cols
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

        # Estado do Mundo / Grafo Ponderado
        self.grid: List[List[int]] = []
        self.graph: Graph = Graph()
        self.start_pos: Node = (1, 1)
        self.goal_pos: Node = (self.rows - 2, self.cols - 2)
        self.terrains: Dict[Node, str] = {}
        self.portal_pairs: List[Tuple[Node, Node]] = []
        self.all_keys: List[Node] = []
        self.collected_keys: Set[Node] = set()

        # Orbes de Poder (Power Pellets)
        self.power_pellets: Set[Node] = set()
        self.frightened_until_tick: int = 0

        # Estado do Jogador (Pac-Man)
        self.player_pos: Node = (1, 1)
        self.player_facing: Tuple[int, int] = (0, 1)  # (dr, dc) inicial para a direita
        self.player_health: int = 100
        self.just_teleported: bool = False
        self.next_player_move_tick: int = 0
        self.player_base_cooldown_ms: int = 140

        # Inimigos com IA
        self.enemies: List[EnemyAgent] = []
        self.enemies_active: bool = True
        self.show_ai_path: bool = True  # Tecla T: exibição da rota traçada pela IA
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

    def reset_maze(self) -> None:
        """Gera proceduralmente um novo mundo com terrenos, portais, chaves e orbes."""
        generator = MazeGenerator(self.rows, self.cols)
        world_data: WorldData = generator.generate_world(
            extra_loops_ratio=0.10,
            num_portal_pairs=1,
            num_keys=2,
        )

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

        # Jogador
        self.player_pos = self.start_pos
        self.player_facing = (0, 1)
        self.player_health = 100
        self.just_teleported = False
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

        self.clear_solution()

    def clear_solution(self) -> None:
        """Limpa as marcações de busca visual."""
        self.last_result = None
        self.animating = False
        self.animation_step = 0
        self.visited_set.clear()
        self.solution_path_list.clear()
        self.solution_path_set.clear()

    def start_solving(self, algorithm_name: str) -> None:
        """Executa o algoritmo escolhido considerando terrenos ponderados e chaves."""
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

    def check_teleport(self, current_pos: Node) -> Tuple[Node, bool]:
        """Verifica se a célula atual é um portal e retorna o destino do teleporte."""
        for p1, p2 in self.portal_pairs:
            if current_pos == p1:
                return p2, True
            if current_pos == p2:
                return p1, True
        return current_pos, False

    def move_player(self, dr: int, dc: int) -> None:
        """Move o jogador pelas arestas do grafo respeitando a física dos terrenos."""
        if self.game_over or self.game_won:
            return

        now = pygame.time.get_ticks()
        # Física dos pesos das arestas: cooldown antes de dar o próximo passo
        if now < self.next_player_move_tick:
            return

        self.player_facing = (dr, dc)

        if self.mode != "PLAYER":
            self.mode = "PLAYER"
            self.clear_solution()

        target: Node = (self.player_pos[0] + dr, self.player_pos[1] + dc)

        # Verifica se existe aresta válida no grafo
        if self.graph.has_edge(self.player_pos, target):
            self.player_pos = target

            # Coleta de Chaves
            if self.player_pos in self.all_keys and self.player_pos not in self.collected_keys:
                self.collected_keys.add(self.player_pos)

            # Coleta de Orbes de Poder (Power Pellets)
            if self.player_pos in self.power_pellets:
                self.power_pellets.remove(self.player_pos)
                self.frightened_until_tick = now + 7000  # 7 segundos de medo

            # Teleporte via Portais
            dest_portal, is_portal = self.check_teleport(self.player_pos)
            if is_portal:
                if not self.just_teleported:
                    self.player_pos = dest_portal
                    self.just_teleported = True
            else:
                self.just_teleported = False

            # Dano e peso do terreno
            terrain_type = self.terrains.get(self.player_pos, TerrainType.NORMAL)
            cost = TERRAIN_COSTS.get(terrain_type, 1.0)

            # Aplica cooldown ponderado (Esteira: veloz 0.3x; Lama: lento 4.0x)
            self.next_player_move_tick = now + int(self.player_base_cooldown_ms * cost)

            if terrain_type == TerrainType.LAVA:
                self.player_health = max(0, self.player_health - 10)
                if self.player_health <= 0:
                    self.game_over = True

            # Condição de Vitória (Chegar ao Goal com todas as chaves)
            if self.player_pos == self.goal_pos and self.is_goal_unlocked:
                self.game_won = True

            # Colisão com inimigos
            self.check_enemy_collisions()

    def check_enemy_collisions(self) -> None:
        """Verifica colisões entre o jogador e os inimigos nos dois estados."""
        for enemy in self.enemies:
            if enemy.pos == self.player_pos:
                if self.is_frightened:
                    # Inimigo é banido de volta para o ponto de spawn inicial
                    enemy.pos = enemy.spawn_pos
                    enemy.just_teleported = False
                    enemy.planned_path.clear()
                else:
                    self.game_over = True

    def get_ambush_target(self) -> Node:
        """Calcula o alvo do Fantasma Emboscador (3 passos à frente do jogador)."""
        dr, dc = self.player_facing
        target = (self.player_pos[0] + 3 * dr, self.player_pos[1] + 3 * dc)
        # Se for válido e transitável, usa diretamente
        if 0 <= target[0] < self.rows and 0 <= target[1] < self.cols and self.grid[target[0]][target[1]] == 0:
            return target
        # Caso contrário, seleciona o vértice transitável mais próximo no grafo
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

        for enemy in self.enemies:
            # 1. Determina o alvo e calcula a rota da IA em tempo real
            if frightened:
                # Heurística Invertida: escolhe vizinho que maximiza distância do jogador
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
                    enemy.pos = next_cell

                    # Teleporte de portal
                    dest_portal, is_portal = self.check_teleport(enemy.pos)
                    if is_portal:
                        if not enemy.just_teleported:
                            enemy.pos = dest_portal
                            enemy.just_teleported = True
                    else:
                        enemy.just_teleported = False

                    # Cooldown ponderado para o inimigo
                    terrain_t = self.terrains.get(enemy.pos, TerrainType.NORMAL)
                    cost = TERRAIN_COSTS.get(terrain_t, 1.0)
                    speed_mod = 1.25 if frightened else 1.0
                    enemy.next_move_tick = now + int(self.enemy_base_cooldown_ms * cost * speed_mod)

        # Checa colisões após movimento
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
                    self.solution_path_list = self.last_result.path
                    self.solution_path_set = set(self.last_result.path)
                    break

    def draw_maze(self) -> None:
        """Renderiza as células do labirinto, terrenos ponderados e entidades."""
        ticks = pygame.time.get_ticks()
        pulse = 0.5 + 0.5 * math.sin(ticks * 0.008)

        # 1. Terrenos e Paredes
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
                    pygame.draw.rect(self.screen, COLOR_WALL, rect)
                    pygame.draw.rect(self.screen, (20, 24, 34), rect, 1)
                else:
                    terrain = self.terrains.get(node, TerrainType.NORMAL)
                    if terrain == TerrainType.MUD:
                        base_color = COLOR_TERRAIN_MUD
                    elif terrain == TerrainType.BOOST:
                        base_color = COLOR_TERRAIN_BOOST
                    elif terrain == TerrainType.LAVA:
                        lava_pulse = int(20 * math.sin(ticks * 0.006 + (r + c)))
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

                    # Textura sutil para esteiras
                    if terrain == TerrainType.BOOST:
                        cx = c * self.cell_size + self.cell_size // 2
                        cy = r * self.cell_size + self.cell_size // 2
                        pygame.draw.line(self.screen, (255, 255, 255), (cx - 4, cy), (cx + 4, cy), 1)
                        pygame.draw.line(self.screen, (255, 255, 255), (cx, cy - 4), (cx, cy + 4), 1)

        # 2. Caminho Ótimo do Solver
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

        # 3. Linhas de Perseguição da IA (Tecla T)
        if self.show_ai_path and not self.is_frightened:
            for enemy in self.enemies:
                line_color = COLOR_AI_RED_ROUTE if enemy.behavior == "DIRECT" else COLOR_AI_PURPLE_ROUTE
                if len(enemy.planned_path) > 1:
                    pts = [
                        (c * self.cell_size + self.cell_size // 2, r * self.cell_size + self.cell_size // 2)
                        for r, c in enemy.planned_path
                    ]
                    for i in range(len(pts) - 1):
                        p1, p2 = pts[i], pts[i + 1]
                        if (abs(enemy.planned_path[i][0] - enemy.planned_path[i+1][0]) + abs(enemy.planned_path[i][1] - enemy.planned_path[i+1][1])) <= 1:
                            pygame.draw.line(self.screen, line_color, p1, p2, 2)
                            pygame.draw.circle(self.screen, line_color, p1, 2)

        # 4. Portais de Teleporte
        for idx, (p1, p2) in enumerate(self.portal_pairs):
            col = COLOR_PORTAL_A if idx % 2 == 0 else COLOR_PORTAL_B
            for p in (p1, p2):
                cx = p[1] * self.cell_size + self.cell_size // 2
                cy = p[0] * self.cell_size + self.cell_size // 2
                radius_out = int(self.cell_size * (0.36 + 0.12 * pulse))
                radius_in = max(2, int(radius_out * 0.5))
                pygame.draw.circle(self.screen, col, (cx, cy), radius_out, 2)
                pygame.draw.circle(self.screen, (255, 255, 255), (cx, cy), radius_in)

        # 5. Orbes de Poder (Power Pellets)
        for pellet in self.power_pellets:
            pr, pc = pellet
            pcx = pc * self.cell_size + self.cell_size // 2
            pcy = pr * self.cell_size + self.cell_size // 2
            r_out = int(self.cell_size * 0.28 * (0.8 + 0.3 * pulse))
            pygame.draw.circle(self.screen, COLOR_POWER_PELLET, (pcx, pcy), r_out)
            pygame.draw.circle(self.screen, (255, 255, 255), (pcx, pcy), max(2, r_out // 2))

        # 6. Chaves Douradas
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

        # 7. Vértice Início (Start)
        sr, sc = self.start_pos
        s_rect = pygame.Rect(sc * self.cell_size + 2, sr * self.cell_size + 2, self.cell_size - 4, self.cell_size - 4)
        pygame.draw.rect(self.screen, COLOR_START, s_rect, border_radius=4)
        st_txt = self.font_small.render("S", True, (255, 255, 255))
        self.screen.blit(st_txt, (sc * self.cell_size + 9, sr * self.cell_size + 6))

        # 8. Vértice Destino (Ícone Geométrico Limpo: Cadeado ou Portal Aberto)
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
            # Corpo do cadeado
            body_w, body_h = 12, 9
            body_r = pygame.Rect(gcx - body_w // 2, gcy - 1, body_w, body_h)
            pygame.draw.rect(self.screen, (250, 204, 21), body_r, border_radius=2)
            # Alça do cadeado
            shackle_r = pygame.Rect(gcx - 5, gcy - 8, 10, 8)
            pygame.draw.arc(self.screen, (250, 204, 21), shackle_r, 0, math.pi, 2)
            # Furo da fechadura
            pygame.draw.circle(self.screen, (30, 30, 30), (gcx, gcy + 3), 2)

        # 9. Inimigos
        frightened = self.is_frightened
        for enemy in self.enemies:
            er, ec = enemy.pos
            ecx = ec * self.cell_size + self.cell_size // 2
            ecy = er * self.cell_size + self.cell_size // 2
            radius = max(5, self.cell_size // 3)

            if frightened:
                # Inimigo Assustado (Azul Royal com olhos brancos)
                color = COLOR_ENEMY_FRIGHTENED
                # Pisca nos 2 segundos finais
                if self.frightened_remaining_sec < 2.0 and int(ticks // 200) % 2 == 0:
                    color = (240, 240, 240)
                pygame.draw.circle(self.screen, color, (ecx, ecy), radius)
                # Olhos assustados
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx - 3, ecy - 2), 3)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx + 3, ecy - 2), 3)
                pygame.draw.circle(self.screen, (30, 58, 138), (ecx - 3, ecy - 2), 1)
                pygame.draw.circle(self.screen, (30, 58, 138), (ecx + 3, ecy - 2), 1)
            else:
                # Inimigo Normal
                pygame.draw.circle(self.screen, enemy.base_color, (ecx, ecy), radius)
                # Chifres estilizados
                h_left = [(ecx - radius, ecy), (ecx - radius - 3, ecy - 7), (ecx - radius + 2, ecy - 3)]
                h_right = [(ecx + radius, ecy), (ecx + radius + 3, ecy - 7), (ecx + radius - 2, ecy - 3)]
                pygame.draw.polygon(self.screen, (255, 255, 255), h_left)
                pygame.draw.polygon(self.screen, (255, 255, 255), h_right)
                # Olhos vermelhos brilhantes
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx - 3, ecy - 2), 2)
                pygame.draw.circle(self.screen, (255, 255, 255), (ecx + 3, ecy - 2), 2)

        # 10. Jogador (Pac-Man Amarelo com Boca Animada)
        pr, pc = self.player_pos
        cx = pc * self.cell_size + self.cell_size // 2
        cy = pr * self.cell_size + self.cell_size // 2
        p_radius = max(4, int(self.cell_size * 0.38))

        # Calcula a direção e abertura da boca do Pac-Man
        dr, dc = self.player_facing
        base_angle = math.atan2(dr, dc)
        mouth_amp = 0.65  # ~37 graus de abertura
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

        # Olho do Pac-Man
        eye_angle = base_angle + math.pi / 2.3
        eye_dist = p_radius * 0.55
        ex = int(cx + eye_dist * math.cos(eye_angle))
        ey = int(cy + eye_dist * math.sin(eye_angle))
        pygame.draw.circle(self.screen, (15, 17, 26), (ex, ey), max(2, p_radius // 5))

    def draw_hud(self) -> None:
        """Desenha o painel lateral em cards modernos sem cortes ou overflow."""
        hud_rect = pygame.Rect(self.maze_width, 0, self.panel_width, self.window_height)
        pygame.draw.rect(self.screen, COLOR_PANEL_BG, hud_rect)
        pygame.draw.line(self.screen, COLOR_CARD_BORDER, (self.maze_width, 0), (self.maze_width, self.window_height), 1)

        x = self.maze_width + 14
        y = 12
        card_w = self.panel_width - 28

        # Cabeçalho Principal do Jogo
        title_surf = self.font_title.render("Pac-Man (Grafos)", True, COLOR_PACMAN)
        self.screen.blit(title_surf, (x, y))
        y += 22
        sub_surf = self.font_small.render("Matemática Discreta | Teoria dos Grafos & IA", True, COLOR_ACCENT)
        self.screen.blit(sub_surf, (x, y))
        y += 24

        def draw_card(cy: int, ch: int) -> pygame.Rect:
            c_rect = pygame.Rect(x, cy, card_w, ch)
            pygame.draw.rect(self.screen, COLOR_CARD_BG, c_rect, border_radius=8)
            pygame.draw.rect(self.screen, COLOR_CARD_BORDER, c_rect, 1, border_radius=8)
            return c_rect

        # ======================================================================
        # CARD 1: Status da Partida
        # ======================================================================
        c1_h = 108
        draw_card(y, c1_h)
        cy = y + 8

        lbl1 = self.font_bold.render("Status da Partida", True, COLOR_TEXT)
        self.screen.blit(lbl1, (x + 10, cy))
        cy += 18

        # Barra de HP
        hp_col = COLOR_START if self.player_health > 40 else COLOR_ALERT
        hp_s = self.font_normal.render(f"Vida: {self.player_health}%", True, hp_col)
        self.screen.blit(hp_s, (x + 10, cy))
        pygame.draw.rect(self.screen, (40, 45, 55), (x + 90, cy + 2, 90, 10), border_radius=3)
        pygame.draw.rect(self.screen, hp_col, (x + 90, cy + 2, max(0, int(90 * (self.player_health / 100))), 10), border_radius=3)

        # Chaves
        k_count = f"Chaves: {len(self.collected_keys)} / {len(self.all_keys)}"
        k_tag = "[PORTÃO ABERTO!]" if self.is_goal_unlocked else "[CADEADO FECHADO]"
        k_col = COLOR_START if self.is_goal_unlocked else COLOR_KEY
        k_s = self.font_normal.render(f"{k_count}  {k_tag}", True, k_col)
        self.screen.blit(k_s, (x + 200, cy))
        cy += 20

        # Modo Poder / Power Pellet
        if self.is_frightened:
            power_txt = f"Modo Poder: ATIVO ({self.frightened_remaining_sec:.1f}s) - Caça Invertida!"
            power_col = COLOR_ACCENT
        else:
            pellets_left = len(self.power_pellets)
            power_txt = f"Orbes no Mapa: {pellets_left}  |  Estado: Pac-Man em Fuga"
            power_col = COLOR_TEXT_MUTED
        p_surf = self.font_normal.render(power_txt, True, power_col)
        self.screen.blit(p_surf, (x + 10, cy))
        cy += 18

        # Inimigos
        e_status = "PERSEGUINDO" if self.enemies_active else "PAUSADOS [P]"
        e_col = COLOR_ALERT if self.enemies_active else COLOR_TEXT_MUTED
        if self.is_frightened:
            e_status = "ASSUSTADOS (Fuga em Grafo)"
            e_col = COLOR_ACCENT
        e_s = self.font_normal.render(f"Inimigos (Minotauro + Fantasma): {e_status}", True, e_col)
        self.screen.blit(e_s, (x + 10, cy))
        y += c1_h + 8

        # ======================================================================
        # CARD 2: Estrutura do Grafo G = (V, E, w)
        # ======================================================================
        c2_h = 76
        draw_card(y, c2_h)
        cy = y + 8

        lbl2 = self.font_bold.render("Estrutura do Grafo G = (V, E, w)", True, COLOR_TEXT)
        self.screen.blit(lbl2, (x + 10, cy))
        cy += 18

        g_line1 = f"Vértices |V|: {self.graph.order}   |   Arestas |E|: {self.graph.size}"
        g_line2 = f"Portais Não-Planares: {len(self.portal_pairs)} par (peso 1.0)   |   Orbes: {len(self.power_pellets)}"
        s1 = self.font_normal.render(g_line1, True, COLOR_TEXT_MUTED)
        s2 = self.font_normal.render(g_line2, True, COLOR_TEXT_MUTED)
        self.screen.blit(s1, (x + 10, cy))
        self.screen.blit(s2, (x + 10, cy + 16))
        y += c2_h + 8

        # ======================================================================
        # CARD 3: Algoritmo de Busca (Multi-Goal Solver)
        # ======================================================================
        c3_h = 92
        draw_card(y, c3_h)
        cy = y + 8

        lbl3 = self.font_bold.render("Algoritmo de Busca (Multi-Goal Solver)", True, COLOR_TEXT)
        self.screen.blit(lbl3, (x + 10, cy))
        cy += 18

        if self.last_result:
            m1 = f"Algoritmo: {self.last_result.algorithm_name}"
            m2 = f"Nós Expandidos: {len(self.visited_set)} / {self.graph.order}   |   Tempo: {self.last_result.execution_time_ms:.2f} ms"
            m3 = f"Custo Total Ponderado: {self.last_result.cost:.1f} unidades"
        else:
            m1 = "Modo: Jogo Manual (Pac-Man)   |   Dica: [1/D] ou [2/A]"
            m2 = "Nós Expandidos: -   |   Tempo de Execução: -"
            m3 = "Custo do Caminho Mínimo: -"

        for m in [m1, m2, m3]:
            s = self.font_normal.render(m, True, COLOR_TEXT_MUTED)
            self.screen.blit(s, (x + 10, cy))
            cy += 17
        y += c3_h + 8

        # ======================================================================
        # CARD 4: Pesos das Arestas w(u, v)
        # ======================================================================
        c4_h = 98
        draw_card(y, c4_h)
        cy = y + 8

        lbl4 = self.font_bold.render("Pesos das Arestas w(u, v) & Física", True, COLOR_TEXT)
        self.screen.blit(lbl4, (x + 10, cy))
        cy += 18

        terrains_info = [
            (COLOR_TERRAIN_NORMAL, "Piso Normal", "1.0", "Passo Padrão"),
            (COLOR_TERRAIN_BOOST, "Esteira", "0.3", "Ultrarrápido"),
            (COLOR_TERRAIN_MUD, "Lama / Pântano", "4.0", "Lento / Atrito"),
            (COLOR_TERRAIN_LAVA, "Lava Ardente", "8.0", "Alto Custo (-10 HP)"),
        ]

        # Exibição compacta em grade de 2 colunas para os terrenos
        col_w = card_w // 2 - 8
        for idx, (col, name, weight, note) in enumerate(terrains_info):
            cx_item = x + 10 if idx % 2 == 0 else x + col_w + 14
            cy_item = cy + (idx // 2) * 24

            pygame.draw.rect(self.screen, col, (cx_item, cy_item + 2, 11, 11), border_radius=2)
            t_s = self.font_normal.render(f"{name}: {weight}", True, COLOR_TEXT)
            d_s = self.font_small.render(f"({note})", True, COLOR_TEXT_MUTED)
            self.screen.blit(t_s, (cx_item + 16, cy_item))
            self.screen.blit(d_s, (cx_item + 100, cy_item + 1))
        y += c4_h + 8

        # ======================================================================
        # CARD 5: Teclas de Controle (Duas Colunas Compactas - 100% Visível)
        # ======================================================================
        c5_h = 100
        draw_card(y, c5_h)
        cy = y + 8

        lbl5 = self.font_bold.render("Teclas de Controle", True, COLOR_TEXT)
        self.screen.blit(lbl5, (x + 10, cy))
        cy += 18

        col1_controls = [
            ("[WASD]", "Mover Pac-Man"),
            ("[1] / [D]", "Solver Dijkstra"),
            ("[2] / [A]", "Solver A* Ponderado"),
            ("[T]", f"Rota IA: {'ON' if self.show_ai_path else 'OFF'}"),
        ]
        col2_controls = [
            ("[P]", "Pausar / Retomar IA"),
            ("[R] / [N]", "Novo Labirinto"),
            ("[C]", "Limpar Rota"),
            ("[ESC]", "Sair"),
        ]

        c_w2 = card_w // 2 - 6
        for idx, (k, d) in enumerate(col1_controls):
            row_y = cy + idx * 17
            k_s = self.font_bold.render(k, True, COLOR_ACCENT)
            d_s = self.font_small.render(f"- {d}", True, COLOR_TEXT_MUTED)
            self.screen.blit(k_s, (x + 10, row_y))
            self.screen.blit(d_s, (x + 80, row_y + 1))

        for idx, (k, d) in enumerate(col2_controls):
            row_y = cy + idx * 17
            k_s = self.font_bold.render(k, True, COLOR_ACCENT)
            d_s = self.font_small.render(f"- {d}", True, COLOR_TEXT_MUTED)
            self.screen.blit(k_s, (x + c_w2 + 10, row_y))
            self.screen.blit(d_s, (x + c_w2 + 80, row_y + 1))

    def draw_game_over_overlay(self) -> None:
        """Exibe tela translúcida de Game Over ou Vitória."""
        if not (self.game_over or self.game_won):
            return

        overlay = pygame.Surface((self.window_width, self.window_height), pygame.SRCALPHA)
        overlay.fill((10, 12, 18, 215))
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
            msg1 = "Você coletou todas as chaves e superou o labirinto!"
            msg2 = "O Pac-Man dominou a Teoria dos Grafos com perfeição."
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
                    elif event.key in (pygame.K_a, pygame.K_LEFT) and not (self.mode == "SOLVER"):
                        self.move_player(0, -1)
                    elif event.key in (pygame.K_d, pygame.K_RIGHT) and not (self.mode == "SOLVER"):
                        self.move_player(0, 1)
                    elif event.key == pygame.K_1 or (event.key == pygame.K_d and self.mode == "SOLVER"):
                        self.start_solving("Dijkstra")
                    elif event.key == pygame.K_2 or (event.key == pygame.K_a and self.mode == "SOLVER"):
                        self.start_solving("A*")
                    elif event.key == pygame.K_p:
                        self.enemies_active = not self.enemies_active
                    elif event.key == pygame.K_t:
                        self.show_ai_path = not self.show_ai_path
                    elif event.key in (pygame.K_r, pygame.K_n):
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
