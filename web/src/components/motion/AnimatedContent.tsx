import React, { useEffect, useRef } from 'react';

interface AnimatedContentProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** React Bits Animated Content reference, adapted to native observer/animation APIs. */
export const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  className,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (
      !element ||
      preference.matches ||
      !('IntersectionObserver' in window) ||
      !element.animate
    )
      return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animation = element.animate(
          [
            { opacity: 0.5, transform: 'translateY(22px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 650,
            delay,
            easing: 'cubic-bezier(.16,1,.3,1)',
            fill: 'backwards',
          },
        );
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    const reduceMotion = () => {
      if (preference.matches) {
        animation?.cancel();
        observer.disconnect();
      }
    };
    preference.addEventListener('change', reduceMotion);
    observer.observe(element);
    return () => {
      animation?.cancel();
      observer.disconnect();
      preference.removeEventListener('change', reduceMotion);
    };
  }, [delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
