You are building a full-stack Progressive Web App called GEOSERVE using:

* React (Vite)
* TailwindCSS
* Supabase (PostgreSQL + Realtime)
* Leaflet (OpenStreetMap)

The goal is to solve food waste by connecting food donors with nearby collectors.

---

## CORE PRODUCT FLOW (STRICT)

You MUST implement this exact flow:

1. Donor creates a food listing
2. Listing appears on a real-time map
3. Nearby collectors can view and claim listings
4. A claimed listing is reserved
5. Pickup is completed
6. Trust score is updated

Do NOT skip or reorder this flow.

---

## DATABASE (SUPABASE)

Create a table called `listings` with fields:

* id (uuid, primary key)
* title (text)
* quantity (text)
* lat (float)
* lng (float)
* status (active | claimed | completed)
* expiry_time (timestamp)
* created_at (timestamp)

Later extend with:

* donor_id
* collector_id

---

## FRONTEND REQUIREMENTS

### 1. Add Listing (Donor)

* Form with:

  * title
  * quantity
* On submit:

  * insert into Supabase
  * status = active

---

### 2. Map View (Collector)

* Use Leaflet
* Show all active listings as markers
* Each marker shows:

  * title
  * quantity
  * status

---

### 3. Claim System

* Button: "Claim"
* On click:

  * update status → claimed
* Prevent multiple claims (basic check)

---

### 4. Complete Pickup

* Button: "Complete"
* On click:

  * update status → completed

---

### 5. Global State

* Use React Context
* Store:

  * listings
  * user (optional for now)

---

## REAL-TIME (IMPORTANT)

* Use Supabase subscriptions
* Listings should update automatically without refresh

---

## UI REQUIREMENTS

* Use TailwindCSS
* Keep UI minimal and functional
* Mobile-first design

---

## PWA REQUIREMENTS

* Add service worker
* Make app installable
* Cache last fetched listings

---

## CONSTRAINTS (VERY IMPORTANT)

* Do NOT build a separate backend (no Express, no MongoDB)
* Do NOT overcomplicate authentication initially
* Do NOT use complex state management (no Redux)
* Do NOT implement advanced AI features

---

## DEVELOPMENT STRATEGY

Build in this order ONLY:

1. Supabase connection
2. Add listing form
3. Fetch + display listings
4. Map integration
5. Claim functionality
6. Complete pickup
7. Real-time updates
8. UI polish
9. PWA features

---

## OUTPUT FORMAT

* Generate modular React components
* Keep code clean and minimal
* Avoid unnecessary abstractions
* Ensure each feature works before moving on

---

## SUCCESS CRITERIA

The app is considered complete when:

* A user can add a listing
* It appears on the map instantly
* Another user can claim it
* Status updates correctly
* No page refresh is required

---

Focus on functionality over perfection.
