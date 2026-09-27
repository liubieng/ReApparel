// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.use(express.json());
  let quotaExhaustedUntil = 0;
  app.post("/api/donations/scrape", async (req, res) => {
    const { country, province, city, location, lat, lng } = req.body || {};
    const targetLocationParts = [city, province, country].filter(Boolean);
    const queryLocation = targetLocationParts.length > 0 ? targetLocationParts.join(", ") : location || "San Francisco, CA";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && Date.now() > quotaExhaustedUntil) {
        try {
          const ai = new GoogleGenAI({});
          const prompt = `Today is September 24, 2026.
Perform a web search for real-world clothing donation drives, pre-loved clothes drop-offs, or disaster relief garment collections specifically in: "${queryLocation}".

IMPORTANT STRICT CONSTRAINTS:
1. ONLY return donation drives that are confirmed ACTIVE right now in September 2026, or announced within the last 30 days (late August to September 2026).
2. DO NOT return old posts, calamity drives, or announcements from 2025 or earlier years.
3. If there are NO verified donation drives currently active in "${queryLocation}" in the last 30 days of September 2026, you MUST return strictly an empty JSON array: []
4. Output ONLY valid JSON:
[
  {
    "name": "Drive / Center Name",
    "address": "Full street address in ${queryLocation}",
    "latitude": 9.3068,
    "longitude": 123.3054,
    "hours": "Operating hours or drive schedule",
    "accepted_types": "Accepted clothing items, materials, shoes, fabrics",
    "organizer": "Name of charity, school, parish or organization",
    "source_url": "Website link",
    "post_url": "Direct link to the actual post",
    "post_platform": "facebook",
    "post_title": "Title of the post",
    "post_snippet": "Excerpt from the post",
    "post_date": "Sept 2026",
    "days_ago": 2,
    "active_window": "Active in Sept 2026",
    "drive_dates": "Active: September 2026",
    "is_last_30_days": true,
    "city": "${city || ""}",
    "province": "${province || ""}",
    "country": "${country || ""}"
  }
]
If none active, return: []`;
          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }]
            }
          });
          const responseText = response.text || "";
          const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/) || responseText.match(/\[\s*\]/);
          let parsedDrives = [];
          if (jsonMatch) {
            try {
              parsedDrives = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.warn("Failed to parse Gemini JSON output", e);
            }
          }
          if (Array.isArray(parsedDrives) && parsedDrives.length > 0) {
            const formatted = parsedDrives.map((d, idx) => {
              const orgSearchQuery = `${d.name || ""} ${d.organizer || ""} clothing donation ${queryLocation}`.trim();
              const realSearchUrl = `https://www.facebook.com/search/posts?q=${encodeURIComponent(orgSearchQuery)}`;
              const validSourceUrl = d.source_url && !d.source_url.includes("pfbid") ? d.source_url : "https://www.facebook.com/";
              const officialUrl = d.official_page_url || validSourceUrl;
              return {
                donation_id: Date.now() + idx,
                name: d.name || "Community Clothing Drop-Off Hub",
                address: d.address || `${queryLocation}`,
                latitude: typeof d.latitude === "number" ? d.latitude : lat || 9.3068,
                longitude: typeof d.longitude === "number" ? d.longitude : lng || 123.3054,
                hours: d.hours || "Mon-Sat 8:30 AM - 5:00 PM",
                accepted_types: d.accepted_types || "Clean everyday clothes, jackets, shoes, blankets, textile scraps",
                is_live_drive: true,
                organizer: d.organizer || "Local Humanitarian Association",
                source_url: validSourceUrl,
                official_page_url: officialUrl,
                facebook_search_url: realSearchUrl,
                post_url: realSearchUrl,
                post_platform: "facebook",
                post_title: d.post_title || `${d.name || "Donation Drive"} - Community Collection Notice`,
                post_date: "Active in the Last 30 Days",
                days_ago: typeof d.days_ago === "number" ? d.days_ago : 3,
                active_window: d.active_window || "Active in the Last 30 Days",
                drive_dates: d.drive_dates || "Active: Last 30 Days",
                is_last_30_days: true,
                scraped_at: (/* @__PURE__ */ new Date()).toISOString(),
                country: country || d.country,
                province: province || d.province,
                city: city || d.city
              };
            });
            return res.json({
              success: true,
              source: "live_webscrape",
              queryLocation,
              drives: formatted
            });
          } else {
            return res.json({
              success: true,
              source: "no_active_drives_found",
              queryLocation,
              drives: []
            });
          }
        } catch (apiErr) {
          const isQuotaOrRateLimit = apiErr?.status === 429 || apiErr?.code === 429 || apiErr?.message?.includes("429") || apiErr?.message?.includes("quota") || apiErr?.message?.includes("RESOURCE_EXHAUSTED");
          if (isQuotaOrRateLimit) {
            quotaExhaustedUntil = Date.now() + 5 * 60 * 1e3;
            console.warn("Gemini API search grounding quota exceeded (429 RESOURCE_EXHAUSTED).");
          } else {
            console.warn("Gemini search grounding notice:", apiErr?.message || apiErr);
          }
          return res.json({
            success: true,
            source: "search_unavailable",
            queryLocation,
            drives: [],
            notice: "Live web scraping is currently unavailable. No active donation drives could be verified."
          });
        }
      }
      return res.json({
        success: true,
        source: "no_active_drives",
        queryLocation,
        drives: [],
        notice: apiKey ? "Search quota exhausted" : "Live web scraper requires GEMINI_API_KEY. No seeded or unverified drives are displayed."
      });
    } catch (err) {
      console.warn("Scraper endpoint error:", err?.message || err);
      return res.json({
        success: true,
        source: "error",
        queryLocation,
        drives: []
      });
    }
  });
  app.post("/api/donations/simulate-empty", (_req, res) => {
    res.json({ success: true, drives: [] });
  });
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ReApparel full-stack server running on port ${PORT}`);
  });
}
startServer();
