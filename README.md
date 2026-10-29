# 🟡 Pac-Man: Teoria dos Grafos & Pathfinding Inteligente

Implementação interativa inspirada no clássico **Pac-Man**, desenvolvida em Python com Pygame e fundamentada rigorosamente nos conceitos de **Teoria dos Grafos** (Matemática Discreta). O projeto modela um labirinto dinâmico com custos heterogêneos, conexões não locais, coleta multi-objetivo e agentes autônomos reativos guiados pelos algoritmos de **Dijkstra** e **A* (A-Star)**.

---

## 🎯 Sobre o Jogo

Diferente de um labirinto tradicional onde todas as células possuem o mesmo custo de movimento, este jogo transforma o mapa em um **grafo direcionado e ponderado**. O jogador controla o Pac-Man com o objetivo de coletar todas as **Chaves Douradas** espalhadas pelo labirinto para destrancar a saída e escapar, enquanto é caçado em tempo real por inimigos com diferentes comportamentos algorítmicos.

O sistema conta com dois modos de operação em tempo real:
1. **Modo Jogador Manual:** Você controla o personagem, planeja rotas, usa portais e coleta orbes de poder para inverter a caçada.
2. **Modo Visualização de Busca:** Os algoritmos **Dijkstra** ou **A*** traçam na tela a rota matematicamente ótima (menor custo acumulado) passando por todas as chaves restantes até o objetivo final.

---

## 🧠 Conceitos de Teoria dos Grafos Aplicados

1. **Modelagem Formal $G = (V, E, w)$:**
   - **Vértices ($V$):** Cada célula transitável $(linha, coluna)$ do grid bidimensional é mapeada como um nó na lista de adjacência.
   - **Arestas ($E$):** Conexões ortogonais entre células adjacentes livres, além de conexões especiais de longo alcance.
   - **Função de Peso ($w : E \to \mathbb{R}^+$):** O custo de um arco depende do terreno de entrada do comando. Em um portal, o destino estável é a outra extremidade; o arco inclui entrada e teleporte.

2. **Grafos Ponderados (Terrenos com Custos Heterogêneos):**
   - **Piso Normal (Cinza):** Peso `1.0` — deslocamento padrão.
   - **Esteira de Aceleração (Ciano):** Peso `0.3` — caminho rápido de baixo custo.
   - **Pântano / Lama (Marrom):** Peso `4.0` — terreno lento que penaliza o custo da rota.
   - **Zona de Lava / Dano (Vermelho Escuro):** Peso `8.0` — alto custo algorítmico e reduz a vida do jogador em `-10 HP`.

3. **Portais: transições compostas não locais:**
   - Um comando que entra no portal A termina no portal B e custa `1.0` (piso normal de entrada). A chegada a B não dispara outro salto. Para voltar, é necessário sair e entrar novamente em um portal.
   - Jogador, inimigos e buscas usam os mesmos arcos. O desenho expande cada transição em passo até a entrada + salto rosa até a saída; o salto não conta como segundo movimento.
   - Conexões não locais, isoladamente, não provam que um grafo seja não planar.

4. **Algoritmos de Caminho Mínimo (Dijkstra vs. A*):**
   - **Algoritmo de Dijkstra:** Busca de custo uniforme utilizando fila de prioridade (*Min-Heap*), garantindo o caminho ótimo com complexidade $\mathcal{O}((|V| + |E|) \log |V|)$.
   - **Algoritmo A* (A-Star):** Utiliza a função de avaliação $f(n) = g(n) + h(n)$, combinando o custo real acumulado $g(n)$ com a heurística $h(n)=\alpha\,d_1(n, alvo)$, onde $\alpha$ é o mínimo de `peso / distância Manhattan` entre os arcos não laço do grafo real. A desigualdade triangular garante consistência mesmo com múltiplos portais e pesos assimétricos. Uma heurística externa deve ser admissível e valer zero no alvo; reaberturas são suportadas.

