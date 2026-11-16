# Streams

Nine streams. Always take column names from the subscribe reply; the lists here are what to
expect, not what to hard-code.

| Stream | What | Rate | Good for |
|---|---|---|---|
| `com` | mental command detected from a trained profile | 8 Hz | control: "push", "lift"… with a threshold and dwell |
| `fac` | facial expressions from muscle (EMG) and eye signals | 32 Hz | control and events; no training needed; **not on MN8** |
| `pow` | band power per sensor | 8 Hz | your own control loop or state estimate |
| `mot` | head motion | 6.4–128 Hz by device | steering without training |
| `met` | EMOTIV's 0–1 mental-state scores | **0.1 Hz free**, 2 Hz with licence | slow dashboards and session summaries, never control |
| `eeg` | raw microvolts per sensor | per headset `settings.eegRate` | your own signal processing |
| `dev` | battery, radio signal, contact quality per sensor | 2 Hz | fit indicator; always show it |
| `eq` | EEG quality: is the signal usable | 2 Hz | gating: don't trust numbers when quality is low |
| `sys` | training lifecycle events | event-driven | training verdicts (see training.md) |

## com: mental commands

Columns `act`, `pow`. `act` is one of the trained actions (`neutral`, `push`, `pull`, `lift`,
`drop`, `left`, `right`, `rotateLeft`, `rotateRight`, `rotateClockwise`,
`rotateCounterClockwise`, `rotateForwards`, `rotateReverse`, `disappear`); `pow` is 0–1
confidence. Act on a **threshold held for a dwell time**, never on one spike. Without a
trained, loaded profile it only reports `neutral`.

## fac: facial expressions

Columns `eyeAct`, `uAct`, `uPow`, `lAct`, `lPow`: three channels that change together
(you can blink while smiling).

- eye: `neutral`, `blink`, `winkL`, `winkR`, `horiEye`
- upper face: `neutral`, `surprise`, `frown` (power 0–1)
- lower face: `neutral`, `smile`, `clench`, `laugh`, `smirkLeft`, `smirkRight` (power 0–1)

These read muscle activity, not mental states. Mapping a smile to "happy" turns the app into
emotion recognition (see honest-use.md).

## pow: band power

Columns are `<sensor>/<band>`, for example `AF3/theta`, `AF3/alpha`, `AF3/betaL`,
`AF3/betaH`, `AF3/gamma`, repeated per sensor in Cortex's order. Units µV²/Hz. Each value is
averaged over a sliding window of about 2 seconds, so one sample spans several seconds of
brain activity.

- theta 4–8 Hz, alpha 8–12 Hz, betaL 12–16 Hz, betaH 16–25 Hz, gamma 25–45 Hz.
- Alpha rises when the eyes close: the most reliable effect to demo.
- Blinks land in frontal theta. Jaw clenching lands in betaH and gamma. Label these as
  artifacts instead of "brain activity".
- Prefer ratios or each sensor relative to its own recent baseline over raw values, which vary
  a lot between people and fits.

## mot: motion

Columns vary by device: `Q0`–`Q3` (quaternion) plus `ACCX`…, `MAGX`… on EPOC X / Flex 2 /
recent Insight; gyro columns on older Insight; quaternions only on MN8. Counter columns
(`COUNTER_MEMS`, `INTERPOLATED_MEMS`) may lead. Quaternions are relative to the start pose:
capture a neutral pose first. ACC/GYRO/MAG have no documented unit.

## met: performance metrics

Columns like `attention.isActive`, `attention`, `eng.isActive`, `eng`, … (MN8:
`attention`, `cognitiveStress`). Values 0–1; null or inactive on poor signal. On the free
licence **one value per 10 seconds**. Interpolating between samples invents data: draw steps.
Mobile builds of Cortex have reported different names (`attentionCnnLstm`, `stressy`,
`loady`), so map whatever columns arrive instead of expecting a fixed set.

## eeg: raw EEG

One column per sensor in microvolts, plus counters and markers (`COUNTER`, `INTERPOLATED`,
`RAW_CQ`, `MARKER_HARDWARE`, `MARKERS` and so on). Needs an `active` session and the right
licence (devices.md). Most apps never need it.

## dev: device health

Columns like `["Battery","Signal",["AF3",…,"OVERALL"],"BatteryPercent"]`: the third column is
itself a list, one contact-quality value per sensor (0–4) plus `OVERALL` (0–100). Show it as
dots on a head map. Contact quality on a Virtual Brainwear headset is synthetic.

## eq: EEG quality

Per-sensor quality 0–4, `overall` 0–100, `sampleRateQuality` (−1 when more than 300 ms of
data was lost within 2 s), battery. Low quality means the numbers above are not usable yet.

## Rates are slower than they sound

`pow` at 8 Hz is averaged over ~2 s windows, and `met` gives one value per 10 s. **Neither can
resolve single trials or event-related potentials (ERPs).** Use them for block-level state:
minutes of task A against minutes of task B.
