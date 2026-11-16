# EMOTIV agent skills

Agent skills that teach Claude and other AI coding agents to build apps for EMOTIV headsets
with the Cortex API.

| Skill | What it covers |
|---|---|
| [`emotiv-cortex`](plugins/emotiv-cortex/skills/emotiv-cortex/SKILL.md) | Connection and auth flow, AI consent, sessions, the nine data streams, mental-command training, licence limits, error codes, verified device facts (MN8, Insight, EPOC X, Flex 2), honest-use rules, and mobile (Android/iOS, Flutter) |

A skill is a folder with a `SKILL.md` (a short description of when to use it, then
instructions) plus reference files the agent opens only when the task needs them. The format
is the open Agent Skills standard, so the same folder works in any tool that reads it.

## Install

### Claude Code

```
/plugin marketplace add giovaniemotiv/agent-skills
/plugin install emotiv-cortex@emotiv
```

Or copy `plugins/emotiv-cortex/skills/emotiv-cortex/` into a project's `.claude/skills/`, or
into `~/.claude/skills/` to use it in every project.

### claude.ai

Zip the `plugins/emotiv-cortex/skills/emotiv-cortex` folder and upload it under
Settings → Capabilities → Skills.

### Claude API

Upload the same folder with the Skills API and attach it to requests that use the
code-execution tool.

### Other agents

Copy the `emotiv-cortex` folder into the tool's skills directory. For tools that don't read
skills, reference `SKILL.md` from your `AGENTS.md`.

## Where the facts come from

The device and protocol facts were taken from a working Cortex SDK and from measurements on
real headsets and Launcher builds, not from memory. Where EMOTIV's documentation and the
hardware disagreed, the skill says what was measured and when (for example the AI consent
calls, checked against Cortex 4.13.5.3). Anything not yet confirmed on hardware is marked as
such.

## Contributing

- Run `node scripts/check.mjs` before committing. CI runs it on every push.
- Never put credentials in a skill or its examples. The check rejects anything shaped like a
  Cortex client id or secret.
- Keep `SKILL.md` short; put detail in `references/`.
- When a fact changes, say what changed it: a hardware measurement, a Launcher version, or a
  documentation page.
