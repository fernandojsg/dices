# Dice Roller

Physics-based 3D dice roller built with [Three.js](https://threejs.org/) and [Cannon-ES](https://pmndrs.github.io/cannon-es/). Works offline as an installable PWA.

## Features

- **3D physics simulation** — realistic dice rolling with shadows and lighting
- **All standard dice** — d4, d6, d8, d10, d12, d20
- **Per-die customization** — custom names and colors from a 12-color palette
- **Simple 2D mode** — quick animated card-based rolls without 3D
- **Presets** — built-in and custom dice pool presets
- **Offline PWA** — installable on mobile, works without internet
- **Haptic feedback** — vibration on roll (Android)

## Getting Started

Serve the project with any static file server:

```bash
npx serve .
```

Then open `http://localhost:3000` in your browser.

On mobile, use "Add to Home Screen" to install it as a standalone app.

## Tech Stack

- **Three.js** — 3D rendering
- **Cannon-ES** — physics engine
- **Vanilla JS** — no framework, ES modules
- Zero build step — just static files

## License

MIT
