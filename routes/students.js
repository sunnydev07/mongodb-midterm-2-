const express = require('express');

const ARUN_DOC = {
  _id: 101,
  name: 'Arun',
  dept: 'CSE',
  marks: 78,
  scores: [
    { subject: 'DBMS', mark: 85 },
    { subject: 'Maths', mark: 70 }
  ]
};

const REMAINING_STUDENTS = [
  {
    _id: 102,
    name: 'Bala',
    dept: 'IT',
    marks: 66,
    scores: [
      { subject: 'DBMS', mark: 60 },
      { subject: 'Maths', mark: 72 }
    ]
  },
  {
    _id: 103,
    name: 'Chitra',
    dept: 'CSE',
    marks: 91,
    scores: [
      { subject: 'DBMS', mark: 95 },
      { subject: 'Maths', mark: 87 }
    ]
  },
  {
    _id: 104,
    name: 'Divya',
    dept: 'ECE',
    marks: 72,
    scores: [
      { subject: 'DBMS', mark: 55 },
      { subject: 'Maths', mark: 89 }
    ]
  },
  {
    _id: 105,
    name: 'Eswar',
    dept: 'IT',
    marks: 84,
    scores: [
      { subject: 'DBMS', mark: 88 },
      { subject: 'Maths', mark: 80 }
    ]
  },
  {
    _id: 106,
    name: 'Farah',
    dept: 'CSE',
    marks: 59,
    scores: [
      { subject: 'DBMS', mark: 45 },
      { subject: 'Maths', mark: 73 }
    ]
  }
];

