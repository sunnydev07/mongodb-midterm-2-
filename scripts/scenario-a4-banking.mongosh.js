// Scenario A4: Banking App: Building and Checking a Replica Set
// Connect to primary: mongosh --port 27017 < scripts/scenario-a4-banking.mongosh.js

print("\n--- Task 1: Initiate 3-node replica set rs0 ---");
printjson(
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "localhost:27017" },
      { _id: 1, host: "localhost:27018" },
      { _id: 2, host: "localhost:27019" }
    ]
  })
);
sleep(3000);

print("\n--- Task 2: Identify PRIMARY and SECONDARY members ---");
printjson(
  rs.status().members.map((m) => ({
    name: m.name,
    state: m.stateStr,
    health: m.health
  }))
);

print("\n--- Task 3: Insert account with writeConcern w: 'majority' ---");
use bankDB;
printjson(
  db.accounts.insertOne(
    { accNo: 1001, holder: "Kumar", balance: 5000 },
    { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
  )
);

print("\n--- Task 4: Read with readPreference secondaryPreferred ---");
db.getMongo().setReadPref("secondaryPreferred");
printjson(db.accounts.find().toArray());

print("\n--- Task 5: Inspect oplog entry for bankDB.accounts ---");
use local;
printjson(db.oplog.rs.find({ ns: "bankDB.accounts" }).sort({ $natural: -1 }).limit(1).toArray());

print("\n--- Task 6: Force primary stepDown & observe election ---");
try {
  rs.stepDown(60);
} catch (e) {
  print("StepDown triggered election; reconnecting...");
}
sleep(3000);

print("\n--- Task 7: Check replication health & secondary lag ---");
printjson(
  rs.status().members.map((m) => ({
    name: m.name,
    state: m.stateStr,
    health: m.health,
    optimeDate: m.optimeDate
  }))
);
rs.printSecondaryReplicationInfo();
