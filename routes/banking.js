const express = require('express');
const { ObjectId, ReadPreference } = require('mongodb');

const READ_PREFERENCES_TABLE = [
  { mode: 'primary (default)', meaning: 'Always read from the primary - latest data, no stale reads.' },
  { mode: 'primaryPreferred', meaning: 'Primary if available, otherwise a secondary.' },
  { mode: 'secondary', meaning: 'Only secondaries - reduces load on primary, data may be slightly stale.' },
  { mode: 'secondaryPreferred', meaning: 'Secondary if available, otherwise the primary.' },
  { mode: 'nearest', meaning: 'Member with the lowest network latency, primary or secondary.' }
];

function createBankingRouter(dbState) {
  const router = express.Router();

  // In-memory simulation state for 3-node Replica Set rs0
  let simInitiated = false;
  let simMembers = [
    { _id: 0, name: 'localhost:27017', stateStr: 'PRIMARY', health: 1, optimeDate: new Date() },
    { _id: 1, name: 'localhost:27018', stateStr: 'SECONDARY', health: 1, optimeDate: new Date() },
    { _id: 2, name: 'localhost:27019', stateStr: 'SECONDARY', health: 1, optimeDate: new Date() }
  ];
  let simAccounts = [];
  let simOplog = [];

  function getAccountsCollection() {
    if (dbState.bankingMode === 'live' && dbState.bankingClient) {
      return dbState.bankingClient.db('bankDB').collection('accounts');
    }
    return null;
  }

  function getAdminDb() {
    if (dbState.bankingMode === 'live' && dbState.bankingClient) {
      return dbState.bankingClient.db('admin');
    }
    return null;
  }

  // Get current accounts & replica state
  router.get('/state', async (req, res) => {
    try {
      const col = getAccountsCollection();
      if (col) {
        const accounts = await col.find({}).toArray();
        const status = await getAdminDb().command({ replSetGetStatus: 1 });
        return res.json({
          mode: 'live',
          initiated: true,
          members: status.members.map((m) => ({
            name: m.name,
            state: m.stateStr,
            health: m.health,
            optimeDate: m.optimeDate
          })),
          accounts,
          oplogCount: simOplog.length
        });
      }
      return res.json({
        mode: 'simulation',
        initiated: simInitiated,
        members: simMembers.map((m) => ({
          name: m.name,
          state: m.stateStr,
          health: m.health,
          optimeDate: m.optimeDate
        })),
        accounts: simAccounts,
        oplogCount: simOplog.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 1: Initiate replica set rs0
  router.post('/task1', async (req, res) => {
    const query = `rs.initiate({\n  _id: "rs0",\n  members: [\n    { _id: 0, host: "localhost:27017" },\n    { _id: 1, host: "localhost:27018" },\n    { _id: 2, host: "localhost:27019" }\n  ]\n})`;
    const whyReplication =
      'Replication keeps identical data across multiple servers, providing high availability (automatic failover if the primary crashes), data redundancy (protection against data loss), and optional read scaling across secondaries.';

    try {
      const admin = getAdminDb();
      if (admin) {
        const status = await admin.command({ replSetGetStatus: 1 });
        return res.json({
          mode: 'live',
          task: 1,
          query,
          output: { ok: status.ok, set: status.set, info: 'Replica set rs0 is already active.' },
          whyReplication
        });
      }
      simInitiated = true;
      const now = new Date();
      simMembers = [
        { _id: 0, name: 'localhost:27017', stateStr: 'PRIMARY', health: 1, optimeDate: now },
        { _id: 1, name: 'localhost:27018', stateStr: 'SECONDARY', health: 1, optimeDate: now },
        { _id: 2, name: 'localhost:27019', stateStr: 'SECONDARY', health: 1, optimeDate: now }
      ];
      return res.json({
        mode: 'simulation',
        task: 1,
        query,
        output: { ok: 1, set: 'rs0', prompt: 'rs0 [direct: primary] test>' },
        whyReplication
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 2: Identify PRIMARY and SECONDARY members
  router.get('/task2', async (req, res) => {
    const query = 'rs.status().members.map(m => ({ name: m.name, state: m.stateStr, health: m.health }))';
    try {
      const admin = getAdminDb();
      if (admin) {
        const status = await admin.command({ replSetGetStatus: 1 });
        const members = status.members.map((m) => ({
          name: m.name,
          state: m.stateStr,
          health: m.health
        }));
        return res.json({ mode: 'live', task: 2, query, output: members });
      }
      const members = simMembers.map((m) => ({
        name: m.name,
        state: m.stateStr,
        health: m.health
      }));
      return res.json({ mode: 'simulation', task: 2, query, output: members });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 3: Insert account document with writeConcern w: "majority", j: true, wtimeout: 5000
  router.post('/task3', async (req, res) => {
    const accNo = Number(req.body?.accNo || 1001);
    const holder = String(req.body?.holder || 'Kumar').trim();
    const balance = Number(req.body?.balance ?? 5000);
    const doc = { accNo, holder, balance };
    const query = `db.accounts.insertOne(${JSON.stringify(doc)}, { writeConcern: { w: "majority", j: true, wtimeout: 5000 } })`;

    try {
      const col = getAccountsCollection();
      if (col) {
        const result = await col.insertOne(doc, {
          writeConcern: { w: 'majority', j: true, wtimeout: 5000 }
        });
        return res.json({ mode: 'live', task: 3, query, output: result });
      }
      const insertedId = new ObjectId().toString();
      const storedDoc = { _id: insertedId, ...doc };
      simAccounts.push(storedDoc);
      const now = new Date();
      simMembers.forEach((m) => {
        m.optimeDate = now;
      });
      simOplog.unshift({
        op: 'i',
        ns: 'bankDB.accounts',
        o: storedDoc,
        ts: { t: Math.floor(now.getTime() / 1000), i: simOplog.length + 1 }
      });
      return res.json({
        mode: 'simulation',
        task: 3,
        query,
        output: { acknowledged: true, insertedId },
        note: 'w: "majority" confirms the write after at least 2 of 3 members acknowledge it; j: true waits for the on-disk journal.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 4: Read with readPreference secondaryPreferred
  router.get('/task4', async (req, res) => {
    const query = 'db.getMongo().setReadPref("secondaryPreferred"); db.accounts.find()';
    try {
      const col = getAccountsCollection();
      if (col) {
        const docs = await col
          .find({}, { readPreference: ReadPreference.SECONDARY_PREFERRED })
          .toArray();
        return res.json({
          mode: 'live',
          task: 4,
          query,
          output: docs,
          readPreferences: READ_PREFERENCES_TABLE
        });
      }
      const servedBy =
        simMembers.find((m) => m.stateStr === 'SECONDARY' && m.health === 1)?.name ||
        simMembers.find((m) => m.stateStr === 'PRIMARY')?.name;
      return res.json({
        mode: 'simulation',
        task: 4,
        query,
        servedBy,
        output: simAccounts,
        readPreferences: READ_PREFERENCES_TABLE
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 5: Inspect oplog entry in local.oplog.rs
  router.get('/task5', async (req, res) => {
    const query = 'use local; db.oplog.rs.find({ ns: "bankDB.accounts" }).sort({ $natural: -1 }).limit(3)';
    try {
      if (dbState.bankingMode === 'live' && dbState.bankingClient) {
        const oplog = await dbState.bankingClient
          .db('local')
          .collection('oplog.rs')
          .find({ ns: 'bankDB.accounts' })
          .sort({ $natural: -1 })
          .limit(3)
          .toArray();
        return res.json({ mode: 'live', task: 5, query, output: oplog });
      }
      return res.json({ mode: 'simulation', task: 5, query, output: simOplog.slice(0, 3) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 6: Force PRIMARY to step down and observe new PRIMARY election
  router.post('/task6', async (req, res) => {
    const query = 'rs.stepDown(60)';
    try {
      const admin = getAdminDb();
      if (admin) {
        try {
          await admin.command({ replSetStepDown: 60 });
        } catch (stepErr) {
          // MongoDB closes client connection on stepDown; that's expected
        }
        await new Promise((r) => setTimeout(r, 1500));
        const status = await admin.command({ replSetGetStatus: 1 });
        return res.json({
          mode: 'live',
          task: 6,
          query,
          output: status.members.map((m) => ({
            name: m.name,
            state: m.stateStr,
            health: m.health
          }))
        });
      }

      const currentPrimaryIdx = simMembers.findIndex((m) => m.stateStr === 'PRIMARY');
      const nextPrimaryIdx = (currentPrimaryIdx + 1) % simMembers.length;
      const oldPrimary = simMembers[currentPrimaryIdx].name;
      simMembers.forEach((m, idx) => {
        m.stateStr = idx === nextPrimaryIdx ? 'PRIMARY' : 'SECONDARY';
      });
      const newPrimary = simMembers[nextPrimaryIdx].name;
      return res.json({
        mode: 'simulation',
        task: 6,
        query,
        event: `${oldPrimary} stepped down. Election completed: ${newPrimary} elected as new PRIMARY.`,
        output: simMembers.map((m) => ({
          name: m.name,
          state: m.stateStr,
          health: m.health
        }))
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 7: Check replication health using rs.status() & replication lag
  router.get('/task7', async (req, res) => {
    const query = 'rs.status() / rs.printSecondaryReplicationInfo()';
    try {
      const admin = getAdminDb();
      if (admin) {
        const status = await admin.command({ replSetGetStatus: 1 });
        const primary = status.members.find((m) => m.stateStr === 'PRIMARY');
        const primaryTime = primary?.optimeDate ? new Date(primary.optimeDate).getTime() : Date.now();
        const report = status.members.map((m) => ({
          name: m.name,
          state: m.stateStr,
          health: m.health,
          lagSeconds: m.optimeDate
            ? Math.max(0, Math.round((primaryTime - new Date(m.optimeDate).getTime()) / 1000))
            : 0
        }));
        return res.json({ mode: 'live', task: 7, query, output: report });
      }
      const primary = simMembers.find((m) => m.stateStr === 'PRIMARY');
      const primaryTime = primary.optimeDate.getTime();
      const report = simMembers.map((m) => ({
        name: m.name,
        state: m.stateStr,
        health: m.health,
        lagSeconds: Math.max(0, Math.round((primaryTime - m.optimeDate.getTime()) / 1000))
      }));
      return res.json({ mode: 'simulation', task: 7, query, output: report });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createBankingRouter;
