const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("❌ MONGODB_URI not found in .env");
}

const client = new MongoClient(uri);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("jeevan_setu");
    console.log("✅ Connected to MongoDB");
  }
  return db;
}

module.exports = connectDB;
