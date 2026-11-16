# Автоэфир для Windows

The Windows installer is built from this folder with Node.js 22.12 or newer:

```powershell
npm ci
npm run dist:desktop
```

The installer is written to `release/`. The desktop shell starts the bundled
application server on loopback and opens it in a secured Electron window.
