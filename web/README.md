# 🟡 Pac-Man: Graph Lab
### Laboratório Interativo de Teoria dos Grafos & IA de Pathfinding em Aplicação Web Moderna

Aplicação web interativa, responsiva e academicamente rigorosa desenvolvida com **TypeScript**, **React 18**, **Phaser 3** e **Vite**, projetada para a disciplina de **Matemática Discreta II / Teoria dos Grafos**.

O projeto combina uma experiência de jogo arcade completa inspirada no clássico *Pac-Man* com um **Laboratório Científico de Grafos**, permitindo inspecionar topologias, comparar algoritmos de busca ponderada (*Dijkstra* vs. *$A^*$*), visualizar conexões não locais (teleportes) e acompanhar a execução passo a passo do algoritmo de menor caminho.

---

## 🌟 Destaques & Funcionalidades

1. **Modelagem Matemática Formal:**
   - Grafo ponderado e direcionado $G = (V, E, w)$ representado via listas de adjacência (`Map<NodeKey, Map<NodeKey, number>>`).
   - Múltiplos custos de terreno $w(u, v) \in \{0.3, 1.0, 4.0, 8.0\}$ que alteram dinamicamente a velocidade e o custo de caminho.
   - Portais de teletransporte modelados como arestas de peso $1.0$ conectando vértices geograficamente distantes no plano grid $\mathbb{Z}^2$, sem que isso demonstre que o grafo seja não planar.
   - Min-Heap binário com ordenação $O(\log |V|)$ com desempate determinístico por ordem de inserção.
   - Heurística $h(n)$ ponderada e estritamente admissível ($h(n) \le d(n, \text{goal})$), considerando atalhos diretos e através de portais.
   - Solver multi-objetivo para o problema das chaves e saída trancada via decomposição métrica e enumeração de permutações (análogo ao TSP).

2. **Laboratório Interativo de Grafos (Graph Lab):**
   - **3 Modos de Visualização:**
     - `MAZE`: Renderização clássica com paredes de contorno neon contínuo e piso temático.
     - `GRAPH`: Modo Raio-X topológico, omitindo paredes e desenhando vértices, arestas coloridas por peso e bifurcações ($\text{grau} \ge 3$).
     - `OVERLAY`: Sobreposição perfeita do grafo sobre a geometria do labirinto.
   - **Controles de Execução Passo a Passo:** Play, Pause, Step Forward, Reset e controle de velocidade em tempo real (1x a 20x).
   - **Inspeção Interativa de Vértices:** Clique ou passe o cursor sobre qualquer nó para visualizar coordenadas $(r, c)$, grau total, grau de entrada, grau de saída, lista de vizinhos com pesos e indicação de cruzamento/bifurcação.
   - **Painel Comparativo Empírico:** Execução paralela de Dijkstra vs. $A^*$, exibindo nós explorados, custo total, nós no caminho ótimo e percentual de economia de expansão.
   - **Gaveta Teórica de Conceitos:** Definições formais, complexidade assintótica e justificativas matemáticas acessíveis durante a exploração.

3. **Mecânicas de Jogo Arcade:**
   - Movimentação fluida com interpolação contínua e colisão estrita com a topologia de arestas.
   - Pac-Man com animação procedural de boca orientada à direção de movimento ($W, A, S, D$).
   - Minotauro Vermelho com perseguição direta via $A^*$ recalculado em tempo real.
   - Fantasma Roxo Emboscador que mira 3 casas à frente do vetor de movimento do Pac-Man.
   - Orbes de Poder (*Power Pellets*) que ativam o estado **Frightened** por 7 segundos, invertendo a heurística para fuga e permitindo eliminar temporariamente os inimigos.
   - Sintetizador de áudio arcade retrô construído inteiramente com a **Web Audio API** (sem dependência de arquivos externos de áudio).

---

## 📐 Fundamentação Teórica

### 1. Definição Formal do Grafo
O labirinto é modelado como um grafo valorado $G = (V, E, w)$, onde:
- $V \subset \mathbb{Z}^2$ representa as células transitáveis do grid bidimensional $R \times C$.
- $E \subseteq V \times V$ representa os corredores de passagem e conexões de portais.
- $w: E \to \mathbb{R}^+$ associa a cada aresta $(u, v)$ o custo do terreno da célula de destino $v$.

### 2. Terrenos e Função de Ponderação $w(u, v)$

