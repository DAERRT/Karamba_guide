// Главный файл компилятора

import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter } from './interpreter';
import { Program } from './types';

export class KarambaCompiler {
  private lexer: Lexer;
  private parser: Parser;
  private interpreter: Interpreter;

  constructor(source: string, inputCallback?: (prompt: string) => Promise<string>) {
    this.lexer = new Lexer(source);
    this.interpreter = new Interpreter(inputCallback);
    const tokens = this.lexer.tokenize();
    // Отладка: выводим первые несколько токенов
    if (tokens.length > 0 && tokens[0].type !== 'EOF') {
      console.log('Первые токены:', tokens.slice(0, 10).map(t => `${t.type}(${t.value || ''})`));
    }
    this.parser = new Parser(tokens);
  }

  compile(): Program {
    return this.parser.parse();
  }

  async run(): Promise<string[]> {
    const program = this.compile();
    return await this.interpreter.interpret(program);
  }
}

export { Lexer } from './lexer';
export { Parser } from './parser';
export { Interpreter } from './interpreter';
export type { Program, Statement, Expression, Value } from './types';

