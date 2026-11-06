import React from 'react';
import styles from './Motion.module.css';

interface SplitTextProps {
  text: string;
  delay?: number;
}

/** Word-aware stagger inspired by React Bits Split Text; native CSS implementation. */
export const SplitText: React.FC<SplitTextProps> = ({ text, delay = 0 }) => {
  let index = 0;
  return (
    <span className={styles.split}>
      <span className={styles.accessibleText}>{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((word, wordIndex) =>
          /^\s+$/.test(word) ? (
            word
          ) : (
            <span className={styles.word} key={wordIndex}>
              {Array.from(word).map((letter) => (
                <span
                  className={styles.letter}
                  key={index}
                  style={
                    {
                      '--letter-delay': `${delay + index++ * 24}ms`,
                    } as React.CSSProperties
                  }
                >
                  {letter}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
};
