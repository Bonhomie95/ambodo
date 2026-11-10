# Ambodo

Both homes. One family. Calm, court-ready co-parenting for iOS & Android.

```
app/     Expo (SDK 58) app — Expo Router, Reanimated 4, native tabs
server/  Node API (stdlib http + MongoDB driver)
```

## Run

```bash
cd server && cp .env.example .env && npm install && npm start   # API on :4000
cd app && npm install && npm run ios        # or: npm run android
```

Swap `MONGODB_URI` in `server/.env` for your Atlas string to go live — nothing else changes.
Point devices/production at the API with `EXPO_PUBLIC_API_URL`.

Demo family: `cd server && npm run seed` → sign in as `ada@demo.ambodo.app` or `bo@demo.ambodo.app` (password in `server/seed.mjs`).

iOS builds need an Xcode whose simulator runtime is installed. If the default one isn't, run e.g.
`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run ios`.

## Checks

```bash
cd server && npm test && npm run smoke      # unit + end-to-end (needs the API running)
cd app && npm test && npm run typecheck && npx eslint src
```

## Brand

`npm run brand` (in `app/`) regenerates every icon and splash asset from the vector "b·d" mark —
b and d are the two homes, the dot is the kid. iOS ships an Icon Composer `.icon` (Liquid Glass);
Android ships adaptive + themed (monochrome) icons.
