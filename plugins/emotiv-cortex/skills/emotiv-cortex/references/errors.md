# Errors and warnings

Turn every code into a sentence the user can act on. A bare number in the UI helps nobody.

## Error codes (in `error.code` of a reply)

| Code | Meaning | What to do / tell the user |
|---|---|---|
| socket won't open | Launcher not running, or its certificate isn't trusted | "Start the EMOTIV Launcher on this computer." |
| `-32102` | the user hasn't approved this app yet | call `requestAccess`; "Approve the app in the EMOTIV Launcher." |
| `-32021` | client ID or secret is wrong | check the app's credentials; not the user's fault |
| `-32014` | Cortex token is invalid | `authorize` again |
| `-32015` | Cortex token expired | `generateNewToken` or `authorize` again |
| `-32019` | no session quota to activate | `authorize` with `debit: 1` before creating an `active` session |
| `-32012` | the stream needs an active session | `updateSession {status:"active"}`, or don't use that stream |
| `-32006` | the licence can't activate a session | the stream needs a paid licence; fall back to free streams |
| `-32118` | profile already exists | load it instead of creating it |
| `-32602` | invalid parameters | read `error.data.behavior` when present; in training it also means "action not offered", "5th active action" or "can't erase an active action" |
| `-32601` | method not found | usually an older Launcher (e.g. `getAiDataConsent` before 4.13.5.3); ask the user to update |

Subscribe failures arrive **inside** a successful reply, in `result.failure[]`, each with its
own `code` and `message`. Handle them per stream.

## Warnings (pushed, `{"warning":{"code":…,"message":…}}`)

| Code | Meaning |
|---|---|
| `0` | streams were cancelled |
| `1` | session closed |
| `15` | profile automatically unloaded |
| `102` | headset connection timed out (seen from the mobile library) |
| `103` | headset disconnected; sent only after **30 s** without data, so run your own watchdog |
| `104` | headset connected; `message.headsetId` says which |

## Common "it doesn't work" causes, by symptom

| Symptom | Likely cause |
|---|---|
| Nothing connects at all | Launcher closed, or no one signed in to it (`getUserLogin` is empty) |
| Stuck after `requestAccess` | the approve dialog is waiting in the Launcher |
| No headset found | headset off, paired to something else, or the 20 s scan hadn't finished |
| `met` barely changes | it is one value every 10 s on the free licence |
| `com` always `neutral` | no trained profile loaded |
| `fac` subscription fails | the headset is an MN8 |
| Values jump wildly | poor contact: check `dev` / `eq` first |
