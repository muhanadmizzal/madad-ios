# MADAD iOS Release Checklist

## Native project

- Bundle ID: `iq.madad.platform`
- App name: `MADAD`
- Build command: `npm run ios:sync`
- Open in Xcode: `npm run ios:open`

## Local runtime behavior

- Use the server host IP, not `localhost`, for local mode on real devices
- Example:
  - Web app: `http://192.168.0.189:3000`
  - Local API: `http://192.168.0.189:4000`

## Xcode tasks on macOS

- Set Apple Team and signing profile
- Set deployment target
- Confirm app icon and launch screen in `Assets.xcassets`
- Test on:
  - iPhone with notch
  - iPhone without notch
  - iPad if supported
- Verify:
  - login flow
  - local mode switching
  - local runtime connectivity
  - offline behavior
  - Arabic RTL layout
  - keyboard overlap on forms

## App Store Connect draft metadata

- Name: `MADAD`
- Subtitle: `Unified Business Platform`
- Category: `Business`
- Description:
  - `MADAD brings HR, bookings, inventory, finance, and local-runtime access together in one unified business platform.`
- Keywords:
  - `HR, ERP, inventory, finance, bookings, workforce, business`

## Recommended next assets

- Replace Capacitor default splash images with MADAD branded splash artwork
- Replace default app icon set with MADAD production icon exports
- Add privacy details for any production analytics, notifications, or cloud AI features before App Store submission
