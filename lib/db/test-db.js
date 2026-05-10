require('dotenv').config();
const { Client } = require('pg');
console.log("Connecting to:", process.env.DATABASE_URL);
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err.message);
    process.exit(1);
  });
