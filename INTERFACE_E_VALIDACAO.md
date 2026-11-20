# Interface e validação do Pac-Man Graph Lab

## Direção visual

Fundo preto, superfícies em cinza neutro e amarelo Pac-Man nas ações e na navegação ativa. O azul fica principalmente no labirinto. A identidade retoma elementos da versão anterior da interface, com controles agrupados por tarefa.

## Alterações

- Menu StaggeredMenu adaptado do componente React Bits enviado pelo usuário: abertura em camadas, entrada escalonada dos itens, indicação da página ativa e botão animado. No desktop, recolhe para uma coluna de atalhos; no celular, abre como painel lateral e fecha após navegar.
- O pacote GSAP não pôde ser instalado por indisponibilidade de DNS do registro npm. A adaptação usa Web Animations e CSS, com os tempos e a sequência visual do componente fornecido. Não se trata da implementação original sem modificações. Licença preservada em `web/src/components/react-bits/LICENSE.md`.
- Escape recolhe o menu e devolve o foco ao botão. O painel fechado fica `inert`, sem links acessíveis pelo teclado. Animações respeitam movimento reduzido.
- Marca e favicon usam o mesmo Pac-Man amarelo em SVG.
- Ícones próprios para labirinto, arcade, grafo, comparação e manual, com dimensões e espessuras consistentes.
- Botões de áudio removidos da interface, conforme solicitado.
- Fantasmas arredondados com base ondulada, olhos orientados pelo movimento e estado vulnerável azul. O aviso de término de vulnerabilidade pisca em branco. As assinaturas do renderizador foram preservadas.
- Inicial com demonstração animada, personagens clássicos e acessos com descrições. Legenda e botão de pausa abaixo do labirinto removidos a pedido do usuário. Texto e labirinto permanecem lado a lado em desktop, com o conjunto centralizado na altura da tela. O efeito do mapa usa halo atrás da moldura e inclinação leve pelo cursor, sem vidro; a demonstração respeita movimento reduzido e pausa fora da área visível.
- Arcade com identificação da seção, separação entre tabuleiro e console e destaque amarelo nos controles.
- Laboratório com mapa dimensionado pela altura disponível e painel lateral nas abas Busca, Resultados, Células e Ajuda. Coordenadas, inspeção e teoria ficam próximas ao mapa; no celular os blocos seguem fluxo vertical. As folhas de estilo da página e de seus componentes foram reescritas para remover regras conflitantes acumuladas.
- Arena com estratégias selecionáveis acompanhadas de descrições e ícones, cenário em formulário separado, resumo calculado de estratégias/mapas/partidas e estados vazios com ações. Abas, campos, tabelas e filtros receberam estilos consistentes e responsivos.
- Manual com capítulos numerados, navegação contextual e diagramas com contornos consistentes. Sua folha de estilos foi reescrita; títulos, espaçamentos e controles seguem a mesma escala das demais páginas.
- Entradas suaves entre páginas e feedback de interação nos acessos da inicial.

## Refinamento dos painéis e da leitura

- Ícones do menu sem as caixas de fundo anteriores, com animação curta de deslocamento/rotação ao passar o mouse e alternativa sem movimento.
- Arcade com fundos neutros de carvão, botões com contraste consistente e configuração autônoma separada da execução nas abas Configuração e Acompanhar. Estratégia em seletor, algoritmo e reprodução em grupos próprios, rota como alternância e métricas detalhadas em bloco expansível. Os eventos enviados ao motor foram preservados.
- Laboratório com os mesmos tons dos painéis do jogo, botões segmentados de melhor contraste e manutenção das abas de resultados/inspeção.
- Arena com gráficos selecionáveis de taxa de vitória, tempo de conclusão (mediana e faixa das vitórias), custo, pontuação e coleta. A interpretação é calculada a partir do lote: explica empates, ausência de vitórias, resultados parciais e limitações da amostra. Um gráfico adicional mostra cada tipo de desfecho com contagens. A tabela completa e as partidas individuais permanecem acessíveis em blocos expansíveis. Nenhuma derrota foi excluída dos resultados.
- Manual com navegação numerada, cinco capítulos e explicações adicionais sobre risco, inspeção, tempos, método experimental e ranking local. A revisão usa o PDF Pacman.pdf e distingue aproximações de garantias matemáticas.
- Referências desta revisão: Pixel Card, Animated List e Magnet do React Bits. As transições e os efeitos foram adaptados ao contexto do jogo; não foram instaladas dependências novas.

## Ajustes de composição e interação

- Os acessos extras da inicial começam recolhidos. O botão Explorar outros modos abre e fecha a área com transição de altura e opacidade; quando fechada, fica `inert` e fora da navegação por teclado.
- Favicon com novos endereços de SVG, ICO multirresolução e ícone para celular, evitando reutilizar o endereço antigo em cache. A marca usa o mesmo SVG do Pac-Man, com fundo transparente; cabeçalho e painel do menu compartilham a mesma cor.
- A posição do olho do Pac-Man foi corrigida no renderizador para ficar acima do corpo ao mover horizontalmente. A direção da boca continua seguindo o movimento real.
- Feedback curto de seleção nos botões e entrada suave dos painéis e gráficos, desativados com movimento reduzido.
- Novos testes verificam a orientação do personagem e as interpretações dos gráficos (denominador da taxa, ausência de vitórias, empate e lote parcial).

## Funcionalidades mantidas e verificações

