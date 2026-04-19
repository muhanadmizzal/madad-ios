# MADAD iOS App

## What is included

- Capacitor is configured for a proper iOS bundle identifier: `iq.madad.platform`
- The app uses the existing React + Vite frontend with no UI rewrite
- Native build scripts are added for iOS sync and Xcode handoff
- The web app now marks native/iOS runtime on boot for iOS-specific styling or behavior

## Scripts

```bash
npm run ios:add
npm run ios:sync
npm run ios:open
```

## Recommended flow

1. Build the web app:

```bash
npm run build
```

2. Add the iOS project once:

```bash
npm run ios:add
```

3. Sync web assets into Capacitor:

```bash
npm run ios:sync
```

4. Open in Xcode on macOS:

```bash
npm run ios:open
```

## Local runtime on iOS

- For cloud mode, ship the app with normal bundled assets.
- For local mode, point the runtime base URL to the local MADAD host IP such as `http://192.168.x.x:4000`.
- Avoid `localhost` on physical devices because it points to the device itself.

## Dev server mode

If you want Capacitor to load a live dev server temporarily, set:

```bash
CAP_SERVER_URL=http://192.168.x.x:3000
```

Then run sync/open again.

## Note

The final native build, signing, simulator/device deployment, and App Store packaging still require macOS with Xcode.
