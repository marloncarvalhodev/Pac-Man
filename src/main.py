"""Interface Gráfica Interativa em Pygame - Pac-Man com Teoria dos Grafos.

Mecânicas Avançadas:
- Grafos Ponderados Reais: Terrenos com diferentes custos de transição
  (Normal: 1.0, Lama: 4.0, Aceleração: 0.3, Lava: 8.0).
- Inimigo com IA em Tempo Real (Minotauro): Perseguição dinâmica via A* ponderado.
- Portais de Teleporte (Grafos Não-Planares): Arestas conectando nós distantes.
- Sistema de Chaves & Destino Trancado (Multi-Goal Pathfinding).
- Visualizador de Busca: Animação dos algoritmos Dijkstra e A*.
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

# Importação dos módulos do projeto com fallback
try:
    from .graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
    from .pathfinding import a_star, dijkstra, PathfindingResult, solve_multi_goal
except ImportError:
    from graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
    from pathfinding import a_star, dijkstra, PathfindingResult, solve_multi_goal


# ==============================================================================
# Paleta de Cores Moderna (Dark UI / Cyberpunk Fantasy)
# ==============================================================================
COLOR_BG = (15, 17, 26)
COLOR_PANEL_BG = (23, 27, 38)
COLOR_BORDER = (45, 53, 72)
COLOR_WALL = (34, 40, 56)

# Terrenos e Pesos
COLOR_TERRAIN_NORMAL = (230, 235, 245)      # Custo 1.0 (Piso claro)
COLOR_TERRAIN_MUD = (120, 82, 48)           # Custo 4.0 (Marrom / Pântano)
COLOR_TERRAIN_BOOST = (0, 195, 215)         # Custo 0.3 (Ciano / Esteira)
COLOR_TERRAIN_LAVA = (230, 60, 45)          # Custo 8.0 (Vermelho alaranjado / Lava)

# Entidades e Mecânicas
COLOR_START = (46, 204, 113)                # Verde Esmeralda
COLOR_GOAL_LOCKED = (180, 40, 40)           # Vermelho Fechado
COLOR_GOAL_OPEN = (39, 174, 96)             # Verde Brilhante
COLOR_PLAYER = (52, 152, 219)               # Azul Ciano
COLOR_ENEMY = (235, 47, 6)                  # Vermelho Carmesim
COLOR_KEY = (241, 196, 15)                  # Dourado Chave
COLOR_PORTAL_A = (155, 89, 182)             # Roxo Ametista
COLOR_PORTAL_B = (232, 67, 147)             # Rosa Magenta

# Visualização de Busca de Grafos
COLOR_VISITED = (142, 68, 173)              # Roxo Translúcido de Exploração
COLOR_OPTIMAL = (255, 234, 167)             # Amarelo Ouro de Rota Ótima

# Tipografia e HUD
COLOR_TEXT = (240, 244, 250)
COLOR_TEXT_MUTED = (150, 160, 178)
COLOR_ACCENT = (0, 206, 201)
COLOR_ALERT = (255, 107, 107)


class MazeGame:
    """Controlador principal do jogo e visualizador de grafos ponderados."""

    def __init__(self, rows: int = 25, cols: int = 25, cell_size: int = 24) -> None:
        pygame.init()
        pygame.font.init()

        self.rows = rows
        self.cols = cols
        self.cell_size = cell_size

        # Dimensões da tela: Labirinto à esquerda, HUD analítico à direita
        self.maze_width = self.cols * self.cell_size
        self.maze_height = self.rows * self.cell_size
        self.panel_width = 420
        self.window_width = self.maze_width + self.panel_width
        self.window_height = max(self.maze_height, 700)

        self.screen = pygame.display.set_mode((self.window_width, self.window_height))
        pygame.display.set_caption("Pac-Man: Teoria dos Grafos & IA de Pathfinding (Dijkstra vs A*)")
        self.clock = pygame.time.Clock()

        # Fontes do sistema
        self.font_title = pygame.font.SysFont("Segoe UI, Arial", 18, bold=True)
        self.font_bold = pygame.font.SysFont("Segoe UI, Arial", 13, bold=True)
        self.font_normal = pygame.font.SysFont("Segoe UI, Arial", 12)
        self.font_small = pygame.font.SysFont("Segoe UI, Arial", 11)

        # Estado do Mundo / Grafo Ponderado
        self.grid: List[List[int]] = []
        self.graph: Graph = Graph()
        self.start_pos: Node = (1, 1)
        self.goal_pos: Node = (self.rows - 2, self.cols - 2)
        self.terrains: Dict[Node, str] = {}
        self.portal_pairs: List[Tuple[Node, Node]] = []
        self.all_keys: List[Node] = []
        self.collected_keys: Set[Node] = set()

        # Estado do Jogador
        self.player_pos: Node = (1, 1)
        self.player_health: int = 100
        self.just_teleported: bool = False

        # Estado do Inimigo (Minotauro)
        self.enemy_pos: Node = (self.rows - 2, self.cols - 2)
        self.enemy_active: bool = True
        self.enemy_move_interval_ms: int = 420
        self.last_enemy_move_time: int = pygame.time.get_ticks()
        self.enemy_just_teleported: bool = False

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

    def reset_maze(self) -> None:
        """Gera proceduralmente um novo mundo com terrenos, portais e chaves."""
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

        self.player_pos = self.start_pos
        self.player_health = 100
        self.just_teleported = False

        self.enemy_pos = world_data.enemy_spawn
        self.enemy_just_teleported = False
        self.last_enemy_move_time = pygame.time.get_ticks()

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

    @property
    def remaining_keys(self) -> List[Node]:
        """Retorna lista de chaves ainda não coletadas pelo jogador."""
        return [k for k in self.all_keys if k not in self.collected_keys]

    @property
    def is_goal_unlocked(self) -> bool:
        """Destino só abre quando todas as chaves forem coletadas."""
        return len(self.remaining_keys) == 0

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
        """Move o jogador pelas arestas do grafo e processa portais e chaves."""
        if self.game_over or self.game_won:
            return

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

            # Teleporte via Portais
            dest_portal, is_portal = self.check_teleport(self.player_pos)
            if is_portal:
                if not self.just_teleported:
                    self.player_pos = dest_portal
                    self.just_teleported = True
            else:
                self.just_teleported = False

            # Dano em poças de Lava
            terrain_type = self.terrains.get(self.player_pos, TerrainType.NORMAL)
            if terrain_type == TerrainType.LAVA:
                self.player_health = max(0, self.player_health - 10)
                if self.player_health <= 0:
                    self.game_over = True

            # Condição de Vitória (Chegar ao Goal com todas as chaves)
            if self.player_pos == self.goal_pos:
                if self.is_goal_unlocked:
                    self.game_won = True

            # Se moveu em direção ao Inimigo
            if self.player_pos == self.enemy_pos:
                self.game_over = True

    def update_enemy(self) -> None:
        """Atualiza a IA do Minotauro via A* ponderado em tempo real."""
        if not self.enemy_active or self.game_over or self.game_won:
            return

        # Verifica captura imediata se colidirem
        if self.enemy_pos == self.player_pos:
            self.game_over = True
            return

        now = pygame.time.get_ticks()
        if now - self.last_enemy_move_time >= self.enemy_move_interval_ms:
            self.last_enemy_move_time = now

            # Minotauro calcula a rota mais rápida até o jogador usando A* ponderado
            path_result = a_star(
                graph=self.graph,
                start=self.enemy_pos,
                goal=self.player_pos,
                portals=self.portal_pairs,
                min_weight=0.3,
            )

            if path_result.found and len(path_result.path) > 1:
                next_cell = path_result.path[1]
                self.enemy_pos = next_cell

                # O Minotauro também pode usar portais se for vantajoso
                portal_dest, is_portal = self.check_teleport(self.enemy_pos)
                if is_portal:
                    if not self.enemy_just_teleported:
                        self.enemy_pos = portal_dest
                        self.enemy_just_teleported = True
                else:
                    self.enemy_just_teleported = False

            # Captura do jogador após movimento
            if self.enemy_pos == self.player_pos:
                self.game_over = True

    def update(self) -> None:
        """Atualiza a IA do inimigo e a animação do pathfinding."""
        self.update_enemy()

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

    def get_enemy_distance(self) -> Tuple[int, float]:
        """Calcula a distância em nós e o custo ponderado do Minotauro até o jogador."""
        res = a_star(
            graph=self.graph,
            start=self.enemy_pos,
            goal=self.player_pos,
            portals=self.portal_pairs,
            min_weight=0.3,
        )
        steps = len(res.path) - 1 if res.found else -1
        cost = res.cost if res.found else float("inf")
        return steps, cost

    def draw_maze(self) -> None:
        """Renderiza as células do labirinto, terrenos ponderados e entidades."""
        ticks = pygame.time.get_ticks()
        pulse = 0.5 + 0.5 * math.sin(ticks * 0.008)

        # 1. Renderiza Terrenos e Paredes
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
                    pygame.draw.rect(self.screen, (25, 29, 42), rect, 1)
                else:
                    # Terreno base
                    terrain = self.terrains.get(node, TerrainType.NORMAL)
                    if terrain == TerrainType.MUD:
                        base_color = COLOR_TERRAIN_MUD
                    elif terrain == TerrainType.BOOST:
                        base_color = COLOR_TERRAIN_BOOST
                    elif terrain == TerrainType.LAVA:
                        # Lava pulsa sutilmente em vermelho/laranja
                        lava_pulse = int(25 * math.sin(ticks * 0.005 + (r + c)))
                        base_color = (
                            min(255, COLOR_TERRAIN_LAVA[0] + lava_pulse),
                            max(0, COLOR_TERRAIN_LAVA[1] - lava_pulse),
                            COLOR_TERRAIN_LAVA[2],
                        )
                    else:
                        base_color = COLOR_TERRAIN_NORMAL

                    # Sobreposição de Nós Visitados na Busca
                    if node in self.visited_set and node not in self.solution_path_set:
                        # Mescla visual da cor visitada
                        color = (
                            int(base_color[0] * 0.45 + COLOR_VISITED[0] * 0.55),
                            int(base_color[1] * 0.45 + COLOR_VISITED[1] * 0.55),
                            int(base_color[2] * 0.45 + COLOR_VISITED[2] * 0.55),
                        )
                    else:
                        color = base_color

                    pygame.draw.rect(self.screen, color, rect)

                    # Textura sutil para esteiras de aceleração
                    if terrain == TerrainType.BOOST:
                        cx = c * self.cell_size + self.cell_size // 2
                        cy = r * self.cell_size + self.cell_size // 2
                        pygame.draw.line(self.screen, (255, 255, 255), (cx - 4, cy), (cx + 4, cy), 2)
                        pygame.draw.line(self.screen, (255, 255, 255), (cx, cy - 4), (cx, cy + 4), 2)

        # 2. Desenha o Caminho Ótimo Encontrado (se houver)
        if self.solution_path_list:
            for i in range(len(self.solution_path_list) - 1):
                n1 = self.solution_path_list[i]
                n2 = self.solution_path_list[i + 1]

                # Se a transição for por teleporte não-planar, desenha tracejado ou salta
                is_portal_jump = (abs(n1[0] - n2[0]) + abs(n1[1] - n2[1])) > 1

                p1 = (n1[1] * self.cell_size + self.cell_size // 2, n1[0] * self.cell_size + self.cell_size // 2)
                p2 = (n2[1] * self.cell_size + self.cell_size // 2, n2[0] * self.cell_size + self.cell_size // 2)

                if is_portal_jump:
                    # Linha de conexão do teleporte com efeito de feixe
                    pygame.draw.line(self.screen, (240, 147, 251), p1, p2, 2)
                else:
                    pygame.draw.line(self.screen, COLOR_OPTIMAL, p1, p2, 4)
                    pygame.draw.circle(self.screen, (255, 255, 255), p1, 3)

        # 3. Portais de Teleporte (Pares Não-Planares)
        portal_colors = [COLOR_PORTAL_A, COLOR_PORTAL_B]
        for idx, (p1, p2) in enumerate(self.portal_pairs):
            color = portal_colors[idx % len(portal_colors)]
            for p in (p1, p2):
                cx = p[1] * self.cell_size + self.cell_size // 2
                cy = p[0] * self.cell_size + self.cell_size // 2
                radius_out = int(self.cell_size * (0.35 + 0.12 * pulse))
                radius_in = max(2, int(radius_out * 0.55))

                pygame.draw.circle(self.screen, color, (cx, cy), radius_out, 2)
                pygame.draw.circle(self.screen, (255, 255, 255), (cx, cy), radius_in)

        # 4. Chaves Douradas
        for key_node in self.all_keys:
            if key_node not in self.collected_keys:
                kr, kc = key_node
                kcx = kc * self.cell_size + self.cell_size // 2
                kcy = kr * self.cell_size + self.cell_size // 2
                key_pulse = 0.8 + 0.2 * pulse

                # Desenho do ícone da Chave
                radius = int(self.cell_size * 0.22 * key_pulse)
                pygame.draw.circle(self.screen, COLOR_KEY, (kcx, kcy - 3), radius)
                pygame.draw.circle(self.screen, (255, 255, 255), (kcx, kcy - 3), max(1, radius // 2))
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy - 3), (kcx, kcy + 6), 2)
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy + 2), (kcx + 3, kcy + 2), 2)
                pygame.draw.line(self.screen, COLOR_KEY, (kcx, kcy + 5), (kcx + 3, kcy + 5), 2)

        # 5. Início (Start)
        sr, sc = self.start_pos
        s_rect = pygame.Rect(sc * self.cell_size + 2, sr * self.cell_size + 2, self.cell_size - 4, self.cell_size - 4)
        pygame.draw.rect(self.screen, COLOR_START, s_rect, border_radius=4)
        start_txt = self.font_small.render("S", True, (255, 255, 255))
        self.screen.blit(start_txt, (sc * self.cell_size + 8, sr * self.cell_size + 4))

        # 6. Destino (Goal - Trancado / Destrancado)
        gr, gc = self.goal_pos
        g_rect = pygame.Rect(gc * self.cell_size + 2, gr * self.cell_size + 2, self.cell_size - 4, self.cell_size - 4)
        if self.is_goal_unlocked:
            goal_color = COLOR_GOAL_OPEN
            pygame.draw.rect(self.screen, goal_color, g_rect, border_radius=4)
            g_txt = self.font_small.render("EXIT", True, (255, 255, 255))
            self.screen.blit(g_txt, (gc * self.cell_size + 2, gr * self.cell_size + 5))
        else:
            goal_color = COLOR_GOAL_LOCKED
            pygame.draw.rect(self.screen, goal_color, g_rect, border_radius=4)
            pygame.draw.rect(self.screen, (255, 255, 255), g_rect, 1, border_radius=4)
            lock_txt = self.font_small.render("LOCK", True, (255, 255, 255))
            self.screen.blit(lock_txt, (gc * self.cell_size + 1, gr * self.cell_size + 5))

        # 7. Inimigo (Minotauro)
        er, ec = self.enemy_pos
        ecx = ec * self.cell_size + self.cell_size // 2
        ecy = er * self.cell_size + self.cell_size // 2
        e_radius = max(4, self.cell_size // 3)

        # Corpo ameaçador
        pygame.draw.circle(self.screen, COLOR_ENEMY, (ecx, ecy), e_radius)
        # Chifres do Minotauro
        horn_left = [(ecx - e_radius, ecy), (ecx - e_radius - 4, ecy - 7), (ecx - e_radius + 2, ecy - 3)]
        horn_right = [(ecx + e_radius, ecy), (ecx + e_radius + 4, ecy - 7), (ecx + e_radius - 2, ecy - 3)]
        pygame.draw.polygon(self.screen, (250, 250, 250), horn_left)
        pygame.draw.polygon(self.screen, (250, 250, 250), horn_right)
        # Olhos vermelhos brilhantes
        pygame.draw.circle(self.screen, (255, 255, 255), (ecx - 3, ecy - 2), 2)
        pygame.draw.circle(self.screen, (255, 255, 255), (ecx + 3, ecy - 2), 2)

        # 8. Jogador
        pr, pc = self.player_pos
        center_x = pc * self.cell_size + self.cell_size // 2
        center_y = pr * self.cell_size + self.cell_size // 2
        p_radius = max(3, self.cell_size // 3)
        pygame.draw.circle(self.screen, COLOR_PLAYER, (center_x, center_y), p_radius)
        pygame.draw.circle(self.screen, (255, 255, 255), (center_x, center_y), p_radius, 2)

    def draw_hud(self) -> None:
        """Desenha o painel lateral com métricas teóricas, status e controles."""
        hud_rect = pygame.Rect(self.maze_width, 0, self.panel_width, self.window_height)
        pygame.draw.rect(self.screen, COLOR_PANEL_BG, hud_rect)
        pygame.draw.line(self.screen, COLOR_BORDER, (self.maze_width, 0), (self.maze_width, self.window_height), 2)

        x = self.maze_width + 20
        y = 15

        # Cabeçalho
        title_surf = self.font_title.render("Pac-Man (Grafos)", True, COLOR_TEXT)
        self.screen.blit(title_surf, (x, y))
        y += 24
        sub_surf = self.font_small.render("Grafos Não-Planares | A* em Tempo Real", True, COLOR_ACCENT)
        self.screen.blit(sub_surf, (x, y))
        y += 22

        pygame.draw.line(self.screen, COLOR_BORDER, (x, y), (x + self.panel_width - 40, y), 1)
        y += 12

        # Status do Jogador & Missão
        sec1 = self.font_bold.render("Status da Partida:", True, COLOR_TEXT)
        self.screen.blit(sec1, (x, y))
        y += 20

        # Barra de Vida
        hp_color = COLOR_START if self.player_health > 40 else COLOR_ALERT
        hp_text = self.font_normal.render(f"Vida: {self.player_health}%", True, hp_color)
        self.screen.blit(hp_text, (x + 10, y))
        # Mini barra de HP
        bar_x = x + 100
        pygame.draw.rect(self.screen, (50, 50, 50), (bar_x, y + 2, 100, 12), border_radius=3)
        pygame.draw.rect(self.screen, hp_color, (bar_x, y + 2, max(0, self.player_health), 12), border_radius=3)
        y += 20

        # Chaves Coletadas
        num_collected = len(self.collected_keys)
        num_total = len(self.all_keys)
        keys_status = f"Chaves: {num_collected} / {num_total}"
        if self.is_goal_unlocked:
            keys_status += "  [PORTÃO ABERTO!]"
            k_color = COLOR_START
        else:
            keys_status += "  [TRANCADO]"
            k_color = COLOR_KEY

        k_surf = self.font_normal.render(keys_status, True, k_color)
        self.screen.blit(k_surf, (x + 10, y))
        y += 20

        # Inimigo (Minotauro)
        enemy_steps, enemy_cost = self.get_enemy_distance()
        e_status_str = "ATIVO (Perseguindo)" if self.enemy_active else "PAUSADO [P]"
        e_status_color = COLOR_ALERT if self.enemy_active else COLOR_TEXT_MUTED
        e_surf = self.font_normal.render(f"Minotauro: {e_status_str}", True, e_status_color)
        self.screen.blit(e_surf, (x + 10, y))
        y += 18

        dist_str = f"Distância do Minotauro: {enemy_steps} passos (Custo: {enemy_cost:.1f})"
        dist_color = COLOR_ALERT if enemy_steps <= 5 and enemy_steps >= 0 else COLOR_TEXT_MUTED
        dist_surf = self.font_normal.render(dist_str, True, dist_color)
        self.screen.blit(dist_surf, (x + 10, y))
        y += 24

        pygame.draw.line(self.screen, COLOR_BORDER, (x, y), (x + self.panel_width - 40, y), 1)
        y += 12

        # Estatísticas do Grafo Ponderado G = (V, E, w)
        sec2 = self.font_bold.render("Estrutura do Grafo G = (V, E, w):", True, COLOR_TEXT)
        self.screen.blit(sec2, (x, y))
        y += 20

        graph_lines = [
            f"Vértices |V|: {self.graph.order}",
            f"Arestas |E|: {self.graph.size} (inclui portais)",
            f"Portais Não-Planares: {len(self.portal_pairs)} par(es) [peso 1.0]",
            f"Origem: {self.player_pos} -> Destino: {self.goal_pos}",
        ]
        for gl in graph_lines:
            s = self.font_normal.render(gl, True, COLOR_TEXT_MUTED)
            self.screen.blit(s, (x + 10, y))
            y += 18

        y += 6
        pygame.draw.line(self.screen, COLOR_BORDER, (x, y), (x + self.panel_width - 40, y), 1)
        y += 12

        # Painel do Solver (Dijkstra vs A*)
        sec3 = self.font_bold.render("Algoritmo de Busca (Multi-Goal):", True, COLOR_TEXT)
        self.screen.blit(sec3, (x, y))
        y += 20

        if self.last_result:
            status = "Animando..." if self.animating else "Rota Ótima Traçada!"
            metrics = [
                f"Algoritmo: {self.last_result.algorithm_name}",
                f"Status: {status}",
                f"Nós Expandidos: {len(self.visited_set)} / {self.graph.order}",
                f"Custo Total Ponderado: {self.last_result.cost:.1f}",
                f"Tempo de Execução: {self.last_result.execution_time_ms:.3f} ms",
            ]
        else:
            metrics = [
                "Modo: Navegação Manual [WASD]",
                "Dica: [1/D] p/ Dijkstra  |  [2/A] p/ A*",
                "Nós Expandidos: -",
                "Custo Ponderado: -",
                "Tempo de Execução: -",
            ]

        for m in metrics:
            s = self.font_normal.render(m, True, COLOR_TEXT_MUTED)
            self.screen.blit(s, (x + 10, y))
            y += 18

        y += 6
        pygame.draw.line(self.screen, COLOR_BORDER, (x, y), (x + self.panel_width - 40, y), 1)
        y += 12

        # Tabela de Terrenos & Pesos
        sec4 = self.font_bold.render("Pesos das Arestas w(u, v):", True, COLOR_TEXT)
        self.screen.blit(sec4, (x, y))
        y += 20

        terrains_info = [
            (COLOR_TERRAIN_NORMAL, "Piso Normal", "1.0", "Passo Padrão"),
            (COLOR_TERRAIN_BOOST, "Aceleração", "0.3", "Rápido / Esteira"),
            (COLOR_TERRAIN_MUD, "Pântano / Lama", "4.0", "Lento / Penoso"),
            (COLOR_TERRAIN_LAVA, "Lava / Dano", "8.0", "Alto Custo (-10 HP)"),
            (COLOR_PORTAL_A, "Portal Teleporte", "1.0", "Atalho Não-Planar"),
        ]

        for color, name, weight, note in terrains_info:
            pygame.draw.rect(self.screen, color, (x + 10, y + 2, 12, 12))
            t_s = self.font_normal.render(f"{name}: peso {weight}", True, COLOR_TEXT)
            d_s = self.font_small.render(f"({note})", True, COLOR_TEXT_MUTED)
            self.screen.blit(t_s, (x + 28, y))
            self.screen.blit(d_s, (x + 175, y + 1))
            y += 18

        y += 6
        pygame.draw.line(self.screen, COLOR_BORDER, (x, y), (x + self.panel_width - 40, y), 1)
        y += 12

        # Controles
        sec5 = self.font_bold.render("Teclas de Controle:", True, COLOR_TEXT)
        self.screen.blit(sec5, (x, y))
        y += 20

        controls = [
            ("WASD / Setas", "Mover Jogador"),
            ("[1] ou [D]", "Solver Dijkstra Ponderado"),
            ("[2] ou [A]", "Solver A* Ponderado"),
            ("[P]", "Ativar / Pausar Minotauro"),
            ("[R]", "Gerar Novo Labirinto"),
            ("[C]", "Limpar Solução"),
            ("[+] / [-]", f"Velocidade: {self.animation_speed}x"),
        ]
        for key, desc in controls:
            k_s = self.font_bold.render(key, True, COLOR_ACCENT)
            d_s = self.font_small.render(f"- {desc}", True, COLOR_TEXT_MUTED)
            self.screen.blit(k_s, (x + 10, y))
            self.screen.blit(d_s, (x + 110, y + 1))
            y += 18

    def draw_game_over_overlay(self) -> None:
        """Exibe tela translúcida de Game Over ou Vitória."""
        if not (self.game_over or self.game_won):
            return

        overlay = pygame.Surface((self.window_width, self.window_height), pygame.SRCALPHA)
        overlay.fill((10, 12, 18, 205))
        self.screen.blit(overlay, (0, 0))

        box_width = 440
        box_height = 200
        box_x = (self.window_width - box_width) // 2
        box_y = (self.window_height - box_height) // 2

        pygame.draw.rect(self.screen, COLOR_PANEL_BG, (box_x, box_y, box_width, box_height), border_radius=10)
        border_col = COLOR_START if self.game_won else COLOR_ALERT
        pygame.draw.rect(self.screen, border_col, (box_x, box_y, box_width, box_height), 3, border_radius=10)

        if self.game_won:
            title_text = "VITÓRIA!"
            msg1 = "Você coletou todas as chaves e escapou!"
            msg2 = "O labirinto de grafos foi conquistado com sucesso."
            text_color = COLOR_START
        else:
            title_text = "GAME OVER!"
            if self.player_health <= 0:
                msg1 = "Você sucumbiu à lava ardente!"
            else:
                msg1 = "O Minotauro te capturou no labirinto!"
            msg2 = "A rota traçada pelo A* do inimigo foi implacável."
            text_color = COLOR_ALERT

        t_surf = self.font_title.render(title_text, True, text_color)
        m1_surf = self.font_normal.render(msg1, True, COLOR_TEXT)
        m2_surf = self.font_small.render(msg2, True, COLOR_TEXT_MUTED)
        restart_surf = self.font_bold.render("Pressione [R] para Novo Labirinto ou [ESC] para Sair", True, COLOR_ACCENT)

        self.screen.blit(t_surf, (box_x + (box_width - t_surf.get_width()) // 2, box_y + 30))
        self.screen.blit(m1_surf, (box_x + (box_width - m1_surf.get_width()) // 2, box_y + 75))
        self.screen.blit(m2_surf, (box_x + (box_width - m2_surf.get_width()) // 2, box_y + 105))
        self.screen.blit(restart_surf, (box_x + (box_width - restart_surf.get_width()) // 2, box_y + 145))

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
                        self.enemy_active = not self.enemy_active
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
    game = MazeGame(rows=25, cols=25, cell_size=24)
    game.run()


if __name__ == "__main__":
    main()