O projeto inclui modo humano, Pac-Man autônomo, demonstração e máquina contra máquina; cinco estratégias; Dijkstra, A* e busca multiobjetivo; risco dos fantasmas no Laboratório; comparação experimental por sementes e repetições; resultados, exportação JSON e ranking local.

A suíte automatizada executada teve **94 testes aprovados em 14 arquivos**. Inclui grafos, caminhos, agentes, regressões de jogabilidade e simulação experimental. A compilação de produção também foi executada.

A conferência visual é feita sobre os arquivos compilados, em Chrome automatizado, nas larguras 1440, 768 e 320 px. O ambiente não permite servir os arquivos normalmente por localhost; as requisições são atendidas pelo próprio teste, e o worker experimental é carregado como Blob. As fontes remotas ficam indisponíveis nesse teste, portanto as capturas usam as fontes alternativas locais.

Os fluxos no navegador passaram nas três larguras: navegação, canvas, alternância dos modos, risco dos fantasmas, execução do lote, exportação, persistência e limpeza do ranking. A revisão adicional cobriu seleção por coordenadas, abas de inspeção/resultados, explicações abertas, controles dos diagramas, estados vazios e fechamento por Escape com retorno de foco. A versão de 320 px foi conferida com movimento reduzido; os rótulos dos controles segmentados também foram medidos para confirmar que cabem nos botões.

## Limites

- A simulação experimental reaproveita os agentes, mas não está demonstrada equivalência quadro a quadro com a cena Phaser.
- Busca com risco não representa probabilidade de sobrevivência. No Laboratório, considera as posições iniciais dos fantasmas.
- Coleta completa usa aproximação gulosa; maior pontuação não garante ótimo global. As derrotas e os limites aparecem nos resultados.
- Os testes de interface não substituem partidas humanas completas nem conferência em dispositivos físicos.
- O build ainda avisa sobre o tamanho do pacote Phaser.
- O MCP shadcn não ficou conectado nesta sessão: não há ferramenta correspondente carregada, e a tentativa de execução via npx falhou com ENOTFOUND em registry.npmjs.org. O arquivo `mcp.shadcn.toml` contém o bloco solicitado para o cliente Codex; não é carregado automaticamente apenas por existir no repositório. `web/components.json` prepara o registro público @react-bits. A pesquisa continuou diretamente nas fontes oficiais, sem alegar conexão MCP.

## Referências consultadas

- https://reactbits.dev/components/staggered-menu
- https://reactbits.dev/animations/animated-content
- https://reactbits.dev/components/stepper
- https://reactbits.dev/components/spotlight-card
- https://ui.shadcn.com/docs/mcp
- https://reactbits.dev/components/pixel-card
- https://reactbits.dev/components/animated-list
- https://reactbits.dev/animations/magnet
- Componente StaggeredMenu fornecido no arquivo Texto colado.txt.
- Versão anterior do próprio projeto, conforme solicitado pelo usuário.

## Evidência da última revisão

Compilação concluída e 94 testes aprovados. Conferência em Chrome a 1440, 768 e 320 px: expansão/recolhimento dos acessos, conteúdo fechado fora do teclado, texto e mapa lado a lado em desktop, SVG do favicon carregado, cores do cabeçalho e menu iguais, alternância dos painéis do agente, opções de estratégia/algoritmo/velocidade/rota, cinco métricas do gráfico, exportação e persistência do ranking. A regressão da orientação horizontal do olho tem teste próprio. As capturas foram feitas com fontes alternativas locais porque o ambiente de teste bloqueia fontes externas.


## Fechamento da auditoria

- Carregamento fantasma com skeleton do mapa e dos controles, ícone de fantasma e brilho suave. Presente nas páginas carregadas sob demanda, na demonstração da inicial e na preparação do canvas. A verificação com atraso de chunk confirmou aparecimento durante a espera e remoção quando pronta, sem espera mínima artificial.
- Barra lateral compacta de 76 px recolhida e 244 px expandida, indicador ativo deslizante, itens com rótulo e descrição, fundo uniforme com a marca e transição de abertura. Referências: Staggered Menu e Animated Content do React Bits.
- Mapa inteiro do Laboratório conferido em Chrome nas resoluções 1920×900, 1440×768 e 1366×650; também conferido o fluxo sem transbordamento horizontal em 768×900 e 320×850.
- Corrigida vitória prematura de FULL_CLEAR na Arena: sair antes de recolher todos os pontos não termina mais com vitória. Regressão demonstrada antes e depois em um corredor de quatro células. Motor experimental versão 2 e histórico v2 separados; os dados v1 são preservados.
- Lote real registrado em VALIDACAO_EXPERIMENTAL.json: cinco estratégias, três sementes, duas repetições, 30 partidas. Sobrevivência ganhou 2/6, ambas na semente 42; demais políticas 0/6. A amostra não demonstra superioridade geral. Resumo em RESUMO_VALIDACAO.json.
- Validação final: 94 testes web em 14 arquivos e 35 testes matemáticos Python aprovados; build de produção concluído. O aviso de tamanho do pacote Phaser permanece.
- Conformidade integral não afirmada: faltam equivalência quadro a quadro Arena/Phaser e partidas humanas completas; sobrevivência é uma política de rota, enquanto a definição de um objetivo temporal independente ainda requer alinhamento. A integração pygame não foi executada porque o pacote não está instalado.
- Relatório final em PDF documenta a matriz de requisitos, correções, resultados medidos e limites de validação.
