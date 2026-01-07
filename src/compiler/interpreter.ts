// Интерпретатор - выполняет AST

import { Expression, Statement, Value, Program } from './types';

export class Interpreter {
  private variables: Map<string, Value> = new Map();
  private functions: Map<string, { params: string[]; body: Statement[] }> = new Map();
  private output: string[] = [];
  private returnValue: Value = null;
  private inputCallback?: (prompt: string) => Promise<string>;

  constructor(inputCallback?: (prompt: string) => Promise<string>) {
    this.inputCallback = inputCallback;
    // Встроенные функции
    this.functions.set('математика', {
      params: ['операция', 'а', 'б'],
      body: []
    });
  }

  async interpret(program: Program): Promise<string[]> {
    this.output = [];
    try {
      for (const statement of program.statements) {
        await this.execute(statement);
      }
    } catch (error) {
      this.output.push(`Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    }
    return this.output;
  }

  private async execute(statement: Statement): Promise<void> {
    switch (statement.type) {
      case 'let':
        // Для let тоже нужно обработать индексацию
        if (statement.value.type === 'index') {
          throw new Error('Нельзя использовать индексацию при объявлении переменной');
        }
        this.variables.set(statement.name, await this.evaluate(statement.value));
        break;
      case 'assign':
        await this.assignValue(statement.target, await this.evaluate(statement.value));
        break;
      case 'if':
        if (this.isTruthy(await this.evaluate(statement.condition))) {
          await this.executeBlock(statement.thenBranch);
        } else if (statement.elseBranch) {
          await this.executeBlock(statement.elseBranch);
        }
        break;
      case 'while':
        while (this.isTruthy(await this.evaluate(statement.condition))) {
          await this.executeBlock(statement.body);
        }
        break;
      case 'for':
        // Инициализация
        if (statement.init) {
          await this.execute(statement.init);
        }
        // Цикл
        while (statement.condition === undefined || this.isTruthy(await this.evaluate(statement.condition))) {
          await this.executeBlock(statement.body);
          // Шаг
          if (statement.increment) {
            await this.evaluate(statement.increment);
          }
        }
        break;
      case 'foreach': {
        const array = await this.evaluate(statement.array);
        if (!Array.isArray(array)) {
          throw new Error('Цикл "для каждого" работает только с массивами');
        }
        const arr = array as Value[];
        for (const element of arr) {
          // Сохраняем текущее значение переменной
          const oldValue = this.variables.get(statement.variable);
          this.variables.set(statement.variable, element);
          await this.executeBlock(statement.body);
          // Восстанавливаем значение, если оно было
          if (oldValue !== undefined) {
            this.variables.set(statement.variable, oldValue);
          } else {
            this.variables.delete(statement.variable);
          }
        }
        break;
      }
      case 'print':
        const value = await this.evaluate(statement.value);
        this.output.push(this.stringify(value));
        break;
      case 'input':
        if (!this.inputCallback) {
          throw new Error('Функция ввода не настроена');
        }
        const inputValue = await this.inputCallback(`Введите значение для ${statement.variable}:`);
        // Пытаемся преобразовать в число, если не получается - оставляем строкой
        const numValue = Number(inputValue);
        const finalValue = isNaN(numValue) ? inputValue : numValue;
        // Если переменная не существует, создаем её
        this.variables.set(statement.variable, finalValue);
        break;
      case 'function':
        this.functions.set(statement.name, {
          params: statement.params,
          body: statement.body,
        });
        break;
      case 'return':
        this.returnValue = statement.value ? await this.evaluate(statement.value) : null;
        break;
      case 'block':
        await this.executeBlock(statement.statements);
        break;
    }
  }

  private async executeBlock(statements: Statement[]): Promise<void> {
    for (const statement of statements) {
      await this.execute(statement);
      if (this.returnValue !== null) {
        break;
      }
    }
  }

  private async evaluate(expr: Expression): Promise<Value> {
    switch (expr.type) {
      case 'number':
        return expr.value;
      case 'string':
        return expr.value;
      case 'boolean':
        return expr.value;
      case 'variable':
        if (!this.variables.has(expr.name)) {
          throw new Error(`Переменная ${expr.name} не определена`);
        }
        return this.variables.get(expr.name)!;
      case 'array': {
        const arrayElements: Value[] = [];
        for (const element of expr.elements) {
          arrayElements.push(await this.evaluate(element));
        }
        return arrayElements;
      }
      case 'index':
        return await this.evaluateIndex(expr);
      case 'binary':
        return await this.evaluateBinary(expr);
      case 'unary':
        return await this.evaluateUnary(expr);
      case 'call':
        return await this.evaluateCall(expr);
    }
  }

  private async evaluateIndex(expr: { object: Expression; index: Expression }): Promise<Value> {
    const object = await this.evaluate(expr.object);
    const index = await this.evaluate(expr.index);

    if (!Array.isArray(object)) {
      throw new Error('Индексация возможна только для массивов');
    }

    if (typeof index !== 'number') {
      throw new Error('Индекс должен быть числом');
    }

    const array = object as Value[];
    if (index < 0 || index >= array.length) {
      throw new Error(`Индекс ${index} выходит за границы массива (длина: ${array.length})`);
    }

    return array[index];
  }

  private async assignValue(target: Expression, value: Value): Promise<void> {
    if (target.type === 'variable') {
      if (!this.variables.has(target.name)) {
        throw new Error(`Переменная ${target.name} не объявлена`);
      }
      this.variables.set(target.name, value);
    } else if (target.type === 'index') {
      // Присваивание элементу массива
      await this.assignToIndex(target, value);
    } else {
      throw new Error('Можно присваивать только переменным или элементам массивов');
    }
  }

  private async assignToIndex(indexExpr: { type: 'index'; object: Expression; index: Expression }, value: Value): Promise<void> {
    if (indexExpr.object.type === 'variable') {
      const array = this.variables.get(indexExpr.object.name);
      if (!Array.isArray(array)) {
        throw new Error(`Переменная ${indexExpr.object.name} не является массивом`);
      }

      const index = await this.evaluate(indexExpr.index);
      if (typeof index !== 'number') {
        throw new Error('Индекс должен быть числом');
      }

      const arr = array as Value[];
      if (index < 0 || index >= arr.length) {
        throw new Error(`Индекс ${index} выходит за границы массива (длина: ${arr.length})`);
      }

      arr[index] = value;
    } else if (indexExpr.object.type === 'index') {
      // Многомерный массив
      const innerArray = await this.evaluateIndex(indexExpr.object) as Value[];
      if (!Array.isArray(innerArray)) {
        throw new Error('Вложенный элемент не является массивом');
      }

      const index = await this.evaluate(indexExpr.index);
      if (typeof index !== 'number') {
        throw new Error('Индекс должен быть числом');
      }

      if (index < 0 || index >= innerArray.length) {
        throw new Error(`Индекс ${index} выходит за границы массива (длина: ${innerArray.length})`);
      }

      innerArray[index] = value;
    } else {
      throw new Error('Присваивание возможно только элементам массивов');
    }
  }

  private async evaluateBinary(expr: { operator: string; left: Expression; right: Expression }): Promise<Value> {
    const left = await this.evaluate(expr.left);
    const right = await this.evaluate(expr.right);

    switch (expr.operator) {
      case 'PLUS':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return (left as number) + (right as number);
      case 'MINUS':
        return (left as number) - (right as number);
      case 'MULTIPLY':
        return (left as number) * (right as number);
      case 'DIVIDE':
        if (right === 0) throw new Error('Деление на ноль');
        return (left as number) / (right as number);
      case 'MOD':
        return (left as number) % (right as number);
      case 'EQUAL':
        return left === right;
      case 'NOT_EQUAL':
        return left !== right;
      case 'LESS':
        return (left as number) < (right as number);
      case 'LESS_EQUAL':
        return (left as number) <= (right as number);
      case 'GREATER':
        return (left as number) > (right as number);
      case 'GREATER_EQUAL':
        return (left as number) >= (right as number);
      case 'И':
        return this.isTruthy(left) && this.isTruthy(right);
      case 'ИЛИ':
        return this.isTruthy(left) || this.isTruthy(right);
      default:
        throw new Error(`Неизвестный оператор: ${expr.operator}`);
    }
  }

  private async evaluateUnary(expr: { operator: string; operand: Expression }): Promise<Value> {
    const right = await this.evaluate(expr.operand);

    switch (expr.operator) {
      case 'НЕ':
        return !this.isTruthy(right);
      case 'MINUS':
        return -(right as number);
      default:
        throw new Error(`Неизвестный унарный оператор: ${expr.operator}`);
    }
  }

  private async evaluateCall(expr: { name: string; args: Expression[] }): Promise<Value> {
    const func = this.functions.get(expr.name);
    if (!func) {
      throw new Error(`Функция ${expr.name} не определена`);
    }

    if (expr.args.length !== func.params.length) {
      throw new Error(`Ожидается ${func.params.length} аргументов, получено ${expr.args.length}`);
    }

    // Сохраняем текущее состояние
    const oldVariables = new Map(this.variables);
    const oldReturnValue = this.returnValue;
    this.returnValue = null;

    // Создаем локальные переменные для параметров
    for (let i = 0; i < func.params.length; i++) {
      this.variables.set(func.params[i], await this.evaluate(expr.args[i]));
    }

    // Выполняем тело функции
    await this.executeBlock(func.body);

    // Восстанавливаем состояние
    const result = this.returnValue;
    this.variables = oldVariables;
    this.returnValue = oldReturnValue;

    return result !== null ? result : null;
  }

  private isTruthy(value: Value): boolean {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private stringify(value: Value): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'истина' : 'ложь';
    if (Array.isArray(value)) {
      return '[' + value.map(v => this.stringify(v)).join(', ') + ']';
    }
    return String(value);
  }
}

