// Minimal Cortex client for the browser: no dependencies, raw JSON-RPC.
// Connects, gets approval and a token, checks AI consent, opens a session on the first
// headset and subscribes to streams. Every sample is decoded with the column labels from
// the subscribe reply, never with hard-coded indexes.
//
// Usage:
//   const cortex = await connectCortex({ clientId, clientSecret, streams: ['pow', 'dev'],
//     onSample: (stream, sample) => console.log(stream, sample),
//     onStatus: (text) => console.log(text) });
//   ...later: await cortex.close();
//
// Never hard-code real credentials: read them from your app's settings.

export async function connectCortex({
  clientId,
  clientSecret,
  streams = ['pow', 'dev'],
  activeSession = false, // true for raw EEG / 2 Hz met (needs a licence)
  onSample = () => {},
  onWarning = () => {},
  onStatus = () => {},
}) {
  const ws = new WebSocket('wss://localhost:6868');
  const pending = new Map();
  const cols = {};
  let nextId = 1;

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('Cannot reach Cortex. Is the EMOTIV Launcher running?'));
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        const err = new Error(`${method} failed (${msg.error.code}): ${msg.error.message}`);
        err.code = msg.error.code;
        err.data = msg.error.data;
        reject(err);
      } else {
        resolve(msg.result);
      }
    } else if (msg.warning) {
      onWarning(msg.warning.code, msg.warning.message);
    } else if (msg.sid) {
      for (const stream of Object.keys(cols)) {
        if (msg[stream]) onSample(stream, { time: msg.time, ...zip(cols[stream], msg[stream]) });
      }
    }
  };

  const call = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }));
    });
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. Someone must be signed in to the Launcher.
  const logins = await call('getUserLogin');
  if (!logins?.[0]?.username) throw new Error('Sign in to the EMOTIV Launcher first.');

  // 2. One-time approval of this app, in the Launcher.
  const creds = { clientId, clientSecret };
  if (!(await call('hasAccessRight', creds)).accessGranted) {
    await call('requestAccess', creds);
    onStatus('Approve this app in the EMOTIV Launcher.');
    const deadline = Date.now() + 120_000;
    while (!(await call('hasAccessRight', creds)).accessGranted) {
      if (Date.now() > deadline) throw new Error('The app was not approved in the Launcher.');
      await pause(2000);
    }
  }

  // 3. Token. An active session needs quota reserved with debit.
  const { cortexToken } = await call('authorize', { ...creds, ...(activeSession ? { debit: 1 } : {}) });

  // 4. AI consent (Launcher 4.13.5.3+). "Could not check" counts as "not granted".
  const ack = await call('getAiAcknowledgement', { cortexToken }).catch(() => null);
  const data = await call('getAiDataConsent', { cortexToken }).catch(() => null);
  if (!ack?.accepted || !data?.aiConsent || !data?.cloudConsent) {
    ws.close();
    // Offer simulated data here, and a button that calls
    // setAiAcknowledgement {cortexToken, accepted: true} on the user's explicit choice.
    throw new Error('EMOTIV AI consent is not granted (or the Launcher is too old to check).');
  }

  // 5. Find a headset. The Bluetooth scan runs about 20 s.
  await call('controlDevice', { command: 'refresh' }).catch(() => {});
  let headset = null;
  for (let i = 0; i < 15 && !headset; i++) {
    const list = await call('queryHeadsets');
    headset = list.find((h) => h.status === 'connected') ?? null;
    const found = list.find((h) => h.status === 'discovered');
    if (!headset && found) await call('controlDevice', { command: 'connect', headset: found.id });
    if (!headset) await pause(2000);
  }
  if (!headset) throw new Error('No headset found. Turn it on and keep it near the computer.');
  onStatus(`Connected to ${headset.id}${headset.isVirtual ? ' (virtual)' : ''}.`);

  // 6. Session and subscription. Failures arrive per stream, inside the result.
  const session = await call('createSession', {
    cortexToken,
    headset: headset.id,
    status: activeSession ? 'active' : 'open',
  });
  const sub = await call('subscribe', { cortexToken, session: session.id, streams });
  for (const ok of sub.success ?? []) cols[ok.streamName] = ok.cols;
  const failures = (sub.failure ?? []).map((f) => ({ stream: f.streamName, code: f.code, message: f.message }));

  return {
    headset,
    streams: Object.keys(cols),
    failures,
    call,
    async close() {
      await call('updateSession', { cortexToken, session: session.id, status: 'close' }).catch(() => {});
      ws.close();
    },
  };
}

// Pair labels with values. A label can itself be a list (dev's per-sensor contact quality).
function zip(labels, values) {
  const out = {};
  labels.forEach((label, i) => {
    if (Array.isArray(label)) out.contactQuality = zip(label, values[i] ?? []);
    else out[label] = values[i];
  });
  return out;
}
