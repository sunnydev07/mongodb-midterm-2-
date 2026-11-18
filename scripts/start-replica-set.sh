#!/usr/bin/env bash
set -e

mkdir -p /tmp/rs0-1 /tmp/rs0-2 /tmp/rs0-3

echo "Starting 3-node MongoDB Replica Set (rs0) on ports 27017, 27018, 27019..."
mongod --replSet rs0 --port 27017 --dbpath /tmp/rs0-1 --bind_ip localhost --fork --logpath /tmp/rs0-1/mongod.log
mongod --replSet rs0 --port 27018 --dbpath /tmp/rs0-2 --bind_ip localhost --fork --logpath /tmp/rs0-2/mongod.log
mongod --replSet rs0 --port 27019 --dbpath /tmp/rs0-3 --bind_ip localhost --fork --logpath /tmp/rs0-3/mongod.log

echo "All 3 mongod instances started."
echo "Next: mongosh --port 27017 < scripts/scenario-a4-banking.mongosh.js"
