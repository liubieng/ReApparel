# ReApparel: Capstone / Thesis Defense Guide
**Responsible Wardrobe Utilization, Peer-to-Peer Garment Lending, & Compulsive Buying Recovery**
*Aligned with UN Sustainable Development Goal 12 (Target 12.5) & Bergen Shopping Addiction Scale (BSAS)*

---

## 1. Executive Summary & Problem Formulation

### The Problem:
- **Fast Fashion Overconsumption**: The fashion industry is responsible for 10% of global carbon emissions and over 92 million tons of textile waste annually. The average consumer wears a newly purchased garment only 7 to 10 times before discarding or forgetting it.
- **Compulsive Buying Disorder (CBD)**: Uncontrolled shopping is often used as an emotional coping mechanism, leading to financial distress, interpersonal conflict, and clutter.

### The ReApparel Solution:
ReApparel is a web platform that combines **behavioral psychology** with **digital wardrobe tracking** and **circular sharing**:
1. **Behavioral Recovery (BSAS)**: Evaluates shopping motivations using the validated 7-item Bergen Shopping Addiction Scale (Andreassen et al., 2015), tracking recovery trajectories over time.
2. **Wardrobe Accountability**: Classifies garments by baseline lifecycle ("Old" pre-existing vs "New" acquisitions) and tracks cumulative wear counts to maximize garment lifespan.
3. **Circular Peer-to-Peer Lending**: Facilitates borrowing items among connected friends with an automated conflict-detection schedule guard, preventing unnecessary purchases for short-term events.
4. **Textile Donation & Drop-off Mapping**: Connects users to local verified clothing donation drives, pre-loved hubs, and disaster relief collections.

---

## 2. System Architecture & File Structure

ReApparel follows a **Separation of Concerns (SoC)** architecture. The codebase is broken down into modular, self-contained components:

```
src/
├── App.tsx                          # Root Application Controller & Global State Coordinator (~480 lines)
├── components/
│   ├── Auth/
│   │   └── AuthView.tsx             # Authentication (Login/Register, Friend Code Login, Demo Profiles)
│   ├── BSAS/
│   │   ├── BSASIntroView.tsx        # Educational Onboarding on the 7 Clinical Dimensions
│   │   └── BSASAssessmentModal.tsx  # 7-Step Diagnostic Stepper with 0–7 Scoring & Cutoff Calculation
│   ├── VirtualCloset/
│   │   ├── VirtualClosetView.tsx    # Multi-Attribute Wardrobe Grid (Active Categories, Colors, Wear Counts)
│   │   ├── AddItemModal.tsx         # Add Garment (Single Category/Type Enforcement, Canvas BG Removal)
│   │   └── EditItemModal.tsx        # Edit Garment Details & Photos
│   ├── DailyLog/
│   │   └── DailyLogView.tsx         # Daily Outfit Logger & 00:00 Midnight Finalization Simulator
│   ├── Recovery/
│   │   └── RecoveryView.tsx         # Longitudinal BSAS Score Line Chart, Cooldown, & SDG 12 Metrics
│   ├── Friends/
│   │   ├── FriendsView.tsx          # Friend Code Exchange & Friend Wardrobe Browsing
│   │   ├── BorrowModal.tsx          # Borrow Date Selection with Schedule Overlap Conflict Guard
│   │   └── LendingDashboardView.tsx # Requests Sent & Received, Approval, & Return Tracking
│   ├── Profile/
│   │   └── ProfileView.tsx          # User Identity, Fast Profile Switcher, Account Deletion Guard
│   ├── Settings/
│   │   └── SettingsView.tsx         # Visual Theme (Dark/Light) & Supabase Connection Modal Trigger
│   ├── Navigation/
│   │   ├── Sidebar.tsx              # Desktop & Mobile Drawer Navigation with Badge Counters
│   │   └── Header.tsx               # Mobile Top App Bar with Theme Toggle
│   ├── Modals/
│   │   ├── DeleteCascadeModal.tsx   # PostgreSQL Cascade Awareness Confirmation Modal
│   │   └── ConfirmModal.tsx         # Reusable Generic Confirmation Dialog
│   ├── DatabaseModal.tsx            # Supabase Cloud Database Configuration & PostgreSQL Schema
│   └── DonationMapSection.tsx       # Interactive Google Maps & Live Geolocation Web Scraper
├── services/
│   ├── closetService.ts             # Business logic for Garments, BSAS assessments, & Daily Logs
│   ├── friendsService.ts            # Business logic for Connections and Borrow Schedules
│   ├── mapsService.ts               # Business logic for Donation drop-off hubs & flags
│   ├── donationScraperService.ts    # Live Gemini AI web scraping client
│   └── supabaseClient.ts            # Hybrid Offline MockDatabase & Live Supabase PostgreSQL client
├── types/
│   └── database.ts                  # TypeScript Entity Models matching the 11 Relational Tables
└── utils/
    └── imageProcessing.ts           # HTML5 Canvas Perceptual Color Distance & Silhouette Extraction
```

