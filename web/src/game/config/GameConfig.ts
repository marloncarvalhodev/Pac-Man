/**
 * Configuração Centralizada de Velocidades, Temporizadores e Simulação do Jogo.
 *
 * Fundamentação Teórica:
 * - A velocidade de deslocamento de cada personagem é governada pelo custo ponderado w(u, v)
 *   da aresta atravessada no grafo G = (V, E, w):
 *     delta_t(u, v) = w(u, v) * BASE_DELAY_MS
 * - No terreno NORMAL (w=1.0), o Pac-Man executa 1 célula a cada PLAYER_BASE_DELAY_MS.
 * - Em BOOST (w=0.3), a travessia é acelerada (~3.3x).
 * - Em MUD (w=4.0), a travessia é retardada (4x).
 * - Em LAVA (w=8.0), a travessia é muito lenta (8x) e acarreta perda de HP.
 *
 * Proporcionalidade e Equivalência Matemática:
 * - O tempo total de qualquer caminho P é: T(P) = somatório delta_t(e) = PLAYER_BASE_DELAY_MS * Custo(P).
 * - Como PLAYER_BASE_DELAY_MS > 0 é uma constante escalar estrita, argmin T(P) === argmin Custo(P).
 * - Logo, a equivalência isomórfica entre as estratégias MIN_COST e MIN_TIME é rigorosamente preservada.
 */

export const GAME_SPEED_CONFIG = {
  /**
   * Intervalo base de movimento do Pac-Man (em milissegundos por unidade de peso de aresta).
   * Anterior: 135 ms (~7.4 células/s, excessivamente frenético).
   * Novo: 200 ms (~5.0 células/s em terreno normal, legível e reativo).
   */
  PLAYER_BASE_DELAY_MS: 200,

  /**
   * Intervalo base de movimento dos Fantasmas (em milissegundos por unidade de peso de aresta).
   * Anterior: 260 ms (~3.85 células/s em terreno normal).
   * Balanceado para pesquisa e paridade: 320 ms (~3.12 células/s), permitindo margem de manobra viável em MVM.
   */
  GHOST_BASE_DELAY_MS: 320,

  /**
   * Multiplicador de velocidade quando os fantasmas estão assustados (modo Frightened).
   * Fantasmas ficam ~40% mais lentos: 260 * 1.4 = 364 ms (~2.75 células/s).
   */
  GHOST_FRIGHTENED_MULTIPLIER: 1.4,

  /**
   * Duração do efeito de vulnerabilidade dos fantasmas (Power Pellet) em milissegundos simulados.
   */
  FRIGHTENED_DURATION_MS: 7000,

  /**
   * Intervalo de recálculo de rota dos fantasmas (em milissegundos de tempo simulado).
   */
  GHOST_RECALC_INTERVAL_MS: 250,

  /**
   * Duração da contagem regressiva de preparação inicial (em segundos de tempo real / contagem).
   * Durante a contagem, o labirinto é visível, os personagens ficam imóveis e o relógio não avança.
   */
  COUNTDOWN_DURATION_SEC: 3,

  /**
   * Janela inicial de reação / espera dos fantasmas após a contagem (em milissegundos de tempo simulado).
   * Permite ao Pac-Man iniciar sua trajetória antes dos fantasmas começarem a se mover.
   */
  GHOST_INITIAL_SPAWN_DELAY_MS: 2000,

  /**
   * Janela inicial reduzida exclusivamente para o modo Máquina vs. Máquina (MVM).
   */
  MVM_GHOST_INITIAL_SPAWN_DELAY_MS: 500,

  /**
   * Cooldown de anti-oscilação para replanejamento do agente autônomo (em milissegundos simulados).
   */
  AGENT_REPLAN_COOLDOWN_MS: 350,

  /**
   * Velocidades de simulação disponíveis para visualização do modo Arcade Autônomo.
   */
  SIMULATION_SPEEDS: [0.5, 1.0, 2.0] as const,

  /**
   * Velocidade padrão da simulação (1.0x).
   */
  DEFAULT_SIMULATION_SPEED: 1.0,

  /**
   * Limite temporal simulado padrão para a estratégia MAX_SURVIVAL_TIME no modo visual (120 s).
   */
  MAX_SURVIVAL_TIME_LIMIT_MS: 120000,
} as const;

export type SimulationSpeed = (typeof GAME_SPEED_CONFIG.SIMULATION_SPEEDS)[number];
