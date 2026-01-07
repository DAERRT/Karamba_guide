// Парсер - строит AST из токенов

import { Token, TokenType } from './lexer';
import { Expression, Statement, Program } from './types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      // Пропускаем пустые строки (одиночные точки с запятой)
      if (this.check('SEMICOLON')) {
        this.advance();
        continue;
      }
      try {
        statements.push(this.declaration());
      } catch (error) {
        // Если не удалось распарсить, пробуем пропустить токен и продолжить
        if (this.isAtEnd()) break;
        const token = this.peek();
        throw new Error(`${error instanceof Error ? error.message : String(error)}. Токен: ${token.type}(${token.value || ''}) на строке ${token.line}`);
      }
    }
    return { statements };
  }

  private declaration(): Statement {
    if (this.match('LET')) return this.letDeclaration();
    if (this.match('ФУНКЦИЯ')) return this.functionDeclaration();
    return this.statement();
  }

  private letDeclaration(): Statement {
    // match('LET') в declaration() уже продвинул токен
    const name = this.consume('IDENTIFIER', 'Ожидается имя переменной').value as string;
    this.consume('ASSIGN', 'Ожидается =');
    const value = this.expression();
    this.consume('SEMICOLON', 'Ожидается ;');
    return { type: 'let', name, value };
  }

  private functionDeclaration(): Statement {
    // match('ФУНКЦИЯ') в declaration() уже продвинул токен
    const name = this.consume('IDENTIFIER', 'Ожидается имя функции').value as string;
    this.consume('LPAREN', 'Ожидается (');
    const params: string[] = [];
    if (!this.check('RPAREN')) {
      do {
        params.push(this.consume('IDENTIFIER', 'Ожидается параметр').value as string);
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', 'Ожидается )');
    this.consume('LBRACE', 'Ожидается {');
    const body = this.block();
    return { type: 'function', name, params, body };
  }

  private statement(): Statement {
    if (this.match('ЕСЛИ')) return this.ifStatement();
    if (this.match('ПОКА')) return this.whileStatement();
    if (this.match('ДЛЯ_КАЖДОГО')) return this.forEachStatement();
    if (this.match('ДЛЯ')) return this.forStatement();
    if (this.match('ВЫВЕСТИ')) return this.printStatement();
    if (this.match('ВВЕСТИ')) return this.inputStatement();
    if (this.match('ВЕРНУТЬ')) return this.returnStatement();
    if (this.match('LBRACE')) return { type: 'block', statements: this.block() };
    return this.expressionStatement();
  }

  private ifStatement(): Statement {
    this.consume('LPAREN', 'Ожидается (');
    const condition = this.expression();
    this.consume('RPAREN', 'Ожидается )');
    this.consume('ТО', 'Ожидается то');
    this.consume('LBRACE', 'Ожидается {');
    const thenBranch = this.block();
    let elseBranch: Statement[] | undefined;
    if (this.match('ИНАЧЕ')) {
      this.consume('LBRACE', 'Ожидается {');
      elseBranch = this.block();
    }
    return { type: 'if', condition, thenBranch, elseBranch };
  }

  private whileStatement(): Statement {
    this.consume('LPAREN', 'Ожидается (');
    const condition = this.expression();
    this.consume('RPAREN', 'Ожидается )');
    this.consume('LBRACE', 'Ожидается {');
    const body = this.block();
    return { type: 'while', condition, body };
  }

  private forEachStatement(): Statement {
    this.consume('LPAREN', 'Ожидается (');
    const variable = this.consume('IDENTIFIER', 'Ожидается имя переменной').value as string;
    this.consume('В', 'Ожидается "в"');
    const array = this.expression();
    this.consume('RPAREN', 'Ожидается )');
    this.consume('LBRACE', 'Ожидается {');
    const body = this.block();
    return { type: 'foreach', variable, array, body };
  }

  private forStatement(): Statement {
    this.consume('LPAREN', 'Ожидается (');
    
    // Обычный for: для (инициализация; условие; шаг)
    let init: Statement | undefined;
    if (!this.check('SEMICOLON')) {
      if (this.match('LET')) {
        init = this.letDeclaration();
      } else {
        // Выражение-присваивание (i = 0) или просто выражение
        // Парсим как expressionStatement, но без точки с запятой в конце
        if (this.check('IDENTIFIER') && this.checkNext('ASSIGN')) {
          const target = this.expression(); // Может быть переменной или индексацией
          this.advance(); // пропускаем =
          const value = this.expression();
          this.consume('SEMICOLON', 'Ожидается ;');
          init = { type: 'assign', target, value };
        } else {
          // Просто выражение - пропускаем
          this.expression();
          this.consume('SEMICOLON', 'Ожидается ;');
        }
      }
    } else {
      this.advance(); // пропускаем ;
    }
    
    let condition: Expression | undefined;
    if (!this.check('SEMICOLON')) {
      condition = this.expression();
    }
    this.consume('SEMICOLON', 'Ожидается ;');
    
    let increment: Expression | undefined;
    if (!this.check('RPAREN')) {
      increment = this.expression();
    }
    this.consume('RPAREN', 'Ожидается )');
    this.consume('LBRACE', 'Ожидается {');
    const body = this.block();
    return { type: 'for', init, condition, increment, body };
  }

  private printStatement(): Statement {
    const value = this.expression();
    this.consume('SEMICOLON', 'Ожидается ;');
    return { type: 'print', value };
  }

  private inputStatement(): Statement {
    const variable = this.consume('IDENTIFIER', 'Ожидается имя переменной').value as string;
    this.consume('SEMICOLON', 'Ожидается ;');
    return { type: 'input', variable };
  }

  private returnStatement(): Statement {
    let value: Expression | undefined;
    if (!this.check('SEMICOLON')) {
      value = this.expression();
    }
    this.consume('SEMICOLON', 'Ожидается ;');
    return { type: 'return', value };
  }

  private expressionStatement(): Statement {
    if (this.check('IDENTIFIER') && this.checkNext('ASSIGN')) {
      const target = this.expression(); // Может быть переменной или индексацией
      this.advance(); // пропускаем =
      const value = this.expression();
      this.consume('SEMICOLON', 'Ожидается ; после присваивания');
      return { type: 'assign', target, value };
    }
    // Если это просто выражение (например, вызов функции без ключевого слова)
    const expr = this.expression();
    this.consume('SEMICOLON', `Ожидается ; после выражения на строке ${this.peek().line}`);
    return { type: 'print', value: expr };
  }

  private block(): Statement[] {
    const statements: Statement[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    this.consume('RBRACE', 'Ожидается }');
    return statements;
  }

  private expression(): Expression {
    return this.logicalOr();
  }

  private logicalOr(): Expression {
    let expr = this.logicalAnd();
    while (this.match('ИЛИ')) {
      const operator = this.previous().type;
      const right = this.logicalAnd();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private logicalAnd(): Expression {
    let expr = this.equality();
    while (this.match('И')) {
      const operator = this.previous().type;
      const right = this.equality();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();
    while (this.match('EQUAL', 'NOT_EQUAL')) {
      const operator = this.previous().type;
      const right = this.comparison();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();
    while (this.match('LESS', 'LESS_EQUAL', 'GREATER', 'GREATER_EQUAL')) {
      const operator = this.previous().type;
      const right = this.term();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private term(): Expression {
    let expr = this.factor();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous().type;
      const right = this.factor();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private factor(): Expression {
    let expr = this.unary();
    while (this.match('MULTIPLY', 'DIVIDE', 'MOD')) {
      const operator = this.previous().type;
      const right = this.unary();
      expr = { type: 'binary', operator, left: expr, right };
    }
    return expr;
  }

  private unary(): Expression {
    if (this.match('НЕ', 'MINUS')) {
      const operator = this.previous().type;
      const right = this.unary();
      return { type: 'unary', operator, operand: right };
    }
    return this.call();
  }

  private call(): Expression {
    let expr = this.primary();
    while (true) {
      if (this.match('LPAREN')) {
        const args: Expression[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.expression());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', 'Ожидается )');
        if (expr.type === 'variable') {
          expr = { type: 'call', name: expr.name, args };
        }
      } else if (this.match('LBRACKET')) {
        const index = this.expression();
        this.consume('RBRACKET', 'Ожидается ]');
        expr = { type: 'index', object: expr, index };
      } else {
        break;
      }
    }
    return expr;
  }

  private primary(): Expression {
    if (this.match('BOOLEAN')) {
      return { type: 'boolean', value: this.previous().value as boolean };
    }
    if (this.match('NUMBER')) {
      return { type: 'number', value: this.previous().value as number };
    }
    if (this.match('STRING')) {
      return { type: 'string', value: this.previous().value as string };
    }
    if (this.match('LBRACKET')) {
      // Массив
      const elements: Expression[] = [];
      if (!this.check('RBRACKET')) {
        do {
          elements.push(this.expression());
        } while (this.match('COMMA'));
      }
      this.consume('RBRACKET', 'Ожидается ]');
      return { type: 'array', elements };
    }
    if (this.match('IDENTIFIER')) {
      return { type: 'variable', name: this.previous().value as string };
    }
    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', 'Ожидается )');
      return expr;
    }
    throw new Error(`Ожидается выражение на строке ${this.peek().line}`);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    if (this.tokens[this.current + 1].type === 'EOF') return false;
    return this.tokens[this.current + 1].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const current = this.peek();
    const currentInfo = current ? `Текущий токен: ${current.type}(${current.value || ''})` : 'Конец файла';
    throw new Error(`${message} на строке ${current?.line || '?'}, столбец ${current?.column || '?'}. ${currentInfo}`);
  }
}