---

## 3. Core Algorithms & Scientific Grounding (What to Show the Panel)

### Algorithm 1: BSAS 7-Item Scoring & Risk Categorization
- **File**: `src/components/BSAS/BSASAssessmentModal.tsx` & `src/services/closetService.ts`
- **Theory**: Based on Andreassen et al. (2015) *The Bergen Shopping Addiction Scale*.
- **The 7 Dimensions**:
  1. *Salience*: Preoccupation with shopping in daily thought patterns.
  2. *Mood Modification*: Using shopping as an emotional regulation coping mechanism.
  3. *Conflict*: Interpersonal friction or neglect of obligations due to shopping.
  4. *Tolerance*: Escalating purchase volume/frequency to achieve identical satisfaction.
  5. *Withdrawal*: Restlessness or irritability when shopping is restricted.
  6. *Relapse*: Repeated unsuccessful attempts to control or reduce buying.
  7. *Problems*: Debts, financial strain, or personal consequences.
- **Scoring Scale**: Rated on a 0 to 7 scale:
  - Score $\ge 4$ on any item constitutes **endorsement** of that clinical criterion.
  - **Diagnostic Score** = Count of endorsed criteria ($0 \le \text{Score} \le 7$).
  - **Cut-Off Criterion**: Score $\ge 4$ classifies the user under **"Indicative Risk"**.
  - **Retest Cooldown**: 30-day interval between assessments to avoid test-retest bias.

---

### Algorithm 2: Lending Schedule Overlap & Conflict Detection
- **File**: `src/components/Friends/BorrowModal.tsx` & `src/components/Friends/LendingDashboardView.tsx`
- **Purpose**: Prevents two friends from borrowing the same clothing item for overlapping dates.
- **Formula**:
  Two intervals $[A_{\text{start}}, A_{\text{end}}]$ and $[B_{\text{start}}, B_{\text{end}}]$ overlap if and only if:
  $$\text{Overlap} = \neg (A_{\text{end}} < B_{\text{start}} \lor A_{\text{start}} > B_{\text{end}})$$
- **Execution**:
  - Checked on **client submission** in `BorrowModal.tsx` to provide immediate user feedback.
  - Re-checked on **lender approval** in `LendingDashboardView.tsx` to ensure concurrency safety.

---

### Algorithm 3: Automated Midnight Finalization (Daily Outfit Logging)
- **File**: `src/components/DailyLog/DailyLogView.tsx` & `src/services/closetService.ts`
- **Purpose**: Prevents retroactive tampering with wear data and automates wear metrics.
- **Execution**:
  - During the day: User can freely add or remove garments from today's outfit.
  - At **00:00 midnight**: An automated background job (`pg_cron` in Supabase or simulated via the UI):
    1. Sets `is_finalized = true` and `finalized_at = now()`.
    2. Executes `UPDATE clothing_item SET wear_count = wear_count + 1 WHERE item_id IN (...)`.
    3. Locks the log from further edits.

---

### Algorithm 4: Client-Side Background Removal (Silhouette Isolation)
- **File**: `src/utils/imageProcessing.ts` & `src/components/VirtualCloset/AddItemModal.tsx`
- **Purpose**: Isolates garment silhouettes onto transparent PNGs for clean visual cataloging without incurring external API latency, costs, or cloud privacy concerns.
- **Algorithm**:
  1. Draws the uploaded photo onto an off-screen HTML5 `<canvas>`.
  2. Samples perimeter border pixels (top, bottom, left, right) to detect the dominant background chroma and lighting variations.
  3. Uses human-eye weighted perceptual color distance (Redmean metric):
     $$\Delta C = \frac{\sqrt{(2 + \frac{\bar{r}}{256})\Delta r^2 + 4\Delta g^2 + (2 + \frac{255 - \bar{r}}{256})\Delta b^2}}{3}$$
  4. Converts pixels within the tolerance threshold to transparent alpha ($A = 0$).

---

### Algorithm 5: Dynamic Multi-Attribute Wardrobe Filtering
- **File**: `src/components/VirtualCloset/VirtualClosetView.tsx`
- **Purpose**: Provides real-time visibility into wardrobe composition without displaying irrelevant categories or colors.
- **Execution**:
  - Filters for Category and Color are dynamically computed from active garments currently owned by the user.
  - Multi-dimensional conjunction:
    $$\text{Display} = \text{Category Match} \land \text{Color Match} \land \text{Lifecycle Match} \land \text{Wear Filter Match} \land \text{Search Match}$$

