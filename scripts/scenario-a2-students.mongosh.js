// Scenario A2: Student Records: Insert, Query, Sort and Project
// Run with: mongosh < scripts/scenario-a2-students.mongosh.js

use collegeDB;
db.students.drop();

print("\n--- Task 1: Insert Arun (_id: 101) with insertOne ---");
printjson(
  db.students.insertOne({
    _id: 101,
    name: "Arun",
    dept: "CSE",
    marks: 78,
    scores: [
      { subject: "DBMS", mark: 85 },
      { subject: "Maths", mark: 70 }
    ]
  })
);

print("\n--- Task 2: Attempt duplicate _id: 101 (expected E11000 error) ---");
try {
  db.students.insertOne({
    _id: 101,
    name: "Duplicate",
    dept: "CSE",
    marks: 80,
    scores: [
      { subject: "DBMS", mark: 80 },
      { subject: "Maths", mark: 80 }
    ]
  });
} catch (err) {
  print(err.name + ": " + err.message);
  print("Reason: _id is the primary key and must be unique.");
}

print("\n--- Task 3: Insert remaining 5 students (102 to 106) with insertMany ---");
printjson(
  db.students.insertMany([
    { _id: 102, name: "Bala", dept: "IT", marks: 66, scores: [{ subject: "DBMS", mark: 60 }, { subject: "Maths", mark: 72 }] },
    { _id: 103, name: "Chitra", dept: "CSE", marks: 91, scores: [{ subject: "DBMS", mark: 95 }, { subject: "Maths", mark: 87 }] },
    { _id: 104, name: "Divya", dept: "ECE", marks: 72, scores: [{ subject: "DBMS", mark: 55 }, { subject: "Maths", mark: 89 }] },
    { _id: 105, name: "Eswar", dept: "IT", marks: 84, scores: [{ subject: "DBMS", mark: 88 }, { subject: "Maths", mark: 80 }] },
    { _id: 106, name: "Farah", dept: "CSE", marks: 59, scores: [{ subject: "DBMS", mark: 45 }, { subject: "Maths", mark: 73 }] }
  ])
);

print("\n--- Task 4: Equality query (CSE department) ---");
printjson(db.students.find({ dept: "CSE" }).toArray());

print("\n--- Task 5: Comparison operator (marks >= 75) ---");
printjson(db.students.find({ marks: { $gte: 75 } }).toArray());

print("\n--- Task 6: $in operator (CSE or IT) ---");
printjson(db.students.find({ dept: { $in: ["CSE", "IT"] } }).toArray());

print("\n--- Task 7: $elemMatch on scores array (DBMS > 80) ---");
printjson(
  db.students.find({
    scores: { $elemMatch: { subject: "DBMS", mark: { $gt: 80 } } }
  }).toArray()
);

print("\n--- Task 8: Top 3 students (name & marks only, hide _id) ---");
printjson(
  db.students.find({}, { _id: 0, name: 1, marks: 1 }).sort({ marks: -1 }).limit(3).toArray()
);
