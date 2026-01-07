// Утилиты для подсветки синтаксиса языка Карамба

export interface Token {
  type: 'keyword' | 'string' | 'number' | 'operator' | 'comment' | 'variable' | 'function' | 'boolean' | 'text';
  value: string;
  start: number;
  end: number;
}

// Ключевые слова языка Карамба
const KEYWORDS = ['пусть', 'если', 'то', 'иначе', 'пока', 'для', 'для_каждого', 'в', 'функция', 'вернуть', 'вывести', 'ввести', 'и', 'или', 'не'];
const BOOLEANS = ['истина', 'ложь'];
const OPERATORS = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '=', '(', ')', '{', '}', '[', ']', ',', ';'];

export function highlightKaramba(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Пропускаем пробелы и переносы строк
    if (/\s/.test(code[i])) {
      i++;
      continue;
    }

    // Комментарии (однострочные)
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      tokens.push({
        type: 'comment',
        value: code.substring(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Строки (в кавычках)
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      const start = i;
      i++; // пропускаем открывающую кавычку
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          i += 2; // пропускаем экранированный символ
        } else {
          i++;
        }
      }
      if (i < code.length) i++; // пропускаем закрывающую кавычку
      tokens.push({
        type: 'string',
        value: code.substring(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Числа
    if (/\d/.test(code[i])) {
      const start = i;
      while (i < code.length && (/\d/.test(code[i]) || code[i] === '.')) {
        i++;
      }
      tokens.push({
        type: 'number',
        value: code.substring(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Операторы (двухсимвольные сначала)
    let matched = false;
    for (const op of ['==', '!=', '<=', '>=']) {
      if (code.substring(i, i + op.length) === op) {
        tokens.push({
          type: 'operator',
          value: op,
          start: i,
          end: i + op.length,
        });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Операторы (односимвольные)
    if (OPERATORS.includes(code[i])) {
      tokens.push({
        type: 'operator',
        value: code[i],
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // Идентификаторы и ключевые слова
    if (/[\wа-яА-ЯёЁ]/.test(code[i])) {
      const start = i;
      while (i < code.length && /[\wа-яА-ЯёЁ]/.test(code[i])) {
        i++;
      }
      const word = code.substring(start, i);
      const wordLower = word.toLowerCase();

      // Проверяем, является ли следующий символ открывающей скобкой (для функций)
      const isFunction = i < code.length && code[i] === '(';

      if (KEYWORDS.includes(wordLower)) {
        tokens.push({
          type: 'keyword',
          value: word,
          start,
          end: i,
        });
      } else if (BOOLEANS.includes(wordLower)) {
        tokens.push({
          type: 'boolean',
          value: word,
          start,
          end: i,
        });
      } else if (isFunction) {
        // Функции (идентификатор перед скобкой)
        tokens.push({
          type: 'function',
          value: word,
          start,
          end: i,
        });
      } else {
        // Переменные
        tokens.push({
          type: 'variable',
          value: word,
          start,
          end: i,
        });
      }
      continue;
    }

    // Остальное - обычный текст
    tokens.push({
      type: 'text',
      value: code[i],
      start: i,
      end: i + 1,
    });
    i++;
  }

  return tokens;
}

