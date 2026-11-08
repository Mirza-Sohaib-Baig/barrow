"use strict";

// Project hook for the 8x assignment capture.
// beforeSubmitPrompt appends the user prompt.
// afterAgentResponse keeps the latest assistant text for that generation.
// stop appends that text once, as the final response.
// Thinking, tool calls, and intermediate steps are not hooked.

const fs = require("fs");
const path = require("path");

const AUTHOR = "Mirza Sohaib Baig";
const TOOL = "cursor";
const PROJECT = "8x-amazon-reimagined";

function readStdinBuffer() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks)));
    process.stdin.on("error", reject);
  });
}

function decodeBuffer(buf) {
  if (!buf || buf.length === 0) return "";
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString("utf16le");
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString("utf8");
  }
  let zeros = 0;
  const sample = Math.min(buf.length, 80);
  for (let i = 1; i < sample; i += 2) {
    if (buf[i] === 0) zeros += 1;
  }
  if (zeros > sample / 8) return buf.toString("utf16le").replace(/^\uFEFF/, "");
  return buf.toString("utf8").replace(/^\uFEFF/, "");
}

function nowIso() {
  return new Date().toISOString();
}

function modelName(payload) {
  const model = typeof payload.model === "string" ? payload.model.trim() : "";
  const modelId = typeof payload.model_id === "string" ? payload.model_id.trim() : "";
  if (model) return model;
  if (modelId) return modelId;
  return "unknown";
}

function shortId(conversationId) {
  const clean = String(conversationId || "unknown").replace(/[^A-Za-z0-9]/g, "");
  return (clean || "unknown").slice(0, 8);
}

