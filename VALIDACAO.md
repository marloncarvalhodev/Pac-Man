# Relatório de correção e validação

Validação realizada em 29/10/2026, com Python 3.13.9 e Pygame 2.6.1.

## A. Problemas corrigidos

- **Portais:** a antiga aresta opcional entre as extremidades permitia rotas incompatíveis com o teleporte automático. Agora um arco representa um comando completo: entrar na célula e terminar na outra extremidade. O custo é o terreno de entrada, sem cobrança adicional pelo salto. A chegada não dispara outro teleporte. Jogador e inimigos usam essa mesma representação; a visualização inclui a entrada e o salto rosa.
- **Conectividade:** a regressão encontrou um isolamento de células com dois pares de portais no mapa 7×7, semente 56. O gerador agora testa conectividade forte antes de aceitar cada par. Combinações inválidas são descartadas; o número efetivo de portais é exibido pelo estado real.
- **Contagem:** `Graph.size` conta arcos direcionados, inclusive arcos sem retorno. `connection_count` conta pares conectados sem orientação; `bidirectional_count` conta pares distintos com ambos os sentidos. O painel identifica tamanho como quantidade de arcos.
- **Pesos:** rejeição de pesos negativos, infinitos ou NaN. Pesos direcionados assimétricos são preservados. Cooldowns do jogador e inimigos usam o peso do arco realmente executado.
- **Buscas:** o min-heap descarta entradas obsoletas, permite reaberturas e reconstrói apenas rotas alcançadas. Vértices inexistentes não produzem soluções fictícias, nem quando origem e destino são iguais. O núcleo de relaxamento foi compartilhado para evitar divergência entre Dijkstra e A*.
- **Heurística A*:** a aproximação que considerava apenas um portal foi substituída por uma cota obtida de todos os arcos reais, válida também com múltiplos portais, custo zero e direção assimétrica.
- **Multiobjetivo:** todas as ordens são avaliadas com cache de buscas direcionadas. Caminho e animação usam exatamente os segmentos escolhidos. A ordem real de primeira coleta é armazenada. Expansões dos segmentos selecionados e trabalho de todas as alternativas são métricas distintas; o tempo cobre a otimização completa.
- **Regras finais:** dano e colisões são resolvidos antes da vitória; não se vence e perde no mesmo movimento. Vitória aplica bônus uma vez e bloqueia novas ações. Coletar todos os pontos permanece opcional.
- **Inimigos:** perseguidor direto e emboscador foram preservados. A captura devolve ao spawn com um segundo de recuperação, evitando pontuação repetida ao permanecer sobre o spawn. Fuga é descrita corretamente como escolha local do vizinho de maior distância Manhattan.
- **Controles:** A/D sempre movimentam, inclusive após executar uma busca; somente 1/2 acionam algoritmos. R reinicia a mesma configuração; N gera outro mundo. Legenda, README e implementação correspondem.
- **Geração:** RNG por instância garante sementes reproduzíveis sem interferência entre geradores. Dimensões pares são normalizadas na interface. Mapas pequenos reservam espaço para itens e inimigos e não usam posições de fallback sobre itens já reservados.
- **Painel e Raio-X:** preservada a estética Arcade Dark. Arcos orientados, pesos, portais, paredes, ordem e tamanho são derivados do mundo real. A comparação parcial é identificada como tal; mostra custo, movimentos, tempo e redução de expansões, inclusive negativa. Removidas afirmações indevidas de não planaridade e superioridade universal de desempenho.

## B. Arquivos modificados

| Arquivo | Finalidade |
|---|---|
| `src/graph.py` | Convenções de contagem, transições compostas, validação de pesos, geração reproduzível e conectividade forte |
| `src/pathfinding.py` | Heurística consistente, relaxamento com reabertura, resultados e cache multiobjetivo |
| `src/main.py` | Movimento equivalente ao grafo, colisões, cooldowns, controles, reinício, métricas e desenhos |
| `src/__init__.py` | Exportação do construtor compartilhado do grafo de movimento |
| `tests/test_math.py` | Grafos, referências independentes, buscas, portais e geração |
| `tests/test_game.py` | Integração Pygame de movimento, regras, inimigos, teclado e renderização |
| `tests/benchmark.py` | Escopo e conclusões restritos ao experimento efetivamente executado |
| `README.md` | Regras, convenções matemáticas, métricas, limitações e controles atualizados |
| `.gitignore` | Exclusão de `.tools`, ambiente portátil e arquivos temporários de validação |
| `VALIDACAO.md` | Este relatório |

## C. Testes realizados

**57 testes unittest aprovados**: 35 matemáticos e 22 de integração Pygame.

```powershell
python -m unittest discover -s tests -v
```

Nesta máquina não havia Python disponível no PATH. Para validar, foi preparado um Python portátil oficial com Pygame dentro de `.tools`, sem mudar a instalação do sistema. Aqui os testes também podem ser executados com:

```powershell
& .\.tools\python\python.exe -m unittest discover -s tests -v
```

Cobertura e evidências:

