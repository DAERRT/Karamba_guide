import { useState } from 'react';
import { KarambaCompiler } from './compiler';
import { CodeEditor } from './components/CodeEditor';
import { Tutorial } from './components/Tutorial';
import { WelcomePage } from './components/WelcomePage';
import './App.css';

const EXAMPLE_CODE = `пусть счетчик = 0;
пусть сумма = 0;

пока (счетчик < 10) {
    счетчик = счетчик + 1;
    сумма = сумма + счетчик;
    вывести счетчик;
}

вывести "Сумма чисел от 1 до 10: ";
вывести сумма;

если (сумма > 50) то {
    вывести "Сумма больше 50!";
} иначе {
    вывести "Сумма не больше 50";
}

функция факториал(число) {
    если (число <= 1) то {
        вернуть 1;
    }
    вернуть число * факториал(число - 1);
}

вывести "Факториал 5: ";
вывести факториал(5);
`;

function App() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'tutorial'>('editor');
  const [tutorialConceptId, setTutorialConceptId] = useState<string | undefined>(undefined);
  const [waitingForInput, setWaitingForInput] = useState<{ prompt: string; resolve: (value: string) => void } | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(true);

  const handleStartCoding = () => {
    setShowWelcome(false);
  };

  const handleOpenTutorial = (conceptId: string) => {
    setTutorialConceptId(conceptId);
    setActiveTab('tutorial');
  };

  const handleRun = async () => {
    try {
      setError('');
      setWaitingForInput(null);
      setInputValue('');
      if (!code.trim()) {
        setError('Введите код для выполнения');
        return;
      }
      
      // Создаем Promise для ввода
      const inputCallback = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          setWaitingForInput({ prompt, resolve });
        });
      };
      
      const compiler = new KarambaCompiler(code, inputCallback);
      const result = await compiler.run();
      setOutput(result);
      setWaitingForInput(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Ошибка: ${errorMessage}`);
      setOutput([]);
      setWaitingForInput(null);
      console.error('Ошибка компиляции:', err);
    }
  };

  const handleInputSubmit = () => {
    if (waitingForInput) {
      waitingForInput.resolve(inputValue);
      setInputValue('');
      setWaitingForInput(null);
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  const handleClear = () => {
    setCode('');
    setOutput([]);
    setError('');
  };

  const handleLoadExample = () => {
    setCode(EXAMPLE_CODE);
    setOutput([]);
    setError('');
  };

  // Показываем приветственную страницу при первом входе
  if (showWelcome) {
    return <WelcomePage onStart={handleStartCoding} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏴‍☠️ Карамба - Язык программирования</h1>
        <p>Создайте свой код на языке Карамба с русскими ключевыми словами</p>
      </header>

      <div className="toolbar">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            💻 Редактор
          </button>
          <button
            className={`tab-button ${activeTab === 'tutorial' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutorial')}
          >
            📚 Учебник
          </button>
        </div>
        {activeTab === 'editor' && (
          <>
            <button onClick={handleRun} className="btn btn-primary">
              ▶ Запустить
            </button>
            <button onClick={handleClear} className="btn btn-secondary">
              🗑️ Очистить
            </button>
            <button onClick={handleLoadExample} className="btn btn-secondary">
              📝 Пример
            </button>
          </>
        )}
      </div>

      {activeTab === 'editor' ? (
        <div className="editor-container">
          <div className="editor-panel">
            <div className="panel-header">
              <h2>Код</h2>
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              placeholder="Введите код на языке Карамба..."
              onOpenTutorial={handleOpenTutorial}
            />
          </div>

          <div className="output-panel">
            <div className="panel-header">
              <h2>Вывод</h2>
            </div>
            <div className="output-content">
              {error && <div className="error">{error}</div>}
              {output.length === 0 && !error && !waitingForInput && (
                <div className="placeholder">Запустите код, чтобы увидеть результат</div>
              )}
              {output.map((line, index) => (
                <div key={index} className="output-line">
                  {line}
                </div>
              ))}
              {waitingForInput && (
                <div className="input-prompt">
                  <label>{waitingForInput.prompt}</label>
                  <div className="input-group">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleInputKeyPress}
                      autoFocus
                      className="input-field"
                    />
                    <button onClick={handleInputSubmit} className="btn btn-primary input-submit">
                      Ввести
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="tutorial-wrapper">
          <Tutorial
            onConceptClick={handleOpenTutorial}
            initialConceptId={tutorialConceptId}
          />
        </div>
      )}
    </div>
  );
}

export default App;

