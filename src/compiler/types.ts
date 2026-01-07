// Типы для AST (абстрактное синтаксическое дерево)

export type Value = number | string | boolean | null | Value[];

export interface Variable {
  name: string;
  value: Value;
}

export type Expression = 
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'variable'; name: string }
  | { type: 'array'; elements: Expression[] }
  | { type: 'index'; object: Expression; index: Expression }
  | { type: 'binary'; operator: string; left: Expression; right: Expression }
  | { type: 'unary'; operator: string; operand: Expression }
  | { type: 'call'; name: string; args: Expression[] };

export type Statement =
  | { type: 'let'; name: string; value: Expression }
  | { type: 'assign'; target: Expression; value: Expression }
  | { type: 'if'; condition: Expression; thenBranch: Statement[]; elseBranch?: Statement[] }
  | { type: 'while'; condition: Expression; body: Statement[] }
  | { type: 'for'; init?: Statement; condition?: Expression; increment?: Expression; body: Statement[] }
  | { type: 'foreach'; variable: string; array: Expression; body: Statement[] }
  | { type: 'print'; value: Expression }
  | { type: 'input'; variable: string }
  | { type: 'function'; name: string; params: string[]; body: Statement[] }
  | { type: 'return'; value?: Expression }
  | { type: 'block'; statements: Statement[] };

export interface Program {
  statements: Statement[];
}

