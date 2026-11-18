require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const createStudentsRouter = require('./routes/students');
const createBankingRouter = require('./routes/banking');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_MODE = (process.env.APP_MODE || 'auto').toLowerCase();
const MONGO_URI_STUDENTS = process.env.MONGO_URI_STUDENTS || 'mongodb://127.0.0.1:27017';
const MONGO_URI_BANKING =
  process.env.MONGO_URI_BANKING ||
  'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/?replicaSet=rs0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbState = {
  studentsMode: 'simulation',
  bankingMode: 'simulation',
  studentsClient: null,
  bankingClient: null
};

async function initConnections() {
  if (APP_MODE === 'simulation') {
    console.log('[Mode] Running in forced SIMULATION mode.');
    return;
  }

  // Try connecting to Standalone / Primary MongoDB for Scenario A2 (collegeDB.students)
  try {
    const client = new MongoClient(MONGO_URI_STUDENTS, {
      serverSelectionTimeoutMS: 2000
    });
    await client.connect();
    await client.db('collegeDB').command({ ping: 1 });
    dbState.studentsClient = client;
    dbState.studentsMode = 'live';
    console.log(`[MongoDB] Connected to collegeDB at ${MONGO_URI_STUDENTS} (LIVE)`);
  } catch (err) {
    if (APP_MODE === 'live') {
      console.error('[MongoDB] Failed to connect to collegeDB in LIVE mode:', err.message);
    } else {
      console.log('[MongoDB] collegeDB unavailable; using SIMULATION mode for Scenario A2.');
    }
  }

  // Try connecting to 3-Node Replica Set rs0 for Scenario A4 (bankDB.accounts)
  try {
    const rsClient = new MongoClient(MONGO_URI_BANKING, {
      serverSelectionTimeoutMS: 2000
    });
    await rsClient.connect();
    await rsClient.db('bankDB').command({ ping: 1 });
    dbState.bankingClient = rsClient;
    dbState.bankingMode = 'live';
    console.log(`[MongoDB] Connected to Replica Set rs0 at ${MONGO_URI_BANKING} (LIVE)`);
  } catch (err) {
    if (APP_MODE === 'live') {
      console.error('[MongoDB] Failed to connect to Replica Set rs0 in LIVE mode:', err.message);
    } else {
      console.log('[MongoDB] Replica Set rs0 unavailable; using SIMULATION mode for Scenario A4.');
    }
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    appMode: APP_MODE,
    studentsMode: dbState.studentsMode,
    bankingMode: dbState.bankingMode,
    uris: {
      students: MONGO_URI_STUDENTS,
      banking: MONGO_URI_BANKING
    }
  });
});

app.use('/api/students', createStudentsRouter(dbState));
app.use('/api/banking', createBankingRouter(dbState));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initConnections().then(() => {
  app.listen(PORT, () => {
    console.log(`\nMongoDB Lab Fullstack Server running at http://localhost:${PORT}`);
    console.log(`Scenario A2 (Student Records): ${dbState.studentsMode.toUpperCase()}`);
    console.log(`Scenario A4 (Banking Replica Set): ${dbState.bankingMode.toUpperCase()}\n`);
  });
});