5. **Busca com múltiplos objetivos (ordenação de visita às chaves):**
   - Enumera todas as permutações das chaves pendentes e escolhe a de menor custo até a saída. Segmentos direcionados são armazenados em cache e reutilizados para a rota e sua animação.
   - `key_order` registra a ordem real da primeira coleta, incluindo chaves atravessadas incidentalmente. As junções não repetem o vértice de ligação.
   - A solução minimiza custos de deslocamento; saúde, colisões e posição futura dos inimigos não integram o estado da busca. Uma rota ótima em custo pode ser perigosa.

6. **Agentes Autônomos e Heurística Invertida:**
   - **Minotauro Vermelho (Caçador Direto):** Recalcula a cada passo o caminho mínimo via **A*** apontando diretamente para o vértice atual do jogador.
   - **Espectro Roxo (Emboscador Preditivo):** Calcula o caminho mínimo mirando nos vértices situados à frente da direção de deslocamento do jogador, tentando cercá-lo em cruzamentos (vértices de grau $\ge 3$).
   - **Modo Fuga (Orbe de Poder):** Ao coletar um *Power Pellet*, por 7 segundos cada inimigo escolhe, entre seus vizinhos válidos, aquele de maior distância Manhattan do jogador. É uma estratégia local de fuga, sem garantia global de caminho mais longo.

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
| `1` | Calcula e exibe o caminho ótimo via **Dijkstra** |
| `2` | Calcula e exibe o caminho ótimo via **A*** |
| `T` | Exibe / oculta em tempo real as rotas planejadas pelos inimigos |
| `P` | Pausa / despausa a perseguição dos inimigos |
| `C` | Limpa a visualização do caminho ótimo na tela |
| `R` | Reinicia a partida no mesmo labirinto |
| `N` | Gera um novo labirinto procedural completo |
| `G` | Alterna o Raio-X do grafo, com arcos orientados e pesos de entrada |
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


## Convenções e métricas acadêmicas

- **Ordem**: `Graph.order = |V|`, quantidade de células transitáveis.
- **Tamanho**: `Graph.size = |E|`, quantidade de **arcos direcionados**. Uma conexão bidirecional entre vértices distintos contribui com dois arcos, mesmo quando os pesos são iguais.
- `connection_count`: pares conectados ignorando orientação (laços contam uma vez). `bidirectional_count`: pares distintos que possuem ambos os sentidos; não implica igualdade de pesos. `degree` mede grau de saída.
- Os pesos aceitos são finitos e não negativos. Terrenos do jogo têm custos positivos; o custo total é a soma dos pesos da rota. Menor custo pode exigir mais movimentos.
- A comparação instantânea do painel é **parcial**: posição atual até uma chave selecionada por proximidade Manhattan, ou até a saída quando não há chaves. Ambos os algoritmos recebem exatamente os mesmos dados e alvo. A chave selecionada pode não ser a mais barata em custo.
- O solver de `1`/`2` calcula a **rota completa** pelas chaves até a saída. Expansões da rota e animação são a concatenação dos segmentos escolhidos; expansões totais incluem todas as buscas realmente executadas nas alternativas, sem contar consultas ao cache. Tempo inclui toda a otimização.
- Cada retirada válida da fila conta como expansão, incluindo o alvo. Uma reabertura com heurística externa inconsistente conta novamente; não se trata de quantidade de vértices distintos.
- Redução de expansões: `100 * (Dijkstra - A*) / Dijkstra`, podendo ser negativa. Tempo inclui preparação da heurística e varia com ambiente e amostra; menos expansões não significa necessariamente menos tempo.
- O benchmark existente usa grades unitárias sem portais, início até saída. Ele não representa sozinho os mundos ponderados com chaves.

## Testes automatizados

```bash
python -m unittest discover -s tests -v
```

As referências independentes usam Bellman-Ford e o produto `(posição, chaves coletadas)`.
Os testes incluem múltiplas sementes, conectividade, comandos físicos versus arcos, terrenos,
portais, busca multiobjetivo e integração Pygame com SDL dummy. Essa integração não abre janela.

Veja [VALIDACAO.md](VALIDACAO.md) para o relatório de correções, verificações e limitações.
