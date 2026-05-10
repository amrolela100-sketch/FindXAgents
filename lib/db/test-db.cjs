const { Client } = require('pg');
const url = 'postgresql://postgres:Amrolela123456%40@db.ljjmusrrqjzdecvktqte.supabase.co:5432/postgres';
console.log("Connecting to:", url);
const client = new Client({ connectionString: url });
client.connect()
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err.message);
    process.exit(1);
  });
