import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

const icon = (name: string, shapes: React.ReactNode) => {
  const Component = forwardRef<SVGSVGElement, LucideProps>(({ size = 24, strokeWidth = 1.8, ...props }, ref) =>
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>{shapes}</svg>);
  Component.displayName = name;
  return Component;
};
export const MazeIcon = icon('MazeIcon', <><path d="M9 3H3v18h18V3h-6v6h-6v6h6v6M3 9h6M15 15h6"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></>);
export const ArcadeIcon = icon('ArcadeIcon', <><path d="M6 11h12l3 9H3zM8 20v-4h8v4M12 11V6"/><circle cx="12" cy="4" r="2" fill="currentColor" stroke="none"/><path d="M7 13h2M16 13h1"/></>);
export const GraphIcon = icon('GraphIcon', <><path d="M6 6l12 12M6 6v12h12M6 6h12v12"/><rect x="3" y="3" width="6" height="6" rx="1.5" fill="currentColor" stroke="none"/><rect x="15" y="15" width="6" height="6" rx="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="2.5" fill="var(--icon-ground,#080808)"/><circle cx="6" cy="18" r="2.5" fill="var(--icon-ground,#080808)"/></>);
export const ArenaIcon = icon('ArenaIcon', <><path d="M3 21V12h6v9M9 21V4h6v17M15 21V9h6v12M2 21h20"/><path d="M11 7h2"/><circle cx="6" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/></>);
export const GuideIcon = icon('GuideIcon', <><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15M6 8h3M6 11h3M15 8h3M15 11h3"/></>);
