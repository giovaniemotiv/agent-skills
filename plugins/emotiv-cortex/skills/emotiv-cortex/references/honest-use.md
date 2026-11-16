# Honest use

Consumer EEG is easy to over-claim. These rules keep apps truthful.

## What the signals can't support

- **No event-related potentials (ERPs), no single-trial decoding.** `pow` is averaged over
  ~2 s windows and `met` updates every 10 s on the free licence. Use block-level comparisons
  (minutes of condition A against minutes of condition B).
- **No source localisation.** A few electrodes cannot say where in the brain activity comes
  from. If you draw a map, paint it on the scalp, never colour the cortex, and stop it at the
  area the electrodes actually surround. MN8's two near-opposite in-ear points enclose no area:
  give it no map at all.
- **No indexes the electrodes can't measure.** Frontal-midline theta needs an Fz electrode;
  Insight and MN8 have none. Withhold such a measure instead of approximating it, and say so.
- **No units where Cortex gives none.** `met` scores are unitless 0–1 indexes; ACC/GYRO/MAG
  values have no documented unit. Compare within one session and person, not between people.
- **No integrated motion.** Don't integrate acceleration into speed or position.
- **No diagnosis.** These are not medical devices. Never present output as clinical, as a
  diagnosis, or as a measure of a disorder.

## Name the artifacts

Muscle and eye movement look like brain activity to a naive reading:

- blinks → frontal theta;
- jaw clench, talking, chewing → betaH and gamma;
- head movement → everything.

Tell the user to sit still, and label these effects rather than showing them as brain states.

## Emotion and workplace/education use

Mapping signals to emotions (for example smile → "happy", `met` → "stressed") is emotion
recognition. In the EU, the AI Act prohibits emotion recognition in workplaces and educational
settings, with narrow medical and safety exceptions. Keep such features out of those contexts
unless legal review has cleared them.

## Data and disclosure

- Say what the app reads and what it infers, in plain words, before it starts.
- Keep brain data on the device unless the user explicitly agrees otherwise.
- Check EMOTIV's AI consent before using live data (connection-flow.md §4); offer simulated
  data when it isn't granted.
- Offer a simulated mode so people without a headset, or who decline, can still try the app,
  and label simulated data clearly.
