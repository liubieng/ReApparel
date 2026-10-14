# ReApparel &mdash; System Architecture & Complete Operations Guide

**Target File:** `docs/REAPPAREL_ARCHITECTURE_AND_MODULES.md`  
**System Name:** ReApparel: Mindful Closet Utilization & Shopping Addiction Recovery System  
**Document Classification:** Operations, Code Architecture, and Inter-File Interaction Blueprint  
**Audience:** Developers, Groupmates, Capstone Panelists, Thesis Advisors, and System Auditors  
**Academic & Capstone Alignment:** UN Sustainable Development Goal 12 (*Responsible Consumption and Production*) & Bergen Shopping Addiction Scale (BSAS) Clinical Framework  

---

## Table of Contents

1. [Architectural Overview & Hybrid Dual-Store Paradigm](#1-architectural-overview--hybrid-dual-store-paradigm)
2. [User Roles, Permissions & Identity Lifecycle](#2-user-roles-permissions--identity-lifecycle)
3. [Master Operations Directory](#3-master-operations-directory)
4. [Operation 1: Authentication, Verification & Session Management (`#auth`)](#4-operation-1-authentication-verification--session-management-auth)
   - 4.1. Account Registration & Email Magic Link Dispatch
   - 4.2. Verification Status Polling & Access Token Hydration
   - 4.3. User Sign-In & Offline UUID Realignment Cascade
   - 4.4. Realtime Auth State Change Observer & Auto-Session Boot
5. [Operation 2: Bergen Shopping Addiction Scale (BSAS) (`#bsasIntro`)](#5-operation-2-bergen-shopping-addiction-scale-bsas-bsasintro)
   - 5.1. 7 Core Addiction Dimensions & Clinical Criteria
   - 5.2. Interactive Stepper & 28-Item Likert Questionnaire
   - 5.3. Clinical Scoring Calculation & Diagnostic Cut-Off
   - 5.4. 30-Day Clinical Retake Cooldown Engine
6. [Operation 3: Virtual Wardrobe & Garment Digitization (`#closet`)](#6-operation-3-virtual-wardrobe--garment-digitization-closet)
   - 6.1. Digitize Garment & Client-Side Canvas Background Removal
   - 6.2. Redmean Perceptual Color Distance Algorithm
   - 6.3. Garment Modification & Attribute Updates
   - 6.4. Garment Deletion & Relational Foreign Key Cascades
7. [Operation 4: Daily Clothing Log & Wear Maximization (`#daily-log`)](#7-operation-4-daily-clothing-log--wear-maximization-daily-log)
   - 7.1. Outfit Builder & Item Inclusion Toggling
   - 7.2. Serialized Remote Synchronization Queue (`dailyLogSyncChain`)
   - 7.3. Lock & Finalize Outfit (Wear Count Incrementation)
   - 7.4. Outfit Unlocking, Editing & Wear Count Rollback Protection
   - 7.5. Midnight Auto-Lock Simulation Engine
8. [Operation 5: Recovery Progress & Wardrobe Analytics (`#recovery` / `#closet-statistics`)](#8-operation-5-recovery-progress--wardrobe-analytics-recovery--closet-statistics)
   - 8.1. Longitudinal BSAS Multi-Bar Recovery Progression Chart
   - 8.2. 7-Dimension Accordion Clinical Breakdown
   - 8.3. Wardrobe Utilization & Mathematical Formulas
   - 8.4. Environmental Impact Quantification ($CO_2e$ & Water Conserved)
9. [Operation 6: Friends, Request Board & Circular Lending (`#friends` / `#requests` / `#notifications`)](#9-operation-6-friends-request-board--circular-lending-friends--requests--notifications)
   - 9.1. Unique Friend Code Generation (`RP-[NAME]-[RANDOM4]`)
   - 9.2. Foreign Key Sync Pre-Flight Guard (`ensureUserSyncedToSupabase`)
   - 9.3. Garment Borrowing & Date Overlap Conflict Detection Algorithm
   - 9.4. Lender Approval, Status Lock (`'Borrowed'`) & Return Restoral
10. [Operation 7: Community Textile Donation Map & Geolocation (`#donations`)](#10-operation-7-community-textile-donation-map--geolocation-donations)
    - 10.1. Interactive Google Maps & Leaflet Geolocation Rendering
    - 10.2. Haversine Great-Circle Distance Engine
    - 10.3. Cascading Geographical Filters (Country &rarr; Province &rarr; City &rarr; Barangay)
    - 10.4. Post Donation Drive with Draggable Coordinate Pin
    - 10.5. Automated Expiration Guard & Creator-Only Deletion Privileges
    - 10.6. Community Accuracy Flagging (`Inactive` vs `Inaccurate`)
11. [Operation 8: Profile, Preferences & Account Deletion Safeguard (`#profile` / `#settings`)](#11-operation-8-profile-preferences--account-deletion-safeguard-profile--settings)
    - 11.1. Self-Service Profile Updating
    - 11.2. Theme Toggle (Light/Dark Mode) & Granular Notification Toggles
    - 11.3. Irreversible Account Deletion Safeguard & Complete Relational Wipe
12. [Operation 9: Cloud Database Diagnostics & Self-Healing Telemetry](#12-operation-9-cloud-database-diagnostics--self-healing-telemetry)
    - 12.1. Live PostgreSQL Telemetry (Ping, Row Counts, RLS Write Probe)
    - 12.2. One-Click Cloud Reconciliation (`syncAllLocalDataToSupabase`)
13. [Master Folder Structure Reference (Modular Architecture)](#13-master-folder-structure-reference-modular-architecture)
14. [Master Operations Matrix: Code, Actions, Modals & Database Tables](#14-master-operations-matrix-code-actions-modals--database-tables)
15. [Verification & Capstone Defense Checklist](#15-verification--capstone-defense-checklist)

---

## 1. Architectural Overview & Hybrid Dual-Store Paradigm

ReApparel is engineered around a **Hybrid Dual-Store Architecture**. In contrast to traditional web applications that block the user interface with loading spinners on every network mutation, ReApparel maintains an instantaneous local reactive store while asynchronously streaming mutations to cloud PostgreSQL storage.

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                       |
|                                                                                         |
|   [User / Student] <-----(Interacts via 6 Domain Modules)-----> [React 19 SPA Controller]
|                                                                           |             |
|                                                     Optimistic Updates    |             |
|                                                     (0ms UI Latency)      v             |
|                                                           [App.tsx View Router]         |
+---------------------------------------------------------------------------+-------------+
                                                                            |
                   +--------------------------------------------------------+
                   |
     +-------------v-------------+    +-----------------------+    +----------------------+
     | Master Layout & Modals    |    | Domain Feature Modules|    | Shared Infrastructure|
     |                           |    |                       |    |                      |
     | - Header.tsx              |    | - VirtualCloset/      |    | - supabaseClient.ts  |
     | - Sidebar.tsx             |    | - DailyClothingLog/   |    | - database.ts (types)|
     | - ConfirmModal.tsx        |    | - BSAS/               |    | - seedData.ts        |
     | - DatabaseModal.tsx       |    | - RecoveryProgress/   |    | - AuthView.tsx       |
     |                           |    | - FriendsAndLending/  |    | - ProfileView.tsx    |
     |                           |    | - DonationMap/        |    | - SettingsView.tsx   |
     +-------------+-------------+    +-----------+-----------+    +----------+-----------+
                   |                              |                           |
                   +------------------------------+---------------------------+
                                                  |
                                                  v
     +------------------------------------------------------------------------------------+
     |                         In-Memory & LocalStorage Dual-Store                        |
     |                   (mockDatabase in src/shared/services/supabaseClient.ts)          |
     |                                                                                    |
     |   - Instant synchronous read/write operations (localStorage + React state)         |
     |   - Observer pattern subscriber registry (mockDatabase.subscribe(callback))       |
     |   - Automatic UUID generation & local relational cascade management                |
     +--------------------------------------------+---------------------------------------+
                                                  |
                        Asynchronous Non-Blocking | Realtime Postgres Change
                        Sync Queues (Timeout Guard)| Listeners (Multi-Device Broadcast)
                                                  v
     +------------------------------------------------------------------------------------+
     |                             Supabase Cloud PostgreSQL                              |
     |                    (Remote Relational Tables & Session Storage)                    |
     |                                                                                    |
     |   - public.users                 - public.friend_request                           |
     |   - public.clothing_item         - public.borrow                                   |
     |   - public.item_tag              - public.donation_opportunity                     |
     |   - public.daily_clothing_log    - public.donation_flag                            |
     |   - public.daily_log_item        - public.bsas_assessment                          |
     +------------------------------------------------------------------------------------+
```

### Key Architectural Pillars:
1. **Zero-Latency (0ms) Optimistic Updates:**
   Every user action (adding a garment, locking an outfit, taking a BSAS test, borrowing an item) commits immediately to [`mockDatabase`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L418). The interface never stutters, freezes, or waits for cloud latency.
2. **Observer Subscription Auto-Rerender:**
   Components register reactive listeners via [`mockDatabase.subscribe(callback)`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L418-L422). Any data mutation triggers an instantaneous UI re-render.
3. **Serialized Background Sync Queue:**
   Mutations are safely scheduled into asynchronous FIFO promises (e.g., [`dailyLogSyncChain`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L15)) guarded by [`withTimeout()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L330), eliminating race conditions when users tap quickly.
4. **Relational Pre-Flight Integrity Guard:**
   Before any child entity is pushed to Supabase, [`ensureUserSyncedToSupabase()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L1729-L1820) verifies that the parent `user_id` exists in `public.users`, preventing PostgreSQL foreign key violation exceptions (`23503`).

---

## 2. User Roles, Permissions & Identity Lifecycle

The application enforces three user privilege tiers:

| Tier | Role / State | Permissions & Access Scope | Identifier Format |
|---|---|---|---|
| **Tier 1** | **Authenticated User** | Full access to wardrobe management, daily logging, longitudinal recovery tracking, friend connections, circular borrowing, and donation drive creation. | Supabase RFC 4122 UUID (`authUser.id`) + Friend Code (`RP-[NAME]-[RANDOM4]`) |
| **Tier 2** | **Offline / Guest User** | Full offline access stored in `localStorage`. When the user later creates an account, [`mockDatabase.realignUserId()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L535-L582) cascades their real UUID across all local clothes, logs, and assessments. | Offline temporary UUID |
| **Tier 3** | **Drive Creator / Admin** | Only the user matching `opp.created_by === currentUser.user_id` possesses privileges to permanently remove a community donation drive. | User UUID check in [`OpportunityCard.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/OpportunityCard.tsx#L24) |

---

## 3. Master Operations Directory

The complete system operations directory, mapping sidebar views to their module containers, modals, and backend services:

| # | Operation Name | Navigation View ID (`currentView`) | Primary Module / View Component | Associated Modal(s) | Primary Service Controller |
|---|---|---|---|---|---|
| **1** | **Authentication** | `'auth'` (conditional overlay) | [`AuthView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/AuthView.tsx) | *Inline Auth Card* | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts) |
| **2** | **BSAS Assessment** | `'bsasIntro'` | [`BSASIntroView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASIntroView.tsx) | [`BSASAssessmentModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) |
| **3** | **Virtual Wardrobe** | `'closet'` | [`VirtualClosetView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/VirtualClosetView.tsx) | [`AddItemModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/AddItemModal.tsx)<br>[`EditItemModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/EditItemModal.tsx)<br>[`DeleteCascadeModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/DeleteCascadeModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts)<br>[`imageProcessing.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/imageProcessing.ts) |
| **4** | **Daily Clothing Log**| `'daily-log'` | [`DailyLogView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DailyClothingLog/DailyLogView.tsx) | *Inline Outfit Builder* | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) |
| **5** | **Recovery Progress** | `'recovery'`<br>`'closet-statistics'` | [`RecoveryView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/RecoveryView.tsx)<br>[`ClosetStatisticsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/ClosetStatisticsView.tsx) | [`BSASAssessmentModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) |
| **6** | **Friends & Lending** | `'friends'`<br>`'requests'`<br>`'notifications'` | [`FriendsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/FriendsView.tsx)<br>[`LendingDashboardView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/LendingDashboardView.tsx)<br>[`NotificationsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/NotificationsView.tsx) | [`BorrowModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/BorrowModal.tsx) | [`friendsService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/friendsService.ts) |
| **7** | **Donation Map** | `'donations'` | [`DonationMapSection.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/DonationMapSection.tsx) | [`AddDonationModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/AddDonationModal.tsx)<br>[`FlagModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/FlagModal.tsx)<br>[`ConfirmModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/ConfirmModal.tsx) | [`mapsService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/mapsService.ts) |
| **8** | **Profile & Settings**| `'profile'`<br>`'settings'` | [`ProfileView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/ProfileView.tsx)<br>[`SettingsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/SettingsView.tsx) | [`ConfirmModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/ConfirmModal.tsx) | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts) |
| **9** | **Database Telemetry**| *Modal Trigger* | [`DatabaseModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/DatabaseModal.tsx) | *Self-Contained Modal* | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts) |

---

## 4. Operation 1: Authentication, Verification & Session Management (`#auth`)

```
                           AUTHENTICATION LIFECYCLE
                           
           +---------------------------------------------+
           |     User opens App (src/App.tsx router)     |
           +----------------------+----------------------+
                                  |
                      Has Valid Active Session?
                      /                       \
                    YES                        NO
                    /                            \
      +------------v------------+      +----------v----------+
      | Hydrate Active User     |      | Render AuthView.tsx |
      | Load Closet & Logs      |      | Mode: Login / Signup|
      +-------------------------+      +----------+----------+
                                                  |
                                   +--------------+--------------+
                                   |                             |
                                   v                             v
                        [Register Account]              [Sign In With Creds]
                                   |                             |
                                   v                             v
                       supabase.auth.signUp()           supabase.auth.signInWithPassword()
                                   |                             |
                                   v                             v
                        Email Confirmation Sent        [Realign Offline UUID]
                                   |                             |
                                   v                             v
                       [Verify via Link / OTP]         [ensureUserSyncedToSupabase]
                                   |                             |
                                   +-------------> <-------------+
                                                  |
                                                  v
                                      [Route to BSAS or Closet]
```

### 4.1. Account Registration & Email Magic Link Dispatch
* **What it does:** Creates an account identity in Supabase Auth and registers the user in local memory with a generated friend code.
* **How it works:**
  1. User enters First Name, Last Name, Email, Password, and Password Confirmation in [`AuthView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/AuthView.tsx#L254-L363).
  2. RFC 5322 regex checks validate email structure, and passwords require $\ge 8$ characters.
  3. Form submission calls `supabase.auth.signUp({ email, password })`.
  4. App sets view state to `'verify'`, displaying the pending email and countdown timer.
* **Key Code Responsible:**
  - [`handleSubmit(e)` in `src/shared/views/AuthView.tsx` (Lines 254–363)](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/AuthView.tsx#L254-L363).
  - [`generateUUID()` in `src/shared/services/supabaseClient.ts` (Lines 319–325)](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L319-L325).

### 4.2. Verification Status Polling & Access Token Hydration
* **What it does:** Allows the user to confirm their email either by clicking the magic link in their inbox or pressing **"I Have Confirmed My Email"**.
* **How it works:**
  1. [`handleCheckEmailLink()` (Lines 366–448)](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/AuthView.tsx#L366-L448) polls `supabase.auth.getSession()`.
  2. If session token is active, it calls [`mockDatabase.registerUser(...)`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L498-L533) using the official `authUser.id`.
  3. Ensures user exists in `public.users` via [`ensureUserSyncedToSupabase()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L1729-L1820).
  4. Automatically uploads any offline garments or check-ins via [`closetService.syncLocalDataToSupabase()`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L657-L750).
  5. Routes the user into the initial BSAS check-in (`bsasIntro`).

### 4.3. User Sign-In & Offline UUID Realignment Cascade
* **What it does:** Authenticates returning users via email or unique Friend Code (`RP-[NAME]-[RANDOM4]`) and reconciles offline entities.
* **How it works:**
  1. If signed in with email: calls `supabase.auth.signInWithPassword({ email, password })`.
  2. If the user previously created items under an offline mock ID, [`mockDatabase.realignUserId(oldId, authUser.id)`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L535-L582) executes:
     - Updates `user_id` across all `clothing_item`, `daily_clothing_log`, `daily_log_item`, `bsas_assessment`, and `friend_request` records in memory.
  3. Sets `currentUser` in React state and loads their personal wardrobe.

### 4.4. Realtime Auth State Change Observer & Auto-Session Boot
* In [`src/App.tsx` (Lines 439–505)](file:///c:/Users/Admin/Downloads/ReApparel/src/App.tsx#L439-L505), `useEffect` registers `supabase.auth.onAuthStateChange()`:
  - Captures OAuth or magic-link redirects containing `#access_token` or `?code=`.
  - Clears query parameters from the browser URL without refreshing.
  - Hydrates the session and triggers [`loadData()`](file:///c:/Users/Admin/Downloads/ReApparel/src/App.tsx#L195-L259).

---

## 5. Operation 2: Bergen Shopping Addiction Scale (BSAS) (`#bsasIntro`)

```
                             BSAS ASSESSMENT LIFECYCLE
                             
           +---------------------------------------------+
           | User initiates assessment in BSASIntroView  |
           +----------------------+----------------------+
                                  |
                     Is 30-Day Cooldown Elapsed?
                     /                         \
                   YES                          NO
                   /                              \
       +----------v-----------+          +---------v----------+
       | Open AssessmentModal |          | Display Cooldown   |
       | 28 Items (7 Dims)    |          | Days Remaining Pill|
       +----------+-----------+          +--------------------+
                  |
                  v
       [Likert Scale Input: 0 to 4]
                  |
                  v
       [Clinical Scoring Engine]
       Threshold: Item Score >= 3 -> Endorsed Dimension (1)
       Total Score: Sum of 7 Dimensions (0 to 7)
                  |
                  v
       [Persist in mockDatabase & Supabase bsas_assessment]
                  |
                  v
       [Update Longitudinal Chart in RecoveryView.tsx]
```

### 5.1. 7 Core Addiction Dimensions & Clinical Criteria
The module implements the validated clinical Bergen Shopping Addiction Scale (*Andreassen et al., 2015*), assessing 7 core behavioral dimensions:
1. **Salience:** Compulsive rumination on shopping and clothing purchases.
2. **Tolerance:** Needing to purchase increasing quantities of garments to achieve excitement.
3. **Mood Modification:** Utilizing clothing acquisition as an escape from dysphoria or stress.
4. **Relapse:** Repeated unsuccessful efforts to curtail fashion expenditures.
5. **Withdrawal:** Agitation, restlessness, or guilt when prevented from acquiring clothes.
6. **Conflict:** Interpersonal discord with family, partners, or peers over shopping habits.
7. **Problems:** Financial, professional, or academic impairment resulting from wardrobe accumulation.

### 5.2. Interactive Stepper & 28-Item Likert Questionnaire
* **View:** [`BSASAssessmentModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx).
* Items are rendered in a 7-step paginated stepper (4 items per dimension) with progress tracking.
* Each item offers a 5-point Likert scale:
  - `0`: Completely Disagree
  - `1`: Disagree
  - `2`: Neutral
  - `3`: Agree
  - `4`: Completely Agree

### 5.3. Clinical Scoring Calculation & Diagnostic Cut-Off
* **Calculation Engine:** [`finalizeAssessment(...)` in Lines 58–99](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx#L58-L99).
* **Clinical Endorsement Rule:**
  $$\text{Endorsed}_d = \begin{cases} 1, & \text{if } \max_{i \in \text{dim}_d}(\text{Score}_i) \ge 3 \\ 0, & \text{otherwise} \end{cases}$$
* **Total Score:**
  $$\text{Total BSAS Score} = \sum_{d=1}^{7} \text{Endorsed}_d \quad (0 \le \text{Total} \le 7)$$
* **Diagnostic Threshold:**
  - **$\ge 4$ Endorsed Dimensions:** Indicative of Compulsive Clothing Acquisition.
  - **$< 4$ Endorsed Dimensions:** Non-Indicative.
* Persisted to `bsas_assessment` with full 7-dimension JSON breakdown.

### 5.4. 30-Day Clinical Retake Cooldown Engine
* **Code:** [`closetService.getBSASCooldown(assessments)` (Lines 340–370)](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L340-L370).
* Calculates elapsed days since the latest test:
  $$\text{Elapsed Days} = \left\lfloor \frac{\text{Now} - \text{LastTakenDate}}{86,400,000} \right\rfloor$$
* Retakes are locked for 30 calendar days to preserve psychometric validity, displaying a countdown badge with simulated time-travel controls for thesis demonstration.

---

## 6. Operation 3: Virtual Wardrobe & Garment Digitization (`#closet`)

```
                           GARMENT LIFECYCLE
                           
           +---------------------------------------------+
           | User uploads photo in AddItemModal.tsx       |
           +----------------------+----------------------+
                                  |
                   Has Raw Background / Photo?
                   /                         \
                 YES                          NO
                 /                              \
      +---------v-----------+          +---------v----------+
      | Canvas Redmean BG   |          | Generate Curated   |
      | Removal Algorithm   |          | Vector Silhouette  |
      +---------+-----------+          +---------+----------+
                |                                |
                +---------------> <--------------+
                                |
                                v
               [Assign Category, Colors & Tags]
                                |
                                v
               [Save to mockDatabase (0ms)]
                                |
                                v
               [Supabase clothing_item + item_tag Insert]
                                |
                                v
               [Available in Wardrobe & Daily Outfits]
```

### 6.1. Digitize Garment & Client-Side Canvas Background Removal
* **File:** [`imageProcessing.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/imageProcessing.ts#L118-L360).
* When a user snaps or uploads a photo of their clothing, client-side canvas routines isolate the garment without transmitting raw unedited photos to external servers.
* Samples boundary corner pixels to detect the backdrop color via [`extractBackgroundPalette(...)`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/imageProcessing.ts#L31-L85).

### 6.2. Redmean Perceptual Color Distance Algorithm
The system computes the perceptual difference between backdrop and fabric pixels using the **Redmean Distance Equation** ([`perceptualColorDistance(...)` in Lines 15–29](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/imageProcessing.ts#L15-L29)):

$$\bar{r} = \frac{R_1 + R_2}{2}$$

$$\Delta C = \sqrt{\left(2 + \frac{\bar{r}}{256}\right)(R_1 - R_2)^2 + 4(G_1 - G_2)^2 + \left(2 + \frac{255 - \bar{r}}{256}\right)(B_1 - B_2)^2}$$

* Pixels with $\Delta C \le \text{tolerance}$ are assigned alpha $A = 0$.
* Edge perimeter pixels undergo alpha feathering to prevent jagged outlines, yielding clean, transparent catalog PNGs.

### 6.3. Garment Modification & Attribute Updates
* **Modal:** [`EditItemModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/EditItemModal.tsx).
* Modifies garment title, primary/secondary colors, subcategory, and optional replacement imagery.
* Invokes [`closetService.updateItem(itemId, updates)`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L199-L218), updating the local store immediately and asynchronously patching remote `clothing_item`.

### 6.4. Garment Deletion & Relational Foreign Key Cascades
* **Modal:** [`DeleteCascadeModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/DeleteCascadeModal.tsx).
* Prevents data corruption:
  1. In local memory, [`closetService.deleteItem(itemId)`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L220-L234) removes the garment from active daily logs and cancels pending loans.
  2. In Supabase, deleting `clothing_item` automatically triggers PostgreSQL `ON DELETE CASCADE` across `item_tag`, `daily_log_item`, and `borrow`.

---

## 7. Operation 4: Daily Clothing Log & Wear Maximization (`#daily-log`)

```
                         DAILY OUTFIT LIFECYCLE
                         
          +----------------------------------------------+
          | User opens DailyLogView.tsx for Date (T)     |
          +----------------------+-----------------------+
                                 |
                                 v
          [Tap Garments to Include / Exclude in Today Outfit]
                                 |
                                 v
          [Sync to In-Memory Log (0ms Instant Feedback)]
                                 |
                                 v
          [dailyLogSyncChain FIFO Background Queue Execution]
                                 |
                                 v
          +----------------------+-----------------------+
          |         User Clicks "Lock & Finalize"        |
          +----------------------+-----------------------+
                                 |
                                 v
          [Set is_finalized = true, finalized_at = Timestamp]
                                 |
                                 v
          [Increment wear_count by +1 for Each Included Garment]
                                 |
                                 v
          [Outfit Locked: Badges Rendered, Accidental Edits Prevented]
```

### 7.1. Outfit Builder & Item Inclusion Toggling
* **View:** [`DailyLogView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DailyClothingLog/DailyLogView.tsx).
* Displays date selector with carousel of the user's digitized wardrobe.
* Tapping a garment invokes [`handleToggleGarmentInOutfit()`](file:///c:/Users/Admin/Downloads/ReApparel/src/App.tsx#L588-L617), instantly toggling inclusion and recalculating outfit composition in 0ms.

### 7.2. Serialized Remote Synchronization Queue (`dailyLogSyncChain`)
* Rapid user taps could trigger out-of-order network requests.
* [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L15) guards writes with a Promise queue:
  ```ts
  dailyLogSyncChain = dailyLogSyncChain.then(() => pushDateToRemote(userId, logDate));
  ```
* Upserts `daily_clothing_log` with `ON CONFLICT (user_id, log_date)` and reconciles children in `daily_log_item`.

### 7.3. Lock & Finalize Outfit (Wear Count Incrementation)
* Finalizing an outfit marks it immutable and increases the wear count of all constituent clothes:
  $$\text{wear\_count}_{\text{new}} = \text{wear\_count}_{\text{current}} + 1$$
* Handled in [`closetService.finalizeDailyLog(logId)`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L460-L489).

### 7.4. Outfit Unlocking, Editing & Wear Count Rollback Protection
* Users can unlock finalized logs via [`unlockDailyLogForEditing()`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L491-L518).
* Deleting a finalized log cleanly rolls back $+1$ wear counts, ensuring wardrobe analytics remain strictly accurate.

### 7.5. Midnight Auto-Lock Simulation Engine
* [`simulateMidnightFinalization()`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L545-L552) automatically scans for unfinalized logs from previous days and locks them, mimicking automated cron processing.

---

## 8. Operation 5: Recovery Progress & Wardrobe Analytics (`#recovery` / `#closet-statistics`)

```
+-----------------------------------------------------------------------------------------+
|                                RECOVERY & ANALYTICS DASHBOARD                           |
|                                                                                         |
|   +---------------------------------------+   +-------------------------------------+   |
|   | Longitudinal BSAS Progression Chart   |   | Environmental Impact Metrics        |   |
|   | Score: 6 -> 5 -> 3 (Non-Indicative!)  |   | Avoided CO2e: 45.0 kg               |   |
|   | Dimension Breakdown Accordion (0 to 4)|   | Conserved Water: 8,100 Liters       |   |
|   +---------------------------------------+   +-------------------------------------+   |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   | Wardrobe Utilization Breakdown: Active Worn vs Inactive Dormant Garments        |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

### 8.1. Longitudinal BSAS Multi-Bar Recovery Progression Chart
* **File:** [`RecoveryView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/RecoveryView.tsx).
* Plots chronological check-ins using historical `bsas_assessment` rows.
* Visualizes score trajectories from high compulsive shopping ($S \ge 4$) toward mindful stability ($S < 4$).

### 8.2. 7-Dimension Accordion Clinical Breakdown
* Expands each addiction dimension (Salience, Tolerance, Mood Modification, etc.) showing historical scores, subscale interpretations, and self-reflection prompts.

### 8.3. Wardrobe Utilization & Mathematical Formulas
* **File:** [`ClosetStatisticsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/ClosetStatisticsView.tsx).
* **Utilization Rate:**
  $$\text{Utilization Rate} = \left( \frac{\sum [ \text{wear\_count} > 0 ]}{N_{\text{total}}} \right) \times 100\%$$

### 8.4. Environmental Impact Quantification ($CO_2e$ & Water Conserved)
Based on UN Sustainable Development Goal 12 research data:
* **Avoided Carbon Emissions ($CO_2e$):**
  $$\text{Avoided } CO_2e = \left(\sum \text{wear\_count}\right) \times 15.0\text{ kg } CO_2$$
* **Conserved Water Footprint:**
  $$\text{Avoided Water} = \left(\sum \text{wear\_count}\right) \times 2,700\text{ Liters}$$

---

## 9. Operation 6: Friends, Request Board & Circular Lending (`#friends` / `#requests` / `#notifications`)

```
                             CIRCULAR LENDING LIFECYCLE
                             
           +---------------------------------------------+
           | Borrower clicks "Borrow" on Friend's Garment|
           +----------------------+----------------------+
                                  |
                                  v
           +---------------------------------------------+
           | BorrowModal: Select Start Date & End Date   |
           +----------------------+----------------------+
                                  |
                     Date Collision Overlap Guard?
                     /                           \
                 CONFLICT                       CLEAR
                   /                               \
     +------------v------------+        +-----------v-----------+
     | Alert Banner Displayed  |        | Insert borrow Row     |
     | Submit Button Disabled  |        | Status: 'Pending'     |
     +-------------------------+        +-----------+-----------+
                                                    |
                                                    v
                                        [Lender Views in Dashboard]
                                                    |
                                   +----------------+----------------+
                                   |                                 |
                                   v                                 v
                             [Accept Loan]                     [Reject Loan]
                                   |                                 |
                                   v                                 v
                       Set borrow.status = 'Accepted'     Set borrow.status = 'Rejected'
                       Set garment = 'Borrowed' (Locked)  Garment remains Available
                                   |
                                   v
                       [Garment Returned by Borrower]
                                   |
                                   v
                       Set borrow.status = 'Returned'
                       Restore garment = 'Available'
```

### 9.1. Unique Friend Code Generation (`RP-[NAME]-[RANDOM4]`)
* Users are assigned a human-readable friend code (e.g. `RP-BIEN-9363`) generated via [`mockDatabase.generateFriendCode()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L481-L491).
* Allows seamless user connection without exposing private email addresses.

### 9.2. Foreign Key Sync Pre-Flight Guard (`ensureUserSyncedToSupabase`)
* Connecting friends requires foreign key validation. [`friendsService.sendFriendRequest()`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/friendsService.ts#L21-L139) pre-syncs both sender and receiver into `public.users` before database insertion, completely eliminating constraint errors.

### 9.3. Garment Borrowing & Date Overlap Conflict Detection Algorithm
* **Algorithm:** [`checkDateOverlap(aFrom, aTo, bFrom, bTo)` in `BorrowModal.tsx` (Lines 15–17)](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/BorrowModal.tsx#L15-L17):
  $$\text{HasConflict} = \neg\left( \text{end}_A < \text{start}_B \;\lor\; \text{start}_A > \text{end}_B \right)$$
* Dynamically evaluates all approved loans for that item, preventing double-booking before submission.

### 9.4. Lender Approval, Status Lock (`'Borrowed'`) & Return Restoral
* Upon approval in [`LendingDashboardView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/LendingDashboardView.tsx), the garment is marked `'Borrowed'`, hiding it from other friends.
* Once returned, clicking **"Mark Returned"** restores availability.

---

## 10. Operation 7: Community Textile Donation Map & Geolocation (`#donations`)

```
                           DONATION DRIVE LIFECYCLE
                           
           +---------------------------------------------+
           | User opens DonationMapSection.tsx           |
           +----------------------+----------------------+
                                  |
                                  v
           [HTML5 Geolocation: navigator.geolocation.getCurrentPosition]
                                  |
                                  v
           [Haversine Distance Engine: Compute Distances to All Drives]
                                  |
                                  v
           [Filter Out Expired Drives (end_date < Date.now())]
                                  |
                                  v
           [Render Custom Pins on Google Maps & Leaflet Container]
                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v
        [Flag Inactive / Bad Data]        [Creator Deletes Drive]
                 |                                 |
                 v                                 v
        Insert donation_flag Row          Assert opp.created_by === currentUserId
        Increment flag count badge        Remove from Supabase & Local Cache
```

### 10.1. Interactive Google Maps & Leaflet Geolocation Rendering
* **Container:** [`MapContainer.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/MapContainer.tsx).
* Dual-engine map renderer supporting `@vis.gl/react-google-maps` and Leaflet fallbacks with custom SVG marker pins.

### 10.2. Haversine Great-Circle Distance Engine
* **Formula:** [`calculateDistanceKm(...)` in `mapsService.ts` (Lines 233–245)](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/mapsService.ts#L233-L245):

$$\Delta \phi = \frac{(\text{lat}_2 - \text{lat}_1)\pi}{180}, \quad \Delta \lambda = \frac{(\text{lng}_2 - \text{lng}_1)\pi}{180}$$

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\left(\frac{\text{lat}_1 \pi}{180}\right) \cos\left(\frac{\text{lat}_2 \pi}{180}\right) \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$d = 2 \cdot R \cdot \arctan2\left(\sqrt{a}, \sqrt{1 - a}\right) \quad (R = 6,371\text{ km})$$

### 10.3. Cascading Geographical Filters
* **Component:** [`CascadingFilters.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/CascadingFilters.tsx).
* Filters by Region &rarr; Province &rarr; City &rarr; Barangay using Philippine geospatial presets in [`locationDirectory.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/locationDirectory.ts).

### 10.4. Post Donation Drive with Draggable Coordinate Pin
* **Modal:** [`AddDonationModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/AddDonationModal.tsx).
* Interactive mini-map enables draggable pin placement to capture precise decimal coordinates (`latitude`, `longitude`).

### 10.5. Automated Expiration Guard & Creator-Only Deletion Privileges
* Expired drives (`end_date < Date.now()`) are automatically filtered out via [`isOpportunityExpired()`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/mapsService.ts#L4-L12).
* Only the original creator possesses deletion rights (`opp.created_by === currentUser.user_id`).

### 10.6. Community Accuracy Flagging (`Inactive` vs `Inaccurate`)
* **Modal:** [`FlagModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/FlagModal.tsx).
* Users report closed donation drives or incorrect contact information, persisting flags in `donation_flag`.

---

## 11. Operation 8: Profile, Preferences & Account Deletion Safeguard (`#profile` / `#settings`)

### 11.1. Self-Service Profile Updating
* **View:** [`ProfileView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/ProfileView.tsx).
* Updates user names, displays friend code, lifetime wear stats, and carbon savings.

### 11.2. Theme Toggle & Granular Notification Toggles
* **View:** [`SettingsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/SettingsView.tsx).
* Toggles light/dark visual theme (`data-theme`) and customizes alert preferences for loans and donation drives.

### 11.3. Irreversible Account Deletion Safeguard & Complete Relational Wipe
* Prompts the user to type `"DELETE"` into [`ConfirmModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/ConfirmModal.tsx).
* Handled in [`handleDeleteAccount()` in App.tsx (Lines 731–771)](file:///c:/Users/Admin/Downloads/ReApparel/src/App.tsx#L731-L771):
  1. Signs out of Supabase Auth.
  2. Calls [`closetService.deleteUserAccount(userId, email)`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts#L610-L655).
  3. Cascades complete deletion of all child records in Supabase (`item_tag`, `daily_log_item`, `borrow`, `daily_clothing_log`, `bsas_assessment`, `friend_request`, `clothing_item`, `users`).
  4. Wipes local `localStorage` keys and returns the browser cleanly to login.

---

## 12. Operation 9: Cloud Database Diagnostics & Self-Healing Telemetry

### 12.1. Live PostgreSQL Telemetry
* **Modal:** [`DatabaseModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/DatabaseModal.tsx).
* Performs real-time diagnostics:
  - Measures HTTP roundtrip latency (ms).
  - Fetches row counts across all 10 PostgreSQL tables.
  - Probes Row Level Security write permissions.

### 12.2. One-Click Cloud Reconciliation (`syncAllLocalDataToSupabase`)
* Calls [`syncAllLocalDataToSupabase()`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L1990-L2069):
  - Validates all local users with [`ensureUserSyncedToSupabase(...)`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts#L1729-L1820).
  - Pushes any orphaned clothing items, daily logs, or BSAS check-ins to Supabase with zero duplicate entries.

---

## 13. Master Folder Structure Reference (Modular Architecture)

The project directory is cleanly organized into domain feature modules and shared core infrastructure, with zero duplicate files:

```
ReApparel/
├── docs/
│   └── REAPPAREL_ARCHITECTURE_AND_MODULES.md    # Master Architecture & Operations Guide
├── src/
│   ├── modules/
│   │   ├── VirtualCloset/
│   │   │   ├── VirtualClosetView.tsx            # Wardrobe grid, category filters & item cards
│   │   │   ├── AddItemModal.tsx                 # Digitize garment with background removal
│   │   │   ├── EditItemModal.tsx                # Modify garment attributes & image
│   │   │   ├── DeleteCascadeModal.tsx           # Garment deletion warning dialog
│   │   │   ├── closetService.ts                 # Wardrobe, BSAS assessments & outfit logging
│   │   │   ├── imageProcessing.ts               # Canvas Redmean algorithm background isolation
│   │   │   └── index.ts                         # Public module barrel export
│   │   ├── DailyClothingLog/
│   │   │   ├── DailyLogView.tsx                 # Daily outfit builder, lock & wear counters
│   │   │   └── index.ts                         # Public module barrel export
│   │   ├── BSAS/
│   │   │   ├── BSASIntroView.tsx                # Pre-assessment questionnaire briefing
│   │   │   ├── BSASAssessmentModal.tsx          # 28-item clinical BSAS addiction test
│   │   │   └── index.ts                         # Public module barrel export
│   │   ├── RecoveryProgress/
│   │   │   ├── RecoveryView.tsx                 # Longitudinal BSAS chart & 7-dimension breakdown
│   │   │   ├── ClosetStatisticsView.tsx         # Utilization metrics, CO2 and water savings
│   │   │   └── index.ts                         # Public module barrel export
│   │   ├── FriendsAndLending/
│   │   │   ├── FriendsView.tsx                  # Friends list, friend codes & closet sharing
│   │   │   ├── LendingDashboardView.tsx         # Borrowing & lending request manager
│   │   │   ├── NotificationsView.tsx            # Notification center for friend requests & loans
│   │   │   ├── BorrowModal.tsx                  # Date-picker loan reservation with conflict check
│   │   │   ├── friendsService.ts                # Friend requests, user discovery & loan reservations
│   │   │   └── index.ts                         # Public module barrel export
│   │   └── DonationMap/
│   │       ├── DonationMapSection.tsx           # Geolocation donation map section
│   │       ├── MapContainer.tsx                 # Google Maps & Leaflet map renderer
│   │       ├── CascadingFilters.tsx             # Distance, search, and category filters for map
│   │       ├── OpportunityCard.tsx              # Donation drive list card with creator delete check
│   │       ├── OpportunityDrawer.tsx            # Slide-out details drawer for selected donation drive
│   │       ├── AddDonationModal.tsx             # Create new community donation drive
│   │       ├── FlagModal.tsx                    # Community donation accuracy reporting
│   │       ├── mapsService.ts                   # Donation drives, distance calculation & flagging
│   │       ├── locationDirectory.ts             # Philippines preset geographical coordinates
│   │       └── index.ts                         # Public module barrel export
│   ├── shared/
│   │   ├── layout/
│   │   │   ├── Header.tsx                       # Top navigation, streak counter, theme toggle
│   │   │   └── Sidebar.tsx                      # Desktop and mobile drawer navigation menu
│   │   ├── modals/
│   │   │   ├── ConfirmModal.tsx                 # Reusable generic confirmation dialog
│   │   │   └── DatabaseModal.tsx                # Supabase cloud diagnostics & sync telemetry
│   │   ├── views/
│   │   │   ├── AuthView.tsx                     # Email authentication, OTP, and friend code login
│   │   │   ├── ProfileView.tsx                  # User profile, statistics, friend code & logout
│   │   │   └── SettingsView.tsx                 # Theme toggle, notification prefs & delete account
│   │   ├── services/
│   │   │   └── supabaseClient.ts                # Supabase client, mockDatabase engine & UUID realign
│   │   ├── types/
│   │   │   └── database.ts                      # TypeScript interfaces matching PostgreSQL schema
│   │   └── data/
│   │       ├── seedData.ts                      # Curated color families, BSAS question definitions
│   │       ├── schema.sql                       # Supabase PostgreSQL schema DDL
│   │       └── simulate_2month_account.sql      # Test account seed SQL
│   ├── App.tsx                                  # Root controller, view router, sync orchestrator
│   └── main.tsx                                 # React 19 entry point
├── .env                                         # Local environment secrets (private)
├── .env.example                                 # Template environment secrets for teammates
├── .gitignore                                   # Git ignore rules (includes server.js & .env)
├── .npmrc                                       # npm legacy peer dependencies rule
├── index.html                                   # Vite application HTML entry point
├── package.json                                 # Manifest, scripts & npm dependencies
├── package-lock.json                            # Consistent package version tree
├── server.ts                                    # Local Express dev server (npm run dev)
├── tsconfig.json                                # TypeScript compilation settings
├── vercel.json                                  # Vercel deployment & rewrite configuration
└── vite.config.ts                               # Vite build bundle configuration
```

---

## 14. Master Operations Matrix: Code, Actions, Modals & Database Tables

The following matrix provides a comprehensive operational reference across all 9 ReApparel subsystems, detailing the frontend view, modal dialogs, service methods, database touchpoints, and core safeguards:

| Operation Name | UI Page / View File | Modal File | Service Controller | Key Service Method(s) | Primary JS Handlers (`App.tsx`) | Database Tables Affected | Primary Guard / Safety Mechanism |
|---|---|---|---|---|---|---|---|
| **1. Auth & Verification** | [`AuthView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/AuthView.tsx) | *Inline Card* | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts) | `registerUser`<br>`authenticateUser`<br>`realignUserId`<br>`ensureUserSyncedToSupabase` | `handleLoginSuccess()`<br>`onAuthStateChange()` | `auth.users`<br>`public.users` | - RFC 5322 regex validation<br>- $\ge 8$ char password check<br>- Magic link session token validation<br>- Offline-to-cloud UUID realignment cascade |
| **2. BSAS Assessment** | [`BSASIntroView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASIntroView.tsx) | [`BSASAssessmentModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) | `submitAssessment`<br>`getBSASCooldown`<br>`getAssessments` | `handleCompleteBSAS()` | `bsas_assessment`<br>`users` | - 30-day clinical retake cooldown engine<br>- Dimension endorsement threshold ($\ge 3$ Likert)<br>- Cut-off diagnostic calculation ($\ge 4$ dims) |
| **3. Virtual Wardrobe** | [`VirtualClosetView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/VirtualClosetView.tsx) | [`AddItemModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/AddItemModal.tsx)<br>[`EditItemModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/EditItemModal.tsx)<br>[`DeleteCascadeModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/DeleteCascadeModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts)<br>[`imageProcessing.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/imageProcessing.ts) | `addItem`<br>`updateItem`<br>`deleteItem`<br>`removeBackgroundClientSide` | `handleAddGarment()`<br>`handleUpdateGarment()`<br>`handleConfirmDeleteGarment()` | `clothing_item`<br>`item_tag`<br>`daily_log_item`<br>`borrow` | - Redmean perceptual color background extraction<br>- Automated vector silhouette fallback<br>- ON DELETE CASCADE cleanup across loans and logs |
| **4. Daily Clothing Log**| [`DailyLogView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DailyClothingLog/DailyLogView.tsx) | *Inline Outfit Builder* | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) | `updateTodayItems`<br>`finalizeDailyLog`<br>`unlockDailyLogForEditing`<br>`deleteDailyLog` | `handleToggleGarmentInOutfit()`<br>`handleFinalizeDailyLog()`<br>`handleDeleteDailyLog()` | `daily_clothing_log`<br>`daily_log_item`<br>`clothing_item` | - FIFO Promise serialized sync queue (`dailyLogSyncChain`)<br>- Wear count increment guard on lock<br>- Wear count rollback on deletion / unlock |
| **5. Recovery & Analytics**| [`RecoveryView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/RecoveryView.tsx)<br>[`ClosetStatisticsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/RecoveryProgress/ClosetStatisticsView.tsx) | [`BSASAssessmentModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/BSAS/BSASAssessmentModal.tsx) | [`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) | `getAssessments`<br>`calculateClosetAnalytics`<br>`deduplicateAssessments` | `handleCompleteBSAS()` | `bsas_assessment`<br>`clothing_item` | - Assessment deduplication by `(score, date)`<br>- Mathematical utilization rate calculation<br>- UN SDG 12 $CO_2e$ (15kg) and water (2,700L) formulas |
| **6. Friends & Lending** | [`FriendsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/FriendsView.tsx)<br>[`LendingDashboardView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/LendingDashboardView.tsx)<br>[`NotificationsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/NotificationsView.tsx) | [`BorrowModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/BorrowModal.tsx) | [`friendsService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/FriendsAndLending/friendsService.ts) | `sendFriendRequest`<br>`respondToRequest`<br>`requestBorrow`<br>`updateBorrowStatus` | `handleAcceptFriendRequest()`<br>`handleSubmitBorrow()`<br>`handleRespondBorrow()` | `friend_request`<br>`borrow`<br>`users`<br>`clothing_item` | - `ensureUserSyncedToSupabase` on both participants<br>- Date range collision check algorithm (`checkDateOverlap`)<br>- Garment status lock to `'Borrowed'` preventing double loans |
| **7. Donation Map** | [`DonationMapSection.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/DonationMapSection.tsx) | [`AddDonationModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/AddDonationModal.tsx)<br>[`FlagModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/FlagModal.tsx)<br>[`ConfirmModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/ConfirmModal.tsx) | [`mapsService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/DonationMap/mapsService.ts) | `getDonationOpportunities`<br>`addDonationOpportunity`<br>`deleteDonationOpportunity`<br>`addFlag` | `handleAddDriveSubmit()`<br>`handleDeleteOpportunity()`<br>`handleSubmitFlag()` | `donation_opportunity`<br>`donation_flag` | - Haversine great-circle distance engine<br>- Automated expired drive filter (`end_date < now`)<br>- Creator-only deletion assertion (`created_by === currentUserId`) |
| **8. Profile & Settings**| [`ProfileView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/ProfileView.tsx)<br>[`SettingsView.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/views/SettingsView.tsx) | [`ConfirmModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/ConfirmModal.tsx) | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts)<br>[`closetService.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/modules/VirtualCloset/closetService.ts) | `deleteUserAccount`<br>`safeStorage` | `handleSaveProfile()`<br>`handleDeleteAccount()` | All 10 PostgreSQL Tables | - Text confirmation requiring typing `"DELETE"`<br>- Supabase Auth sign-out<br>- Complete relational cascade wipe |
| **9. Database Diagnostics**| [`DatabaseModal.tsx`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/modals/DatabaseModal.tsx) | *Self-Contained* | [`supabaseClient.ts`](file:///c:/Users/Admin/Downloads/ReApparel/src/shared/services/supabaseClient.ts) | `runDatabaseDiagnostic`<br>`syncAllLocalDataToSupabase` | `handleRunDiagnostics()`<br>`handleSyncToCloud()` | All 10 PostgreSQL Tables | - Real-time HTTP ping telemetry<br>- PostgreSQL Row Level Security write probe<br>- Self-healing orphan entity cloud push |

---

## 15. Verification & Capstone Defense Checklist

- [x] **Zero TypeScript Errors:** Entire codebase compiles cleanly with `tsc --noEmit` (Exit code 0).
- [x] **Production Bundle Success:** `vite build` packages assets without missing imports in $< 1\text{s}$.
- [x] **Zero Duplicate Files:** Complete migration into `src/modules/` and `src/shared/` with legacy folders purged.
- [x] **Relational Foreign Key Safety:** `ensureUserSyncedToSupabase()` guarantees users exist before child entity insertion.
- [x] **Offline-to-Cloud Dual-Store:** Local mutations execute at 0ms and asynchronously reconcile with Supabase.
- [x] **Clean Root Directory:** Unused configs removed; `vercel.json` configured for production hosting.
- [x] **Code Hyperlinks Integrity:** Every module, handler, and calculation references its exact file and line range.

---

*Document compiled and verified against repository source code in `c:\Users\Admin\Downloads\ReApparel\`.*
