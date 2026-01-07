import { useMemo } from 'react';
import { highlightKaramba } from '../utils/syntaxHighlight';
import './CodeEditorOverlay.css';

interface CodeEditorOverlayProps {
  code: string;
  cursorPosition: number;
}

export function CodeEditorOverlay({ code }: CodeEditorOverlayProps) {
  const highlightedCode = useMemo(() => {
    if (!code) return <></>;
    
    const tokens = highlightKaramba(code);
    const elements: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    tokens.forEach((token, index) => {
      // Добавляем текст между токенами
      if (token.start > lastIndex) {
        const text = code.substring(lastIndex, token.start);
        if (text) {
          // Сохраняем пробелы и переносы строк
          elements.push(
            <span key={`text-${index}`} className="token-text">
              {text}
            </span>
          );
        }
      }

      // Добавляем токен с соответствующим классом
      const className = `token token-${token.type}`;
      elements.push(
        <span key={`token-${index}`} className={className}>
          {token.value}
        </span>
      );

      lastIndex = token.end;
    });

    // Добавляем оставшийся текст
    if (lastIndex < code.length) {
      const remaining = code.substring(lastIndex);
      if (remaining) {
        elements.push(
          <span key="text-remaining" className="token-text">
            {remaining}
          </span>
        );
      }
    }

    return <>{elements}</>;
  }, [code]);

  return (
    <div className="code-editor-overlay">
      <pre className="code-editor-highlighted">
        <code>{highlightedCode}</code>
      </pre>
    </div>
  );
}

