# Mobile (Android / iOS)

There is no Launcher on phones. The app embeds the **Cortex Library for Mobile** and speaks the
same JSON-RPC to it in-process. The library is a **private beta, available on request** from
EMOTIV; its binaries (`EmotivCortexLib.aar` for Android, `EmotivCortexLib.xcframework` for iOS)
are never committed to source control.

For Flutter, EMOTIV publishes `github.com/Emotiv/flutter-plugin` (package `cortex`) with an
example app. It exposes three broadcast streams (`responseEvents`, `warningEvents`,
`dataStreamEvents`) plus `startCortex()`, `authenticateWithCortex(clientId)` and
`sendRequestToCortex(json)`.

## Differences from desktop

- **Login is a browser OAuth flow, not the Launcher.** `authenticateWithCortex(clientId)` opens
  EMOTIV's login (AppAuth, PKCE) and returns a code; then call `loginWithAuthenticationCode`
  `{clientId, clientSecret, code}`, then `authorize` as usual. Check `getUserLogin` first: if
  someone is already signed in, skip the browser.
- After `authorize`, the mobile examples call `acceptLicense {cortexToken}`; an account that
  already accepted may answer with an error, which is harmless.
- **`met` sends a different, larger column set** on the mobile library. Measured on an EPOC X
  (Android, 2026-11-16): `boredom`, `attention`, `visualAttention`, `cognitiveStress`, `eng`,
  `exc`, `lex`, `str`, `rel`, `int`, each with its `.isActive` flag except `lex`. So a scalp
  headset sends **both** `cognitiveStress` and `str` there; label them differently. Other
  builds have sent `attentionCnnLstm`, `stressy` and `loady`. Map whatever the subscribe reply
  lists, and keep a column whose value is `null` (inactive) instead of dropping it: early in a
  session most metrics arrive inactive.
- The native client is created asynchronously after `startCortex()`; the first requests can
  fail with "CortexClient is not created". Retry briefly.

## Android setup that bites

- **Login redirect scheme:** the library redirects to `emotiv-<md5(clientId)>://authorize`
  (lowercase hex MD5). The app must register that scheme for AppAuth through the manifest
  placeholder `appAuthRedirectScheme`. Compute it in Gradle from the same client id the app uses.
- **If the login page never returns to the app, remove `android:taskAffinity=""`** from the
  main activity (newer Flutter templates add it). AppAuth's redirect lands in the package's
  task; with an empty affinity the app waits in another task forever. Confirmed on a Galaxy
  S24 (Android 16) with an EPOC X, 2026-11-16: with the attribute the login never came back;
  without it the redirect returned to the app in under 200 ms.
- **Two apps with the same client id** register the same redirect scheme. In the test above
  the right app still received the login, but don't rely on it: use one client id per app.
- Load the native libraries in `Application.onCreate` with `EmotivLibraryLoader`, as EMOTIV's
  example does.
- Current Android Gradle Plugin rejects `android:extractNativeLibs="true"` in the manifest; set
  `packaging { jniLibs.useLegacyPackaging = true }` in Gradle instead.
- The plugin's own `build.gradle` predates current AGP: it needs a `namespace` and no `package`
  attribute in its manifest.
- Request `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (Android 12+) and location (Android 11 and
  below, and the library's own scan) at runtime.

## Combining with other Bluetooth devices

A phone can hold the headset and another BLE device (for example a heart-rate sensor) at the
same time: an EPOC X and a Garmin Instinct 3 heart-rate broadcast ran together on a Galaxy S24
(2026-11-16). Stamp both streams with the phone's own clock on arrival and align them in time
windows that match the slower stream (10 s for free-tier `met`). A watch's wrist broadcast
sends heart rate without RR intervals, so it cannot give heart-rate variability; a chest strap
usually can.
