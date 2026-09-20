# live-sim ⚡📱

> **Zero-Push Live iOS Simulator Streaming with Sub-Second Fast Refresh (<1s)** for React Native & Expo developers on Windows, Linux, and macOS.

Instead of waiting 15–25 minutes for every code change to compile on GitHub Actions, **`live-sim`** boots a high-speed remote Apple Silicon iOS Simulator in the cloud **once** (~60s) and connects it directly to your Windows machine's local Metro server (`localhost`) over a tunnel!

```bash
cd my-expo-app
live-sim start
```

```
› Preparing live development session
✓ Local Metro tunnel active: exp://xxxx.exp.direct:80
› Launching cloud iOS Simulator runner (session: 8f2a1b9c)
✓ Dispatched simulator runner on Apple Silicon macOS image
✓ iOS Simulator is live and connected to your PC!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📱 iOS Simulator Live Stream (Zero-Push Mode)
  🔗 Stream URL:   https://calm-river-1234.trycloudflare.com/?k=...
  ⚡ Local Server: exp://xxxx.exp.direct:80
  ⏱️  Session:      Active for 60 minutes with Fast Refresh (<1s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Edit any code file in your project and save — changes will update instantly on the simulator!
```

---

## 🚀 Why `live-sim`?

| Feature | Standard CI Rebuild (`native-sim up`) | `live-sim start` (Zero-Push Mode) |
|---|---|---|
| **Wait Time on File Save** | 15–25 minutes (Full rebuild) | **< 1 second (Instant Fast Refresh)** |
| **Git Commits / Pushes** | Required on every test | **0 Git Pushes (Zero-Push)** |
| **Simulator Boot Time** | ~25 minutes | **~60 seconds** |
| **Where Code Runs** | Compiled remotely on GitHub | **Bundled live from your local PC** |

---

## 📦 Installation

```bash
npm install -g live-sim
```

Or run directly with `npx`:

```bash
npx live-sim start
```

---

## ⚡ Prerequisites

1. **Node.js** (v18+)
2. **Git**
3. **GitHub CLI (`gh`)**:
   ```bash
   winget install GitHub.cli
   gh auth login
   ```

---

## 🛠️ Commands

| Command | Description |
|---|---|
| `live-sim start` | Start local Metro bundler + boot cloud iOS simulator + stream *(default)* |
| `live-sim doctor` | Perform diagnostic check of environment and prerequisites |
| `live-sim init` | Scaffold `.github/workflows/live-sim.yml` and auth gate into project |
| `live-sim status` | Inspect active session, tunnel link, and stream URL |
| `live-sim down` | Cancel remote runner and stop local Metro session |

---

## ⚙️ Options (`live-sim start`)

| Flag | Default | Description |
|---|---|---|
| `--minutes <n>` | `60` | Stream duration in minutes (max 350) |
| `--device <name>` | `iPhone 16 Pro` | Target iOS Simulator device |
| `--fps <n>` | `30` | Stream framerate (FPS) |
| `--quality <n>` | `0.7` | MJPEG image quality (0.05 - 1.0) |
| `--public` | `true` | Create public repo (**unlimited free GitHub Actions minutes**) |
| `--no-open` | `false` | Do not automatically launch browser |

---

## 📄 License

MIT License
