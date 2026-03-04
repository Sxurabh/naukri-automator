# 🐳 Naukri Automator — Docker Setup Guide

Get the Naukri job application bot running on your machine in 3 simple steps!

---

## Prerequisites

You only need **one thing** installed:

👉 **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (free for personal use)

Download and install it for your OS (Windows / Mac / Linux). Make sure it's **running** before proceeding.

---

## 🚀 Quick Start

### Step 1: Get the code

**Option A** — If you have Git:
```bash
git clone https://github.com/Sxurabh/naukri-automator.git
cd naukri-automator
```

**Option B** — No Git? Download the ZIP from GitHub, extract it, and open a terminal inside the folder.

---

### Step 2: Build & Run

Run this single command inside the project folder:

```bash
docker compose up --build
```

> ⏳ The **first build** takes 3-5 minutes (downloads Node.js, Chromium, etc.). Subsequent starts are instant.

You'll see logs like:
```
naukri-automator  | ▲ Next.js 15.x
naukri-automator  |   - Local: http://localhost:3000
naukri-automator  | ✓ Ready in Xs
```

---

### Step 3: Open the Dashboard

Open your browser and go to:

### 👉 **http://localhost:3000**

You'll see the **NAUKRI OPS** tactical dashboard!

---

## 📋 How to Use

1. **Get your Naukri cookie:**
   - Log into [naukri.com](https://www.naukri.com) in your browser
   - Open **Developer Tools** (press `F12`)
   - Go to **Application** tab → **Cookies** → `www.naukri.com`
   - Find the cookie named **`nauk_at`** and copy its **Value**

2. **Paste the cookie** into the "AGENT AUTH TOKEN" box in the dashboard

3. **Select a Target Sector** (e.g., "For You", "Based on Skills")

4. **Go to Settings** → Set "Jobs Per Mission" (up to 50)

5. **Click "INITIATE MISSION"** → Watch the live logs as the bot applies to jobs!

---

## 🔄 Daily Usage

To start the app again after stopping:

```bash
docker compose up
```

To stop:
```bash
docker compose down
```

Or press `Ctrl + C` in the terminal where it's running.

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 already in use | Stop other apps using port 3000, or change the port in `docker-compose.yml`: `"3001:3000"` then visit `localhost:3001` |
| Docker build fails | Make sure Docker Desktop is running. Try `docker compose down` then `docker compose up --build` |
| Cookie expired error | Get a fresh `nauk_at` cookie from Naukri (they expire periodically) |
| App is slow to start first time | Normal! First build downloads ~1GB of dependencies. Future starts are instant |

---

## 📌 Notes

- The bot runs **headlessly** inside Docker (no visible browser window). All progress is shown via **live logs** in the dashboard.
- Your Naukri cookie is stored locally in your browser's `localStorage` — it's never sent anywhere except to naukri.com.
- Settings and applied job history persist in your browser between sessions.

---

**Happy job hunting! 🎯**
