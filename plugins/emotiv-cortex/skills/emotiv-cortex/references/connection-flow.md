# Connection flow

Transport: one WebSocket to `wss://localhost:6868`, JSON-RPC 2.0. Every request carries an
`id`; match replies by it. Messages without an `id` are either **stream samples** (they have
`sid`) or **warnings** (they have `warning: {code, message}`).

```json
{"jsonrpc":"2.0","id":1,"method":"getCortexInfo"}
```

If the socket doesn't open, the Launcher isn't running (or, in a browser, its local
certificate isn't trusted). Tell the user to start the EMOTIV Launcher. Chrome, Edge, Safari
and Firefox all reach it once the Launcher's installer has added "Emotiv CA Root" to the
system trust store.

## 1. Who is signed in

```json
{"jsonrpc":"2.0","id":2,"method":"getUserLogin"}
```

An empty list means nobody is signed in to the Launcher: ask the user to sign in there. If
`currentOSUId` differs from `loggedInOSUId`, someone is signed in from another computer
account and this one can't use Cortex.

The Launcher's EmotivID is **not** your app's user identity. Never treat a working Cortex
connection as authentication for your own service.

## 2. Approval (once per app per user)

```json
{"jsonrpc":"2.0","id":3,"method":"hasAccessRight","params":{"clientId":"…","clientSecret":"…"}}
```

If `accessGranted` is false, call `requestAccess` with the same params. The Launcher shows
an approve dialog; until the user clicks it, calls fail with `-32102`. Poll `hasAccessRight`
every ~2 s for up to ~2 minutes, with a message telling the user to look at the Launcher.

## 3. Token

```json
{"jsonrpc":"2.0","id":4,"method":"authorize","params":{"clientId":"…","clientSecret":"…"}}
```

Returns `{"cortexToken": "…"}` (about 48 h). Every later call carries it. Optional params:
`license` (a specific licence id) and `debit` (sessions to reserve). If you will create an
`active` session, pass `debit: 1` or the activation fails with `-32019`. When the token
expires (`-32015`), call `generateNewToken` or `authorize` again.

## 4. AI consent (Launcher 4.13.5.3 and later)

EMOTIV asks apps that process headset data with AI to check consent before touching a
headset. Both calls need only the token: no session, headset or paid licence.

```json
{"jsonrpc":"2.0","id":5,"method":"getAiAcknowledgement","params":{"cortexToken":"…"}}
→ {"result":{"accepted":false}}            or {"accepted":true,"preference":"<your app's bundle id>"}

{"jsonrpc":"2.0","id":6,"method":"getAiDataConsent","params":{"cortexToken":"…"}}
→ {"result":{"aiConsent":true,"cloudConsent":true,"vipAccessUser":true}}
```

- The agreement is per app and per user. To accept it, on a user's explicit action only:
  `setAiAcknowledgement` with `{"cortexToken":"…","accepted":true}`. The published docs omit
  `accepted`; without it the call fails with `-32602 "This parameter is required: accepted"`.
  `accepted:false` withdraws it. Trust the stored state the reply returns, not your request.
- `aiConsent` and `cloudConsent` belong to the user's EMOTIV account; your app can't set them.
- **Launchers older than 4.13.5.3 answer `getAiDataConsent` with `-32601` (method not found).**
  Treat "could not check" as "not granted": fall back to simulated data and tell the user to
  update the Launcher. Never treat it as permission.

## 5. Find and connect a headset

```json
{"jsonrpc":"2.0","id":7,"method":"controlDevice","params":{"command":"refresh"}}
{"jsonrpc":"2.0","id":8,"method":"queryHeadsets"}
{"jsonrpc":"2.0","id":9,"method":"controlDevice","params":{"command":"connect","headset":"INSIGHT-A1B2C3D4"}}
```

- `refresh` starts a Bluetooth scan that runs about 20 s. Poll `queryHeadsets` past that window
  before saying no headset was found.
- A headset moves `discovered → connecting → connected`. Warning `104` is pushed when one
  connects. If several are listed, let the user choose.

## 6. Session

```json
{"jsonrpc":"2.0","id":10,"method":"createSession",
 "params":{"cortexToken":"…","headset":"INSIGHT-A1B2C3D4","status":"open"}}
```

- `"open"` is free and unlocks the processed streams.
- `"active"` uses a licence session and is what raw EEG and 2 Hz metrics need. You can also
  open first and `updateSession` to `"active"` later.
- Close with `updateSession {status:"close"}` when done. Never keep two sessions on one socket:
  the old one's samples keep arriving.

## 7. Subscribe

```json
{"jsonrpc":"2.0","id":11,"method":"subscribe",
 "params":{"cortexToken":"…","session":"<session id>","streams":["met","pow","dev"]}}
```

```json
{"id":11,"jsonrpc":"2.0","result":{
  "success":[{"streamName":"pow","cols":["AF3/theta","AF3/alpha","AF3/betaL","AF3/betaH","AF3/gamma", "…"],"sid":"…"}],
  "failure":[{"streamName":"met","code":-32012,"message":"…"}]}}
```

Store `cols` per stream. Samples then arrive as:

```json
{"pow":[2.1,5.3,1.7,0.9,0.4, …],"sid":"…","time":1731772800.123}
```

Zip each array with its stream's `cols`. A column can itself be a list (the `dev` stream nests
per-sensor contact quality), so decode recursively.

`unsubscribe` with the same params stops streams.

## 8. Keep the link honest

- Warning `103` (headset disconnected) only arrives after **30 seconds** without data. Run your
  own watchdog: if no sample arrives for a few seconds, show "signal lost".
- Warning `0` means streams were cancelled; `1` the session was closed. Re-subscribe or
  re-create the session; don't keep a dead UI on screen.
- On socket close, the Launcher quit or crashed: say so and offer reconnect.
