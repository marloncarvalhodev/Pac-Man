import React from 'react';
import { ArrowRight, Play, FlaskConical, BookOpen } from 'lucide-react';
import styles from './HomePage.module.css';

interface HomePageProps { onNavigate: (page: 'play' | 'lab' | 'how-to-play') => void; }

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div className={styles.home}>
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.overline}>MATEMÁTICA DISCRETA · IFBA</p>
        <h1>O labirinto é<br/><span>o começo.</span></h1>
        <p className={styles.intro}>Jogue, explore e descubra os caminhos que conectam o Pac-Man à teoria dos grafos.</p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => onNavigate('play')}><Play size={18} fill="currentColor" /> Jogar Arcade <ArrowRight size={18} /></button>
          <button className={styles.secondary} onClick={() => onNavigate('lab')}><FlaskConical size={18} /> Abrir laboratório</button>
        </div>
        <button className={styles.manual} onClick={() => onNavigate('how-to-play')}><BookOpen size={17} /> Manual & teoria <ArrowRight size={16} /></button>
      </div>
      <div className={styles.visual} aria-label="Ilustração de um labirinto com Pac-Man, fantasmas e uma rota de busca" role="img">
        <div className={styles.visualHeader}><span>GRAPH LAB <b> / </b> MAPA DE BUSCA</span><span>V · E · W</span></div>
        <svg viewBox="0 0 560 420" className={styles.maze} aria-hidden="true">
          <g fill="none" stroke="#2755aa" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M38 146V66 Q38 38 66 38H494 Q522 38 522 66V112 M38 206V354 Q38 382 66 382H494 Q522 382 522 354V248"/>
            <path d="M88 38V112H172V64 M222 38V108H338V38 M386 38V112H472V72 M38 164H124V224H70 M172 150V224H238V174H318V224H390V150 M442 150H522 M88 268H172V330H88 M222 268H338V330H222 M390 268H472V330H390 M522 192H442V224"/>
          </g>
          <g stroke="#4cb3d8" strokeWidth="2" fill="none" opacity=".72"><path className={styles.searchRoute} d="M60 194H149V136H204V194H278V250H360V136H410V194H494" strokeDasharray="5 9" /></g>
          <g fill="#647a9c"><circle cx="149" cy="194" r="4"/><circle cx="149" cy="136" r="4"/><circle cx="204" cy="136" r="4"/><circle cx="204" cy="194" r="4"/><circle cx="278" cy="194" r="4"/><circle cx="278" cy="250" r="4"/><circle cx="360" cy="250" r="4"/><circle cx="360" cy="136" r="4"/><circle cx="410" cy="136" r="4"/></g>
          <g fill="#ffe18a"><circle cx="110" cy="194" r="3"/><circle cx="125" cy="194" r="3"/><circle cx="238" cy="194" r="3"/><circle cx="258" cy="194" r="3"/></g>
          <g className={styles.heroPac}><circle cx="91" cy="194" r="25" fill="#ffd43b"/><path className={styles.heroMouth} d="M91 194 L117 181 L117 207 Z" fill="#0c1423"/><circle cx="88" cy="181" r="2.4" fill="#101726"/></g>
          <g transform="translate(338 288)"><g className={styles.heroGhost}><path d="M-20 18V0a20 20 0 0 1 40 0v18l-7-5-6 5-7-5-7 5-6-5z" fill="#a66bff"/><g fill="#fff"><circle cx="-7" cy="-2" r="5"/><circle cx="7" cy="-2" r="5"/></g><g fill="#352060"><circle cx="-5" cy="-2" r="2"/><circle cx="9" cy="-2" r="2"/></g></g></g>
          <g transform="translate(433 194)"><circle r="19" fill="#ef5350"/><path d="M-17 -9l-8-12 12 5 M17 -9l8-12-12 5" fill="#fff1dc"/><g fill="#fff"><circle cx="-7" cy="-2" r="5"/><circle cx="7" cy="-2" r="5"/></g><g fill="#6b2027"><circle cx="-5" cy="-2" r="2"/><circle cx="9" cy="-2" r="2"/></g></g>
          <circle className={styles.heroPortal} cx="494" cy="194" r="10" fill="none" stroke="#a66bff" strokeWidth="3"/><circle cx="494" cy="194" r="3" fill="#f2d9ff"/>
        </svg>
        <div className={styles.visualFooter}><span><i/> VISUALIZAÇÃO ILUSTRATIVA</span><span>O caminho também é uma descoberta.</span></div>
      </div>
    </div>
    <div className={styles.concepts} aria-label="Conceitos do projeto">
      <div><strong>Grafos ponderados</strong><span>Cada terreno muda o custo de uma rota.</span></div>
      <div><strong>Dijkstra e A*</strong><span>Compare duas buscas no mesmo labirinto.</span></div>
      <div><strong>Experimente</strong><span>Inspecione vértices e acompanhe cada passo.</span></div>
    </div>
  </div>
);