| Terreno | Custo $w$ | Cor Visual | Efeito Mecânico no Jogo |
| :--- | :---: | :---: | :--- |
| **Piso Normal** | `1.0` | Slate `#1e293b` | Velocidade padrão (~135ms por célula) |
| **Esteira de Aceleração** | `0.3` | Ciano `#06b6d4` | Deslocamento acelerado (~40ms por célula) |
| **Lama / Pântano** | `4.0` | Âmbar `#b45309` | Atrito elevado (~540ms por célula) |
| **Lava Ardente** | `8.0` | Vermelho `#ef4444` | Dano contínuo de vida (-10 HP por pisada) |

### 3. Conexões Não Locais & Portais
Para nós $u, v \in V$ geograficamente distantes na projeção do grid, os portais introduzem arestas bidirecionais $(u, v)$ e $(v, u)$ com custo $w(u, v) = 1.0$. O desenho de conexões cruzadas não prova que o grafo seja não planar; essa propriedade exige demonstração própria.

### 4. Heurística Admissível com Portais
Para garantir a otimalidade do algoritmo $A^*$, a heurística $h(n)$ deve ser admissível ($h(n) \le d(n, \text{goal})$). Como o menor custo unitário de transição no jogo é $c_{\min} = 0.3$ (esteira), a heurística de Manhattan é normalizada e estendida para considerar atalhos através dos portais:

$$h_0(n) = c_{\min} \cdot \left( |r_n - r_g| + |c_n - c_g| \right)$$

$$h(n) = \min \left( h_0(n), \min_{(p_1, p_2) \in \mathcal{P}} \left[ h(n, p_1) + w(p_1, p_2) + h(p_2, \text{goal}) \right] \right)$$

Isso garante que o $A^*$ nunca superestime a distância real, mantendo a admissibilidade e a consistência formal ($h(u) \le w(u, v) + h(v)$).

### 5. Multi-Goal Solver (Chaves $\to$ Saída)
A vitória requer coletar todas as chaves $K = \{k_1, k_2, \dots, k_m\}$ antes de atingir a saída $G$. O solver calcula a matriz de distâncias mínimas entre $\{\text{start}\} \cup K \cup \{G\}$ usando $A^*$ e determina a permutação ótima $\pi \in S_m$ que minimiza:

$$\text{Custo}(\pi) = d(\text{start}, k_{\pi(1)}) + \sum_{i=1}^{m-1} d(k_{\pi(i)}, k_{\pi(i+1)}) + d(k_{\pi(m)}, G)$$

---

## 🏗️ Arquitetura do Software

```text
web/
├── public/                 # Favicon SVG e assets estáticos
├── src/
│   ├── app/                # Entrada React, Navbar e App Component
│   │   ├── App.tsx
│   │   ├── App.module.css
│   │   └── main.tsx
│   ├── components/         # Componentes modulares de UI
│   │   ├── game/           # HUD, painéis de status e métricas do jogo
│   │   └── laboratory/     # Controles, comparação empírica, inspetor e gaveta
│   ├── game/               # Núcleo Phaser 3 e Algoritmos Matemáticos
│   │   ├── algorithms/     # Dijkstra, A*, Heurísticas, PriorityQueue, MultiGoal
│   │   ├── core/           # EventBus, GameState
│   │   ├── graph/          # Graph, MazeGenerator, Terrain, GraphTypes
│   │   ├── rendering/      # WallRenderer (neon), CharacterRenderer, GraphRenderer
│   │   ├── scenes/         # GameScene (Arcade) e GraphLabScene (Laboratório)
│   │   └── systems/        # SoundManager (Web Audio API Synthesizer)
│   ├── pages/              # Páginas: HomePage, PlayPage, LaboratoryPage, HowToPlayPage
│   ├── styles/             # Design tokens CSS e reset global
│   └── tests/              # Bateria de testes automatizados com Vitest
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js** v18+ (recomendado v20 ou v22)
- Gerenciador de pacotes **npm** ou **pnpm**

### Passos de Instalação

```bash
# 1. Acesse o diretório da aplicação web
cd web

# 2. Instale as dependências
npm ci

# 3. Inicie o servidor de desenvolvimento Vite
npm run dev
```

Abra `http://localhost:3000/` (porta configurada no Vite). Durante o desenvolvimento a aplicação usa a raiz `/`; a base `/Pac-Man/` é aplicada ao build e à prévia de produção.

---

## 🧪 Testes Automatizados

O projeto utiliza o **Vitest** para assegurar a corretude matemática das estruturas de dados e dos algoritmos de busca:

