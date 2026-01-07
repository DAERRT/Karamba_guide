import { useState, useEffect, useRef } from 'react';
import { findConceptByKeyword, Concept } from '../data/tutorial';
import './KeywordTooltip.css';

interface KeywordTooltipProps {
  keyword: string;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenTutorial?: (conceptId: string) => void;
}

export function KeywordTooltip({ keyword, position, onClose, onOpenTutorial }: KeywordTooltipProps) {
  const [concept, setConcept] = useState<Concept | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Всегда вызываем хуки, даже если concept еще не найден
  useEffect(() => {
    const foundConcept = findConceptByKeyword(keyword);
    setConcept(foundConcept);
  }, [keyword]);

  useEffect(() => {
    // Используем requestAnimationFrame для корректного измерения после рендера
    const adjustPosition = () => {
      if (tooltipRef.current) {
        const rect = tooltipRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let x = position.x;
        let y = position.y;
        
        // Если подсказка выходит за правый край, показываем слева от слова
        if (x + rect.width > windowWidth) {
          x = position.x - rect.width - 20; // Слева от слова
        }
        
        // Если подсказка выходит за нижний край, показываем сверху
        if (y + rect.height > windowHeight) {
          y = position.y - rect.height - 10;
        }
        
        // Если подсказка выходит за левый край, возвращаем справа
        if (x < 10) {
          x = position.x + 20; // Справа от слова
        }
        
        // Минимальные отступы от краев
        x = Math.max(10, x);
        y = Math.max(10, y);
        
        setAdjustedPosition({ x, y });
      }
    };
    
    // Небольшая задержка для корректного измерения размеров
    const timeout = setTimeout(adjustPosition, 0);
    return () => clearTimeout(timeout);
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleOpenTutorial = () => {
    if (onOpenTutorial && concept) {
      onOpenTutorial(concept.id);
    }
    onClose();
  };

  // Возвращаем null только после всех хуков
  if (!concept) return null;

  return (
    <div
      ref={tooltipRef}
      className="keyword-tooltip"
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 2000,
      }}
      onMouseEnter={(e) => {
        // Предотвращаем скрытие при наведении на подсказку
        e.stopPropagation();
      }}
      onMouseLeave={() => {
        // Скрываем при уходе курсора с подсказки
        onClose();
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-keyword">{keyword}</span>
        <button className="tooltip-close" onClick={onClose}>×</button>
      </div>
      <div className="tooltip-content">
        <h3 className="tooltip-title">{concept.title}</h3>
        <p className="tooltip-description">{concept.description}</p>
        <div className="tooltip-why">
          <strong>Зачем:</strong> {concept.why.substring(0, 150)}...
        </div>
      </div>
      <div className="tooltip-footer">
        <button className="tooltip-button" onClick={handleOpenTutorial}>
          📚 Открыть в учебнике
        </button>
      </div>
    </div>
  );
}

