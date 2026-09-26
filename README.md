# ReApparel — Mindful Closet & Shopping Addiction Recovery

A mindful closet utilization and shopping addiction recovery web platform aligned with UN SDG 12.

---

## 🚀 How to Deploy Online (Get a Public Website URL)

You can deploy ReApparel for free so that anyone can access it on their phone, tablet, or computer.

### Option 1: Deploy to Vercel (Recommended & Fastest)
1. **Push your code to GitHub:**
   - Create a repository on [GitHub](https://github.com/new) named `reapparel`.
   - Upload this project folder to your repository (or use VS Code's "Publish to GitHub" button).
2. **Import into Vercel:**
   - Go to [Vercel](https://vercel.com/) and sign up / log in with GitHub.
   - Click **"Add New Project"** and select your `reapparel` repository.
   - Vercel will automatically detect **Vite**.
   - Under **Environment Variables**, add:
     - `GEMINI_API_KEY`: *(Optional - your Google Gemini API key)*
     - `VITE_SUPABASE_URL`: *(Optional - if using cloud Supabase)*
     - `VITE_SUPABASE_ANON_KEY`: *(Optional - if using cloud Supabase)*
   - Click **Deploy**. In under a minute, you will receive a live URL (e.g., `https://reapparel.vercel.app`).

---

### Option 2: Deploy to Netlify
1. Go to [Netlify](https://www.netlify.com/) and log in.
2. Click **"Add new site"** -> **"Import an existing project"** -> connect to GitHub.
3. Select your `reapparel` repo.
4. Netlify will use the included [`netlify.toml`](netlify.toml) settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy Site**.

---

### Option 3: Deploy to Render (Full-Stack with Node Backend)
If you want the Express backend server (`server.ts`) running 24/7 for live web scraping:
1. Go to [Render](https://render.com/) and log in with GitHub.
2. Click **"New +"** -> **"Web Service"**.
3. Select your `reapparel` repository.
4. Render will read the included [`render.yaml`](render.yaml):
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Click **Create Web Service**. You will get a free `.onrender.com` public URL.

---

## 💻 Local Development

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (optional).
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