function createStudentsRouter(dbState) {
  const router = express.Router();

  // In-memory simulation store for Scenario A2 (collegeDB.students)
  let simStudents = [];

  function getCollection() {
    if (dbState.studentsMode === 'live' && dbState.studentsClient) {
      return dbState.studentsClient.db('collegeDB').collection('students');
    }
    return null;
  }

  // Get all students currently in collegeDB.students
  router.get('/', async (req, res) => {
    try {
      const col = getCollection();
      if (col) {
        const docs = await col.find({}).sort({ _id: 1 }).toArray();
        return res.json({ mode: 'live', count: docs.length, data: docs });
      }
      const docs = [...simStudents].sort((a, b) => a._id - b._id);
      return res.json({ mode: 'simulation', count: docs.length, data: docs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset collection to empty (start of scenario)
  router.post('/reset', async (req, res) => {
    try {
      const col = getCollection();
      if (col) {
        await col.deleteMany({});
        return res.json({ mode: 'live', acknowledged: true, message: 'collegeDB.students cleared.' });
      }
      simStudents = [];
      return res.json({ mode: 'simulation', acknowledged: true, message: 'collegeDB.students cleared.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 1: Insert Arun (_id: 101) with insertOne
  router.post('/task1', async (req, res) => {
    const query = `db.students.insertOne(${JSON.stringify(ARUN_DOC)})`;
    try {
      const col = getCollection();
      if (col) {
        const result = await col.insertOne(structuredClone(ARUN_DOC));
        return res.json({ mode: 'live', task: 1, query, output: result });
      }
      if (simStudents.some((s) => s._id === 101)) {
        return res.status(409).json({
          mode: 'simulation',
          task: 1,
          query,
          error: 'MongoServerError: E11000 duplicate key error collection: collegeDB.students index: _id_ dup key: { _id: 101 }'
        });
      }
      simStudents.push(structuredClone(ARUN_DOC));
      return res.json({
        mode: 'simulation',
        task: 1,
        query,
        output: { acknowledged: true, insertedId: 101 }
      });
    } catch (err) {
      res.status(409).json({ mode: dbState.studentsMode, task: 1, query, error: err.message });
    }
  });

  // Task 2: Deliberate duplicate _id: 101 insertOne
  router.post('/task2', async (req, res) => {
    const duplicateDoc = {
      _id: 101,
      name: 'DuplicateStudent',
      dept: 'CSE',
      marks: 80,
      scores: [
        { subject: 'DBMS', mark: 80 },
        { subject: 'Maths', mark: 80 }
      ]
    };
    const query = `db.students.insertOne(${JSON.stringify(duplicateDoc)})`;
    const explanation =
      '_id is the primary key and must be unique. The original Arun document is not changed. Fix: use a new _id value or leave _id out so MongoDB generates an ObjectId.';

    try {
      const col = getCollection();
      if (col) {
        await col.insertOne(duplicateDoc);
        return res.json({
          mode: 'live',
          task: 2,
          query,
          note: 'Insert succeeded because _id 101 was not present yet. Run Task 1 first to trigger E11000.'
        });
      }
      if (simStudents.some((s) => s._id === 101)) {
        return res.json({
          mode: 'simulation',
          task: 2,
          query,
          expectedError: true,
          output: 'MongoServerError: E11000 duplicate key error collection: collegeDB.students index: _id_ dup key: { _id: 101 }',
          explanation
        });
      }
      return res.json({
        mode: 'simulation',
        task: 2,
        query,
        expectedError: false,
        output: 'Run Task 1 first so _id: 101 exists, then Task 2 will trigger the E11000 duplicate key error.',
        explanation
      });
    } catch (err) {
      return res.json({
        mode: 'live',
        task: 2,
        query,
        expectedError: true,
        output: err.message,
        explanation
      });
    }
  });

  // Task 3: Insert remaining 5 students (102 to 106) with insertMany
  router.post('/task3', async (req, res) => {
    const query = 'db.students.insertMany([ /* 102..106 */ ])';
    try {
      const col = getCollection();
      if (col) {
        const result = await col.insertMany(structuredClone(REMAINING_STUDENTS));
        return res.json({ mode: 'live', task: 3, query, output: result });
      }
      const existingIds = new Set(simStudents.map((s) => s._id));
      for (const s of REMAINING_STUDENTS) {
        if (existingIds.has(s._id)) {
          return res.status(409).json({
            mode: 'simulation',
            task: 3,
            query,
            error: `MongoBulkWriteError: E11000 duplicate key error collection: collegeDB.students index: _id_ dup key: { _id: ${s._id} }`
          });
        }
      }
      REMAINING_STUDENTS.forEach((s) => simStudents.push(structuredClone(s)));
      return res.json({
        mode: 'simulation',
        task: 3,
        query,
        output: {
          acknowledged: true,
          insertedCount: 5,
          insertedIds: { '0': 102, '1': 103, '2': 104, '3': 105, '4': 106 }
        }
      });
    } catch (err) {
      res.status(409).json({ mode: dbState.studentsMode, task: 3, query, error: err.message });
    }
  });

  // Task 4: Equality query - CSE department
  router.get('/task4', async (req, res) => {
    const query = 'db.students.find({ dept: "CSE" })';
    try {
      const col = getCollection();
      const docs = col
        ? await col.find({ dept: 'CSE' }).sort({ _id: 1 }).toArray()
        : simStudents.filter((s) => s.dept === 'CSE');
      res.json({ mode: dbState.studentsMode, task: 4, query, count: docs.length, output: docs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 5: Comparison operator - marks >= 75
  router.get('/task5', async (req, res) => {
    const query = 'db.students.find({ marks: { $gte: 75 } })';
    try {
      const col = getCollection();
      const docs = col
        ? await col.find({ marks: { $gte: 75 } }).sort({ _id: 1 }).toArray()
        : simStudents.filter((s) => s.marks >= 75);
      res.json({ mode: dbState.studentsMode, task: 5, query, count: docs.length, output: docs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 6: $in operator - CSE or IT
  router.get('/task6', async (req, res) => {
    const query = 'db.students.find({ dept: { $in: ["CSE", "IT"] } })';
    try {
      const col = getCollection();
      const docs = col
        ? await col.find({ dept: { $in: ['CSE', 'IT'] } }).sort({ _id: 1 }).toArray()
        : simStudents.filter((s) => ['CSE', 'IT'].includes(s.dept));
      res.json({ mode: dbState.studentsMode, task: 6, query, count: docs.length, output: docs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 7: $elemMatch on scores array (DBMS > 80) + comparison without $elemMatch
  router.get('/task7', async (req, res) => {
    const query = 'db.students.find({ scores: { $elemMatch: { subject: "DBMS", mark: { $gt: 80 } } } })';
    const wrongQuery = 'db.students.find({ "scores.subject": "DBMS", "scores.mark": { $gt: 80 } })';
    try {
      const col = getCollection();
      const docs = col
        ? await col
            .find({ scores: { $elemMatch: { subject: 'DBMS', mark: { $gt: 80 } } } })
            .sort({ _id: 1 })
            .toArray()
        : simStudents.filter((s) =>
            s.scores.some((sc) => sc.subject === 'DBMS' && sc.mark > 80)
          );

      const withoutElemMatch = col
        ? await col.find({ 'scores.subject': 'DBMS', 'scores.mark': { $gt: 80 } }).sort({ _id: 1 }).toArray()
        : simStudents.filter(
            (s) =>
              s.scores.some((sc) => sc.subject === 'DBMS') &&
              s.scores.some((sc) => sc.mark > 80)
          );

      res.json({
        mode: dbState.studentsMode,
        task: 7,
        query,
        count: docs.length,
        output: docs,
        comparisonNote: {
          wrongQuery,
          wrongCount: withoutElemMatch.length,
          wrongNames: withoutElemMatch.map((d) => d.name),
          reason:
            'Without $elemMatch, Divya is wrongly returned because her Maths mark (89) satisfies > 80 on a different array element.'
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Task 8: Sort, limit(3), and projection (hide _id)
  router.get('/task8', async (req, res) => {
    const query = 'db.students.find({}, { _id: 0, name: 1, marks: 1 }).sort({ marks: -1 }).limit(3)';
    try {
      const col = getCollection();
      const docs = col
        ? await col
            .find({}, { projection: { _id: 0, name: 1, marks: 1 } })
            .sort({ marks: -1 })
            .limit(3)
            .toArray()
        : [...simStudents]
            .sort((a, b) => b.marks - a.marks)
            .slice(0, 3)
            .map(({ name, marks }) => ({ name, marks }));
      res.json({ mode: dbState.studentsMode, task: 8, query, count: docs.length, output: docs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Custom interactive insert for fullstack CRUD demo
  router.post('/custom', async (req, res) => {
    const { _id, name, dept, marks, dbms, maths } = req.body || {};
    if (_id === undefined || !name || !dept || marks === undefined) {
      return res.status(400).json({ error: 'Fields _id, name, dept, and marks are required.' });
    }
    const doc = {
      _id: Number(_id),
      name: String(name).trim(),
      dept: String(dept).trim().toUpperCase(),
      marks: Number(marks),
      scores: [
        { subject: 'DBMS', mark: Number(dbms ?? marks) },
        { subject: 'Maths', mark: Number(maths ?? marks) }
      ]
    };
    try {
      const col = getCollection();
      if (col) {
        const result = await col.insertOne(doc);
        return res.json({ mode: 'live', output: result, doc });
      }
      if (simStudents.some((s) => s._id === doc._id)) {
        return res.status(409).json({
          mode: 'simulation',
          error: `MongoServerError: E11000 duplicate key error collection: collegeDB.students index: _id_ dup key: { _id: ${doc._id} }`
        });
      }
      simStudents.push(doc);
      return res.json({
        mode: 'simulation',
        output: { acknowledged: true, insertedId: doc._id },
        doc
      });
    } catch (err) {
      res.status(409).json({ mode: dbState.studentsMode, error: err.message });
    }
  });

  return router;
}

module.exports = createStudentsRouter;