function safeId(value) {
  const id = String(value || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
  return id || "unknown";
}

function normalizeRoot(root) {
  if (typeof root !== "string") return "";
  const trimmed = root.trim();
  if (!trimmed) return "";
  // Cursor sends Windows roots as /c:/Project, which Node joins to \c:\Project.
  const msys = /^[\\/]([a-zA-Z]):[\\/](.*)$/.exec(trimmed);
  if (!msys) return trimmed;
  return `${msys[1].toUpperCase()}:\\${msys[2].replace(/\//g, "\\")}`;
}

function workspaceRoot(payload) {
  const roots = Array.isArray(payload.workspace_roots) ? payload.workspace_roots : [];
  for (const candidate of roots) {
    const normalized = normalizeRoot(candidate);
    if (normalized && fs.existsSync(normalized)) return normalized;
  }
  return process.cwd();
}

function stateDir(root) {
  return path.join(root, ".cursor", "hooks", ".state");
}

function logsDir(root) {
  return path.join(root, ".agent-logs");
}

function statePath(root, conversationId) {
  return path.join(stateDir(root), `${safeId(conversationId)}.json`);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function logError(root, error) {
  try {
    const base = root && fs.existsSync(root) ? root : process.cwd();
    const dir = stateDir(base);
    fs.mkdirSync(dir, { recursive: true });
    const line = `${nowIso()} ${error && error.stack ? error.stack : error}\n`;
    fs.appendFileSync(path.join(dir, "errors.log"), line, "utf8");
  } catch {
    // A logging failure must not block the prompt.
  }
}

function formatStamp(iso) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "unknown-time";
  return `${match[1]}_${match[2]}-${match[3]}-${match[4]}`;
}

function countPrompts(logFile) {
  try {
    const text = fs.readFileSync(logFile, "utf8");
    const matches = text.match(/\[LOG_ENTRY type=PROMPT /g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function findExistingLog(root, conversationId) {
  const dir = logsDir(root);
  if (!fs.existsSync(dir)) return null;
  const needle = `session_id: ${conversationId}`;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const full = path.join(dir, name);
    const head = fs.readFileSync(full, "utf8").slice(0, 1200);
    if (head.includes(needle)) return full;
  }
  return null;
}

function loadState(root, conversationId) {
  const saved = readJson(statePath(root, conversationId), null);
  if (saved && saved.logFile && fs.existsSync(saved.logFile)) return saved;
  const existing = findExistingLog(root, conversationId);
  if (!existing) return null;
  return {
    conversationId,
    logFile: existing,
    exchanges: countPrompts(existing),
    pending: {},
  };
}

function saveState(root, state) {
  writeJson(statePath(root, state.conversationId), state);
}

function patchFrontmatter(content, fields) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return content;
  let frontmatter = match[1];
  for (const [key, value] of Object.entries(fields)) {
    const line = `${key}: ${value}`;
    const re = new RegExp(`^${key}:.*$`, "m");
    frontmatter = re.test(frontmatter) ? frontmatter.replace(re, line) : `${frontmatter}\n${line}`;
  }
  return `---\n${frontmatter}\n---\n${content.slice(match[0].length)}`;
}

function createLog(root, conversationId, timestamp, model) {
  const dir = logsDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${formatStamp(timestamp)}_${safeId(conversationId)}.md`);
  const date = timestamp.slice(0, 10);
  const short = shortId(conversationId);
  const body = `---
session_id: ${conversationId}
date: ${date}
author: ${AUTHOR}
model: ${model}
tool: ${TOOL}
project: ${PROJECT}
total_exchanges: 0
first_prompt_time: ${timestamp}
last_prompt_time: ${timestamp}
---

# Session Log - ${date}

Session: \`${short}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\`

---

`;
  fs.writeFileSync(file, body, "utf8");
  return file;
}

function appendEntry(logFile, type, num, conversationId, timestamp, model, body) {
  const text = typeof body === "string" ? body : "";
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  const block = `[LOG_ENTRY type=${type} num=${num} session=${shortId(conversationId)}]
timestamp: ${timestamp}
model: ${model}

${normalized}
`;
  fs.appendFileSync(logFile, block, "utf8");
}

function updateHeader(state, fields) {
  const content = fs.readFileSync(state.logFile, "utf8");
  fs.writeFileSync(state.logFile, patchFrontmatter(content, fields), "utf8");
}

function logPrompt(root, payload) {
  const conversationId = String(payload.conversation_id || "unknown");
  const generationId = String(payload.generation_id || `missing-generation-${Date.now()}`);
  const timestamp = nowIso();
  const model = modelName(payload);
  let state = loadState(root, conversationId);
  if (!state) {
    state = {
      conversationId,
      logFile: createLog(root, conversationId, timestamp, model),
      exchanges: 0,
      pending: {},
    };
  }
  if (!state.pending) state.pending = {};
  state.exchanges += 1;
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  appendEntry(state.logFile, "PROMPT", state.exchanges, conversationId, timestamp, model, prompt);
  updateHeader(state, {
    total_exchanges: String(state.exchanges),
    last_prompt_time: timestamp,
    model,
  });
  state.pending[generationId] = {
    num: state.exchanges,
    model,
    text: null,
    responseAt: null,
    written: false,
  };
  saveState(root, state);
}

function isSubagentEvent(payload) {
  return Boolean(payload.parent_conversation_id || payload.subagent_id || payload.subagent_type);
}

function storeResponse(root, payload) {
  if (isSubagentEvent(payload)) return;
  const conversationId = String(payload.conversation_id || "");
  const generationId = String(payload.generation_id || "");
  if (!conversationId || !generationId) return;
  const state = loadState(root, conversationId);
  if (!state || !state.pending || !state.pending[generationId]) return;
  const pending = state.pending[generationId];
  if (pending.written) return;
  pending.text = typeof payload.text === "string" ? payload.text : "";
  pending.responseAt = nowIso();
  pending.model = modelName(payload);
  saveState(root, state);
}

function writePending(root, state, generationId) {
  const pending = state.pending[generationId];
  if (!pending || pending.written || pending.text === null) return false;
  appendEntry(
    state.logFile,
    "RESPONSE",
    pending.num,
    state.conversationId,
    pending.responseAt || nowIso(),
    pending.model,
    pending.text
  );
  pending.written = true;
  saveState(root, state);
  return true;
}

function flushResponse(root, payload) {
  const conversationId = String(payload.conversation_id || "");
  if (!conversationId) return;
  const state = loadState(root, conversationId);
  if (!state || !state.pending) return;
  const generationId = String(payload.generation_id || "");
  if (generationId && writePending(root, state, generationId)) return;
  const ready = Object.keys(state.pending)
    .filter((id) => state.pending[id] && !state.pending[id].written && state.pending[id].text !== null)
    .sort((a, b) => state.pending[a].num - state.pending[b].num);
  const latest = ready[ready.length - 1];
  if (latest) writePending(root, state, latest);
}

function outputFor(event) {
  if (event === "beforeSubmitPrompt") return { continue: true };
  return {};
}

async function main() {
  let root = process.cwd();
  let event = "";
  try {
    const raw = decodeBuffer(await readStdinBuffer());
    const payload = raw.trim() ? JSON.parse(raw) : {};
    event = payload.hook_event_name || "";
    root = workspaceRoot(payload);
    if (event === "beforeSubmitPrompt") logPrompt(root, payload);
    else if (event === "afterAgentResponse") storeResponse(root, payload);
    else if (event === "stop") flushResponse(root, payload);
  } catch (error) {
    logError(root, error);
  }
  process.stdout.write(JSON.stringify(outputFor(event)));
}

main();