---

## 4. Database Schema & Data Integrity

ReApparel's database design follows strict 3rd Normal Form (3NF) principles across 11 relational tables:

| Table Name | Description | Key Relationships |
|------------|-------------|-------------------|
| `users` | User accounts and unique friend codes | Primary Entity |
| `clothing_item` | Garments, photos, addition types, and cumulative wear counts | `user_id -> users(user_id) ON DELETE CASCADE` |
| `tag` | Reusable standardized tags (Category and Color) | Lookup Table |
| `item_tag` | Junction table for many-to-many garment tagging | `item_id -> clothing_item`, `tag_id -> tag` |
| `bsas_assessment`| Longitudinal assessment records and 0–7 scores | `user_id -> users(user_id) ON DELETE CASCADE` |
| `daily_clothing_log`| Date-based daily outfit logs and lock state | `user_id -> users(user_id) ON DELETE CASCADE` |
| `daily_log_item` | Junction table of garments worn on a specific date | `log_id -> daily_clothing_log`, `item_id -> clothing_item` |
| `friend_request` | Peer connection invitations and friendship status | `sender_id -> users`, `receiver_id -> users` |
| `borrow` | Lending reservations, date ranges, and loan statuses | `borrower_id -> users`, `item_id -> clothing_item` |
| `donation_opportunity`| Geographic textile drop-off centers and hours | Geolocation Entity |
| `donation_flag` | Crowdsourced verification flags for drop-offs | `donation_id -> donation_opportunity`, `user_id -> users` |

### Hybrid Architecture (Offline + Supabase Cloud):
- **Development & Defense**: The application includes a self-contained in-memory `mockDatabase` with initial seed data (Mario and Liu). It works 100% offline without requiring internet access or database setup.
- **Production**: Seamlessly connects to Supabase PostgreSQL by entering project URL and API key via the `DatabaseModal`.

---

## 5. Top 15 Professor Panel Questions & Model Answers

### Question 1: "Why did you choose the BSAS scale over other assessment tools?"
> **Model Answer**: "The Bergen Shopping Addiction Scale (Andreassen et al., 2015) is internationally recognized in clinical psychology because it operationalizes shopping addiction across the seven core addiction components: salience, mood modification, conflict, tolerance, withdrawal, relapse, and problems. Unlike generic consumer questionnaires, BSAS provides a validated diagnostic cut-off score ($\ge 4$ endorsed criteria) that allows our system to provide clinically grounded categorization."

---

### Question 2: "How does this platform directly contribute to UN SDG 12?"
> **Model Answer**: "UN SDG 12 Target 12.5 calls for substantially reducing waste generation through prevention, reduction, recycling, and reuse. ReApparel targets the root cause of textile waste: underutilization and compulsive overconsumption. By tracking wear counts, categorizing pre-existing vs new items, and enabling peer-to-peer garment borrowing, we extend the active lifespan of clothing, directly reducing new purchases and post-consumer textile disposal."

---

### Question 3: "Why did you implement client-side canvas background removal instead of calling a Python model like RMBG or remove.bg?"
> **Model Answer**: "For three primary architectural reasons:
> 1. **Zero External Dependency / Cost**: External APIs charge per image or introduce latency.
> 2. **Privacy**: Users' wardrobe photos remain on their device rather than being transmitted to third-party machine learning providers.
> 3. **Offline Resilience**: The system works instantly in local environments without GPU infrastructure or internet connection."

---

### Question 4: "How does the system prevent two users from borrowing the same garment at the same time?"
> **Model Answer**: "We implement a strict date interval overlap algorithm: `!(aEnd < bStart || aStart > bEnd)`. This is enforced twice: first on client-side form submission to give immediate feedback, and second on lender approval. If any approved loan overlaps the requested dates, approval is rejected."

---

### Question 5: "What happens when a user deletes a garment that has historical logs or loans?"
> **Model Answer**: "We implemented the `DeleteCascadeModal` reflecting PostgreSQL `ON DELETE CASCADE` semantics. When a garment is deleted, foreign-key cascade rules automatically remove linked `daily_log_item` junction records and loan history, preventing orphaned records and database foreign key violations."

---

### Question 6: "Why is there a 30-day cooldown on the BSAS check-in?"
> **Model Answer**: "In psychometrics, administering a behavioral test too frequently introduces test-retest learning bias, where participants respond from memory rather than genuine behavioral change. The 30-day window ensures that behavioral interventions—such as wearing existing clothes or borrowing—have had sufficient time to reflect in actual shopping habits."

---

