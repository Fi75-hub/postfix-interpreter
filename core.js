//Postfix++ interpreter core.
// Numbers Formatting
function formatNumericValue(x) {
  if (typeof x !== "number") return String(x);
  if (!Number.isFinite(x)) return String(x);

  const fixed = x.toFixed(8);
  return fixed.replace(/\.?0+$/, "");
}

//Helpers 

function listHas(list, value) {
  // Avoid Array.includes().
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) return true;
  }
  return false;
}

// Pseudocode
// IS-VAR-NAME(token)
// if LENGTH(token) ≠ 1
//     return false
// ch = TO-UPPERCASE(token[1])
// if 'A' ≤ ch ≤ 'Z'
//     return true
//    return false
function isVarName(token) {
  // Variables are a single letter: A..Z
  return typeof token === "string" && token.length === 1 && token >= "A" && token <= "Z";
}

function isNumberToken(token) {
  const n = Number(token);
  return token !== "" && Number.isFinite(n);
}

 //Tokenise an input line into whitespace-separated tokens.
 
// Pseudocode
// TOKENIZE-LINE(line)
//src = TO-STRING(line)
//out = empty list
//buf = empty string
// for i = 1 to LENGTH(src)
//ch = src[i]
//if ch is whitespace
//if buf ≠ empty
// APPEND buf to out
// buf = empty string
//      else
// buf = buf + ch
// if buf ≠ empty
// APPEND buf to out
//    return out
function tokenizeLine(line) {
  const src = String(line ?? "");
  const out = [];

  let buf = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    // basic whitespace handling
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (buf !== "") {
        out[out.length] = buf;
        buf = "";
      }
      continue;
    }

    buf += ch;
  }

  if (buf !== "") out[out.length] = buf;
  return out;
}

 //Evaluation Stack

// Pseudocode
// INIT-EVALUATION-STACK()
//stack.items = empty array
//    return stack
class EvaluationStack {
  constructor() {
    // Top is stored at the end of the array.
    this.items = [];
  }

  // PUSH(value)
  pushValue(value) {
    this.items[this.items.length] = value;
  }

  // POP() -> value
  popValue() {
    if (this.items.length === 0) {
      throw new Error("Stack underflow: not enough operands.");
    }
    const value = this.items[this.items.length - 1];
    this.items.length--;
    return value;
  }

// Pseudocode
// RESET-STACK(stack)
// stack.items = empty array
//    return OK
  reset() {
    this.items.length = 0;
  }

  
  //Format as [top ... bottom] where the leftmost item is the top.
  formatStack() {
    if (this.items.length === 0) return "[]";

    const parts = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      parts[parts.length] = formatNumericValue(this.items[i]);
    }
    return "[" + parts.join(" ") + "]";
  }
}

 //Symbol Table

// Pseudocode
// INIT-SYMTAB()
//table.values = new array of size 26
//table.defined = new array of size 26
//for i = 1 to 26
//table.defined[i] = false
// table.values[i] = 0
//    return table
class SymbolTable {
  constructor() {
    // Fixed A–Z namespace: store "defined?" and "value" in parallel arrays.
    this.defined = new Array(26);
    this.values = new Array(26);
    this.resetTable();
  }

// Pseudocode
// RESET-TABLE(table)
//for i = 1 to 26
//table.defined[i] = false
//table.values[i] = 0
//    return OK
  resetTable() {
    for (let i = 0; i < 26; i++) {
      this.defined[i] = false;
      this.values[i] = 0;
    }
  }

