import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { HowToPlayPage } from '../pages/HowToPlayPage';

describe('conteúdo e navegação da interface', () => {
  it('mantém as três entradas principais na página inicial', () => {
    const html = renderToStaticMarkup(<HomePage onNavigate={() => {}} />);
    expect(html).toContain('Jogar Arcade');
    expect(html).toContain('Abrir laboratório');
    expect(html).toContain('Manual &amp; teoria');
    expect(html).toContain('VISUALIZAÇÃO ILUSTRATIVA');
  });
  it('aponta cada tópico do manual para uma seção existente', () => {
    const html = renderToStaticMarkup(<HowToPlayPage onStartPlaying={() => {}} />);
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
    expect(links.length).toBeGreaterThan(0);
    expect(html).toMatch(/href="#objetivo"[^>]*aria-current="location"/);
    for (const target of links) expect(html).toContain(`id="${target}"`);
    expect(html).toContain('não demonstra que o grafo é não planar');
  });
});
