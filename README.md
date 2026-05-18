# ATOMQUEST // In-House Goal Setting & Tracking Portal

AtomQuest is a high-fidelity, premium corporate performance management dashboard designed to align organizations with dynamic goals, strict constraint validations, manager-led approval workflows, cascading shared metrics, and an active audit trail log.

---

## 🚀 Key Features Built

### 1. Unified Cyber-Obsidian Dashboard Interface
- Styled with dynamic HSL dark variables, elegant glassmorphic cards, glowing interactive hover states, Outfit typography, and glowing progress indicators.
- **Dynamic Role Switcher Header**: Judges can instantly select any of the 8 corporate personas (Employee, Manager, CEO, HR Admin) to toggle the entire application's UI views and API context.
- **Floating Alert Toasts Center**: Live in-app triggers display notifications when sheets are submitted/locked, dates shifted, or shared achievements cascaded.

### 2. Time Machine (Cycle Date Simulator)
- A simulated system calendar allows testing across all fiscal windows in real-time.
- Swapping to **May 15th** activates **Goal Setting** (allowing employee additions/drafting).
- Swapping to **July 15th** automatically locks goal-drafting and unlocks **Q1 Quarterly Achievements Logging** with inline formulas!

### 3. Strict Constraint Validation Engine
- Enforces hard limitations: Maximum of `8 goals` per sheet, individual goal weightage must be $\ge$ `10%`, and the cumulative sheet total must sum to exactly `100%` before submission.
- Real-time animated gauges display balance states to employees.

### 4. Direct Reports Override & Approvals Area
- Managers see submitted sheets from reports, and can reject sheets with comments or directly override/adjust goal weightages inline before clicking "Approve & Lock".

### 5. Cascading Shared Goal Syncing
- CEO-level KPIs (such as Corporate CSAT) automatically push to direct sheets with locked parameters (title, description, target).
- When the primary user logs a Q1 achievement on the master goal, the results automatically sync down to all recipients' sheets in a transactional atomic operation.

### 6. Dynamic Recharts Analytics
- Thrust area weightage distributions (Pie chart), Employee Goal Completion states (Bar chart), and QoQ achievement average trends (Line chart) update in real-time.

---

## 🛠️ Relational Database Schema (SQLite)

- `User`: Handles active credentials, departments, roles (`EMPLOYEE`, `MANAGER`, `ADMIN`), and organizational hierarchies.
- `Goal`: Relates to owners, sets weightages, UoM constraints, lock states, and shared parent templates.
- `Achievement`: Connects actual progress inputs and scores per quarter.
- `CheckIn`: Captures manager quarterly review approvals and commentary.
- `Cycle`: Prescribes dates defining the fiscal calendar phases.
- `AuditLog`: Enforces high-integrity governance logging by tracking actions, actors, reasons, and state changes.

---

## 📐 Precise Progress Formula Engines

- **Numeric Min (Higher is better)**:
  $$\text{Score} = \left(\frac{\text{actualValue}}{\text{targetValue}}\right) \times 100$$
- **Numeric Max (Lower is better)**:
  $$\text{Score} = \left(\frac{\text{targetValue}}{\text{actualValue}}\right) \times 100 \quad (\text{if actual} = 0 \text{ score is } 100\%)$$
- **Zero-Based (Zero is success)**:
  $$\text{Score} = (\text{actualValue} == 0) ? 100 : 0$$
- **Timeline (Date Bound)**:
  $$\text{Score} = (\text{actualDate} \le \text{targetDate}) ? 100 : 0$$

---

## 🏃 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Seeding
The database is fully configured and pre-populated. To reset or populate:
```bash
npx prisma db push
node prisma/seed.js
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to experience the dashboard!

---

## 🧑‍💻 Walking Through the Judge's Guide

1. **Test Role Switching**: Switch to **Alex Rivera** (Engineering Employee) via the header. Notice his sheet is LOCKED as he has pre-seeded approved goals.
2. **Time Travel**: In the left Time Machine panel, click **July 15 (Q1 Check-in Open)**. The portal instantly updates to Q1 check-in state. Scroll to Alex's first goal and click **Log Q1 Actuals**. Enter `1.8` for API speed (target is 2.0). Notice the preview math computes `111.11%`! Click Log.
3. **Verify Shared Cascades**: Switch to **David Vance** (Manager L1). David is a manager who owns the shared CSAT goal. Log an achievement on David's CSAT goal. Swapping back to Alex Rivera reveals that his copy of the shared CSAT goal has automatically updated its achievement score and logged progress in real-time!
4. **Test Goal Creation**: Switch to **Bianca Cole**. Bianca's sheet is in a draft state. Try adding goals or submitting. Notice the Submission button is disabled until the dynamic weightage gauge hits exactly `100%`.
5. **Manager Approvals**: Switch to **David Vance**. You will see Bianca's sheet under the pending approvals queue. Adjust weightages or reject/approve her sheet!
6. **Audit Console**: Switch to **Sarah Jenkins** (HR Admin). Scroll down to inspect the detailed terminal-style governance logs mapping all simulated date shifts, overrides, and submissions.
7. **Report Exports**: Click **Export CSV** in the Manager panel to instantly compile and download a formatted performance registry.
