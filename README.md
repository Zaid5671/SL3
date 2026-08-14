# 🥀 ShelfLife

> **The Resurrection of the Living Archive.**
> 🌐 **Live Demo:** [sl-3.vercel.app](https://sl-3.vercel.app)

ShelfLife is a social, AI-augmented link curation platform built to fight the "digital graveyard" of forgotten tabs and broken bookmarks. Instead of static lists, it creates a living ecosystem that organizes itself, summarizes content, and visually decays links that go unvisited.

---

## ✨ Core Experience

* **🧠 AI Ingestion:** Paste any URL to auto-generate a title, a brief summary, and a relevant emoji icon using Groq.
* **💊 Semantic Vibes:** Links are automatically classified into unique moods like `High-Signal`, `Chaotic`, `Wholesome`, or `Cursed`.
* **🍂 Biological Decay:** Unvisited links progressively fade after 14 days. By day 31 of neglect, they are swept into the Graveyard.
* **🤝 Collaborative Rooms:** Create shared spaces featuring live cursors, real-time presence, and instant link broadcasts.
* **🔄 Context Feed:** An automated AI sweep checks your links every 5 days to determine if the content remains relevant, is updated, or has gone stale.

---

## 🛠️ The Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite, React Router 7, Framer Motion |
| **Backend** | Node.js, Express 5, MongoDB Atlas |
| **Real-Time** | Socket.IO |
| **Intelligence** | Groq SDK, Cheerio, Puppeteer |

---

## 🚀 Quick Start

Get up and running locally in minutes. Ensure you have Node.js 20+ installed.

**1. Clone the repository**

```bash
git clone https://github.com/Zaid5671/SL3.git
cd SL3

```

**2. Environment Setup**
Create `.env` files in both the `client/` and `server/` directories using their respective `.env.example` templates. You will need a **MongoDB URI** and a **Groq API Key**.

**3. Start the Backend**

```bash
cd server
npm install
npm run dev

```

**4. Start the Frontend**
Open a new terminal session:

```bash
cd client
npm install
npm run dev

```

---

## 🌍 Deployment

ShelfLife is optimized for modern cloud hosting workflows, and is currently live at **[sl-3.vercel.app](https://sl-3.vercel.app)**.

* **Frontend:** Hosted on **Vercel**.
* **Backend:** Hosted on **Render** (utilize the included `render.yaml` blueprint).
* **Database:** Hosted on **MongoDB Atlas**.

---

> *Built with curiosity. Organized by AI. Decayed by neglect.*
