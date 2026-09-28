# Postfix++ Interpreter

A stack-based expression interpreter with a browser interface and a Node.js command-line interface. Both interfaces use the same JavaScript evaluation engine.

## Features

- Evaluate postfix arithmetic, such as `10 3 * 5 +`.
- Assign variables in a fixed A–Z namespace and reuse them in expressions.
- Use trigonometric, logarithmic, rounding and other numeric functions.
- Manipulate the stack with `DUP`, `SWAP`, `OVER`, `DROP` and `CLEAR`.
- Receive errors for undefined variables, stack underflow and invalid numeric operations.

The implementation uses an array-backed stack and two fixed-size arrays for variable values and definition flags.

## Run

**Browser:** open `index.html` in a modern browser. The page uses local JavaScript files and does not require a package installation.

**Command line:** install Node.js, open a terminal in this folder and run:

```sh
node cli.js
```

Enter these lines separately:

```text
10 3 * 5 +
RESET
A 3 =
A 10 ^
EXIT
```

The first expression produces `[35]`; the variable expression produces `[59049]`. The leftmost displayed stack item is the top. `RESET` clears both variables and stack; `CLEAR` clears the stack only.

## Structure

| File | Purpose |
| --- | --- |
| `core.js` | Tokenisation, stack, symbol table and evaluator |
| `app.js` | Browser interface behaviour |
| `index.html` | Browser layout and styles |
| `cli.js` | Interactive terminal interface |

## Project context

A University of London Computer Science coursework project associated with Algorithms and Data Structures II. The available files do not establish its precise assessment stage.

This is an educational interpreter, with a deliberately small language. An invalid expression can modify the stack before raising an error; use `RESET` for a fresh session.