- **1.000 mundos**: dimensões 5, 7, 15 e 25; sementes 0–249 em cada dimensão; solicitação de 0, 1 ou 2 pares conforme a semente. Verificação de conectividade forte, paredes, itens disjuntos, portais e equivalência de cada arco com uma simulação independente dos comandos físicos.
- Bellman-Ford independente para caminhos simples e grafos direcionados aleatórios, com pesos 0, 0.3, 1, 4 e 8.
- Referência independente no produto `(posição, máscara de chaves)` para validar a otimização multiobjetivo; inclui uma instância em que a ordem gulosa é pior.
- Portais nos dois sentidos, saída e reentrada, custos, rota que evita portal, representação gráfica e ausência de disparo infinito.
- A* com heurística externa admissível inconsistente, exigindo reabertura; verificação da cota padrão e de sua consistência em atalhos encadeados.
- Integração: lava, lama, aceleração, coletas únicas, saída com chaves pendentes, vitória, colisão na saída, morte na saída, fuga local, captura, pausa, perseguidor, emboscador, reinício e teclado A/D no modo solver.
- Execução de uma rota completa pelo movimento real do jogador, com inimigos removidos e saúde aumentada apenas no teste para isolar conectividade e coleta.
- Inicialização e execução do loop principal com evento de saída; renderização de busca, Raio-X, vitória e derrota usando SDL dummy. Imagens 1140×700 inspecionadas: métricas e legendas cabem nos cards.
- **100 casos do benchmark**: 20 sementes em cada grade 15, 25, 35, 51 e 71, sem divergência de custo entre Dijkstra e A*. Gráficos opcionais não foram gerados. Nesta execução A* expandiu menos vértices em média, porém demorou mais, incluindo a preparação da heurística.
- Compilação dos módulos com `compileall` e verificação de whitespace com `git diff --check`.

Falhas descobertas durante o trabalho: sobreposição de spawn no fallback de mapas pequenos e isolamento por portais compostos. Ambas foram corrigidas e estão cobertas pelas regressões. Um erro no oráculo de teste com chaves duplicadas também foi corrigido antes da validação final.

## D. Validação acadêmica

Cada célula livre é um vértice que representa uma posição estável após um comando. Cada arco corresponde a um movimento ortogonal válido, incluindo teleporte obrigatório quando a entrada é um portal. Paredes não são vértices. O grafo é direcionado e ponderado; sua geometria de desenho não constitui prova de planaridade ou não planaridade.

O peso é o custo de entrar no terreno atravessado. O custo da rota é a soma dos pesos dos arcos e também determina os intervalos de movimento. Um arco composto de portal vale um movimento. Menos movimentos e menor custo são conceitos distintos.

Dijkstra expande a menor distância acumulada, relaxa os arcos e reconstrói o caminho pelos predecessores. Com pesos não negativos, retorna custo mínimo. O contador inclui o alvo retirado da fila.

A* usa `f = g + h`, com `h(u) = alpha * Manhattan(u, alvo)`, em que `alpha = min(peso(u,v) / Manhattan(u,v))` sobre os arcos não laço. Pela desigualdade triangular, `h(u) <= peso(u,v) + h(v)` em todo arco. Como `h(alvo)=0`, a heurística é consistente e admissível, inclusive com portais sucessivos. Ela pode ser fraca ou nula; correção tem prioridade sobre redução de expansões. Heurísticas externas devem cumprir admissibilidade e valor zero no alvo.

A rota multiobjetivo enumera ordens de chaves e encadeia caminhos mínimos direcionados. O cache evita executar duas vezes o mesmo par ordenado de objetivos. As animações e expansões da rota vêm dos resultados escolhidos; o total de expansões de otimização inclui alternativas descartadas.

O painel compara ambos os algoritmos no mesmo grafo, origem e destino parcial. Enquanto há chaves, o destino é escolhido pela proximidade Manhattan; depois é a saída. Já o solver avalia a rota completa. A redução percentual é `100 * (expansões_D - expansões_A) / expansões_D`, ou zero se não houver expansões de Dijkstra. Não equivale a ganho de tempo.

## E. Limitações e pendências

- A validação gráfica usou SDL dummy e inspeção das imagens renderizadas. Uma sessão humana prolongada no monitor e teclado reais não foi realizada.
- A solução ótima é de **custo de movimento**: saúde e estados futuros dos inimigos não fazem parte da busca. Não há promessa de sobrevivência automática ao seguir a rota.
- A animação não bloqueia o loop, mas o cálculo da busca é síncrono. Foi validado nas dimensões testadas; mapas arbitrariamente grandes podem exigir processamento assíncrono em trabalho futuro.
- A ordenação por permutações é adequada às duas chaves do projeto; não foi dimensionada para muitas chaves.
- O gerador pode fornecer menos portais, chaves ou orbes quando o espaço ou a conectividade impedem a quantidade solicitada. O painel sempre mostra a quantidade real.
- Não há falhas conhecidas nos cenários automatizados após as correções. Isso não constitui prova de ausência de defeitos fora do escopo testado.
