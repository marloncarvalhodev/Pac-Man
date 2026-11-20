// Adapted from the supplied React Bits StaggeredMenu (see LICENSE.md).
// Uses Web Animations in place of GSAP; timings follow the supplied component.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import './StaggeredMenu.css';

type Item = { id: string; label: string; Icon: LucideIcon };
type Props = {
  open: boolean; onToggle: () => void; onClose: () => void;
  items: Item[]; active: string; onSelect: (id: string) => void;
};

export default function StaggeredMenu({ open, onToggle, onClose, items, active, onSelect }: Props) {
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const initial = useRef(true);

  useLayoutEffect(() => {
    if (panel.current) panel.current.inert = !open;
    if (initial.current) { initial.current = false; return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations: Animation[] = [];
    root.current?.querySelectorAll<HTMLElement>('.sm-prelayer').forEach((layer, index) => {
      animations.push(layer.animate(open
        ? [{ transform: 'translateX(-110%)' }, { transform: 'translateX(0)' }]
        : [{ transform: 'translateX(0)' }, { transform: 'translateX(-110%)' }],
      { duration: open ? 500 : 320, delay: open ? index * 70 : 0, easing: 'cubic-bezier(.22,1,.36,1)' }));
    });
    if (open) panel.current?.querySelectorAll<HTMLElement>('.sm-panel-itemLabel').forEach((label, index) => {
      animations.push(label.animate([
        { transform: 'translateY(140%) rotate(10deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
      ], { duration: 650, delay: 180 + index * 80, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }));
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) onClose();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open, onClose]);

  const select = (id: string) => {
    onSelect(id);
    if (matchMedia('(max-width: 850px)').matches) onClose();
  };

  return <header ref={root} className="staggered-menu-wrapper" data-open={open}>
    <div className="sm-prelayers" aria-hidden="true"><div className="sm-prelayer" /><div className="sm-prelayer" /></div>
    <div className="staggered-menu-header">
      <button className="sm-logo" onClick={() => select('home')} aria-label="Ir para início">
        <img src={`${import.meta.env.BASE_URL}pacman-icon.svg`} alt="" width="32" height="32" />
        <span>PAC-MAN <b>GRAPH LAB</b></span>
      </button>
      <button ref={toggle} className="sm-toggle" type="button" onClick={onToggle}
        aria-expanded={open} aria-controls="project-navigation" aria-label={open ? 'Recolher menu' : 'Abrir menu'}>
        <span className="sm-toggle-textWrap"><span key={String(open)} className="sm-toggle-textInner">{open ? 'Fechar' : 'Menu'}</span></span>
        <span className="sm-icon" aria-hidden="true"><i /><i /></span>
      </button>
    </div>
    <div ref={panel} className="staggered-menu-panel" aria-hidden={!open}>
      <span className="sm-panel-title">Navegação</span>
      <nav id="project-navigation" aria-label="Navegação principal">
        <ul className="sm-panel-list">
          {items.map(({ id, label, Icon }) => <li className="sm-panel-itemWrap" key={id}>
            <button className="sm-panel-item" aria-label={label} aria-current={active === id ? 'page' : undefined} onClick={() => select(id)}>
              <span className="sm-panel-itemLabel"><Icon size={21} aria-hidden /><span className="sm-label-copy">{label}<span className="sm-description" aria-hidden="true">{({home:'Seu ponto de partida',play:'Jogue ou observe os agentes',lab:'Explore rotas e decisões',arena:'Compare as estratégias','how-to-play':'Regras e fundamentos'} as Record<string,string>)[id]}</span></span></span>
            </button>
          </li>)}
        </ul>
      </nav>
      <div className="sm-panel-footer"><span>LABORATÓRIO INTERATIVO</span><p>Jogar · explorar · comparar</p></div>
    </div>
    {!open && <nav className="sm-rail" aria-label="Atalhos"><span className="sm-rail-indicator" aria-hidden="true" style={{transform:`translateY(${Math.max(0,items.findIndex(item=>item.id===active))*54}px)`}}/>
      {items.map(({ id, label, Icon }) => <button key={id} title={label} aria-label={label} aria-current={active === id ? 'page' : undefined} onClick={() => select(id)}><Icon size={21} aria-hidden /></button>)}
    </nav>}
  </header>;
}