  _indexOfName(varName) {
    if (typeof varName !== "string" || varName.length !== 1) return -1;
    const code = varName.charCodeAt(0);
    if (code < 65 || code > 90) return -1; // 'A'..'Z'
    return code - 65;
  }

// Pseudocode
// SYMTAB-SET(table, name, value)
//idx = NAME-TO-INDEX(name)
//table.values[idx] = value
// table.defined[idx] = true
//return OK
  setVariable(varName, numericValue) {
    const idx = this._indexOfName(varName);
    if (idx < 0) throw new Error(`Invalid variable "${varName}". Use A–Z.`);
    if (!Number.isFinite(numericValue)) throw new Error(`Cannot store non-finite value in ${varName}.`);

    this.defined[idx] = true;
    this.values[idx] = numericValue;
  }

// Pseudocode
// SYMTAB-GET(table, name)
// idx = NAME-TO-INDEX(name)
// if table.defined[idx] = false
// return ERROR('Undefined variable')
//return table.values[idx]
  getVariable(varName) {
    const idx = this._indexOfName(varName);
    if (idx < 0) throw new Error(`Invalid variable "${varName}". Use A–Z.`);
    if (!this.defined[idx]) {
      throw new Error(
        `Undefined variable "${varName}". Assign it first (e.g., ${varName} 3 =).`
      );
    }
    return this.values[idx];
  }

// Pseudocode
// SYMTAB-UNSET(table, name)
// idx = NAME-TO-INDEX(name)
//table.defined[idx] = false
//table.values[idx] = 0
//   return OK
  unsetVariable(varName) {
    const idx = this._indexOfName(varName);
    if (idx < 0) throw new Error(`Invalid variable "${varName}". Use A–Z.`);

    this.defined[idx] = false;
    this.values[idx] = 0;
  }

  getAllVariables() {
    const rows = [];
    for (let i = 0; i < 26; i++) {
      if (this.defined[i]) {
        rows[rows.length] = { name: String.fromCharCode(65 + i), value: this.values[i] };
      }
    }
    return rows;
  }
}

  //Interpreter

