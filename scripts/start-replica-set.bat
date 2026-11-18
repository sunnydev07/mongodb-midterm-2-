@echo off
mkdir C:\data\rs0-1 2>nul
mkdir C:\data\rs0-2 2>nul
mkdir C:\data\rs0-3 2>nul

echo Starting 3-node MongoDB Replica Set (rs0) in separate windows...
start "mongod-27017" mongod --replSet rs0 --port 27017 --dbpath C:\data\rs0-1 --bind_ip localhost
start "mongod-27018" mongod --replSet rs0 --port 27018 --dbpath C:\data\rs0-2 --bind_ip localhost
start "mongod-27019" mongod --replSet rs0 --port 27019 --dbpath C:\data\rs0-3 --bind_ip localhost

echo All 3 mongod windows launched.
echo Next: mongosh --port 27017 ^< scripts\scenario-a4-banking.mongosh.js
