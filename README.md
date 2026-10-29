🟡 Pac-Man: Graph Lab
Um jogo arcade e laboratório interativo de Teoria dos Grafos
O Pac-Man: Graph Lab é uma aplicação web interativa inspirada no clássico Pac-Man, desenvolvida para demonstrar a aplicação da Teoria dos Grafos na construção de jogos digitais.

O projeto combina jogabilidade arcade, geração procedural de labirintos, inteligência artificial para inimigos e algoritmos de busca de caminhos mínimos.

Além do jogo, a aplicação oferece um Laboratório de Grafos, no qual é possível visualizar estruturas matemáticas, acompanhar a execução de algoritmos e comparar os resultados de Dijkstra e A (A-Star)*.

Desenvolvido como projeto acadêmico da disciplina de Matemática Discreta II, do Instituto Federal da Bahia (IFBA).
🌐 Jogue online
Acesse o Pac-Man: Graph Lab diretamente pelo navegador, sem instalar nada:
🎮 ▶ Jogar Pac-Man: Graph Lab
A versão web reúne o Modo Arcade e o Laboratório de Grafos, com demonstrações de Dijkstra e A*. Caso prefira executar localmente, consulte as instruções de instalação abaixo.
🎮 Sobre o projeto
O objetivo é demonstrar como a Teoria dos Grafos pode ser aplicada à modelagem de ambientes, à movimentação de personagens e à tomada de decisões em jogos digitais.

Diferentemente de um labirinto convencional, no qual todos os deslocamentos possuem custos iguais, o Graph Lab utiliza um grafo direcionado e ponderado.

Cada posição transitável representa um vértice, enquanto as conexões representam as transições permitidas entre posições.

Os custos variam conforme o terreno atravessado, permitindo que os algoritmos encontrem trajetos considerando não apenas a distância, mas também o custo acumulado.

A aplicação possui duas experiências principais:

Modo Arcade: uma experiência jogável em que o usuário controla o Pac-Man, coleta itens, utiliza portais e enfrenta inimigos autônomos.

Laboratório de Grafos: ambiente acadêmico interativo para estudar a representação do labirinto, executar algoritmos e analisar caminhos mínimos.
✨ Funcionalidades
Modo Arcade
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
Laboratório de Grafos
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
🛠️ Tecnologias utilizadas
Aplicação web
Tecnologia	Utilização
TypeScript	Linguagem principal
React	Interface e navegação
Phaser 3	Motor de renderização do jogo
Vite	Ambiente de desenvolvimento e build
CSS Modules	Estilização da interface
Vitest	Testes automatizados
Web Audio API	Efeitos sonoros


Implementação original
Tecnologia	Utilização
Python	Algoritmos e regras do jogo
Pygame	Interface gráfica e jogabilidade
unittest	Testes automatizados


A versão Python foi preservada como implementação original e referência para a migração.

A versão web é a principal interface do projeto.
🧠 Teoria dos Grafos aplicada
O labirinto é representado matematicamente por um grafo ponderado:
\[
G = (V,E,w)
\]
Onde:
- V: conjunto de vértices, representando posições transitáveis.
- E: conjunto de arcos direcionados, representando transições permitidas.
- w: função que associa um custo a cada arco.
A representação computacional utiliza listas de adjacência.
1. Grafos direcionados e ponderados
Cada posição transitável do labirinto é identificada por uma coordenada:
(linha, coluna)
Os movimentos permitidos são representados por conexões entre vértices.

O custo pode variar conforme o terreno de destino da transição.
Pesos dos terrenos
Terreno	Peso	Característica
Normal	1,0	Deslocamento padrão
Esteira	0,3	Baixo custo de travessia
Lama	4,0	Movimento mais lento
Lava	8,0	Alto custo e dano ao jogador


Essa modelagem permite demonstrar uma propriedade importante:

O caminho com menos movimentos nem sempre é o caminho de menor custo.

Um percurso mais longo pode ser matematicamente mais vantajoso quando utiliza terrenos com pesos menores.
2. Geração procedural com DFS
Os labirintos são gerados utilizando uma abordagem baseada em busca em profundidade (Depth-First Search — DFS).

O algoritmo percorre o espaço disponível e constrói corredores conectados.

Após a geração inicial, podem ser introduzidas conexões adicionais, criando ciclos e caminhos alternativos.

Isso permite produzir diferentes configurações de labirinto sem desenhar manualmente cada mapa.

A versão web utiliza um gerador pseudoaleatório com sementes, permitindo reproduzir cenários para testes.
3. Algoritmo de Dijkstra
O algoritmo de Dijkstra encontra caminhos mínimos em grafos com pesos não negativos.

