// Утилиты для автодополнения

export interface CompletionItem {
  label: string;
  kind: 'keyword' | 'variable' | 'function' | 'operator' | 'constant';
  description?: string;
  insertText?: string;
}

export const KEYWORDS: CompletionItem[] = [
  { label: 'пусть', kind: 'keyword', description: 'Объявление переменной', insertText: 'пусть ' },
  { label: 'если', kind: 'keyword', description: 'Условный оператор', insertText: 'если () то {\n    \n}' },
  { label: 'то', kind: 'keyword', description: 'Часть условия' },
  { label: 'иначе', kind: 'keyword', description: 'Альтернативная ветка условия', insertText: 'иначе {\n    \n}' },
  { label: 'пока', kind: 'keyword', description: 'Цикл while', insertText: 'пока () {\n    \n}' },
  { label: 'для', kind: 'keyword', description: 'Цикл for', insertText: 'для (пусть i = 0; i < 10; i = i + 1) {\n    \n}' },
  { label: 'для_каждого', kind: 'keyword', description: 'Цикл foreach', insertText: 'для_каждого (элемент в массив) {\n    \n}' },
  { label: 'функция', kind: 'keyword', description: 'Объявление функции', insertText: 'функция имя() {\n    \n}' },
  { label: 'вернуть', kind: 'keyword', description: 'Возврат значения', insertText: 'вернуть ' },
  { label: 'вывести', kind: 'keyword', description: 'Вывод значения', insertText: 'вывести ' },
  { label: 'ввести', kind: 'keyword', description: 'Ввод значения с клавиатуры', insertText: 'ввести ' },
  { label: 'и', kind: 'operator', description: 'Логическое И' },
  { label: 'или', kind: 'operator', description: 'Логическое ИЛИ' },
  { label: 'не', kind: 'operator', description: 'Логическое НЕ' },
  { label: 'истина', kind: 'constant', description: 'Булево значение true' },
  { label: 'ложь', kind: 'constant', description: 'Булево значение false' },
];

export const OPERATORS: CompletionItem[] = [
  { label: '+', kind: 'operator', description: 'Сложение' },
  { label: '-', kind: 'operator', description: 'Вычитание' },
  { label: '*', kind: 'operator', description: 'Умножение' },
  { label: '/', kind: 'operator', description: 'Деление' },
  { label: '%', kind: 'operator', description: 'Остаток от деления' },
  { label: '==', kind: 'operator', description: 'Равенство' },
  { label: '!=', kind: 'operator', description: 'Неравенство' },
  { label: '<', kind: 'operator', description: 'Меньше' },
  { label: '>', kind: 'operator', description: 'Больше' },
  { label: '<=', kind: 'operator', description: 'Меньше или равно' },
  { label: '>=', kind: 'operator', description: 'Больше или равно' },
];

// Извлекает переменные из кода
export function extractVariables(code: string): string[] {
  const variables: Set<string> = new Set();
  const letRegex = /пусть\s+(\w+)\s*=/g;
  let match;
  while ((match = letRegex.exec(code)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

// Извлекает функции из кода
export function extractFunctions(code: string): string[] {
  const functions: Set<string> = new Set();
  const funcRegex = /функция\s+(\w+)\s*\(/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    functions.add(match[1]);
  }
  return Array.from(functions);
}

// Получает текущее слово в позиции курсора
export function getCurrentWord(text: string, cursorPosition: number): { word: string; start: number; end: number } {
  let start = cursorPosition;
  let end = cursorPosition;

  // Ищем начало слова
  while (start > 0 && /[\wа-яА-ЯёЁ]/.test(text[start - 1])) {
    start--;
  }

  // Ищем конец слова
  while (end < text.length && /[\wа-яА-ЯёЁ]/.test(text[end])) {
    end++;
  }

  const word = text.substring(start, end);
  return { word, start, end };
}

// Фильтрует подсказки по текущему слову
export function getCompletions(
  word: string,
  variables: string[],
  functions: string[]
): CompletionItem[] {
  const lowerWord = word.toLowerCase();
  const completions: CompletionItem[] = [];

  // Ключевые слова
  for (const keyword of KEYWORDS) {
    if (keyword.label.toLowerCase().startsWith(lowerWord)) {
      completions.push(keyword);
    }
  }

  // Переменные
  for (const variable of variables) {
    if (variable.toLowerCase().startsWith(lowerWord)) {
      completions.push({
        label: variable,
        kind: 'variable',
        description: 'Переменная',
        insertText: variable,
      });
    }
  }

  // Функции
  for (const func of functions) {
    if (func.toLowerCase().startsWith(lowerWord)) {
      completions.push({
        label: func,
        kind: 'function',
        description: 'Функция',
        insertText: `${func}(`,
      });
    }
  }

  return completions;
}

