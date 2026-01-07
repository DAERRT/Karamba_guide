// Лексер - разбивает исходный код на токены

export type TokenType = 
  | 'NUMBER' | 'STRING' | 'BOOLEAN' | 'IDENTIFIER'
  | 'LET' | 'ЕСЛИ' | 'ТО' | 'ИНАЧЕ' | 'ПОКА' | 'ДЛЯ' | 'ДЛЯ_КАЖДОГО' | 'В' | 'ФУНКЦИЯ' | 'ВЕРНУТЬ'
  | 'ВЫВЕСТИ' | 'ВВЕСТИ' | 'И' | 'ИЛИ' | 'НЕ'
  | 'PLUS' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'MOD'
  | 'EQUAL' | 'NOT_EQUAL' | 'LESS' | 'LESS_EQUAL' | 'GREATER' | 'GREATER_EQUAL'
  | 'ASSIGN' | 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE'
  | 'LBRACKET' | 'RBRACKET' | 'COMMA' | 'SEMICOLON' | 'EOF';

export interface Token {
  type: TokenType;
  value?: string | number | boolean;
  line: number;
  column: number;
}

const keywords: Record<string, TokenType> = {
  'пусть': 'LET',
  'если': 'ЕСЛИ',
  'то': 'ТО',
  'иначе': 'ИНАЧЕ',
  'пока': 'ПОКА',
  'для': 'ДЛЯ',
  'для_каждого': 'ДЛЯ_КАЖДОГО',
  'в': 'В',
  'функция': 'ФУНКЦИЯ',
  'вернуть': 'ВЕРНУТЬ',
  'вывести': 'ВЫВЕСТИ',
  'ввести': 'ВВЕСТИ',
  'и': 'И',
  'или': 'ИЛИ',
  'не': 'НЕ',
  'истина': 'BOOLEAN',
  'ложь': 'BOOLEAN',
};

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== 'EOF') {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token);
    return tokens;
  }

  private nextToken(): Token {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return this.createToken('EOF');
    }

    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    const char = this.advance();

    // Числа
    if (this.isDigit(char)) {
      return this.number(char);
    }

    // Строки
    if (char === '"' || char === "'") {
      return this.string(char);
    }

    // Идентификаторы и ключевые слова
    if (this.isAlpha(char)) {
      return this.identifier(char);
    }

    // Операторы
    switch (char) {
      case '+': return this.createToken('PLUS');
      case '-': return this.createToken('MINUS');
      case '*': return this.createToken('MULTIPLY');
      case '/': return this.createToken('DIVIDE');
      case '%': return this.createToken('MOD');
      case '=': 
        if (this.match('=')) return this.createToken('EQUAL');
        return this.createToken('ASSIGN');
      case '!':
        if (this.match('=')) return this.createToken('NOT_EQUAL');
        break;
      case '<':
        if (this.match('=')) return this.createToken('LESS_EQUAL');
        return this.createToken('LESS');
      case '>':
        if (this.match('=')) return this.createToken('GREATER_EQUAL');
        return this.createToken('GREATER');
      case '(': return this.createToken('LPAREN');
      case ')': return this.createToken('RPAREN');
      case '{': return this.createToken('LBRACE');
      case '}': return this.createToken('RBRACE');
      case '[': return this.createToken('LBRACKET');
      case ']': return this.createToken('RBRACKET');
      case ',': return this.createToken('COMMA');
      case ';': return this.createToken('SEMICOLON');
    }

    throw new Error(`Неожиданный символ: ${char} на строке ${this.line}, столбец ${this.column}`);
  }

  private number(firstChar: string): Token {
    let value = firstChar; // начинаем с уже прочитанного символа
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    return this.createToken('NUMBER', parseFloat(value));
  }

  private string(quote: string): Token {
    let value = '';
    while (this.peek() !== quote && !this.isAtEnd()) {
      if (this.peek() === '\n') this.line++;
      value += this.advance();
    }
    if (this.isAtEnd()) {
      throw new Error(`Незакрытая строка на строке ${this.line}`);
    }
    this.advance(); // пропускаем закрывающую кавычку
    return this.createToken('STRING', value);
  }

  private identifier(firstChar: string): Token {
    let value = firstChar; // начинаем с уже прочитанного символа
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Нормализуем ключевое слово для поиска (приводим к нижнему регистру)
    // Важно: для русских символов toLowerCase() работает корректно
    const normalizedValue = value.toLowerCase();
    
    // Сначала проверяем более длинные ключевые слова (например, "для_каждого" перед "для")
    // Это важно, чтобы "для" не перехватывал "для_каждого"
    const sortedKeywords = Object.keys(keywords).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      if (normalizedValue === keyword) {
        const tokenType = keywords[keyword];
        if (tokenType === 'BOOLEAN') {
          return this.createToken('BOOLEAN', normalizedValue === 'истина');
        }
        return this.createToken(tokenType);
      }
    }

    return this.createToken('IDENTIFIER', value);
  }

  private skipWhitespace(): void {
    while (true) {
      const char = this.peek();
      if (char === ' ' || char === '\r' || char === '\t') {
        this.advance();
        this.column++;
      } else if (char === '\n') {
        this.line++;
        this.column = 1;
        this.advance();
      } else if (char === '/' && this.peekNext() === '/') {
        while (this.peek() !== '\n' && !this.isAtEnd()) {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private advance(): string {
    this.position++;
    this.column++;
    return this.source[this.position - 1];
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.position] !== expected) return false;
    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || 
           (char >= 'A' && char <= 'Z') || 
           char === '_' || 
           (char >= 'а' && char <= 'я') || 
           (char >= 'А' && char <= 'Я');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char) || char === '_';
  }

  private createToken(type: TokenType, value?: string | number | boolean): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
    };
  }
}