// Pseudocode
// INIT-INTERPRETER()
//interpreter.evalStack = INIT-EVALUATION-STACK()
//interpreter.symbolTable = INIT-SYMTAB()
//interpreter.unaryOps = list of supported unary ops
//interpreter.binaryOps = list of supported binary ops
//interpreter.stackOps = list of supported stack ops
//    return interpreter
class PostfixInterpreter {
  constructor() {
    this.evalStack = new EvaluationStack();
    this.symbolTable = new SymbolTable();

    // Supported language tokens (kept as arrays for simple lookup)
    this.unaryOps  = ["ABS", "LN", "LOG10", "COS", "SIN", "TAN", "SQRT", "EXP", "NEG", "FLOOR", "CEIL", "ROUND"];
    this.binaryOps = ["+", "-", "*", "/", "^", "MOD", "MIN", "MAX"];
    this.stackOps  = ["DUP", "SWAP", "DROP", "OVER", "CLEAR"];
  }

// Pseudocode
// RESET-INTERPRETER(interpreter)
// RESET-STACK(interpreter.evalStack)
// RESET-TABLE(interpreter.symbolTable)
//    return OK
  resetInterpreter() {
    this.evalStack.reset();
    this.symbolTable.resetTable();
  }

  
   //Evaluate one line of Postfix++.
  executeLine(inputLine) {
    const line = String(inputLine ?? "").trim();

    if (line === "") return { output: this.evalStack.formatStack(), note: "Empty line" };
    if (line.startsWith("//") || line.startsWith("#")) {
      return { output: this.evalStack.formatStack(), note: "Comment ignored" };
    }

    const tokens = tokenizeLine(line);

    for (let i = 0; i < tokens.length; i++) {
      const tokenText = tokens[i].trim();
      if (tokenText === "") continue;

      // 1) numeric literals
      if (isNumberToken(tokenText)) {
        this.evalStack.pushValue(Number(tokenText));
        continue;
      }

      // 2) variables: allow lowercase input, but store/operate as uppercase
      if (tokenText.length === 1) {
        const name = tokenText.toUpperCase();
        if (isVarName(name)) {
          this.evalStack.pushValue(name);
          continue;
        }
      }

      // 3) everything else is treated as an operator/function keyword
      const op = tokenText.toUpperCase();

      // constants
      if (op === "PI") {
        this.evalStack.pushValue(Math.PI);
        continue;
      }

      // assignment
      if (op === "=") {
        this._handleAssignment();
        continue;
      }

      // symbol table delete
      if (op === "UNSET") {
        this._handleUnset();
        continue;
      }

      // stack manipulation
      if (listHas(this.stackOps, op)) {
        this._applyStackOperator(op);
        continue;
      }

      // maths
      if (listHas(this.unaryOps, op)) {
        this._applyUnaryOperator(op);
        continue;
      }
      if (listHas(this.binaryOps, op)) {
        this._applyBinaryOperator(op);
        continue;
      }

      throw new Error(`Unknown token/operator "${tokenText}".`);
    }

    return { output: this.evalStack.formatStack() };
  }

// Pseudocode
// RESOLVE-OPERAND(interpreter, stackItem)
// if TYPEOF(stackItem) = number
//        return stackItem
// if TYPEOF(stackItem) = string AND IS-VAR-NAME(stackItem)
//      return SYMTAB-GET(interpreter.symbolTable, stackItem)
//    return ERROR('Operand is not a number or variable')
  _resolveOperand(stackItem) {
    // Numbers are used directly; variables are looked up in the symbol table.
    if (typeof stackItem === "number") return stackItem;
    if (typeof stackItem === "string" && isVarName(stackItem)) return this.symbolTable.getVariable(stackItem);
    throw new Error(`Invalid operand "${String(stackItem)}".`);
  }

// Pseudocode
// HANDLE-ASSIGNMENT(interpreter)
// expects: [ ... , varName , value ] then '=' token
// valueItem = POP-VALUE(interpreter.evalStack)
// nameItem  = POP-VALUE(interpreter.evalStack)
// if nameItem is not a variable name
//      return ERROR('Left side must be a variable')
// value = RESOLVE-OPERAND(interpreter, valueItem)
// SYMTAB-SET(interpreter.symbolTable, nameItem, value)
//    return OK
  _handleAssignment() {
    // Expect: [  <varName> <value> ] then '='
    const valueItem = this.evalStack.popValue();
    const nameItem = this.evalStack.popValue();

    const numericValue = this._resolveOperand(valueItem);

    if (typeof nameItem !== "string" || !isVarName(nameItem)) {
      throw new Error(
        `Assignment requires a variable name A–Z under the value. Got "${String(nameItem)}".`
      );
    }
    this.symbolTable.setVariable(nameItem, numericValue);
  }

// Pseudocode
// HANDLE-UNSET(interpreter)
// nameItem = POP-VALUE(interpreter.evalStack)
// if nameItem is not a variable name
//      return ERROR('UNSET expects a variable')
// SYMTAB-UNSET(interpreter.symbolTable, nameItem)
//    return OK
  _handleUnset() {
    // Expect: [  <varName> ] then 'UNSET'
    const nameItem = this.evalStack.popValue();
    if (typeof nameItem !== "string" || !isVarName(nameItem)) {
      throw new Error(
        `UNSET requires a variable name A–Z on top of the stack. Got "${String(nameItem)}".`
      );
    }
    this.symbolTable.unsetVariable(nameItem);
  }

// Pseudocode
// APPLY-STACK-OP(op, interpreter)
//    if op = 'CLEAR'
//        RESET-STACK(interpreter.evalStack)
//        return OK
//    if op = 'DROP'
//        POP-VALUE(interpreter.evalStack)
//        return OK
//    if op = 'DUP'
//        x = POP-VALUE(interpreter.evalStack)
//        PUSH-VALUE(interpreter.evalStack, x)
//        PUSH-VALUE(interpreter.evalStack, x)
//        return OK
//    if op = 'SWAP'
//        b = POP-VALUE(interpreter.evalStack)
//        a = POP-VALUE(interpreter.evalStack)
//        PUSH-VALUE(interpreter.evalStack, b)
//        PUSH-VALUE(interpreter.evalStack, a)
//        return OK
//    if op = 'OVER'
//         copy second item to top
//        second = SECOND-FROM-TOP(interpreter.evalStack)
//        PUSH-VALUE(interpreter.evalStack, second)
//        return OK
//    return ERROR('Unknown stack op')
  _applyStackOperator(op) {
    const s = this.evalStack.items;

    if (op === "CLEAR") {
      this.evalStack.reset();
      return;
    }
    if (op === "DROP") {
      this.evalStack.popValue();
      return;
    }

    if (s.length < 1) throw new Error("Stack underflow: not enough operands.");

    switch (op) {
      case "DUP":
        // duplicate top item
        s[s.length] = s[s.length - 1];
        break;

      case "SWAP":
        if (s.length < 2) throw new Error("Stack underflow: not enough operands.");
        {
          const top = s[s.length - 1];
          s[s.length - 1] = s[s.length - 2];
          s[s.length - 2] = top;
        }
        break;

      case "OVER":
        if (s.length < 2) throw new Error("Stack underflow: not enough operands.");
        // copy second-from-top to top
        s[s.length] = s[s.length - 2];
        break;

      default:
        throw new Error(`Stack operator not implemented: ${op}`);
    }
  }

// Pseudocode
// APPLY-UNARY(op, interpreter)
// xItem = POP-VALUE(interpreter.evalStack)
// x = RESOLVE-OPERAND(interpreter, xItem)
// result = COMPUTE-UNARY(op, x)
// PUSH-VALUE(interpreter.evalStack, result)
//   return OK
  _applyUnaryOperator(op) {
    const operandItem = this.evalStack.popValue();
    const a = this._resolveOperand(operandItem);

    let result;

    switch (op) {
      case "ABS":   result = Math.abs(a); break;
      case "NEG":   result = -a; break;

      case "LN":
        if (a <= 0) throw new Error("LN requires input > 0.");
        result = Math.log(a);
        break;

      case "LOG10":
        if (a <= 0) throw new Error("LOG10 requires input > 0.");
        result = Math.log10 ? Math.log10(a) : (Math.log(a) / Math.log(10));
        break;

      case "COS":   result = Math.cos(a); break;
      case "SIN":   result = Math.sin(a); break;
      case "TAN":   result = Math.tan(a); break;

      case "SQRT":
        if (a < 0) throw new Error("SQRT requires input >= 0.");
        result = Math.sqrt(a);
        break;

      case "EXP":   result = Math.exp(a); break;
      case "FLOOR": result = Math.floor(a); break;
      case "CEIL":  result = Math.ceil(a); break;
      case "ROUND": result = Math.round(a); break;

      default:
        throw new Error(`Unary operator not implemented: ${op}`);
    }

    if (!Number.isFinite(result)) throw new Error(`${op} produced a non-finite result.`);
    this.evalStack.pushValue(result);
  }

// Pseudocode
// APPLY-BINARY(op, interpreter)
// bItem = POP-VALUE(interpreter.evalStack)
// aItem = POP-VALUE(interpreter.evalStack)
// b = RESOLVE-OPERAND(interpreter, bItem)
// a = RESOLVE-OPERAND(interpreter, aItem)
// result = COMPUTE-BINARY(op, a, b)
// PUSH-VALUE(interpreter.evalStack, result)
//    return OK
  _applyBinaryOperator(op) {
    const rhsItem = this.evalStack.popValue();
    const lhsItem = this.evalStack.popValue();

    const b = this._resolveOperand(rhsItem);
    const a = this._resolveOperand(lhsItem);

    let result;

    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": result = a * b; break;

      case "/":
        if (b === 0) throw new Error("Division by zero.");
        result = a / b;
        break;

      case "^":
        result = Math.pow(a, b);
        break;

      case "MOD":
        if (b === 0) throw new Error("MOD by zero.");
        result = a % b;
        break;

      case "MIN": result = Math.min(a, b); break;
      case "MAX": result = Math.max(a, b); break;

      default:
        throw new Error(`Binary operator not implemented: ${op}`);
    }

    if (!Number.isFinite(result)) throw new Error(`${op} produced a non-finite result.`);
    this.evalStack.pushValue(result);
  }
}

 //Exports (Node / Web) 

(function () {
  const api = {
    EvaluationStack,
    SymbolTable,
    PostfixInterpreter,
    formatNumericValue
  };

  // Node
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  // Browser globals
  if (typeof window !== "undefined") {
    window.PostfixInterpreter = PostfixInterpreter;
    window.formatNumericValue = formatNumericValue;
    window.PostfixPP = api;
  }
})();