Seu funcionamento considera o menor custo acumulado a partir do vértice inicial.

A implementação utiliza uma fila de prioridade (Min-Heap) para selecionar os próximos vértices a serem processados.
Aplicação no jogo
O algoritmo permite calcular rotas considerando:
- Custos dos terrenos.
- Direção das conexões.
- Portais.
- Posição inicial.
- Destino selecionado.
Dijkstra serve também como referência para a comparação com A*.
4. Algoritmo A* (A-Star)
O algoritmo A* utiliza uma busca informada por heurística.

Sua função de avaliação é:
\[
f(n) = g(n) + h(n)
\]
Onde:
- g(n): custo acumulado desde a origem.
- h(n): estimativa do custo restante até o objetivo.
- f(n): prioridade utilizada na exploração.
A implementação utiliza uma heurística ponderada para considerar os custos mínimos de deslocamento e as conexões especiais do grafo.

A heurística precisa respeitar as condições necessárias de admissibilidade e o algoritmo deve tratar adequadamente eventuais inconsistências para preservar suas garantias de otimalidade.
Comparação com Dijkstra
O Laboratório permite observar:
Métrica	Significado
Custo final	Soma dos pesos do caminho
Vértices expandidos	Quantidade de expansões durante a busca
Comprimento	Número de movimentos do percurso
Tempo de execução	Tempo necessário para calcular o resultado
Caminho encontrado	Indica se existe solução válida


A* pode explorar menos vértices que Dijkstra em determinados cenários.

Entretanto, isso não significa que A seja necessariamente mais rápido em todas as situações*.

Os resultados dependem do grafo, da heurística, das condições de execução e da implementação.
5. Portais e conexões não locais
O jogo possui portais que conectam posições distantes do labirinto.

Ao entrar em um portal, o personagem é transferido para sua extremidade correspondente.

Essas conexões são consideradas durante a busca de caminhos.

Os algoritmos precisam respeitar as mesmas regras de transição utilizadas pela movimentação real dos personagens.

Observação matemática: conexões entre vértices distantes não tornam necessariamente um grafo não planar. A planaridade depende da estrutura matemática do grafo, e não apenas da aparência de sua representação visual.
6. Busca com múltiplos objetivos
Além de encontrar caminhos entre dois vértices, o projeto implementa uma busca que considera objetivos intermediários.

O Pac-Man precisa coletar as chaves necessárias antes de alcançar a saída.

O sistema avalia diferentes ordens de coleta e seleciona uma rota de menor custo acumulado.

Para a quantidade reduzida de chaves utilizada no jogo, é possível analisar as permutações das ordens de visitação.

Essa funcionalidade demonstra uma aplicação de otimização de rotas envolvendo múltiplos destinos.

Limitação: a busca minimiza os custos de deslocamento. Ela não prevê necessariamente a movimentação futura dos inimigos nem otimiza o risco de perder vida.
👻 Inteligência artificial dos inimigos
O jogo possui dois inimigos com estratégias diferentes.
Minotauro vermelho — Perseguidor
Utiliza A* para calcular uma rota em direção à posição atual do Pac-Man.

Seu comportamento prioriza a perseguição direta.
Espectro roxo — Emboscador
Busca antecipar a movimentação do jogador, definindo como alvo uma posição à frente da direção atual do Pac-Man.

A partir desse alvo, calcula uma rota utilizando os algoritmos de busca.
Modo assustado
Ao coletar um orbe de poder, os inimigos entram temporariamente em um estado vulnerável.

Durante esse período, utilizam uma estratégia local de fuga, selecionando movimentos que aumentam a distância em relação ao jogador.

Essa estratégia não equivale necessariamente à determinação de um caminho globalmente mais longo.
🎯 Regras do jogo
Objetivo
Para vencer, o jogador deve:
1. Explorar o labirinto.
2. Coletar as chaves douradas.
3. Desbloquear a saída.
4. Alcançar o destino sem ser derrotado.
A coleta de todos os pontos não é obrigatória para concluir a partida.
Condições de derrota
A partida termina quando:
- O Pac-Man é capturado por um inimigo fora do modo vulnerável.
- A vida do jogador chega a zero.
Pontuação
Ação	Pontos
Coletar ponto comum	+10
Coletar chave	+100
Coletar orbe de poder	+50
Capturar inimigo vulnerável	+200
Concluir a partida	+500


🚀 Instalação e execução
O repositório possui duas implementações.

A versão web é recomendada para utilização e apresentação do projeto.

A versão Python permanece disponível como implementação original.
1. Clonar o repositório
git clone https://github.com/marloncarvalhodev/Pac-Man.git
cd Pac-Man
2. Executar a versão web
Pré-requisitos
- Node.js compatível com a versão do Vite utilizada.
- npm.
Instalar dependências
Acesse a pasta da aplicação:
cd web
Instale as dependências:
npm install
Iniciar o servidor
npm run dev
O terminal exibirá o endereço local da aplicação.

