const Database = require("better-sqlite3");
const db = new Database("trello.db");

const email = "adem@test.com";

const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);

if (result.changes > 0) {
  console.log(email + " artik admin!");
} else {
  console.log(email + " bulunamadi.");
}