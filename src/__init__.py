"""Pac-Man - Pacote de Teoria dos Grafos e Pathfinding.

Módulo educacional voltado para a disciplina de Matemática Discreta e
Teoria dos Grafos.
"""

from .graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
from .graph import build_movement_graph
from .pathfinding import dijkstra, a_star, PathfindingResult, solve_multi_goal

__all__ = [
    "Graph",
    "MazeGenerator",
    "Node",
    "TerrainType",
    "TERRAIN_COSTS",
    "WorldData",
    "build_movement_graph",
    "dijkstra",
    "a_star",
    "PathfindingResult",
    "solve_multi_goal",
]
