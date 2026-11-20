import React, { useEffect, useRef } from 'react';
import styles from './CharacterParade.module.css';

export const CharacterParade: React.FC<{ paused: boolean }> = ({ paused }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = true;
    const update = () => {
      element.dataset.active = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <svg
      ref={ref}
      className={styles.track}
      data-active="true"
      data-paused={paused}
      viewBox="0 0 420 58"
      aria-hidden="true"
    >
      <g fill="#ffdeb1" opacity=".45">
        {Array.from({ length: 17 }, (_, i) => (
          <circle key={i} cx={i * 26 + 4} cy="29" r="2" />
        ))}
      </g>
      <g className={styles.parade}>
        <g transform="translate(0 29)">
          <circle r="18" fill="#ffdf32" />
          <path className={styles.mouth} d="M0 0L20 -14V14Z" fill="#0c1018" />
          <circle cx="-1" cy="-9" r="2" fill="#101722" />
        </g>
        {['#ff4b59', '#b08aff'].map((color, index) => (
          <g key={color} transform={`translate(${-54 - index * 50} 29)`}>
            <path
              d="M-17 17V-1A17 17 0 0 1 17-1V17L11 11L6 17L0 11L-6 17L-11 11Z"
              fill={color}
            />
            <g fill="#fff">
              <ellipse cx="-6" cy="-1" rx="5.5" ry="7" />
              <ellipse cx="6" cy="-1" rx="5.5" ry="7" />
            </g>
            <g fill="#173b96">
              <ellipse cx="-4" cy="0" rx="2.7" ry="3.8" />
              <ellipse cx="8" cy="0" rx="2.7" ry="3.8" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
};
