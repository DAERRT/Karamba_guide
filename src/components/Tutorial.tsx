import { useState } from 'react';
import { tutorial, Chapter, Concept } from '../data/tutorial';
import { CodeSyntaxHighlighter } from './SyntaxHighlighter';
import './Tutorial.css';

interface TutorialProps {
  onConceptClick?: (conceptId: string) => void;
  initialConceptId?: string;
}

export function Tutorial({ onConceptClick, initialConceptId }: TutorialProps) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(tutorial[0]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(
    initialConceptId
      ? tutorial
          .flatMap(ch => ch.concepts)
          .find(c => c.id === initialConceptId) || null
      : tutorial[0].concepts[0]
  );
  const [selectedLanguages, setSelectedLanguages] = useState<Record<number, 'karamba' | 'javascript' | 'python'>>({});

  const handleConceptClick = (concept: Concept) => {
    setSelectedConcept(concept);
    if (onConceptClick) {
      onConceptClick(concept.id);
    }
  };

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    if (chapter.concepts.length > 0) {
      setSelectedConcept(chapter.concepts[0]);
    }
  };

  return (
    <div className="tutorial-container">
      <div className="tutorial-sidebar">
        <h2>📚 Учебник</h2>
        <div className="chapters-list">
          {tutorial.map((chapter) => (
            <div key={chapter.id} className="chapter-section">
              <div
                className={`chapter-header ${selectedChapter.id === chapter.id ? 'active' : ''}`}
                onClick={() => handleChapterClick(chapter)}
              >
                <span className="chapter-title">{chapter.title}</span>
              </div>
              {selectedChapter.id === chapter.id && (
                <div className="concepts-list">
                  {chapter.concepts.map((concept) => (
                    <div
                      key={concept.id}
                      className={`concept-item ${selectedConcept?.id === concept.id ? 'active' : ''}`}
                      onClick={() => handleConceptClick(concept)}
                    >
                      {concept.keyword && (
                        <span className="concept-keyword">{concept.keyword}</span>
                      )}
                      <span className="concept-title">{concept.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="tutorial-content">
        {selectedConcept && (
          <div className="concept-detail">
            <h1 className="concept-main-title">{selectedConcept.title}</h1>
            
            <div className="concept-section">
              <h2>📝 Что это?</h2>
              <p className="concept-description">{selectedConcept.description}</p>
            </div>

            <div className="concept-section">
              <h2>❓ Зачем это нужно?</h2>
              <p className="concept-why">{selectedConcept.why}</p>
            </div>

            <div className="concept-section">
              <h2>⏰ Когда использовать?</h2>
              <p className="concept-when">{selectedConcept.when}</p>
            </div>

            <div className="concept-section">
              <h2>💡 Примеры</h2>
              {selectedConcept.examples.map((example, index) => {
                const currentLang = selectedLanguages[index] || 'karamba';
                return (
                  <div key={index} className="example-block">
                    <div className="example-tabs">
                      <div 
                        className={`example-tab ${currentLang === 'karamba' ? 'active' : ''}`}
                        onClick={() => setSelectedLanguages({ ...selectedLanguages, [index]: 'karamba' })}
                      >
                        Карамба
                      </div>
                      {example.javascript && (
                        <div 
                          className={`example-tab ${currentLang === 'javascript' ? 'active' : ''}`}
                          onClick={() => setSelectedLanguages({ ...selectedLanguages, [index]: 'javascript' })}
                        >
                          JavaScript
                        </div>
                      )}
                      {example.python && (
                        <div 
                          className={`example-tab ${currentLang === 'python' ? 'active' : ''}`}
                          onClick={() => setSelectedLanguages({ ...selectedLanguages, [index]: 'python' })}
                        >
                          Python
                        </div>
                      )}
                    </div>
                    <div className="example-code">
                      {currentLang === 'karamba' && (
                        <CodeSyntaxHighlighter code={example.karamba} language="karamba" />
                      )}
                      {currentLang === 'javascript' && example.javascript && (
                        <CodeSyntaxHighlighter code={example.javascript} language="javascript" />
                      )}
                      {currentLang === 'python' && example.python && (
                        <CodeSyntaxHighlighter code={example.python} language="python" />
                      )}
                    </div>
                    <div className="example-explanation">
                      <strong>Объяснение:</strong> {example.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedConcept.commonMistakes && selectedConcept.commonMistakes.length > 0 && (
              <div className="concept-section">
                <h2>⚠️ Частые ошибки</h2>
                <ul className="mistakes-list">
                  {selectedConcept.commonMistakes.map((mistake, index) => (
                    <li key={index}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedConcept.tips && selectedConcept.tips.length > 0 && (
              <div className="concept-section">
                <h2>💡 Полезные советы</h2>
                <ul className="tips-list">
                  {selectedConcept.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