```bash
# Execução direta dos testes
npm run test

# Execução em modo watch
npm run test:watch
```

### Casos de Teste Verificados:
- [x] Adição e remoção de vértices e arestas direcionadas.
- [x] Cálculo exato de graus (in-degree, out-degree e grau total).
- [x] Detecção de cruzamentos / bifurcações ($\text{grau} \ge 3$).
- [x] Presença de conexões de teleporte entre vértices distantes.
- [x] Admissibilidade estrita da heurística com terrenos ponderados.
- [x] Equivalência de custo ótimo entre Dijkstra e $A^*$.
- [x] Eficiência empírica: $A^*$ expande menos nós que o Dijkstra em labirintos abertos.
- [x] Resolução exata de metas múltiplas (ordem ótima de coleta de chaves).

---

## 📦 Build para Produção & Deploy Estático

A aplicação foi configurada para ser compilada como um conjunto de arquivos estáticos (`HTML`, `JS`, `CSS`), compatível com qualquer provedor moderno de hospedagem:

```bash
# Compilar TypeScript e gerar o bundle otimizado
npm run build
```

Os arquivos prontos para publicação serão gerados no diretório `web/dist/`.

### 1. Vercel
Instale o CLI da Vercel ou conecte o repositório no dashboard:
```bash
npx vercel --cwd web
```

### 2. Netlify
Arraste a pasta `web/dist` no painel do Netlify ou utilize o Netlify CLI:
```bash
npx netlify deploy --dir=web/dist --prod
```

### 3. GitHub Pages (GitHub Actions)

O workflow [deploy-pages.yml](../.github/workflows/deploy-pages.yml) executa em pushes na branch `main` e também pode ser iniciado manualmente em **Actions → Deploy GitHub Pages → Run workflow**. Ele instala as dependências em `web/` com `npm ci`, executa `npm run build` e publica exclusivamente o conteúdo compilado de `web/dist/` usando as actions oficiais do GitHub Pages. Não é necessário token pessoal.

Antes da primeira publicação, em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**. Após o workflow estar disponível na branch principal, acompanhe sua execução em **Actions**. O endereço esperado é [https://marloncarvalhodev.github.io/Pac-Man/](https://marloncarvalhodev.github.io/Pac-Man/); ele depende de uma execução remota concluída e da configuração do repositório.

O Vite usa `/Pac-Man/` no build para que scripts, estilos e favicon sejam carregados no subcaminho do repositório. Para conferir a versão compilada localmente:

```bash
cd web
npm ci
npm run build
npm run preview
```

A prévia informa a porta no terminal; acesse `http://localhost:4173/Pac-Man/` quando estiver usando a porta padrão. A navegação entre Início, Arcade, Laboratório e Manual usa estado React, sem rotas no servidor: recarregar retorna ao Início e Voltar/Avançar não percorrem essas abas. Os links de tópicos do Manual usam fragmentos da URL e entram no histórico do navegador.

---

## 🎮 Tabela de Controles e Atalhos

| Tecla / Ação | Contexto | Efeito |
| :---: | :---: | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / <kbd>Setas</kbd> | Jogo | Movimentação manual pelas arestas do labirinto |
| <kbd>1</kbd> | Jogo | Ativar Solver automático via **Dijkstra** |
| <kbd>2</kbd> | Jogo | Ativar Solver automático via **A\*** |
| <kbd>T</kbd> | Jogo | Ativar / Desativar visualização das rotas das IAs |
| <kbd>G</kbd> | Jogo | Alternar modo **Raio-X do Grafo** |
| <kbd>P</kbd> | Jogo | Pausar / Retomar a partida |
| <kbd>R</kbd> | Jogo | Reiniciar partida com o labirinto atual |
| <kbd>N</kbd> | Jogo / Lab | Gerar novo labirinto procedural |
| <kbd>Clique Esquerdo</kbd> | Lab | Inspecionar vértice ou alterar nó de **Origem** ($S$) |
| <kbd>Shift + Clique</kbd> | Lab | Alterar nó de **Destino** ($T$) |
| <kbd>Espaço</kbd> | Lab | Play / Pause da execução passo a passo |

---

## 👨‍💻 Créditos Acadêmicos
- **Disciplina:** Matemática Discreta II / Teoria dos Grafos
- **Tema:** Modelagem de Jogos em Grafos Valorados e Pathfinding Inteligente
- **Tecnologias:** TypeScript, React, Phaser 3, Vite, Web Audio API, Vitest
