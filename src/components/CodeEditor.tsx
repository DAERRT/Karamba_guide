import { useState, useRef, useMemo, KeyboardEvent, useEffect } from 'react';
import { getCurrentWord, getCompletions, extractVariables, extractFunctions, CompletionItem } from '../utils/autocomplete';
import { getAllKeywords, findConceptByKeyword } from '../data/tutorial';
import { KeywordTooltip } from './KeywordTooltip';
import { CodeEditorOverlay } from './CodeEditorOverlay';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onOpenTutorial?: (conceptId: string) => void;
}

export function CodeEditor({ value, onChange, placeholder, onOpenTutorial }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCompletions, setShowCompletions] = useState(false);
  const [completionPosition, setCompletionPosition] = useState({ top: 0, left: 0 });
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const keywords = useMemo(() => getAllKeywords(), []);

  // Функция для вычисления позиции курсора из координат мыши
  const getCaretPositionFromMouse = (clientX: number, clientY: number, textarea: HTMLTextAreaElement): number | null => {
    if (!textarea || !value) {
      return null;
    }
    
    try {
      const rect = textarea.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const styles = window.getComputedStyle(textarea);
      const paddingLeft = parseFloat(styles.paddingLeft) || 20;
      const paddingTop = parseFloat(styles.paddingTop) || 20;
      const lineHeight = parseFloat(styles.lineHeight) || 22.4;
      const fontSize = parseFloat(styles.fontSize) || 14;

      // Вычисляем строку с учетом прокрутки
      const scrollTop = textarea.scrollTop;
      const relativeY = y - paddingTop + scrollTop;
      const lineIndex = Math.max(0, Math.floor(relativeY / lineHeight));
      
      const lines = value.split('\n');
      if (lineIndex >= lines.length) {
        return value.length;
      }
      
      const currentLine = lines[lineIndex] || '';
      const textBeforeLine = lines.slice(0, lineIndex).join('\n');
      
      // Для моноширинного шрифта (Courier New) используем более точный расчет
      // В моноширинном шрифте символы имеют одинаковую ширину
      const charWidth = fontSize * 0.6; // Примерная ширина для Courier New
      const relativeX = Math.max(0, x - paddingLeft);
      const charPos = Math.min(currentLine.length, Math.max(0, Math.floor(relativeX / charWidth)));
      
      // Общая позиция в тексте
      const totalPos = textBeforeLine.length + (lineIndex > 0 ? 1 : 0) + charPos;
      return Math.min(Math.max(0, totalPos), value.length);
    } catch (error) {
      console.error('Error calculating caret position:', error);
      return null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    // Очищаем предыдущий таймаут
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    // Сохраняем данные события до выполнения таймаута
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const textareaElement = e.currentTarget;

    // Небольшая задержка для избежания постоянного обновления
    const timeout = setTimeout(() => {
      if (!textareaRef.current || !value || value.length === 0) {
        setSelectedKeyword(null);
        return;
      }
      
      // Вычисляем позицию используя сохраненные координаты
      const position = getCaretPositionFromMouse(mouseX, mouseY, textareaElement);
      
      if (position === null || position < 0 || position > value.length) {
        setSelectedKeyword(null);
        return;
      }

      const { word, start } = getCurrentWord(value, position);
      
      // Проверяем, является ли слово ключевым (без учета регистра)
      if (word && word.length > 0) {
        const wordLower = word.toLowerCase().trim();
        const matchingKeyword = keywords.find(kw => kw.toLowerCase() === wordLower);
        
        if (matchingKeyword) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          const textBeforeWord = value.substring(0, start);
          const lines = textBeforeWord.split('\n');
          const line = lines.length - 1;
          const column = lines[lines.length - 1].length;
          
          const styles = window.getComputedStyle(textarea);
          const lineHeight = parseFloat(styles.lineHeight) || 22.4;
          const fontSize = parseFloat(styles.fontSize) || 14;
          const charWidth = fontSize * 0.6;
          const paddingLeft = parseFloat(styles.paddingLeft) || 20;
          
          // Позиционируем подсказку справа от слова, чтобы не перекрывать его
          const wordEnd = start + word.length;
          const wordEndColumn = column + word.length;
          
          setTooltipPosition({
            x: rect.left + wordEndColumn * charWidth + paddingLeft + 10, // Справа от слова с отступом
            y: rect.top + (line + 1) * lineHeight - 5, // Немного выше, чтобы не перекрывать
          });
          // Используем оригинальное слово для отображения
          setSelectedKeyword(word);
        } else {
          setSelectedKeyword(null);
        }
      } else {
        setSelectedKeyword(null);
      }
    }, 300); // Задержка 300мс перед показом подсказки

    setTooltipTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    // Не скрываем сразу - даем возможность навести курсор на подсказку
    // Подсказка сама закроется при onMouseLeave
  };

  // Извлекаем переменные и функции из кода (мемоизируем для производительности)
  const variables = useMemo(() => extractVariables(value), [value]);
  const functions = useMemo(() => extractFunctions(value), [value]);

  // Вычисляем количество строк
  const lineCount = useMemo(() => {
    if (!value) return 1;
    return value.split('\n').length;
  }, [value]);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Синхронизация прокрутки между textarea, номерами строк и overlay
  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      
      if (overlayRef.current) {
        overlayRef.current.scrollTop = scrollTop;
        overlayRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const updateCompletions = (text: string, position: number) => {
    const { word, start, end } = getCurrentWord(text, position);
    
    // Показываем автодополнение только если есть хотя бы один символ
    if (word.length > 0 && start < position) {
      const suggestions = getCompletions(word, variables, functions);
      if (suggestions.length > 0) {
        setCompletions(suggestions);
        setShowCompletions(true);
        setSelectedIndex(0);
        
        // Вычисляем позицию для подсказок
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const textBeforeCursor = text.substring(0, start);
          const lines = textBeforeCursor.split('\n');
          const line = lines.length - 1;
          const column = lines[lines.length - 1].length;
          
          // Создаем временный элемент для измерения
          const measureDiv = document.createElement('div');
          measureDiv.style.position = 'absolute';
          measureDiv.style.visibility = 'hidden';
          measureDiv.style.whiteSpace = 'pre';
          measureDiv.style.font = window.getComputedStyle(textarea).font;
          measureDiv.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
          measureDiv.style.fontSize = window.getComputedStyle(textarea).fontSize;
          measureDiv.style.padding = window.getComputedStyle(textarea).padding;
          measureDiv.textContent = lines[lines.length - 1] || '';
          document.body.appendChild(measureDiv);
          
          const rect = textarea.getBoundingClientRect();
          const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
          const charWidth = measureDiv.offsetWidth / (lines[lines.length - 1]?.length || 1);
          
          setCompletionPosition({
            top: rect.top + (line + 1) * lineHeight + 5,
            left: rect.left + column * charWidth + parseFloat(window.getComputedStyle(textarea).paddingLeft),
          });
          
          document.body.removeChild(measureDiv);
        }
      } else {
        setShowCompletions(false);
      }
    } else {
      setShowCompletions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart;
    onChange(newValue);
    setCursorPosition(newPosition);
    updateCompletions(newValue, newPosition);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCompletions && completions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % completions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + completions.length) % completions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertCompletion(completions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCompletions(false);
        return;
      }
    }

    // Обновляем позицию курсора
    setTimeout(() => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
        updateCompletions(value, textareaRef.current.selectionStart);
      }
    }, 0);
  };

  const insertCompletion = (completion: CompletionItem) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const text = value;
    const position = textarea.selectionStart;
    const { word, start, end } = getCurrentWord(text, position);

    const insertText = completion.insertText || completion.label;
    const newText = text.substring(0, start) + insertText + text.substring(end);
    const newPosition = start + insertText.length;

    onChange(newText);
    setShowCompletions(false);

    // Устанавливаем позицию курсора после вставки
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleCompletionClick = (completion: CompletionItem) => {
    insertCompletion(completion);
  };

  // Генерируем номера строк
  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  return (
    <div className="code-editor-wrapper">
      <div className="code-editor-container">
        <div 
          ref={lineNumbersRef}
          className="line-numbers"
          onScroll={handleScroll}
        >
          {lineNumbers.map((num) => (
            <div key={num} className="line-number">
              {num}
            </div>
          ))}
        </div>
        <div className="code-editor-with-overlay">
          <div ref={overlayRef} className="code-editor-overlay-wrapper">
            <CodeEditorOverlay code={value} cursorPosition={cursorPosition} />
          </div>
          <textarea
            ref={textareaRef}
            className="code-editor"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              setCursorPosition(start);
              updateCompletions(value, start);
            }}
            placeholder={placeholder}
            spellCheck={false}
          />
        </div>
      </div>
      {showCompletions && completions.length > 0 && (
        <div
          className="autocomplete-menu"
          style={{
            position: 'fixed',
            top: `${completionPosition.top}px`,
            left: `${completionPosition.left}px`,
            zIndex: 1000,
          }}
        >
          {completions.map((completion, index) => (
            <div
              key={`${completion.label}-${index}`}
              className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleCompletionClick(completion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className={`autocomplete-icon ${completion.kind}`}>
                {completion.kind === 'keyword' && '🔑'}
                {completion.kind === 'variable' && '📦'}
                {completion.kind === 'function' && '⚙️'}
                {completion.kind === 'operator' && '🔧'}
                {completion.kind === 'constant' && '💎'}
              </span>
              <span className="autocomplete-label">{completion.label}</span>
              {completion.description && (
                <span className="autocomplete-description">{completion.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {selectedKeyword && (
        <KeywordTooltip
          keyword={selectedKeyword}
          position={tooltipPosition}
          onClose={() => setSelectedKeyword(null)}
          onOpenTutorial={onOpenTutorial}
        />
      )}
    </div>
  );
}

