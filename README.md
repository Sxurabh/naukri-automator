<p align="center">
  <img src="public/logo.png" width="150" alt="RozgaarBot Logo"/>
</p>

<h1 align="center">🤖 RozgaarBot</h1>

<p align="center">
  <strong>Your AI-Powered Job Application Commando — Because Clicking "Apply" 200 Times is a Full-Time Job in Itself</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Playwright-1.55-2EAD33?style=flat-square&logo=playwright" alt="Playwright"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/Platform-Naukri.com-FF6B35?style=flat-square" alt="Naukri"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/Job%20Hunt-Automated-brightgreen?style=flat-square" alt="Automated"/>
</p>

<p align="center">
  <em>
    Stop wasting your precious chai breaks clicking "Apply" like a machine.<br/>
    Let the actual machine do it. You focus on cracking those interviews. 🎯
  </em>
</p>

---

## 🤔 Wait, What Even Is This?

Imagine having a tireless intern who wakes up at 10 AM IST every day, logs into Naukri.com, and applies to every relevant job on your behalf — without complaining, without a salary, and without accidentally sending your resume to the wrong company.

That intern is **RozgaarBot**.

**RozgaarBot** is a sleek, military-themed web dashboard that automates bulk job applications on [Naukri.com](https://www.naukri.com). It uses browser automation (Playwright) to navigate the Recommended Jobs page, intelligently batch-apply to jobs in groups of 5, and log every action in a real-time mission feed — all while you sip chai and rehearse answers for "Tell me about yourself."

> 💡 **Pro Tip:** RozgaarBot applies to jobs. You still have to attend the interviews. Sorry, we're working on that. (See Roadmap.)

---

## ✨ Features That'll Make Your HR Aunt Proud

| Feature | Description |
|---------|-------------|
| 🎛️ **Tactical Mission Dashboard** | Military-dark UI with live mission logs. Feel like a hacker. Apply like a pro. |
| 📦 **Smart Batch Applying** | 5 jobs per batch, then reloads for the next 5. Clean. Efficient. Unstoppable. |
| 🎯 **Up to 50 Jobs / Mission** | Configurable target — the agent loops until it hits your quota or runs out of jobs. |
| 🕵️ **Stealth Mode** | Randomized human-like delays between clicks, because Naukri shouldn't know it's a robot (shh). |
| 📋 **Smart Section Selector** | Auto-detects all your Naukri recommendation tabs — "For You", "Based on Skills", and more. |
| 🧠 **AI Question Bank** | Learns screening questions from Naukri forms, lets you pre-answer them, then auto-fills next time. |
| 📊 **Mission Archive** | Full history of every run — dates, counts, logs. Because data is sexy. |
| 🐳 **Docker Ready** | Share with friends — one command and they're in business. Literally. |

---

## 🖥️ Dashboard Preview

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 ROZGAARBOT                          v1.4.0 / COMMANDO   │
│─────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  🔑 AUTH     │  │  💼 SECTOR   │  │  🎯 MISSION CTRL  │  │
│  │              │  │              │  │                   │  │
│  │  nauk_at:    │  │  ● FOR YOU   │  │  TARGET: 50 JOBS  │  │
│  │  *********** │  │  ○ SKILLS    │  │  STATUS: STANDBY  │  │
│  │              │  │  ○ PROFILE   │  │                   │  │
│  │              │  │  ○ PREF      │  │ [INITIATE MISSION]│  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  🤖 LIVE MISSION FEED                                       │
│  ─────────────────────────────────────────────────────      │
│  > [INIT] Mission RUN-20260307 started...                   │
│  > Scanning for new jobs to apply to...                     │
│  > Found 12 new jobs. Preparing batch of 5...               │
│  > Selected 5 jobs. Clicking Apply...                       │
│  > SUCCESS: Applied to 5 jobs. You're practically hired.   │
│  > Navigating back to Recommended Jobs...                   │
│  > Found 7 new jobs. Preparing batch of 5...                │
│  > Agent active. Total applied: 10/50... █                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

- **Node.js** 20+ ([download here](https://nodejs.org))
- **npm** (comes with Node.js)
- A **Naukri.com** account (obviously)
- A **dream** (optional, but recommended)

### Installation

```bash
# Clone the repo
git clone https://github.com/Sxurabh/rozgaarbot.git
cd rozgaarbot

# Install dependencies
npm install

# Install Playwright browsers (the actual clicking engine)
npx playwright install chromium

# Fire it up
npm run dev
```

Open **http://localhost:3000** and let the bot do the heavy lifting. 🎯

---

## 🐳 Docker Setup (For the "I Don't Want to Install Anything" Crowd)

No Node.js? No problem. No excuses either.

```bash
docker compose up --build
```

Open **http://localhost:3000**. That's literally it. Go touch grass.

> 📖 See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed instructions including troubleshooting for when Docker inevitably does something weird.

---

## 📋 How To Use (Step-by-Step)

### Step 1: Get Your Naukri Auth Cookie

1. Log into [naukri.com](https://www.naukri.com) in your browser
2. Press `F12` → **Application** tab → **Cookies** → `www.naukri.com`
3. Find and copy the value of **`nauk_at`**

> 🔐 This is your authentication token. Keep it private. Don't paste it in your WhatsApp status.

### Step 2: Configure Your Mission

1. Paste your cookie into the **AGENT AUTH TOKEN** field
2. Click **"Load Sections"** to auto-detect your Naukri recommendation tabs
3. Select a **Target Sector** (e.g., "For You", "Based on Skills", "Based on Profile")
4. Go to **Settings** → set your **Jobs Per Mission** (1–50)
5. Toggle **Stealth Mode** ON (highly recommended — the bot takes natural pauses like a human would)

### Step 3: Initiate Mission 🚀

Hit **INITIATE MISSION** and watch the live feed scroll like a movie hacking scene.

### Step 4: Answer Screening Questions (Smart Mode)

Some jobs have sidebar questionnaires. RozgaarBot detects these questions and stores them in the **Question Bank**. Go answer them once, and the bot will auto-fill them for matching jobs in future missions. Work smarter, not harder.

### Step 5: Review Your Mission

- **Live Mission Feed** — real-time logs of every click and action
- **Applied Jobs** — full list of every job applied to, across all sessions
- **Mission Archive** — review past mission results and counts

---

## ⚙️ Configuration Reference

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| **Jobs Per Mission** | 5 | 1–50 | Total applications per session (batched in groups of 5) |
| **Stealth Mode** | ON | — | Random 0.5–2.5s delays between actions to mimic human behavior |
| **Desktop Notifications** | OFF | — | Get a browser notification when a mission completes |

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15, React 19, TailwindCSS | Fast, modern, looks great |
| **UI Components** | Radix UI, Lucide Icons | Accessible and clean |
| **Automation Engine** | Playwright | The best browser automation tool. Period. |
| **Cloud Automation** | @sparticuz/chromium | Serverless-compatible Chromium |
| **Containerization** | Docker, Docker Compose | Share with friends in one command |


---

## 📁 Project Structure

```
rozgaarbot/
├── src/
│   └── app/
│       ├── page.tsx                  # Main dashboard
│       ├── layout.tsx                # App shell
│       ├── api/
│       │   ├── start-automation/     # 🚀 Triggers the Playwright bot
│       │   ├── get-sections/         # 📋 Fetches Naukri recommendation tabs
│       │   └── update-bank/          # 🧠 Updates the question bank
│       ├── lib/
│       │   ├── naukriAutomator.ts    # 🤖 Core automation logic
│       │   ├── chatbotHandler.ts     # 💬 Handles screening Q&A
│       │   ├── getNaukriSections.ts  # 🔍 Section detection
│       │   └── questionBank.ts       # 🗃️ Question storage & retrieval
│       └── views/
│           ├── agent-logs.tsx        # 📡 Live mission feed
│           ├── applied-jobs.tsx      # 📊 Application history
│           ├── question-bank.tsx     # 🧠 Q&A manager
│           └── settings.tsx          # ⚙️ Configuration panel
├── components/ui/                    # Shared UI components
├── docker-compose.yml
└── Dockerfile
```

---

## 🛡️ Is This Safe?

**Legally?** You're applying to public job listings. That's... kind of the point of a job portal.

**Account Safety?** Stealth Mode adds human-like delays between actions. Don't set it to apply 50 jobs every 5 minutes and you'll be fine.

**Data Privacy?** Your `nauk_at` cookie is stored locally in your browser. It never leaves your machine. We're not in the business of stealing your job applications.

> ⚠️ **Disclaimer:** Use responsibly. RozgaarBot is a productivity tool, not a magic employment machine. The quality of your resume still matters. Unfortunately.

---

## 🗺️ Roadmap — The Grand Vision of Rozgaar Domination

We're just getting started. Here's where RozgaarBot is headed:

### ✅ Phase 1 — Naukri.com *(Current)*
- [x] Bulk apply on Naukri.com
- [x] Smart batch applying (5 at a time)
- [x] Stealth mode
- [x] Question Bank with auto-fill
- [x] Mission archive & logs
- [x] Docker support

### 🔄 Phase 2 — Indian Job Portals Domination
- [ ] **Shine.com** integration
- [ ] **TimesJobs** integration  
- [ ] **Freshersworld** integration
- [ ] **Instahyre** integration
- [ ] **Hirist.tech** integration (for tech folks)
- [ ] **foundit (Monster India)** integration
- [ ] Unified dashboard — one mission, all portals

### 🌍 Phase 3 — Global Expansion
- [ ] **LinkedIn Easy Apply** automation
- [ ] **Indeed** one-click apply automation
- [ ] **Internshala** integration (for freshers & interns)
- [ ] **Wellfound (AngelList)** startup job automation
- [ ] **Glassdoor** apply integration

### 🧠 Phase 4 — AI-Powered Intelligence
- [ ] **AI Resume Tailoring** — auto-customize resume summary per job description
- [ ] **Smart Filtering** — skip jobs below a salary threshold or at blacklisted companies
- [ ] **Duplicate Detection** — never apply to the same company twice
- [ ] **Application Score** — AI rates how good a fit you are before applying
- [ ] **Cover Letter Generator** — auto-generate personalized cover letters per job

### 🚀 Phase 5 — The Endgame
- [ ] **Interview Scheduler Bot** — accept/reschedule interview calls automatically (we're joking... mostly)
- [ ] **Multi-profile Support** — manage multiple people's job hunts from one dashboard
- [ ] **Analytics Dashboard** — success rates, response rates, top companies, conversion funnels
- [ ] **Mobile App** — monitor your bot's missions from your phone while you're... at an interview it booked

---

## 🤝 Contributing

Contributions are very welcome! Whether it's a new job portal integration, a bug fix, or just better comments in the code — we appreciate it all.

```bash
# Fork → Clone → Branch → Code → PR
git checkout -b feature/indeed-integration
# Make your changes
git commit -m "feat: add Indeed Easy Apply support"
git push origin feature/indeed-integration
# Open a Pull Request 🙏
```

Please keep PRs focused and include a description of what you changed and why. Bonus points if you also write a test. Double bonus points if it actually works.

---

## ⚖️ License

MIT License — free to use, fork, modify, and share. Just don't sell it as a SaaS without giving back to the community. Karma is real, and so is GitHub.

---

## 🙏 Acknowledgements

- [Playwright](https://playwright.dev/) — for making browser automation not a nightmare
- [Next.js](https://nextjs.org/) — for the world's most developer-friendly full-stack framework
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium) — for making Chromium run in serverless environments
- [Radix UI](https://www.radix-ui.com/) — for accessible, headless UI components
- Every job seeker who has ever spent 3 hours manually clicking "Apply" — this one's for you. 💪

---

<p align="center">
  <strong>Made with ❤️, ☕, and mild frustration at the Indian job market</strong><br/>
  <em>RozgaarBot — Because your talent deserves to be seen. Automatically.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Built%20by-Developers%20Who%20Were%20Tired%20of%20Applying-orange?style=flat-square" alt="Built by tired developers"/>
</p>