"""Pac-Man - Pacote de Teoria dos Grafos e Pathfinding.

Módulo educacional voltado para a disciplina de Matemática Discreta e
Teoria dos Grafos.
"""

from .graph import Graph, MazeGenerator, Node, TerrainType, TERRAIN_COSTS, WorldData
from .pathfinding import dijkstra, a_star, PathfindingResult, solve_multi_goal

__all__ = [
    "Graph",
    "MazeGenerator",
    "Node",
    "TerrainType",
    "TERRAIN_COSTS",
    "WorldData",
    "dijkstra",
    "a_star",
    "PathfindingResult",
    "solve_multi_goal",
]
