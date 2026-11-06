import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SplitText } from '../components/motion/SplitText';
import GlareHover from '../components/react-bits/GlareHover';
import styles from './HowToPlayPage.module.css';
interface Props {
  onStartPlaying: () => void;
  onOpenLaboratory?: () => void;
  onOpenArena?: () => void;
}
const topics = [
  ['objetivo', 'Objetivo'],
  ['terrenos', 'Terrenos'],
  ['inimigos', 'Inimigos e poder'],
  ['controles', 'Controles'],
  ['grafos', 'Teoria dos grafos'],
  ['buscas', 'Dijkstra e A*'],
  ['laboratorio', 'Laboratório'],
  ['arena', 'Arena de máquinas'],
];
export const HowToPlayPage: React.FC<Props> = ({
  onStartPlaying,
  onOpenLaboratory,
  onOpenArena,
}) => {
  const [activeTopic, setActiveTopic] = useState(topics[0][0]);

  useEffect(() => {
    let frame = 0;
    const updateTopic = () => {
      frame = 0;
      const threshold = Math.max(130, window.innerHeight * 0.3);
      let current = topics[0][0];
      for (const [id] of topics) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= threshold)
          current = id;
      }
      const lastTopic = topics[topics.length - 1][0];
      const lastSection = document.getElementById(lastTopic);
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2 &&
        lastSection &&
        lastSection.getBoundingClientRect().top <= window.innerHeight * 0.7
      ) {
        current = lastTopic;
      }
      setActiveTopic(current);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateTopic);
    };
    updateTopic();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <strong>Manual & teoria</strong>
        <nav aria-label="Tópicos do manual">
          {topics.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeTopic === id ? styles.activeTopic : undefined}
              aria-current={activeTopic === id ? 'location' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <article className={styles.article}>
        <GlareHover
          width="100%"
          borderRadius="0px"
          borderColor="transparent"
          glareColor="#7cd9e8"
          glareOpacity={0.12}
          intro
          style={{ display: 'block' }}
        >
          <header className={styles.header}>
            <h1>
              <SplitText text="Um guia para" />
              <br />
              <em>
                <SplitText text="encontrar caminhos." delay={100} />
              </em>
            </h1>
            <div>
              As regras do arcade e os conceitos que dão forma ao labirinto.
            </div>
          </header>
        </GlareHover>
        <section id="objetivo">
          <h2>O objetivo da partida</h2>
          <p>
            Controle o Pac-Man, encontre todas as chaves douradas e alcance a
            saída. Desvie dos inimigos e sobreviva aos terrenos perigosos.
            Coletar todos os pontos não é necessário para vencer.
          </p>
        </section>
        <section id="terrenos">
          <h2>O terreno tem peso</h2>
          <p>
            O custo de uma transição influencia a rota calculada e a velocidade
            de movimento. Um caminho com menos passos pode ter custo maior.
          </p>
          <div className={styles.terrains}>
            <div>
              <i style={{ background: '#52637b' }} />
              <strong>
                Normal <b>1.0</b>
              </strong>
              <span>Movimento padrão</span>
            </div>
            <div>
              <i style={{ background: '#36d5ed' }} />
              <strong>
                Esteira <b>0.3</b>
              </strong>
              <span>Movimento rápido</span>
            </div>
            <div>
              <i style={{ background: '#b98752' }} />
              <strong>
                Lama <b>4.0</b>
              </strong>
              <span>Movimento lento</span>
            </div>
            <div>
              <i style={{ background: '#ef6666' }} />
              <strong>
                Lava <b>8.0</b>
              </strong>
              <span>−10 de vida por entrada</span>
            </div>
          </div>
          <div className={styles.example}>
            <span>EXEMPLO DE CUSTO</span>
            <strong>1.0 + 0.3 + 4.0 = 5.3</strong>
            <p>A soma dos pesos é o custo acumulado da rota.</p>
          </div>
        </section>
        <section id="inimigos">
          <h2>Inimigos e orbes de poder</h2>
          <p>
            O <strong>Minotauro vermelho</strong> persegue o jogador. O{' '}
            <strong>Fantasma roxo</strong> mira à frente da direção atual para
            tentar uma emboscada.
          </p>
          <p>
            Um orbe de poder ativa o modo assustado por sete segundos. Os
            inimigos escolhem localmente um vizinho mais distante; tocá-los
            nesse período os envia de volta ao ponto inicial e concede pontos.
          </p>
        </section>
        <section id="controles">
          <h2>Controles</h2>
          <div className={styles.tableWrap}>
            <table>
              <tbody>
                <tr>
                  <th>W A S D / setas</th>
                  <td>Mover Pac-Man</td>
                </tr>
                <tr>
                  <th>1 / 2</th>
                  <td>Visualizar Dijkstra / A*</td>
                </tr>
                <tr>
                  <th>P</th>
                  <td>Pausar ou retomar</td>
                </tr>
                <tr>
                  <th>G / T</th>
                  <td>Raio-X / rotas dos inimigos</td>
                </tr>
                <tr>
                  <th>R / N</th>
                  <td>Reiniciar / gerar novo mapa</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section id="grafos">
          <h2>Um labirinto, um grafo</h2>
          <p>
            As células transitáveis são vértices. As conexões representam
            deslocamentos possíveis, e seus pesos descrevem custos. O grafo é
            dirigido e ponderado.
          </p>
          <svg
            className={styles.diagram}
            viewBox="0 0 500 105"
            role="img"
            aria-label="Exemplo de vértices conectados por arestas, com uma conexão não local representada por linha pontilhada"
          >
            <path
              d="M55 55 H160 H265 H370"
              stroke="#6dc5e0"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M55 55 Q210 -28 370 55"
              stroke="#b18af5"
              strokeWidth="2"
              strokeDasharray="5 6"
              fill="none"
            />
            <g fill="#101b2c" stroke="#8ed8eb" strokeWidth="2">
              <circle cx="55" cy="55" r="11" />
              <circle cx="160" cy="55" r="11" />
              <circle cx="265" cy="55" r="11" />
              <circle cx="370" cy="55" r="11" />
            </g>
            <text x="390" y="60" fill="#c9d6e9" fontSize="13">
              portal
            </text>
          </svg>
          <p>
            Portais são conexões especiais não locais entre posições distantes.
            O cruzamento de linhas no desenho, por si só,{' '}
            <strong>não demonstra que o grafo é não planar</strong>.
          </p>
        </section>
        <section id="buscas">
          <h2>Comparando caminhos</h2>
          <p>
            Dijkstra expande vértices considerando o custo acumulado. A* combina
            esse custo com uma estimativa heurística até o destino. No
            laboratório, compare os custos e a quantidade de expansões
            observadas na execução.
          </p>
          <div className={styles.example}>
            <span>FUNÇÃO DE A*</span>
            <strong>f(n) = g(n) + h(n)</strong>
            <p>g é o custo acumulado; h é a estimativa até o objetivo.</p>
          </div>
          <p>
            Na busca multiobjetivo, a aplicação avalia ordens de visita às
            chaves e combina os segmentos calculados até a saída.
          </p>
        </section>
        <section id="laboratorio">
          <h2>Explore no laboratório</h2>
          <p>
            Escolha o algoritmo e o modo de visualização. Execute a busca, pause
            ou avance passo a passo. Clique em um vértice para escolher a origem
            e use Shift + clique para o destino; passe o cursor para inspecionar
            seus vizinhos e graus.
          </p>
          <button
            className={styles.startBtn}
            onClick={onOpenLaboratory ?? onStartPlaying}
          >
            {onOpenLaboratory ? 'Abrir laboratório' : 'Ir para o Arcade'}{' '}
            <ArrowRight size={18} />
          </button>
        </section>
        <section id="arena">
          <h2>Máquina contra máquina</h2>
          <p>
            A Arena compara Dijkstra e A* com três táticas: rota rápida, coleta
            gulosa e rota cautelosa. Configure X rodadas; cada máquina recebe o
            mesmo mapa por rodada e tenta chegar à saída com as chaves, ou
            coletar todos os pontos antes de sair.
          </p>
          <p>
            Compare taxa de conclusão, pontuação, tempo simulado e tempo de
            busca. O ranking pode priorizar tempo ou pontos; o gráfico mostra a
            relação entre os dois. O histórico é salvo neste navegador, e os
            resultados podem ser exportados em CSV. O replay usa o mesmo relógio
            para as duas máquinas.
          </p>
          <p>
            A Arena é um modelo determinístico por arestas do grafo. O tempo
            simulado não depende da velocidade do replay. Na Arena, portais são
            transições explícitas; no Arcade, a entrada teleporta
            automaticamente. Leia a metodologia na Arena para comparar as
            medidas corretamente.
          </p>
          {onOpenArena && (
            <button className={styles.startBtn} onClick={onOpenArena}>
              Abrir Arena <ArrowRight size={18} />
            </button>
          )}
        </section>
      </article>
    </div>
  );
};
