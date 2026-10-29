# 🟡 Pac-Man: Graph Lab

### Um jogo arcade e laboratório interativo de Teoria dos Grafos

[![Jogar Online](https://img.shields.io/badge/🎮_JOGAR_ONLINE-PAC--MAN_GRAPH_LAB-FFD43B?style=for-the-badge&labelColor=101827)](https://marloncarvalhodev.github.io/Pac-Man/)

> 🌐 **[ACESSAR O JOGO ONLINE](https://marloncarvalhodev.github.io/Pac-Man/)**
>
> Jogue diretamente pelo navegador, sem precisar instalar nada. Explore o **Modo Arcade** e o **Laboratório Interativo de Grafos**.

---

O **Pac-Man: Graph Lab** é uma aplicação web interativa inspirada no clássico Pac-Man, desenvolvida para demonstrar a aplicação da **Teoria dos Grafos** na construção de jogos digitais.

O projeto combina jogabilidade arcade, geração procedural de labirintos, inteligência artificial para inimigos e algoritmos de busca de caminhos mínimos.

Além do jogo, a aplicação oferece um **Laboratório de Grafos**, no qual é possível visualizar estruturas matemáticas, acompanhar a execução de algoritmos e comparar os resultados de **Dijkstra** e **A* (A-Star)**.

Desenvolvido como projeto acadêmico da disciplina de **Matemática Discreta II**, do Instituto Federal da Bahia (IFBA).

---

## 🎮 Sobre o projeto

O objetivo é demonstrar como a Teoria dos Grafos pode ser aplicada à modelagem de ambientes, à movimentação de personagens e à tomada de decisões em jogos digitais.

Diferentemente de um labirinto convencional, no qual todos os deslocamentos possuem custos iguais, o Graph Lab utiliza um **grafo direcionado e ponderado**.

Cada posição transitável representa um vértice, enquanto as conexões representam as transições permitidas entre posições.

Os custos variam conforme o terreno atravessado, permitindo que os algoritmos encontrem trajetos considerando não apenas a distância, mas também o custo acumulado.

A aplicação possui duas experiências principais:

- **Modo Arcade:** experiência jogável em que o usuário controla o Pac-Man, coleta itens, utiliza portais e enfrenta inimigos autônomos.
- **Laboratório de Grafos:** ambiente acadêmico interativo para estudar a representação do labirinto, executar algoritmos e analisar caminhos mínimos.

---

## ✨ Funcionalidades

### 🎮 Modo Arcade

- Labirintos gerados proceduralmente.
- Movimentação por teclado.
- Sistema de pontuação e vida.
- Terrenos com custos distintos.
- Portais de teletransporte.
- Coleta de chaves para desbloquear a saída.
- Orbes de poder que tornam os inimigos vulneráveis.
- Dois inimigos com comportamentos diferentes.
- Animações e efeitos sonoros.
- Condições de vitória e derrota.
- Visualização opcional das rotas dos inimigos.

### 🧠 Laboratório de Grafos

- Representação visual de vértices e arestas.
- Visualização do grafo sobre o labirinto.
- Algoritmos Dijkstra e A*.
- Execução das buscas passo a passo.
- Controle da velocidade de visualização.
- Identificação dos vértices explorados.
- Destaque do caminho encontrado.
- Seleção de origem e destino.
- Inspeção de vértices e suas conexões.
- Comparação das métricas dos algoritmos.
- Geração de labirintos com sementes reproduzíveis.

---

## 🛠️ Tecnologias utilizadas

### Aplicação web

| Tecnologia | Utilização |
|---|---|
| **TypeScript** | Linguagem principal |
| **React** | Interface e navegação |
| **Phaser 3** | Motor de renderização do jogo |
| **Vite** | Desenvolvimento e build |
| **CSS Modules** | Estilização da interface |
| **Vitest** | Testes automatizados |
| **Web Audio API** | Efeitos sonoros |

### Implementação original

| Tecnologia | Utilização |
|---|---|
| **Python** | Algoritmos e regras do jogo |
| **Pygame** | Interface gráfica e jogabilidade |
| **unittest** | Testes automatizados |

A versão Python foi preservada como implementação original e referência para a migração.

**A versão web é a principal interface do projeto.**

---

## 🧠 Teoria dos Grafos aplicada

O labirinto é representado matematicamente por um grafo ponderado:

**G = (V, E, w)**

Onde:

- **V:** conjunto de vértices, representando posições transitáveis.
- **E:** conjunto de arcos direcionados, representando transições permitidas.
- **w:** função que associa um custo a cada arco.

A representação computacional utiliza **listas de adjacência**.

### 1. Grafos direcionados e ponderados

Cada posição transitável do labirinto é identificada por uma coordenada `(linha, coluna)`.

Os movimentos permitidos são representados por conexões entre vértices.

O custo pode variar conforme o terreno de destino da transição.

#### Pesos dos terrenos

| Terreno | Peso | Característica |
|---|---:|---|
| Normal | 1,0 | Deslocamento padrão |
| Esteira | 0,3 | Baixo custo de travessia |
| Lama | 4,0 | Movimento mais lento |
| Lava | 8,0 | Alto custo e dano ao jogador |

Essa modelagem permite demonstrar uma propriedade importante:

> **O caminho com menos movimentos nem sempre é o caminho de menor custo.**

Um percurso mais longo pode ser matematicamente mais vantajoso quando utiliza terrenos com pesos menores.

### 2. Geração procedural com DFS

Os labirintos são gerados utilizando uma abordagem baseada em **busca em profundidade (Depth-First Search — DFS)**.

O algoritmo percorre o espaço disponível e constrói corredores conectados.

Após a geração inicial, podem ser introduzidas conexões adicionais, criando ciclos e caminhos alternativos.

A versão web utiliza um gerador pseudoaleatório com sementes, permitindo reproduzir cenários para testes.

### 3. Algoritmo de Dijkstra

O algoritmo de Dijkstra encontra caminhos mínimos em grafos com pesos não negativos.

Seu funcionamento considera o menor custo acumulado a partir do vértice inicial.

A implementação utiliza uma fila de prioridade (*Min-Heap*) para selecionar os próximos vértices a serem processados.

**Aplicações no jogo:**

- Consideração dos custos dos terrenos.
- Respeito à direção das conexões.
- Utilização de portais.
- Cálculo de caminhos mínimos.
- Comparação com A*.

### 4. Algoritmo A* (A-Star)

O algoritmo A* utiliza uma busca informada por heurística.

Sua função de avaliação é:

**f(n) = g(n) + h(n)**

Onde:

- **g(n):** custo acumulado desde a origem.
- **h(n):** estimativa do custo restante até o objetivo.
- **f(n):** prioridade utilizada na exploração.

A implementação utiliza uma heurística ponderada para considerar os custos mínimos de deslocamento e as conexões especiais do grafo.

A heurística deve respeitar as condições necessárias para preservar a otimalidade.

#### Comparação com Dijkstra

| Métrica | Significado |
|---|---|
| Custo final | Soma dos pesos do caminho |
| Vértices expandidos | Quantidade de expansões durante a busca |
| Comprimento | Número de movimentos do percurso |
| Tempo de execução | Tempo necessário para calcular o resultado |
| Caminho encontrado | Indica se existe solução válida |

A* pode explorar menos vértices que Dijkstra em determinados cenários.

Entretanto, isso **não significa que A* seja necessariamente mais rápido em todas as situações**.

### 5. Portais e conexões não locais

O jogo possui portais que conectam posições distantes do labirinto.

Ao entrar em um portal, o personagem é transferido para sua extremidade correspondente.

Essas conexões são consideradas durante a busca de caminhos.

**Observação matemática:** conexões entre vértices distantes não tornam necessariamente um grafo não planar. A planaridade depende da estrutura matemática do grafo.

### 6. Busca com múltiplos objetivos

Além de encontrar caminhos entre dois vértices, o projeto implementa uma busca que considera objetivos intermediários.

O Pac-Man precisa coletar as chaves necessárias antes de alcançar a saída.

O sistema avalia diferentes ordens de coleta e seleciona uma rota de menor custo acumulado.

**Limitação:** a busca minimiza os custos de deslocamento. Ela não prevê necessariamente a movimentação futura dos inimigos nem otimiza o risco de perder vida.

---

## 👻 Inteligência artificial dos inimigos

### 🔴 Minotauro vermelho — Perseguidor

Utiliza A* para calcular uma rota em direção à posição atual do Pac-Man.

Seu comportamento prioriza a perseguição direta.

### 🟣 Espectro roxo — Emboscador

Busca antecipar a movimentação do jogador, definindo como alvo uma posição à frente da direção atual do Pac-Man.

A partir desse alvo, calcula uma rota utilizando os algoritmos de busca.

### 🔵 Modo assustado

Ao coletar um orbe de poder, os inimigos entram temporariamente em um estado vulnerável.

Durante esse período, utilizam uma estratégia local de fuga, selecionando movimentos que aumentam a distância em relação ao jogador.

Essa estratégia não equivale necessariamente à determinação de um caminho globalmente mais longo.

---

## 🎯 Regras do jogo

### Objetivo

Para vencer, o jogador deve:

1. Explorar o labirinto.
2. Coletar as chaves douradas.
3. Desbloquear a saída.
4. Alcançar o destino sem ser derrotado.

A coleta de todos os pontos não é obrigatória para concluir a partida.

### Condições de derrota

A partida termina quando:

- O Pac-Man é capturado por um inimigo fora do modo vulnerável.
- A vida do jogador chega a zero.

### Pontuação

| Ação | Pontos |
|---|---:|
| Coletar ponto comum | +10 |
| Coletar chave | +100 |
| Coletar orbe de poder | +50 |
| Capturar inimigo vulnerável | +200 |
| Concluir a partida | +500 |

---

## 🚀 Instalação e execução

### 🌐 Opção 1 — Jogar online

Acesse diretamente:

**[🎮 Pac-Man: Graph Lab — GitHub Pages](https://marloncarvalhodev.github.io/Pac-Man/)**

Não é necessário instalar nenhuma dependência para utilizar a versão publicada.

### 💻 Opção 2 — Executar localmente

#### 1. Clonar o repositório

```bash
git clone https://github.com/marloncarvalhodev/Pac-Man.git
cd Pac-Man
```

#### 2. Acessar a aplicação web

```bash
cd web
```

#### 3. Instalar as dependências

```bash
npm install
```

#### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abra o endereço exibido no terminal, normalmente:

```text
http://localhost:5173/
```

#### 5. Gerar build de produção

```bash
npm run build
```

Os arquivos compilados serão gerados em `web/dist/`.

---

## 🐍 Executar a versão Python

A versão original utiliza Python e Pygame.

A partir da raiz do repositório:

```bash
pip install -r requirements.txt
```

Execute:

```bash
python -m src.main
```

Essa versão abre uma janela local do Pygame.

---

## ⌨️ Controles

### Modo Arcade

| Tecla | Ação |
|---|---|
| `W`, `A`, `S`, `D` | Movimentar Pac-Man |
| `↑`, `↓`, `←`, `→` | Movimentar Pac-Man |
| `P` | Pausar a partida |
| `R` | Reiniciar o labirinto |
| `N` | Gerar novo labirinto |

As demais opções estão disponíveis pelos controles da interface.

### Laboratório de Grafos

O laboratório disponibiliza controles para:

- Selecionar Dijkstra ou A*.
- Iniciar uma busca.
- Pausar a visualização.
- Avançar um passo.
- Reiniciar a demonstração.
- Ajustar a velocidade.
- Alternar os modos de visualização.
- Selecionar origem e destino.
- Inspecionar vértices.

---

## 🧪 Testes automatizados

### Versão web

Acesse a pasta `web` e execute:

```bash
npx vitest run
```

### Versão Python

Na raiz do projeto:

```bash
python -m unittest discover -s tests -v
```

### Benchmark

```bash
python tests/benchmark.py
```

Os resultados devem ser interpretados considerando as características dos cenários utilizados.

Os testes não substituem a validação das mecânicas por meio de partidas completas.

---

## 📁 Estrutura do projeto

```text
Pac-Man/
│
├── src/                         # Implementação Python
│   ├── __init__.py
│   ├── graph.py
│   ├── pathfinding.py
│   └── main.py
│
├── tests/                       # Testes Python
│   ├── benchmark.py
│   ├── test_game.py
│   └── test_math.py
│
├── web/                         # Aplicação React + Phaser
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── game/
│   │   │   ├── algorithms/
│   │   │   ├── core/
│   │   │   ├── graph/
│   │   │   ├── rendering/
│   │   │   ├── scenes/
│   │   │   └── systems/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── tests/
│   ├── package.json
│   └── vite.config.ts
│
├── README.md
├── VALIDACAO.md
├── requirements.txt
└── .gitignore
```

---

## 📊 Convenções matemáticas e métricas

| Conceito | Definição |
|---|---|
| Ordem do grafo | Quantidade de vértices |
| Tamanho do grafo direcionado | Quantidade de arcos |
| Grau de entrada | Quantidade de arcos que chegam a um vértice |
| Grau de saída | Quantidade de arcos que partem de um vértice |
| Custo do caminho | Soma dos pesos das transições |
| Comprimento | Quantidade de movimentos ou transições |
| Caminho mínimo | Percurso com menor custo acumulado |

A redução percentual de expansões pode ser calculada por:

```text
R = ((E_D - E_A) / E_D) × 100
```

Onde:

- **E_D:** expansões realizadas por Dijkstra.
- **E_A:** expansões realizadas por A*.

A expressão é aplicável quando `E_D > 0`.

Valores negativos indicam que A* realizou mais expansões.

**Menos expansões não significa necessariamente menor tempo de execução.**

---

## 🎓 Objetivo acadêmico

O Pac-Man: Graph Lab foi desenvolvido para demonstrar aplicações práticas dos conceitos estudados na disciplina de **Matemática Discreta II / Teoria dos Grafos**.

O projeto explora principalmente:

- Modelagem matemática de ambientes.
- Grafos direcionados.
- Grafos ponderados.
- Listas de adjacência.
- Busca em profundidade.
- Caminhos mínimos.
- Algoritmos Dijkstra e A*.
- Busca com múltiplos objetivos.
- Aplicações de grafos na inteligência artificial de jogos.

O Laboratório permite que esses conceitos sejam observados interativamente, associando a fundamentação teórica ao funcionamento de um jogo digital.

---

## 📚 Documentação complementar

- [`VALIDACAO.md`](VALIDACAO.md) — Relatório de correções, testes e limitações.
- [`web/README.md`](web/README.md) — Documentação técnica da aplicação web.

---

## 👨‍💻 Desenvolvimento

Projeto acadêmico desenvolvido no **Instituto Federal da Bahia (IFBA)**, no contexto da disciplina de Matemática Discreta II.

**Repositório:** [Pac-Man — GitHub](https://github.com/marloncarvalhodev/Pac-Man)

---

<p align="center">
  <strong>Pac-Man: Graph Lab</strong><br>
  Aprenda grafos explorando caminhos.
</p>
