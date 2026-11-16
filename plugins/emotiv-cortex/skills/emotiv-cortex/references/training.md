# Training mental commands (and facial expressions)

Mental commands are trained, not recognised out of the box. The user records ~8-second
examples of a chosen thought against a neutral baseline; the signature lives in a **profile**.
Profiles are stored per EmotivID and per headset type.

## Profiles

`setupProfile {cortexToken, headset, profile, status}` with status `create`, `load`, `save`,
`unload`, `rename` or `delete`.

- `queryProfile` lists the user's profiles; `getCurrentProfile` says which one is loaded.
- Check before creating: `create` on an existing name fails with `-32118`. Load it instead.
- `com` only works with a profile loaded. `loadGuestProfile` gives a throwaway blank profile
  for demo stations.
- **Save after every accepted round**, or the work is lost when the profile unloads
  (warning `15` reports an automatic unload).

## One training round

Subscribe to `sys` first: the verdict never comes back in the method reply.

```
training {cortexToken, session, detection:"mentalCommand", action:"neutral", status:"start"}
   sys → ["mentalCommand","MC_Started"]
   (user holds the thought for 8 s; getTrainingTime gives the exact length)
   sys → ["mentalCommand","MC_Succeeded"]  or  ["mentalCommand","MC_Failed"]
training {…, status:"accept"}   (or "reject" to discard)
   sys → ["mentalCommand","MC_Completed"]  (or MC_Rejected)
setupProfile {…, status:"save"}
```

- Train `neutral` first, then each action. Show a countdown from `getTrainingTime`.
- Ask Cortex which actions exist: `getDetectionInfo {detection:"mentalCommand"}` →
  `actions`. A build that offers fewer answers `-32602 Invalid Parameters` for the rest.
- **At most 4 actions can be active at once** (neutral doesn't count). A fifth fails with a bare
  `-32602`. Choose them with `mentalCommandActiveAction`. Fewer actions are more reliable.
- To erase an action: `training {…, status:"erase", action}`. Cortex refuses to erase an
  action that is currently active (`-32602`); deactivate it first.

## Tuning after training

| Method | What it tells you |
|---|---|
| `mentalCommandGetSkillRating` | 0–1, how separable an action's signature is |
| `getTrainedSignatureActions` | which actions are trained, and how many recordings each |
| `mentalCommandActionSensitivity` | per-action sensitivity 1–10: trade response against false positives |
| `mentalCommandBrainMap` | trained actions as 2-D points against neutral |
| `mentalCommandTrainingThreshold` | the bar a recording must clear |

## Facial expressions

They work untrained through a universal signature. Training is optional and improves accuracy
for one person: the same flow with `detection:"facialExpression"` and `FE_*` events on `sys`.
Trainable: `neutral`, `surprise`, `frown`, `smile`, `clench`. The profile is shared with mental
commands. Not available on MN8.

## What to tell users

- Expect several rounds per action and some failures; that is normal.
- Sit still, keep the face relaxed: jaw and eye movement make it easy to "train" muscle
  instead of thought.
- Re-train after a long break or a different fit.