### Question 7: "How did you demonstrate the 30-day cooldown and midnight finalization during this defense?"
> **Model Answer**: "We built dedicated simulation handlers directly into the interface:
> - In `RecoveryView`, the 'Simulate +30 Days' button advances the simulation offset so the panel can witness a retake assessment without waiting a calendar month.
> - In `DailyLogView`, the 'Simulate 00:00 Midnight Job' button demonstrates the automated cron trigger that freezes the log and increments wear counts."

---

### Question 8: "Can a user manipulate their wear counts retroactively?"
> **Model Answer**: "No. Daily logs are locked once finalized or when 00:00 midnight arrives. Users cannot edit past days' outfits. To record wear for today, the user logs garments in the active session, which increments wear counts upon finalization."

---

### Question 9: "How does the Fast User Switcher work in your profile?"
> **Model Answer**: "The `mockDatabase` maintains multi-tenant user storage. By toggling between Mario (`u-mario-01`) and Liu (`u-liu-02`), the active session switches context, reloading the corresponding virtual closet, friend connections, and lending inbox. This allows us to demonstrate peer-to-peer workflows in real-time."

---

### Question 10: "Why enforce mutually exclusive single category and garment type on item creation?"
> **Model Answer**: "In earlier versions, allowing multiple overlapping tags caused chromatic and category analytics to skew. Enforcing a strict 1-to-1 relationship between a garment and its primary category (e.g. Tops) and garment type (e.g. T-Shirt) maintains relational integrity and accurate wardrobe distribution charts."

---

### Question 11: "What prevents a user from deleting their account to evade returning borrowed clothes?"
> **Model Answer**: "In `ProfileView.tsx`, the `handleDeleteAccount` function checks active borrow records. If the user has any unreturned approved loans, account deletion is blocked with a security alert until all items are returned to their respective owners."

---

### Question 12: "How does your Donation Map find active drop-off centers?"
> **Model Answer**: "In `DonationMapSection.tsx` and `server.ts`, we implement a web scraper powered by Google Gemini with live Google Search groundings. It filters for active September 2026 drives in the user's selected country, province, and city, while crowdsourced flags allow the community to report inactive or inaccurate locations."

---

### Question 13: "What state management pattern did you use?"
> **Model Answer**: "We utilize a React Unidirectional Data Flow pattern with a centralized root controller (`App.tsx`) and an Observer/Subscriber pattern in `supabaseClient.ts`. Components receive state via props and dispatch mutations via async service callbacks, automatically triggering subscriber re-renders across all active views."

---

### Question 14: "How does your color family filter work?"
> **Model Answer**: "In `VirtualClosetView.tsx`, the system maps the user's garment colors to standardized curated color families (e.g., Navy, Olive, Burgundy) using hex and family name matching. The filter displays only the colors actually present in the user's current wardrobe, avoiding empty search results."

---

### Question 15: "What is your roadmap for scaling this to production?"
> **Model Answer**: "The database is already fully normalized and ready for production Supabase PostgreSQL with Row Level Security (RLS) policies. For mobile deployments, the responsive layout is PWA-ready, and the client-side background removal can run natively on iOS and Android webviews."

---

## 6. Live Defense Walkthrough Script (5-Minute Demonstration)

1. **Step 1: Sign In & Identity** (1 Minute)
   - Open ReApparel. Point out the SDG 12 Target 12.5 badge.
   - Click "Mario (Lender)" to demonstrate instant authentication.
2. **Step 2: Virtual Closet & Filtering** (1.5 Minutes)
   - Show the Virtual Closet.
   - Demonstrate multi-attribute filtering: Click "Tops", then "Navy", then "🌿 Old". Show how the grid filters in real-time.
   - Click "+ Add Garment". Upload an item, show automatic canvas background removal, choose category and type, and submit.
3. **Step 3: Daily Outfit Log & Midnight Lock** (1 Minute)
   - Click "Daily Outfit Log". Select 2 garments worn today.
   - Click "Simulate 00:00 Midnight Job". Point out the locked badge and explain how wear counts incremented.
4. **Step 4: BSAS Recovery & Longitudinal Progress** (1 Minute)
   - Click "Recovery Progress".
   - Explain the 7 clinical dimensions and point out the Score Progression line chart and threshold line at score = 4.
   - Click "Simulate +30 Days" and retake the check-in to show the updated score.
5. **Step 5: Peer-to-Peer Wardrobe Sharing** (0.5 Minutes)
   - Switch to "Liu (Borrower)" via the Fast Switcher.
   - Open Friends -> Browse Mario's Closet -> Click "Request to Borrow".
   - Switch back to Mario -> Open Lending & Requests -> Click "Accept Request" -> Demonstrate conflict detection and loan schedule activation!
