---
name: emotiv-cortex
description: Build apps that read EMOTIV headsets (MN8, Insight, EPOC X, Flex 2) through the Cortex API - connection and auth flow, sessions, data streams (met, pow, com, fac, mot, eeg, dev, eq, sys), mental-command training, licence limits, error codes, and the device facts AI models usually get wrong. Use whenever code talks to Cortex (wss://localhost:6868, the EMOTIV Launcher, Cortex Library for Mobile) or whenever a task mentions EMOTIV, Cortex, EEG headsets, performance metrics, mental commands or brain-computer interface apps.
---

# EMOTIV Cortex

Cortex is the service that sits between an EMOTIV headset and your code. It speaks
**JSON-RPC 2.0 over a WebSocket**. On a computer it is the **EMOTIV Launcher** at
`wss://localhost:6868` (TLS is mandatory; `ws://` never works). On a phone it is the
**Cortex Library for Mobile**, embedded in the app, with the same JSON messages.

Brain data stays on the user's machine unless your app sends it somewhere. Keep it that way
by default and say so to the user when it doesn't.

## The six things to get right

1. **Never assume a device can do something. Read what Cortex returns.** Device tables are
   priors. The subscribe reply (`success` / `failure`), the headset object from
   `queryHeadsets` and its `settings` are the truth. Design for less, never for more.
2. **The free licence gives one performance-metrics value every 10 seconds.** `met` is
   0.1 Hz unless the licence has the `pm` scope **and** the session is `active` (then 2 Hz).
   Never drive animation or game control from `met`. Use `com`, `fac`, `pow` or `mot`.
3. **Decode samples with the column labels from the subscribe reply.** Samples arrive as
   plain arrays. The labels come once, in `result.success[].cols`. They differ by headset
   and by Cortex build, so never hard-code indexes.
4. **A subscription can half-succeed.** `subscribe` returns `success` and `failure` lists.
   A missing licence for one stream must not take the session down. Show which streams
   failed and why.
5. **Check fit before trusting any number.** Subscribe to `dev` (contact quality) or `eq`
   (EEG quality) and show it. Poor contact is the most common "bug".
6. **Mental commands need training. Facial expressions do not.** `com` returns nothing
   useful until a profile is trained and loaded. `fac` works immediately on every headset
   except MN8, which does not have it.

## Minimum flow

```
connect wss://localhost:6868
getUserLogin                 someone must be signed in to the Launcher
hasAccessRight / requestAccess   the user approves the app once in the Launcher
authorize {clientId, clientSecret}            -> cortexToken
(AI consent check, Launcher 4.13.5.3+)        see references/connection-flow.md
controlDevice {command:"refresh"}; queryHeadsets; controlDevice {command:"connect"}
createSession {cortexToken, headset, status:"open"}   "active" for raw EEG / 2 Hz met
subscribe {cortexToken, session, streams:[...]}       keep the cols
...samples arrive as {"<stream>":[...], "sid":..., "time":...}
updateSession {status:"close"} when done
```

A complete, dependency-free browser example is in `examples/cortex-minimal.js`.

## Reference files

Read the one the task needs:

| File | When |
|---|---|
| `references/devices.md` | Which headset has which channels, motion sensor, metrics, facial expressions, and what the licence changes |
| `references/connection-flow.md` | Auth, approval, AI consent, finding headsets, sessions, subscribing, reconnecting |
| `references/streams.md` | Every stream: rate, columns, units, how to decode and what it is good for |
| `references/training.md` | Mental-command and facial-expression training, profiles, the `sys` events |
| `references/errors.md` | Error codes and warnings, with what to tell the user |
| `references/honest-use.md` | What the signals can and cannot support; claims to avoid |
| `references/mobile.md` | Android/iOS with the Cortex Library for Mobile and EMOTIV's Flutter plugin |

## Credentials

Every Cortex app needs a **client ID and client secret**, registered by the developer at
emotiv.com under their account. Never put real credentials in code, examples, commits or
chat. Read them from a gitignored config or environment variables. In a browser or mobile
app the secret ships with the app and cannot be kept secret; tell the user that.

## Testing without a headset

The Launcher can create a **Virtual Brainwear** headset (`queryHeadsets` reports
`isVirtual: true`). Its contact-quality values are synthetic: don't score them as bad fit.
For automated tests, replay recorded frames through the same decoder your app uses.
