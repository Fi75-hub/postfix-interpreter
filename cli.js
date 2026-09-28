// Node.js command-line runner for the Postfix++ interpreter.
// It uses the same core.js as the browser version, so behaviour matches exactly.

const readline = require("readline");
const { PostfixInterpreter } = require("./core");

const engine = new PostfixInterpreter();

function printIntro() {
  console.log("Postfix++ CLI");
  console.log("Type expressions as tokens separated by spaces (postfix notation).");
  console.log('Examples: "10 3 * 5 +" | "A 3 =" then "A 10 ^"');
  console.log("Stack ops: DUP SWAP OVER DROP CLEAR");
  console.log("Functions: ABS NEG SQRT EXP LN LOG10 SIN COS TAN FLOOR CEIL ROUND");
  console.log("Other: MOD MIN MAX PI UNSET");
  console.log("Commands: RESET, EXIT");
  console.log("");
}


function printStack() {
  console.log(engine.evalStack.formatStack());
}

printIntro();
printStack();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.prompt();

rl.on("line", (line) => {
  const trimmed = String(line).trim();
  if (trimmed === "") {
    rl.prompt();
    return;
  }

  const cmd = trimmed.toUpperCase();

  if (cmd === "EXIT" || cmd === "QUIT") {
    rl.close();
    return;
  }

  if (cmd === "RESET") {
    engine.resetInterpreter();
    console.log("Reset.");
    printStack();
    rl.prompt();
    return;
  }

  try {
    const res = engine.executeLine(line);
    if (res.note) console.log(res.note);
    printStack();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.log("Error: " + msg);
    printStack();
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("Bye.");
  process.exit(0);
});
