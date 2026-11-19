import { Node, nodeEquals, nodeToKey } from '../graph/GraphTypes';
import { Graph } from '../graph/Graph';
import { AgentPlan } from './AgentTypes';

/**
 * Módulo de Execução do Agente Autônomo.
 * Converte caminhos matemáticos em vetores discretos de direção ortogonal [dr, dc],
 * sincronizados com o motor de física e portais do jogo, suportando desvios e evasão.
 */
export class AgentExecution {
  private plan: AgentPlan | null = null;
  private currentStepIndex = 0;
  private escapePath: Node[] | null = null;
  private lastMoveFacing: [number, number] | null = null;

  setPlan(plan: AgentPlan | null): void {
    this.plan = plan;
    this.currentStepIndex = 0;
    this.escapePath = null;
  }

  getPlan(): AgentPlan | null {
    return this.plan;
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  getLastFacing(): [number, number] | null {
    return this.lastMoveFacing;
  }

  setLastFacing(facing: [number, number] | null): void {
    this.lastMoveFacing = facing;
  }

  setEscapePath(path: Node[] | null): void {
    this.escapePath = path;
  }

  getEscapePath(): Node[] | null {
    return this.escapePath;
  }

  clearEscapePath(): void {
    this.escapePath = null;
  }

  syncPosition(currentPos: Node): void {
    if (!this.plan) return;
    while (
      this.currentStepIndex < this.plan.fullPath.length - 1 &&
      nodeEquals(currentPos, this.plan.fullPath[this.currentStepIndex + 1])
    ) {
      this.currentStepIndex++;
    }
  }

  isComplete(currentPos: Node): boolean {
    if (!this.plan || this.plan.fullPath.length === 0) return true;
    this.syncPosition(currentPos);
    const finalNode = this.plan.fullPath[this.plan.fullPath.length - 1];
    return (
      this.currentStepIndex >= this.plan.fullPath.length - 1 &&
      nodeEquals(currentPos, finalNode)
    );
  }

  /**
   * Determina o próximo comando ortogonal [dr, dc] a ser executado no jogo.
   * Se houver uma rota de escape ativa, prioriza a manobra de fuga.
   */
  getNextMove(currentPos: Node, graph: Graph): [number, number] | null {
    // 1. Prioriza rota de escape ativa, se houver
    if (this.escapePath && this.escapePath.length >= 2) {
      if (nodeEquals(currentPos, this.escapePath[0])) {
        const nextNode = this.escapePath[1];
        const entryCell = graph.transitionEntry(currentPos, nextNode);
        const dr = entryCell[0] - currentPos[0];
        const dc = entryCell[1] - currentPos[1];
        if (Math.abs(dr) + Math.abs(dc) === 1) {
          this.lastMoveFacing = [dr, dc];
          return [dr, dc];
        }
      } else if (nodeEquals(currentPos, this.escapePath[1])) {
        // Já avançou no passo de fuga
        this.escapePath.shift();
        if (this.escapePath.length >= 2) {
          const nextNode = this.escapePath[1];
          const entryCell = graph.transitionEntry(currentPos, nextNode);
          const dr = entryCell[0] - currentPos[0];
          const dc = entryCell[1] - currentPos[1];
          if (Math.abs(dr) + Math.abs(dc) === 1) {
            this.lastMoveFacing = [dr, dc];
            return [dr, dc];
          }
        }
      }
    }

    // 2. Execução padrão do plano de objetivos
    if (!this.plan || this.plan.fullPath.length < 2) {
      return null;
    }

    // Avança o índice se o agente já chegou no próximo nó planejado
    this.syncPosition(currentPos);

    // Se alcançou o último vértice do plano
    if (this.currentStepIndex >= this.plan.fullPath.length - 1) {
      return null;
    }

    const expectedCurrent = this.plan.fullPath[this.currentStepIndex];
    if (!nodeEquals(currentPos, expectedCurrent)) {
      // Posição física divergiu do caminho planejado (necessário replanejar)
      return null;
    }

    const nextVertex = this.plan.fullPath[this.currentStepIndex + 1];
    const entryCell = graph.transitionEntry(currentPos, nextVertex);

    const dr = entryCell[0] - currentPos[0];
    const dc = entryCell[1] - currentPos[1];

    // Validação de passo ortogonal unitário
    if (Math.abs(dr) + Math.abs(dc) !== 1) {
      return null;
    }

    this.lastMoveFacing = [dr, dc];
    return [dr, dc];
  }

  /**
   * Retorna o subconjunto restante do caminho a partir da posição atual para visualização.
   */
  getRemainingPath(currentPos: Node): Node[] {
    if (!this.plan || this.plan.fullPath.length === 0) {
      return [];
    }
    const idx = Math.min(this.currentStepIndex, this.plan.fullPath.length - 1);
    const sub = this.plan.fullPath.slice(idx);
    if (sub.length > 0 && !nodeEquals(sub[0], currentPos)) {
      return [currentPos, ...sub];
    }
    return sub;
  }

  /**
   * Identifica o próximo objetivo de alto nível (chave específica ou saída).
   */
  getNextObjective(remainingKeys: Node[], goal: Node): { target: Node | null; description: string } {
    if (!this.plan) {
      return { target: null, description: 'Nenhum plano ativo' };
    }

    const remSet = new Set(remainingKeys.map(nodeToKey));
    for (let i = 0; i < this.plan.keyOrder.length; i++) {
      const k = this.plan.keyOrder[i];
      if (remSet.has(nodeToKey(k))) {
        return {
          target: k,
          description: `Chave (${k[0]}, ${k[1]})`,
        };
      }
    }

    return {
      target: goal,
      description: `Saída (${goal[0]}, ${goal[1]})`,
    };
  }
}