Normalmente:
http://localhost:5173/
Abra o endereço no navegador para utilizar o Graph Lab.
Gerar build de produção
npm run build
Os arquivos compilados serão gerados na pasta:
web/dist/
Essa versão pode ser publicada em serviços de hospedagem estática, como Vercel, Netlify ou GitHub Pages, com a configuração adequada.
🐍 Executar a versão Python
A versão original utiliza Python e Pygame.
Pré-requisitos
Python 3.10 ou superior, respeitando as versões das dependências do projeto.

A partir da raiz do repositório, instale as dependências:
pip install -r requirements.txt
Execute:
python -m src.main
Essa versão abre uma janela local do Pygame.
⌨️ Controles
Modo Arcade — Versão web
Tecla	Ação
W / A / S / D	Movimentar Pac-Man
Setas direcionais	Movimentar Pac-Man


As demais opções de interação e visualização estão disponíveis pelos controles da interface.
Laboratório de Grafos
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
A seleção de origem e destino pode ser realizada diretamente na visualização do grafo, conforme os comandos apresentados na interface.
🧪 Testes automatizados
O projeto possui testes para verificar o funcionamento das estruturas matemáticas e dos algoritmos.
Versão web
Acesse a pasta web:
cd web
Execute:
npm test
Caso a configuração do projeto utilize exclusivamente o comando de execução direta do Vitest:
npx vitest run
Versão Python
A partir da raiz do repositório:
python -m unittest discover -s tests -v
Os testes da versão Python incluem verificações relacionadas à representação do grafo, algoritmos de busca, terrenos, portais e regras de movimentação.
Benchmark
Para executar o benchmark disponível na implementação Python:
python tests/benchmark.py
Os resultados devem ser interpretados considerando as características dos cenários utilizados.

Os testes não substituem a validação das mecânicas por meio de partidas completas.
📁 Estrutura do projeto
Pac-Man/
│
├── src/
│   ├── __init__.py
│   ├── graph.py
│   ├── pathfinding.py
│   └── main.py
│
├── tests/
│   ├── benchmark.py
│   ├── test_game.py
│   └── test_math.py
│
├── web/
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
A arquitetura web separa o motor matemático, as regras do jogo, a renderização e os componentes da interface.

Essa divisão facilita a manutenção, os testes e a evolução do projeto.
📊 Convenções matemáticas e métricas
Para interpretar corretamente os resultados apresentados:

Ordem do grafo: quantidade de vértices.

Tamanho do grafo direcionado: quantidade de arcos.

Grau de entrada: quantidade de arcos incidentes que chegam a um vértice.

Grau de saída: quantidade de arcos que partem de um vértice.

Custo do caminho: soma dos pesos das transições realizadas.

Comprimento do caminho: quantidade de movimentos ou transições.

Vértices expandidos: métrica associada ao processamento dos vértices pelo algoritmo, conforme a convenção utilizada na implementação.

Caminho mínimo: percurso com menor custo acumulado, que não corresponde necessariamente ao percurso com menor quantidade de movimentos.

Quando os algoritmos utilizam uma mesma origem, destino e representação matemática válida, seus resultados podem ser comparados em relação ao custo encontrado e à quantidade de expansões.

A redução percentual de expansões pode ser calculada por:
\[
R = \frac{E_D - E_A}{E_D} \times 100
\]
Onde:
- \(E_D\): expansões realizadas por Dijkstra.
- \(E_A\): expansões realizadas por A*.
A expressão é aplicável quando \(E_D > 0\).

Valores negativos indicam que A* realizou mais expansões.

Menos expansões não significa necessariamente menor tempo de execução.
🎓 Objetivo acadêmico
O Pac-Man: Graph Lab foi desenvolvido para demonstrar aplicações práticas dos conceitos estudados na disciplina de Matemática Discreta II / Teoria dos Grafos.

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
📚 Documentação complementar
O repositório inclui materiais relacionados à implementação e à validação do projeto.
- [`VALIDACAO.md`](VALIDACAO.md) — Relatório de correções, testes e limitações.
- [`web/README.md`](web/README.md) — Documentação técnica da aplicação web.
👨‍💻 Desenvolvimento
Projeto acadêmico desenvolvido no Instituto Federal da Bahia (IFBA), no contexto da disciplina de Matemática Discreta II.

Repositório: Pac-Man — GitHub
<p align="center">
  <strong>Pac-Man: Graph Lab</strong><br>
  Aprenda grafos explorando caminhos.
</p>
