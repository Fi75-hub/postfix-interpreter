// Browser UI for the Postfix++ interpreter.
// The interpreter logic lives in core.js; this file only deals with DOM + events.

const byId = (id) => document.getElementById(id);

// One shared interpreter instance for the whole page session.
const engine = new PostfixInterpreter();

// DOM references
const inputEl = byId("expr");
const runBtn = byId("execBtn");
const resetBtn = byId("clearBtn");

const historyEl = byId("history");
const stackEl = byId("stack");
const varsBodyEl = byId("varsBody");
const statusEl = byId("status");

// keypad containers (right side)
const padDigitsEl = byId("padDigits");
const padOpsEl = byId("padOps");
const padFuncsEl = byId("padFuncs");
const padStackEl = byId("padStack");
const padVarsEl = byId("padVars");

// Small state: how many lines have been executed in this session.
let runCount = 0;

// Pseudocode
// ESCAPE-HTML(text)
// out = empty string
// for i = 1 to LENGTH(text)
// ch = text[i]
// out = out + HTML-ESCAPE(ch)
//    return out
function escapeHtml(text) {
  // Basic HTML escaping so history.
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Pseudocode
//SET-STATUS(message, kind)
//if message is empty
//HIDE status label
//    else
//SHOW status label
//SET label text to message
//SET label style using kind
function setStatus(message, ok) {
  const cls = ok ? "ok" : "bad";
  statusEl.innerHTML = `<b class="${cls}">${escapeHtml(message)}</b>`;
}

function renderStack() {
  stackEl.textContent = engine.evalStack.formatStack();
}

// Pseudocode
// RENDER-VARIABLES(engine)
// CLEAR variables table body
//vars = engine.symbolTable.getAllVariables()
// if vars is empty
// SHOW 'No variables assigned'
//    else
//for each (name, value) in vars
//ADD table row with name and value
function renderVariables() {
  varsBodyEl.innerHTML = "";

  const allVars = engine.symbolTable.getAllVariables();
  if (allVars.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>—</td><td class="muted">No variables assigned</td>`;
    varsBodyEl.appendChild(tr);
    return;
  }

  for (let i = 0; i < allVars.length; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${allVars[i].name}</td><td>${escapeHtml(formatNumericValue(allVars[i].value))}</td>`;
    varsBodyEl.appendChild(row);
  }
}

// Pseudocode
// ADD-HISTORY-CARD(lineText, resultText, noteText)
// CREATE a new history element
// INSERT lineText and resultText
// if noteText exists
// INSERT noteText
// APPEND element to history panel
function addHistoryCard(inputLine, stackOut, ok, note) {
  // A small "card" element at the top of the history list.
  const card = document.createElement("div");
  card.className = `hCard ${ok ? "hOk" : "hBad"}`;

  const header = document.createElement("div");
  header.className = "hHead";
  header.innerHTML =
    `<div class="mono">${escapeHtml(inputLine)}</div>` +
    `<div class="tag ${ok ? "tag-ok" : "tag-bad"}">${ok ? "OK" : "ERR"}</div>`;

  const body = document.createElement("div");
  body.className = "hBody";
  body.innerHTML = `<div><span class="muted">Stack:</span> <span class="mono">${escapeHtml(stackOut)}</span></div>`;

  card.appendChild(header);
  card.appendChild(body);

  if (note) {
    const footer = document.createElement("div");
    footer.className = "hFoot";
    footer.innerHTML = `<div class="muted">${escapeHtml(note)}</div>`;
    card.appendChild(footer);
  }

  historyEl.prepend(card);
}

// Pseudocode
// RUN-LINE()
//lineText = READ input field
//if lineText is empty
//   return
//   TRY
//res = engine.executeLine(lineText)
//ADD-HISTORY-CARD(lineText, res.output, res.note)
//RENDER-STACK(engine)
//RENDER-VARIABLES(engine)
//CLEAR input field
//CATCH error
//SET-STATUS(error message, 'error')
function runLine() {
  const line = inputEl.value.trim();
  if (line === "") {
    setStatus("Type an expression first", false);
    return;
  }

  runCount++;

  try {
    const res = engine.executeLine(line);

    renderStack();
    renderVariables();

    addHistoryCard(line, res.output, true, res.note || "");
    setStatus("Executed", true);

    inputEl.value = "";
    inputEl.focus();
  } catch (err) {
    // Keep UI consistent even on errors.
    renderStack();
    renderVariables();

    const msg = err && err.message ? err.message : String(err);
    addHistoryCard(line, engine.evalStack.formatStack(), false, msg);
    setStatus(msg || "Error", false);

    inputEl.focus();
  }
}

// Pseudocode
//RESET-SESSION()
//engine.resetInterpreter()
//CLEAR history panel
//RENDER-STACK(engine)
//RENDER-VARIABLES(engine)
//SET-STATUS('Session cleared', 'info')
function resetSession() {
  // Clear interpreter state + wipe UI history.
  engine.resetInterpreter();
  historyEl.innerHTML = "";
  inputEl.value = "";
  runCount = 0;

  renderStack();
  renderVariables();
  setStatus("Ready", true);

  inputEl.focus();
}

//keypad

function appendChar(ch) {
  inputEl.value = inputEl.value + ch;
  inputEl.focus();
}

// Pseudocode
// INSERT-TOKEN(token)
//if input field is empty
//SET input to token
//else if input ends with space
//APPEND token
//  else
//APPEND space then token
function insertToken(token) {
  // Insert with spacing so tokens stay separated.
  let v = inputEl.value;
  if (v.length > 0 && !/\s$/.test(v)) v += " ";
  v += token + " ";
  inputEl.value = v;
  inputEl.focus();
}

function backspace() {
  const v = inputEl.value;
  if (!v) return;
  inputEl.value = v.slice(0, -1);
  inputEl.focus();
}

function makeButton(label, onClick, className) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className || "keyBtn";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

// Pseudocode
// BUILD-KEYPADS()
// DEFINE button groups (digits, operators, functions, variables)
//for each token in groups
//CREATE button
//ON click, INSERT-TOKEN(token)
//    return OK
function buildKeypads() {
  // Digits / editing pad
  if (padDigitsEl) {
    const digits = ["7","8","9","4","5","6","1","2","3","0",".","SPC"];
    for (let i = 0; i < digits.length; i++) {
      const label = digits[i];
      if (label === "SPC") {
        padDigitsEl.appendChild(makeButton("SPC", () => appendChar(" "), "keyBtn soft"));
      } else {
        padDigitsEl.appendChild(makeButton(label, () => appendChar(label)));
      }
    }

    padDigitsEl.appendChild(makeButton("DEL", backspace, "keyBtn warn"));
    padDigitsEl.appendChild(makeButton("CLR", () => { inputEl.value = ""; inputEl.focus(); }, "keyBtn warn"));
    padDigitsEl.appendChild(makeButton("ENTER", runLine, "keyBtn ok"));
  }

  // Operators pad
  const ops = ["+","-","*","/","^","MOD","=","MIN","MAX"];
  if (padOpsEl) {
    for (let i = 0; i < ops.length; i++) {
      padOpsEl.appendChild(makeButton(ops[i], () => insertToken(ops[i]), "keyBtn"));
    }
    padOpsEl.appendChild(makeButton("PI", () => insertToken("PI"), "keyBtn"));
  }

  // Functions pad
  const funcs = ["ABS","NEG","SQRT","EXP","LN","LOG10","SIN","COS","TAN","FLOOR","CEIL","ROUND","UNSET"];
  if (padFuncsEl) {
    for (let i = 0; i < funcs.length; i++) {
      padFuncsEl.appendChild(makeButton(funcs[i], () => insertToken(funcs[i]), "keyBtn"));
    }
  }

  // Stack ops pad
  const stackOps = ["DUP","SWAP","OVER","DROP","CLEAR"];
  if (padStackEl) {
    for (let i = 0; i < stackOps.length; i++) {
      padStackEl.appendChild(makeButton(stackOps[i], () => insertToken(stackOps[i]), "keyBtn"));
    }
  }

  // Variables pad (A..Z)
  if (padVarsEl) {
    for (let code = 65; code <= 90; code++) {
      const letter = String.fromCharCode(code);
      padVarsEl.appendChild(makeButton(letter, () => insertToken(letter), "keyBtn tiny"));
    }
  }
}

//event wiring
runBtn.addEventListener("click", runLine);
resetBtn.addEventListener("click", resetSession);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runLine();
});

// init
buildKeypads();
renderStack();
renderVariables();
setStatus("Ready", true);
inputEl.focus();
