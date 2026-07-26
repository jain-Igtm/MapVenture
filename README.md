# MapVenture

phone-first map with infrastructure for creating, categorizing, and notating locations via pins. 

## What it can do

- Save current locations or locations on maps.
- Categorize pins of locations without limitations.
- Search names, notes, tags, and categories.
- Attach notes, tags, visit dates, and compressed photographs.
- Open driving or walking directions in Google Maps.
- Record live GPS trails and boundaries with pause and resume controls.
- Drop feature pins without ending an active GPS survey.
- Draw trails and areas manually by tapping the map.
- Correct points, trail vertices, and polygon vertices by dragging them.
- Turn any mapped boundary into a field map for a park, property, or neighborhood.
- Assign places, trails, and areas to a field map, then focus the interface on that map.
- Export a complete JSON backup, including photographs.
- Export standard GeoJSON or import a MapVenture backup/GeoJSON file.
- Cache the app shell and recently viewed map tiles for partial offline use.
- Install to an Android home screen and run in a standalone full-screen window.
- Install a native Android APK with system location permissions and Android backup sharing.

## Privacy

All personal map data is stored locally in IndexedDB on user devices. GitHub contains only the application code. Location history, notes, photographs, and saved features are never written to the repository.

Browser storage can be cleared by the device or user, so regular complete backups are recommended.

## Development

```bash
npm install
npm run dev
```

Run the verification suite:

```bash
npm test
npm run build
```

The production build uses `/MapVenture/` as its base path for GitHub Pages.

Build and synchronize the bundled Android app:

```bash
npm run sync:android
cd android
./gradlew assembleDebug
```

The Android project uses Capacitor 8, requires Java 21 to compile, and supports Android 7
(API 24) or newer.

## Android APK

Every pull request builds an installable APK as a GitHub Actions artifact. Every merge to
`main` also creates a GitHub Release containing `MapVenture.apk` and its SHA-256 checksum.

The latest merged APK is available from:

https://github.com/jain-Igtm/MapVenture/releases/latest/download/MapVenture.apk

The APK and the GitHub Pages version use separate private databases. Export a complete JSON
backup from one installation before moving data to the other. The current CI build uses
Android's debug signing mode for personal sideloading; future production updates should use
one stable release keystore stored in GitHub Actions secrets.

## Deployment

Merging to `main` runs the verification workflow and the GitHub Pages deployment workflow. Pages must use **GitHub Actions** as its source in the repository settings.

## Mapping stack

- React and TypeScript
- MapLibre GL JS with OpenFreeMap styles
- Dexie/IndexedDB for local-first data
- Turf for geographic measurements
- Vite PWA and Workbox for installation and caching
