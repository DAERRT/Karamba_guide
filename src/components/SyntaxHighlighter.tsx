import { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { highlightKaramba } from '../utils/syntaxHighlight';
import './SyntaxHighlighter.css';

interface SyntaxHighlighterProps {
  code: string;
  language: 'karamba' | 'javascript' | 'python';
  className?: string;
}

export function CodeSyntaxHighlighter({ code, language, className }: SyntaxHighlighterProps) {
  const highlightedCode = useMemo(() => {
    if (language === 'karamba') {
      return highlightKarambaCode(code);
    }
    return code;
  }, [code, language]);

  if (language === 'karamba') {
    return (
      <pre className={`syntax-highlighter karamba-syntax ${className || ''}`}>
        <code className="language-karamba">{highlightedCode}</code>
      </pre>
    );
  }

  const lang = language === 'python' ? 'python' : 'javascript';

  return (
    <SyntaxHighlighter
      language={lang}
      style={oneDark}
      customStyle={{
        margin: 0,
        padding: '15px',
        background: '#2b2b2b',
        borderRadius: '6px',
      }}
      className={className}
      PreTag="div"
    >
      {code}
    </SyntaxHighlighter>
  );
}

// Функция для подсветки кода Карамба с HTML
function highlightKarambaCode(code: string): JSX.Element {
  if (!code) return <></>;
  
  const tokens = highlightKaramba(code);
  const elements: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  tokens.forEach((token, index) => {
    // Добавляем текст между токенами
    if (token.start > lastIndex) {
      const text = code.substring(lastIndex, token.start);
      if (text) {
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
}
