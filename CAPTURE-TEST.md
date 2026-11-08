# Capture test

Capture is working. Two canaries landed in two different session logs under `.agent-logs/`. The assignment build has not started.

## Tool and model

- Tool: Cursor
- Model: `grok-4.7-high` (Grok 4.7). The same model plans and executes in this Agent session. There is no separate planner.

## Mechanism

Cursor project command hooks. A project rule cannot run a command, so the rule only tells later turns to leave the logs alone.

Config:

- `.cursor/hooks.json` runs `node .cursor/hooks/capture-turn.js` on `beforeSubmitPrompt`, `afterAgentResponse`, and `stop`.
- `.cursor/hooks/capture-turn.js` appends the prompt on submit, keeps the latest assistant text for that generation, and appends that text once when the turn stops. Thinking and tool calls are not recorded.
- `.cursor/rules/agent-capture.mdc` is the always-on reminder not to edit `.agent-logs/`.
- `.gitignore` ignores only `.cursor/hooks/.state/`. `.agent-logs/` is tracked.

Each session is one file: `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`.

## Log files

- Session 1: `.agent-logs/2026-11-08_16-15-52_3f89da00-ef3c-40a2-8d10-41fd42d33c0b.md`
- Session 2: `.agent-logs/2026-11-08_16-17-46_4644f346-23fe-4b57-a358-87c38d3147a1.md`

Session 1 has the canary prompt and the reply. Session 2 has the canary prompt. The reply in this chat is appended to the session 2 file by the hook when this turn ends.

Note: in session `4644f346` the hook also recorded an empty prompt 2 and filed the reply under it, so that reply belongs to the session 2 canary (prompt 1).

## Canary entries, raw

From `.agent-logs/2026-11-08_16-15-52_3f89da00-ef3c-40a2-8d10-41fd42d33c0b.md`:

```
[LOG_ENTRY type=PROMPT num=1 session=3f89da00]
timestamp: 2026-11-08T16:15:52.640Z
model: grok-4.7-high

CAPTURE TEST — 8x assignment, Mirza Sohaib Baig

[LOG_ENTRY type=RESPONSE num=1 session=3f89da00]
timestamp: 2026-11-08T16:16:10.133Z
model: grok-4.7-high

The prompt is in `.agent-logs/2026-11-08_16-15-52_3f89da00-ef3c-40a2-8d10-41fd42d33c0b.md`, verbatim, at `2026-11-08T16:15:52.640Z` with model `grok-4.7-high`. The reply you are reading is written to that same file when this turn ends.

`CAPTURE-TEST.md` is still waiting on the second chat. Send this there:

`CAPTURE TEST — 8x assignment, Mirza Sohaib Baig — session 2`
```

From `.agent-logs/2026-11-08_16-17-46_4644f346-23fe-4b57-a358-87c38d3147a1.md`:

```
[LOG_ENTRY type=PROMPT num=1 session=4644f346]
timestamp: 2026-11-08T16:17:46.034Z
model: grok-4.7-high

CAPTURE TEST — 8x assignment, Mirza Sohaib Baig — session 2
```

## What did not work first

- The first hook command used a quoted absolute path to `node.exe`. A clean PowerShell already has `node` on PATH, so `.cursor/hooks.json` now calls `node` directly. That install is commit `88a4b1e`.
- Cursor passes the workspace root as `/c:/Personal/...`. Node's `path.join` turned that into `\c:\Personal\...`, the write missed this repo, and the script still exited 0. `capture-turn.js` now rewrites that MSYS-style root before writing. That fix is commit `de2730b`. The canaries from before the fix never appeared in `.agent-logs/`, including an earlier second chat that sent the session 2 line.
- Sending `CAPTURE TEST — 8x assignment, Mirza Sohaib Baig — session 2` again inside session `3f89da00` stored it as prompt 2 of that same file. It did not count as a second session. The line had to be sent from this new chat, `4644f346`, which created the second log file.
