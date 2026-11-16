# Devices

These are **priors**. At runtime, branch on what Cortex returns: the headset object from
`queryHeadsets` (`sensors`, `motionSensors`, `settings`) and the columns in the subscribe
reply. Identify the family from the headset id prefix (`MN8-`, `INSIGHT-`, `EPOCX-`,
`FLEX2-` / `EPOCFLEX-`), never from a product name typed by the user.

## Summary

| | MN8 | Insight | EPOC X | Flex 2 |
|---|---|---|---|---|
| Form | in-ear (earbuds) | scalp, 5 channels | scalp, 14 channels | scalp cap, up to 32 channels |
| Channels | T7, T8 | AF3, T7, Pz, T8, AF4 | AF3, F7, F3, FC5, T7, P7, O1, O2, P8, T8, FC6, F4, F8, AF4 | wherever the cap is set up (`configMapping`) |
| Licence class | consumer | consumer | professional | professional |
| Performance metrics (`met`) | attention, cognitiveStress | attention, eng, exc, lex, str, rel, int | same seven | same seven |
| Facial expressions (`fac`) | **no** | yes, 32 Hz | yes, 32 Hz | yes, 32 Hz, needs the EPOC X 14-channel mapping |
| Mental commands (`com`) | yes, 8 Hz | yes, 8 Hz | yes, 8 Hz | yes, 8 Hz, needs the EPOC X 14-channel mapping |
| Motion (`mot`) | 6.4 Hz, 10-bit, quaternions only, **no magnetometer** | depends on generation (below) | 32 or 64 Hz, 14/16-bit, quaternion + ACC + MAG | 0, 32 or 64 Hz, 16-bit, quaternion + ACC + MAG |
| Motion rate configurable | no | no | yes: `updateHeadset`, **over USB only** | yes, in the Flex 2 configuration, not via `updateHeadset` |

## Licence: what changes, and what doesn't

The licence changes **rates and access**, never hardware.

| | Free / consumer | With an EmotivPRO licence |
|---|---|---|
| `met` rate | **0.1 Hz (one value per 10 s)** | 2 Hz, needs the `pm` scope **and** a session created or updated to `status: "active"` |
| Raw EEG (`eeg`) | included on **Insight and MN8** | required on **EPOC X and Flex**; the Cortex app must also be registered with raw EEG enabled |

Check the licence with `getLicenseInfo` (look at `scopes`), but the subscribe reply still
decides: a stream the licence doesn't allow comes back in `failure`.

## Motion details

- **MN8:** ICM-20648, accelerometer plus quaternions, no magnetometer. One sample every
  ~156 ms: design for leaning, never for quick twitches. Yaw drifts, because nothing anchors it.
- **Insight:** the generations differ. Pre-2019 units document gyro/accelerometer/magnetometer
  columns at 128 Hz, 14-bit; 2019 units quaternion/accelerometer/magnetometer at 64 Hz,
  14-bit; Insight 2 the same columns at 32 Hz, 16-bit. Branch on the returned columns.
- **EPOC X / Flex 2:** ICM-20948, quaternion + accelerometer + magnetometer. The magnetometer
  gives yaw an absolute reference, so it barely drifts (measured on a Flex 2: median 0.15°/s
  while still).
- **Fit position matters on EPOC X and Flex 2.** The EPOC X band and the Flex 2 control box can
  sit in two positions about 82° apart around the ear-to-ear axis. Cortex reports the same
  `headbandPosition` for both, so let the user choose or calibrate from a known pose.
- **Cortex documents no unit for GYRO, ACC or MAG values.** Do not integrate them into
  velocity or position. Quaternions are relative to the start pose.

## Raw EEG rate

Not a fixed number per device. Read `settings.eegRate` from the headset object. EPOC X can be
switched between 128 and 256 Hz with `updateHeadset`, over USB only. `updateHeadset` applies to
EPOC+/EPOC X only; there are no configuration settings for other headsets.

## Metric definitions

Use these meanings, not guesses:

| Column | Meaning |
|---|---|
| `attention` | sustained focus on a single task (some Cortex versions send `foc`) |
| `cognitiveStress` | the 2-channel (MN8) stress metric |
| `eng` | engagement: immersion in an activity |
| `exc` | excitement: intensity of reactions to stimuli or environments |
| `lex` | long-term excitement, computed from the excitement values of the last minute |
| `str` | stress: emotional tension while completing a task |
| `rel` | relaxation: calm focus after a period of intense concentration (not drowsiness) |
| `int` | interest: attraction or aversion to stimuli |

Every metric arrives with a `<name>.isActive` flag (except `lex`). When it is false, the
number is meaningless: show "—", never 0.
