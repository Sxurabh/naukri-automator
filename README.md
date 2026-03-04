<p align="center">
  <img src="public/reticle.svg" width="80" alt="Naukri Ops Logo"/>
</p>

<h1 align="center">NAUKRI OPS</h1>

<p align="center">
  <strong>🎯 Your Tactical Job Application Automator for Naukri.com</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Playwright-1.55-2EAD33?style=flat-square&logo=playwright" alt="Playwright"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License"/>
</p>

<p align="center">
  <em>Stop wasting hours clicking "Apply" manually.<br/>
  Let the agent handle it while you prep for interviews.</em>
</p>

---

## ⚡ What Is This?

**Naukri Ops** is a sleek, tactical-themed web dashboard that automates bulk job applications on [naukri.com](https://www.naukri.com). It uses browser automation (Playwright) to navigate the Recommended Jobs page, select jobs in smart batches of 5, and apply — all while you watch the live mission feed.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎛️ **Tactical Dashboard** | Military-inspired dark UI with real-time mission logs |
| 📦 **Smart Batching** | Applies to 5 jobs per batch, then reloads for the next 5 |
| 🎯 **Up to 50 Jobs/Mission** | Configurable target — the agent loops until it hits the quota |
| 🕵️ **Stealth Mode** | Randomized human-like delays between actions |
| 📋 **Job Section Selector** | Auto-detects all your Naukri recommendation tabs |
| 📊 **Mission Archive** | Full history of every mission with detailed logs |
| 🐳 **Docker Ready** | Share with friends — one command to run |

---

## 🖥️ Dashboard Preview

```
┌─────────────────────────────────────────────────────┐
│  NAUKRI OPS                                         │
│  v1.4.0 / AUTOMATOR                                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 🔑 AUTH  │  │ 💼 SECTOR│  │ 🎯 MISSION CTRL  │  │
│  │ TOKEN    │  │          │  │                   │  │
│  │ ******** │  │ FOR YOU  │  │ TARGET: FOR YOU   │  │
│  │          │  │ SKILLS ✓ │  │ STATUS: STANDBY   │  │
│  │          │  │ PROFILE  │  │                   │  │
│  │          │  │ PREF     │  │ [INITIATE MISSION]│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  🤖 LIVE MISSION FEED                               │
│  ─────────────────────────────────────────────      │
│  > [INIT] Mission RUN-20260304 started...           │
│  > Scanning for new jobs to apply to...             │
│  > Found 12 new jobs. Preparing batch of 5...       │
│  > Selected 5 jobs. Clicking Apply...               │
│  > SUCCESS: Applied to 5 jobs                       │
│  > Navigating back to Recommended Jobs...           │
│  > Found 7 new jobs. Preparing batch of 5...        │
│  > Agent active. Awaiting field response...  █      │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Sxurabh/naukri-automator.git
cd naukri-automator

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Start the dev server
npm run dev
```

Open **http://localhost:3000** and you're in! 🎯

---

## 🐳 Docker (Share With Friends)

Don't want to install Node.js? Just use Docker!

```bash
docker compose up --build
```

Then open **http://localhost:3000**. That's it.

> 📖 See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed instructions.

---

## 📋 How To Use

### 1. Get Your Naukri Cookie

1. Log into [naukri.com](https://www.naukri.com) in your browser
2. Press `F12` → **Application** tab → **Cookies** → `www.naukri.com`
3. Copy the value of **`nauk_at`**

### 2. Configure & Launch

1. Paste your cookie into the **AGENT AUTH TOKEN** field
2. Select a **Target Sector** (e.g., "For You", "Based on Skills")
3. Go to **Settings** → set your **Jobs Per Mission** (up to 50)
4. Toggle **Stealth Mode** on for human-like behavior
5. Hit **INITIATE MISSION** and watch the live feed! 🚀

### 3. Monitor & Review

- **Live Mission Feed** — real-time logs of every action
- **Applied Jobs** — track all jobs applied to across sessions
- **Mission Archive** — review past mission results and logs

---

## ⚙️ Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Jobs Per Mission | 5 | 1–50 | Total applications per session (batched in groups of 5) |
| Stealth Mode | ON | — | Adds random 0.5–2.5s delays between actions |
| Desktop Notifications | OFF | — | Browser notifications on mission complete |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **UI Components** | Radix UI, Lucide Icons |
| **Automation** | Playwright, @sparticuz/chromium (serverless) |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Project Structure

```
naukri-automator/
├── src/app/
│   ├── page.tsx              # Main tactical dashboard
│   ├── views/
│   │   ├── settings.tsx      # Agent configuration panel
│   │   ├── agent-logs.tsx    # Mission archive view
│   │   └── applied-jobs.tsx  # Applied jobs tracker
│   ├── lib/
│   │   ├── naukriAutomator.ts  # Core Playwright automation engine
│   │   └── getNaukriSections.ts # Section fetcher
│   └── api/
│       ├── start-automation/   # SSE endpoint for live logs
│       └── get-sections/       # Sections API
├── components/ui/            # Reusable UI components
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # One-command deployment
└── DOCKER_SETUP.md           # Setup guide for friends
```

---

## 🛡️ Security & Privacy

- 🔒 Your Naukri cookie is stored **only in your browser's localStorage**
- 🚫 No data is sent to any third-party server
- 🏠 Everything runs **locally on your machine** (or your Docker container)
- 🔑 The cookie is only used to authenticate with naukri.com directly

---

## ⚠️ Disclaimer

This tool is for **educational and personal productivity purposes only**. Use it responsibly and in accordance with Naukri's Terms of Service. The authors are not responsible for any account restrictions that may result from automated usage. Always use **Stealth Mode** to minimize detection risk.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with ☕ and frustration of clicking "Apply" 1000 times</strong><br/>
  <sub>Made by <a href="https://github.com/Sxurabh">@Sxurabh</a></sub>
</p>
