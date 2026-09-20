# live-sim ⚡📱

> **Zero-Push Live iOS Simulator Streaming with Sub-Second Fast Refresh (<1s)** for React Native & Expo developers on Windows, Linux, and macOS.

[![GitHub Repo](https://img.shields.io/badge/GitHub-Venkatasai08%2Flive--sim-blue?logo=github)](https://github.com/Venkatasai08/live-sim)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Upgraded Evolution of `native-sim`

**`live-sim` is an upgraded, next-generation evolution inspired by [bidah/native-sim](https://github.com/bidah/native-sim).**

### 💡 The Big Difference: Live Development vs. Post-Build Testing

* **In [native-sim](https://github.com/bidah/native-sim)**:
  * Pushes code to GitHub Actions and runs a full Xcode build.
  * **You can only test the app *after* the entire 15–25 minute build completes.**
  * Every single bug fix or UI change requires another `git commit`, `git push`, and another 15–25 minute wait.

* **In `live-sim` (Zero-Push Live Mode)**:
  * Boots a cloud Apple Silicon iOS Simulator in ~60 seconds with pre-installed Expo Go and connects directly to your Windows machine's local Metro server (`localhost:8081`) over a high-speed secure tunnel.
  * **You test your app *live while coding* with instant Fast Refresh (<1s) on every file save!**
  * **Zero Git commits, zero pushes, and zero CI build wait times** during your entire development session.

---

## 📊 Feature Comparison

| Feature | [native-sim](https://github.com/bidah/native-sim) | `live-sim` (This Project) ⚡ |
|---|---|---|
| **Primary Purpose** | Testing static builds on iOS | **Active live development & coding** |
| **When Can You Test?** | **Only after completion of full build** | **Live in real-time as you code** |
| **Wait Time on File Save** | 15–25 minutes (Full Xcode rebuild) | **< 1 second (Instant Fast Refresh)** |
| **Git Push Required on Changes?** | Yes, on every test iteration | **No (Zero-Push Live Mode)** |
| **Simulator Startup Time** | 15–25 minutes | **~60 seconds** |
| **Where Code Runs** | Static compiled app on CI | **Bundled live from your local PC** |
| **Cross-Platform Support** | Windows, Linux, macOS | Windows, Linux, macOS |

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

## 🤝 Credits & Acknowledgements

* Inspired by [bidah/native-sim](https://github.com/bidah/native-sim) for pioneer work on remote iOS simulator streaming.
* Powered by Apple Silicon macOS GitHub Actions runners, `@expo/serve-sim`, and Cloudflare Quick Tunnels.

---

## 📄 License

MIT License © 2026
