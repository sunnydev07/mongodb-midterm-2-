# MongoDB Lab Practicals — Fullstack JavaScript Project

A unified **Node.js + Express + MongoDB + Vanilla JS** fullstack web application covering both MongoDB lab practical scenarios:

1. **Scenario A2 — Student Records (`collegeDB.students`)**: `insertOne`, duplicate `_id` (`E11000`) error handling, `insertMany`, equality queries, comparison operators (`$gte`), `$in`, `$elemMatch` on nested `scores` arrays, sorting, limiting, and projection.
2. **Scenario A4 — Banking App Replica Set (`bankDB.accounts`)**: 3-node replica set (`rs0` on ports `27017`, `27018`, `27019`), `rs.initiate()`, Primary/Secondary identification, `w: "majority"` write concern, `secondaryPreferred` read preference, `local.oplog.rs` inspection, `rs.stepDown()` failover election, and `rs.status()` replication lag monitoring.

---

## Project Structure

```text
mongodb-lab-fullstack/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── server.js                              # Express server (Live MongoDB + Simulation fallback)
├── routes/
│   ├── students.js                        # Scenario A2 API endpoints (Tasks 1–8 + custom insert)
│   └── banking.js                         # Scenario A4 API endpoints (Tasks 1–7)
├── scripts/
│   ├── scenario-a2-students.mongosh.js    # Standalone mongosh script for Scenario A2
│   ├── scenario-a4-banking.mongosh.js     # Standalone mongosh script for Scenario A4
│   ├── start-replica-set.sh               # Linux/macOS 3-node rs0 startup script
│   └── start-replica-set.bat              # Windows 3-node rs0 startup script
└── public/
    ├── index.html                         # Fullstack interactive lab dashboard
    ├── styles.css                         # UI styling
    └── app.js                             # Frontend controller (API + offline preview fallback)
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
cp .env.example .env
```

### 2. Run the Fullstack App
```bash
npm start
```
Open **http://localhost:3000** in your browser.

- **Auto Mode (default)**: If local MongoDB (`27017`) or Replica Set `rs0` (`27017,27018,27019`) is running, the backend executes real queries via the official `mongodb` Node.js driver. If MongoDB is not running, it automatically runs in **Simulation / Preview Mode** so you can still test every task.

### 3. Run Against Live MongoDB Replica Set (Scenario A4)
- **Linux / macOS**:
  ```bash
  chmod +x scripts/start-replica-set.sh
  ./scripts/start-replica-set.sh
  mongosh --port 27017 < scripts/scenario-a4-banking.mongosh.js
  ```
- **Windows**:
  ```bat
  scripts\start-replica-set.bat
  mongosh --port 27017 < scripts\scenario-a4-banking.mongosh.js
  ```

### 4. Run Standalone `mongosh` Script (Scenario A2)
```bash
mongosh < scripts/scenario-a2-students.mongosh.js
```

---

## 📸 Live Demo / Verification

Below is a screenshot of the running fullstack dashboard (both scenarios active):

![MongoDB Lab Fullstack Dashboard — Scenario A2 & Scenario A4](public/demo-screenshot.png)

### Backend Health Check (verified output)

```json
{
  "ok": true,
  "appMode": "auto",
  "studentsMode": "simulation",
  "bankingMode": "simulation",
  "uris": {
    "students": "mongodb://127.0.0.1:27017",
    "banking": "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/?replicaSet=rs0"
  }
}
```

**Both Scenario A2 and Scenario A4 are running.** When MongoDB is not available locally, the app automatically falls back to **Simulation / Preview Mode**, which lets you exercise every API task (insert, query, update, delete, replica-set operations) without a live database. To run against a live MongoDB instance, follow the steps in "Quick Start" above.


---

## Output Screenshots (Verification)

All task outputs were captured live from the running fullstack dashboard
(LIVE MongoDB + 3-node replica set `rs0`) and saved in [`Output_Screenshots/`](Output_Screenshots/).

### Scenario A2 — Student Records
- [00_A2_initial_after_reset.png](Output_Screenshots/00_A2_initial_after_reset.png)
- [A2_Task1.png](Output_Screenshots/A2_Task1.png) — Insert Arun (_id: 101) with insertOne
- [A2_Task2.png](Output_Screenshots/A2_Task2.png) — Duplicate _id: 101 insert (E11000)
- [A2_Task3.png](Output_Screenshots/A2_Task3.png) — Insert remaining 5 students (102–106) via insertMany
- [A2_Task4.png](Output_Screenshots/A2_Task4.png) — Equality Query: CSE department students
- [A2_Task5.png](Output_Screenshots/A2_Task5.png) — Comparison Query: marks >= 75
- [A2_Task6.png](Output_Screenshots/A2_Task6.png) — $in Operator: CSE or IT department
- [A2_Task7.png](Output_Screenshots/A2_Task7.png) — $elemMatch: DBMS mark > 80
- [A2_Task8.png](Output_Screenshots/A2_Task8.png) — Sort, Limit & Project: Top 3
- [A2_RunAll_8_Tasks.png](Output_Screenshots/A2_RunAll_8_Tasks.png) — Run All 8 Tasks summary

### Scenario A4 — Banking Replica Set
- [00_A4_initial.png](Output_Screenshots/00_A4_initial.png)
- [A4_Task1.png](Output_Screenshots/A4_Task1.png) — Initiate 3-node Replica Set rs0
- [A4_Task2.png](Output_Screenshots/A4_Task2.png) — Identify PRIMARY and SECONDARY members
- [A4_Task3.png](Output_Screenshots/A4_Task3.png) — Insert account with w: majority, j: true
- [A4_Task4.png](Output_Screenshots/A4_Task4.png) — Read with secondaryPreferred preference
- [A4_Task5.png](Output_Screenshots/A4_Task5.png) — Inspect local.oplog.rs entry
- [A4_Task6.png](Output_Screenshots/A4_Task6.png) — Force rs.stepDown(60) and observe election
- [A4_Task7.png](Output_Screenshots/A4_Task7.png) — Check rs.status() health and secondary lag
