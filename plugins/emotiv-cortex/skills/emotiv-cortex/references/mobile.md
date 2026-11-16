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
- **`met` columns can have different names** on the mobile library (seen: `attentionCnnLstm`,
  `stressy`, `loady`). Map whatever the subscribe reply lists.
- The native client is created asynchronously after `startCortex()`; the first requests can
  fail with "CortexClient is not created". Retry briefly.

## Android setup that bites

- **Login redirect scheme:** the library redirects to `emotiv-<md5(clientId)>://authorize`
  (lowercase hex MD5). The app must register that scheme for AppAuth through the manifest
  placeholder `appAuthRedirectScheme`. Compute it in Gradle from the same client id the app uses.
- **If the login page never returns to the app**, check the main activity for
  `android:taskAffinity=""` (newer Flutter templates add it). AppAuth's redirect lands in the
  package's task; with an empty affinity the app waits in another task. Remove the attribute.
- **Two apps with the same client id** register the same redirect scheme; Android may deliver
  the login to the wrong one. Use one client id per app, or uninstall the other while testing.
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
same time. Stamp both streams with the phone's own clock on arrival and align them in time
windows that match the slower stream (10 s for free-tier `met`).
