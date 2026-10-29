# 🟡 Pac-Man: Teoria dos Grafos & Pathfinding Inteligente

Implementação interativa inspirada no clássico **Pac-Man**, desenvolvida em Python com Pygame e fundamentada rigorosamente nos conceitos de **Teoria dos Grafos** (Matemática Discreta). O projeto modela um labirinto dinâmico com custos heterogêneos, atalhos não-planares, coleta multi-objetivo e agentes autônomos reativos guiados pelos algoritmos de **Dijkstra** e **A* (A-Star)**.

---

## 🎯 Sobre o Jogo

Diferente de um labirinto tradicional onde todas as células possuem o mesmo custo de movimento, este jogo transforma o mapa em um **grafo ponderado e não-planar**. O jogador controla o Pac-Man com o objetivo de coletar todas as **Chaves Douradas** espalhadas pelo labirinto para destrancar a saída e escapar, enquanto é caçado em tempo real por inimigos com diferentes comportamentos algorítmicos.

O sistema conta com dois modos de operação em tempo real:
1. **Modo Jogador Manual:** Você controla o personagem, planeja rotas, usa portais e coleta orbes de poder para inverter a caçada.
2. **Modo Solver Automático (IA):** Os algoritmos **Dijkstra** ou **A*** assumem o controle ou traçam na tela a rota matematicamente ótima (menor custo acumulado) passando por todas as chaves restantes até o objetivo final.

---

## 🧠 Conceitos de Teoria dos Grafos Aplicados

1. **Modelagem Formal $G = (V, E, w)$:**
   - **Vértices ($V$):** Cada célula transitável $(linha, coluna)$ do grid bidimensional é mapeada como um nó na lista de adjacência.
   - **Arestas ($E$):** Conexões ortogonais entre células adjacentes livres, além de conexões especiais de longo alcance.
   - **Função de Peso ($w : E \to \mathbb{R}^+$):** O custo de travessia de uma aresta $(u, v)$ depende do tipo de terreno do vértice de destino.

2. **Grafos Ponderados (Terrenos com Custos Heterogêneos):**
   - **Piso Normal (Cinza):** Peso `1.0` — deslocamento padrão.
   - **Esteira de Aceleração (Ciano):** Peso `0.3` — caminho rápido de baixo custo.
   - **Pântano / Lama (Marrom):** Peso `4.0` — terreno lento que penaliza o custo da rota.
   - **Zona de Lava / Dano (Vermelho Escuro):** Peso `8.0` — alto custo algorítmico e reduz a vida do jogador em `-10 HP`.

3. **Grafos Não-Planares (Portais de Teletransporte):**
   - Pares de portais conectam vértices geograficamente distantes no grid com peso `1.0`. Isso quebra a planaridade da grade 2D, criando atalhos topológicos que os algoritmos de busca exploram para reduzir o custo total do caminho.

4. **Algoritmos de Caminho Mínimo (Dijkstra vs. A*):**
   - **Algoritmo de Dijkstra:** Busca uniforme em largura ponderada utilizando fila de prioridade (*Min-Heap*), garantindo o caminho ótimo com complexidade $\mathcal{O}((|V| + |E|) \log |V|)$.
   - **Algoritmo A* (A-Star):** Utiliza a função de avaliação $f(n) = g(n) + h(n)$, combinando o custo real acumulado $g(n)$ com a heurística admissível da distância de Manhattan ponderada $h(n)$, reduzindo significativamente o número de vértices expandidos.

5. **Pathfinding Multi-Objetivo (Steiner / Travelling Salesman Simplificado):**
   - Como a saída começa trancada, o solver decompõe o problema em subproblemas sequenciais em grafo: calcula a rota de menor custo da posição atual até a chave mais próxima, atualiza o estado e encadeia a rota até o destino destrancado.

6. **Agentes Autônomos e Heurística Invertida:**
   - **Minotauro Vermelho (Caçador Direto):** Recalcula a cada passo o caminho mínimo via **A*** apontando diretamente para o vértice atual do jogador.
   - **Espectro Roxo (Emboscador Preditivo):** Calcula o caminho mínimo mirando nos vértices situados à frente da direção de deslocamento do jogador, tentando cercá-lo em cruzamentos (vértices de grau $\ge 3$).
   - **Modo Fuga (Orbe de Poder):** Ao coletar um *Power Pellet*, a lógica de busca dos inimigos é invertida por 7 segundos, fazendo-os buscar vértices que maximizem a distância em relação ao jogador.

---

## 🎮 Regras do Jogo

1. **Condição de Vitória:** Coletar todas as chaves douradas do mapa para destrancar a saída (célula vermelha/verde no canto inferior direito) e alcançá-la com vida acima de 0%.
2. **Condição de Derrota (Game Over):**
   - Ser alcançado por qualquer inimigo fora do modo de pânico/fuga.
   - Perder toda a barra de vida (100 HP) ao caminhar repetidamente sobre células de Lava.
3. **Orbes de Poder (Azuis/Brilhantes):** Tornam os inimigos vulneráveis (azuis) por 7 segundos. Encostar neles durante esse período bane o inimigo de volta para sua posição inicial.
4. **Portais (Roxos):** Entrar em um portal transporta instantaneamente o jogador ou o algoritmo para o portal par correspondente.

---

## ⌨️ Controles e Atalhos

| Tecla | Ação |
| :---: | :--- |
| `W`, `A`, `S`, `D` ou `Setas` | Movimenta o jogador pelo grafo |
| `1` ou `D` | Calcula e exibe o caminho ótimo via **Dijkstra** |
| `2` ou `A` | Calcula e exibe o caminho ótimo via **A*** |
| `T` | Exibe / oculta em tempo real as rotas planejadas pelos inimigos |
| `P` | Pausa / despausa a perseguição dos inimigos |
| `C` | Limpa a visualização do caminho ótimo na tela |
| `R` ou `N` | Gera um novo labirinto procedural completo |
| `+` / `-` | Aumenta ou diminui a velocidade da animação de busca |
| `ESC` | Encerra o jogo |

---

## 🚀 Como Instalar e Executar pelo Terminal

### 1. Pré-requisitos
Certifique-se de ter o **Python 3.10+** instalado em sua máquina.

### 2. Clonar o repositório e acessar a pasta
```bash
git clone https://github.com/marloncarvalhodev/Pac-Man.git
cd Pac-Man
```
*(Caso já esteja com a pasta localmente, basta acessá-la com `cd pacman_game`).*

### 3. Instalar as dependências
```bash
pip install -r requirements.txt
```

### 4. Executar o jogo
```bash
python -m src.main
```

### 5. Executar o Benchmark Estatístico (Dijkstra vs. A*)
Para rodar os testes empíricos no terminal comparando tempo de execução (ms), custo ótimo e quantidade de vértices expandidos em diferentes dimensões de labirinto:
```bash
python tests/benchmark.py
```
