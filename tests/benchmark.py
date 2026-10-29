"""Script de Benchmark e Análise Comparativa de Desempenho: Dijkstra vs A*.

Disciplina: Matemática Discreta / Teoria dos Grafos.
Este script executa ensaios empíricos sistemáticos comparando:
1. Tempo de Execução Médio (ms) e Desvio Padrão.
2. Quantidade de Nós Expandidos / Visitados (|V_visitados|).
3. Razão de Eficiência Heurística (|V_visitados_A*| / |V_visitados_Dijkstra|).
4. Custo do Menor Caminho (verificação empírica de optimalidade).
"""

from __future__ import annotations

import statistics
import sys
import time
from pathlib import Path
from typing import Dict, List

# Adiciona o diretório raiz ao sys.path para importação de src
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from src.graph import MazeGenerator
from src.pathfinding import a_star, dijkstra


def run_benchmark(
    sizes: List[int] = [15, 25, 35, 51, 71],
    iterations_per_size: int = 20,
    save_plot: bool = True,
) -> None:
    """Executa medições sistemáticas em labirintos de múltiplas dimensões."""
    print("=" * 80)
    print(" BENCHMARK: DIJKSTRA vs A* (MANHATTAN COM ESCALA DO GRAFO)")
    print("=" * 80)
    print(f"Iterações por tamanho: {iterations_per_size}")
    print(f"Tamanhos de grade testados: {sizes}\n")

    summary_data = []

    times_dijkstra_all: List[float] = []
    times_astar_all: List[float] = []
    nodes_dijkstra_all: List[float] = []
    nodes_astar_all: List[float] = []

    for size in sizes:
        dijkstra_times: List[float] = []
        astar_times: List[float] = []
        dijkstra_nodes: List[int] = []
        astar_nodes: List[int] = []
        total_vertices_list: List[int] = []

        for i in range(iterations_per_size):
            generator = MazeGenerator(size, size, seed=1000 * size + i)
            _, graph, start, goal = generator.generate(extra_loops_ratio=0.05)
            total_vertices_list.append(graph.order)

            # Teste Dijkstra
            res_dijkstra = dijkstra(graph, start, goal)
            dijkstra_times.append(res_dijkstra.execution_time_ms)
            dijkstra_nodes.append(res_dijkstra.nodes_expanded)

            # Teste A*
            res_astar = a_star(graph, start, goal)
            astar_times.append(res_astar.execution_time_ms)
            astar_nodes.append(res_astar.nodes_expanded)

            # Validação teórica: ambos devem encontrar caminho de custo idêntico (optimalidade)
            assert abs(res_dijkstra.cost - res_astar.cost) < 1e-6, (
                f"Inconsistência de optimalidade: Dijkstra={res_dijkstra.cost}, A*={res_astar.cost}"
            )

        avg_vertices = statistics.mean(total_vertices_list)
        avg_d_time = statistics.mean(dijkstra_times)
        avg_a_time = statistics.mean(astar_times)
        avg_d_nodes = statistics.mean(dijkstra_nodes)
        avg_a_nodes = statistics.mean(astar_nodes)

        reduction_nodes = ((avg_d_nodes - avg_a_nodes) / avg_d_nodes) * 100.0
        speedup = avg_d_time / avg_a_time if avg_a_time > 0 else 1.0

        summary_data.append({
            "size": f"{size}x{size}",
            "avg_v": f"{avg_vertices:.0f}",
            "d_time": f"{avg_d_time:.3f} ms",
            "a_time": f"{avg_a_time:.3f} ms",
            "d_nodes": f"{avg_d_nodes:.1f}",
            "a_nodes": f"{avg_a_nodes:.1f}",
            "node_reduction": f"{reduction_nodes:.1f}%",
            "speedup": f"{speedup:.2f}x",
        })

        times_dijkstra_all.append(avg_d_time)
        times_astar_all.append(avg_a_time)
        nodes_dijkstra_all.append(avg_d_nodes)
        nodes_astar_all.append(avg_a_nodes)

    # Exibição dos resultados em tabela formatada
    header = (
        f"{'Grade':<10} | {'|V| Médio':<10} | {'Dijkstra (ms)':<14} | {'A* (ms)':<10} | "
        f"{'Nós Dijkstra':<13} | {'Nós A*':<10} | {'Redução Nós':<12} | {'Speedup':<8}"
    )
    separator = "-" * len(header)
    print(header)
    print(separator)
    for row in summary_data:
        print(
            f"{row['size']:<10} | {row['avg_v']:<10} | {row['d_time']:<14} | {row['a_time']:<10} | "
            f"{row['d_nodes']:<13} | {row['a_nodes']:<10} | {row['node_reduction']:<12} | {row['speedup']:<8}"
        )
    print(separator)

    # Conclusões teóricas
    print("\nCustos comparados em grades unitárias sem portais, início -> saída.")
    print("Redução de expansões pode ser negativa; tempo depende da máquina e da amostra.")
    print("Os resultados não garantem que A* sempre explore menos ou seja mais rápido.")
    print("Para validar terrenos, portais e chaves, execute a suíte unittest.\n")

    # Geração de gráficos para relatório acadêmico (se matplotlib estiver disponível)
    if save_plot:
        try:
            import matplotlib.pyplot as plt

            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

            labels = [f"{s}x{s}" for s in sizes]

            # Gráfico 1: Nós Expandidos
            ax1.plot(labels, nodes_dijkstra_all, marker="o", color="#e74c3c", label="Dijkstra (Cego)", linewidth=2)
            ax1.plot(labels, nodes_astar_all, marker="s", color="#2ecc71", label="A* (Heurística Manhattan)", linewidth=2)
            ax1.set_title("Nós Visitados / Expandidos (|V_explorados|)")
            ax1.set_xlabel("Dimensão do Labirinto")
            ax1.set_ylabel("Média de Vértices Expandidos")
            ax1.grid(True, linestyle="--", alpha=0.6)
            ax1.legend()

            # Gráfico 2: Tempo de Execução
            ax2.plot(labels, times_dijkstra_all, marker="o", color="#e74c3c", label="Dijkstra", linewidth=2)
            ax2.plot(labels, times_astar_all, marker="s", color="#2ecc71", label="A*", linewidth=2)
            ax2.set_title("Tempo de Execução Médio (ms)")
            ax2.set_xlabel("Dimensão do Labirinto")
            ax2.set_ylabel("Tempo (milissegundos)")
            ax2.grid(True, linestyle="--", alpha=0.6)
            ax2.legend()

            fig.tight_layout()
            output_img = project_root / "benchmark_results.png"
            plt.savefig(output_img, dpi=300)
            print(f"[OK] Grafico comparativo salvo com sucesso em: {output_img}")
        except ImportError:
            print("[INFO] Matplotlib nao instalado. Para gerar graficos visuais: pip install matplotlib")
        except Exception as e:
            print(f"[AVISO] Nao foi possivel gerar o grafico: {e}")


if __name__ == "__main__":
    run_benchmark()
