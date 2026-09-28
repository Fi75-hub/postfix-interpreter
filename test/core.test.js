const test = require('node:test');
const assert = require('node:assert/strict');
const { PostfixInterpreter, formatNumericValue } = require('../core');

test('large and small numbers retain their magnitude when displayed', () => {
  assert.equal(formatNumericValue(1e30), '1e+30');
  assert.equal(formatNumericValue(-1e30), '-1e+30');
  assert.equal(formatNumericValue(1e-9), '1e-9');
  assert.equal(formatNumericValue(10), '10');
  assert.equal(formatNumericValue(2.5), '2.5');
});

test('arithmetic follows postfix operand order', () => {
  const examples = [['10 3 * 5 +', 35], ['10 3 -', 7], ['10 2 /', 5],
    ['2 5 ^', 32], ['10 3 MOD', 1], ['-7 ABS', 7], ['81 SQRT', 9]];
  for (const [expression, expected] of examples) {
    const engine = new PostfixInterpreter();
    engine.executeLine(expression);
    assert.deepEqual(engine.evalStack.items, [expected]);
  }
});

test('variables can be assigned, reused and removed', () => {
  const engine = new PostfixInterpreter();
  engine.executeLine('a 3 =');
  assert.equal(engine.executeLine('A 10 ^').output, '[59049]');
  engine.executeLine('A UNSET');
  assert.throws(() => engine.executeLine('A 1 +'), /Undefined variable/);
});

test('stack operations and reset have separate effects', () => {
  const engine = new PostfixInterpreter();
  engine.executeLine('A 4 = 1 2 OVER SWAP DUP DROP');
  assert.deepEqual(engine.evalStack.items, [1, 1, 2]);
  engine.executeLine('CLEAR');
  assert.deepEqual(engine.evalStack.items, []);
  assert.equal(engine.symbolTable.getVariable('A'), 4);
  engine.resetInterpreter();
  assert.throws(() => engine.symbolTable.getVariable('A'), /Undefined variable/);
});

test('a failed line restores the previous stack and variable values', () => {
  const engine = new PostfixInterpreter();
  engine.executeLine('A 2 = 5');
  for (const expression of ['0 /', 'A 7 = 1 0 /', 'A UNSET UNKNOWN', 'DROP +', '-1 SQRT']) {
    assert.throws(() => engine.executeLine(expression));
    assert.deepEqual(engine.evalStack.items, [5]);
    assert.equal(engine.symbolTable.getVariable('A'), 2);
  }
});
