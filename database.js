const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

// setup our lowdb database
db.defaults({
  users: [],
}).write();

module.exports = db;
