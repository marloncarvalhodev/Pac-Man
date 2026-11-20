import styles from './LoadingState.module.css';

export function LoadingState({ label='Preparando a página', compact=false }:{label?:string;compact?:boolean}) {
  return <div className={styles.loading} data-compact={compact} role="status" aria-live="polite" aria-busy="true">
    <span className={styles.message}>{label}<span className={styles.dots} aria-hidden="true">…</span></span>
    <div className={styles.layout} aria-hidden="true">
      <div className={styles.board}><svg className={styles.ghost} viewBox="0 0 48 48"><path d="M8 40V22a16 16 0 0 1 32 0v18l-5-5-5 5-6-5-6 5-5-5Z" fill="currentColor"/><ellipse cx="18" cy="22" rx="4" ry="5" fill="#111"/><ellipse cx="30" cy="22" rx="4" ry="5" fill="#111"/></svg><i/><i/><i/></div>
      {!compact&&<div className={styles.controls}><i/><i/><div><i/><i/><i/></div><i/><i/><div><i/><i/></div></div>}
    </div>
  </div>;
}
