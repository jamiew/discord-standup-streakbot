const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

// Initialize database with required tables
if (!db.has("users").value()) {
  console.log("Initializing users table in database");
  db.set("users", []).write();
}

if (!db.has("users").value()) {
  console.error("FATAL ERROR: Failed to initialize users table in database");
  process.exit(1);
}

const getOrCreateDBUser = (msg) => {
  let dbUser = db.get("users").find({ userID: msg.author.id });
  const now = new Date().toISOString();

  if (dbUser.value()) {
    console.log(`Found existing user ${msg.author.username}`);
    // Update username in case it changed
    dbUser.assign({ username: msg.author.username }).write();
  } else {
    console.log(`Creating new user ${msg.author.username}`);
    const newUser = {
      userID: msg.author.id,
      username: msg.author.username,
      messagesEnabled: true,
      mentionsEnabled: true,
      lastUpdate: now, // Initialize lastUpdate for new users
      streak: 0,
      bestStreak: 0,
    };
    const dbUsers = db.get("users");
    if (!dbUsers.value()) {
      console.error("FATAL ERROR: Users table is missing from database");
      process.exit(1);
    }
    dbUsers.push(newUser).write();
    dbUser = dbUsers.find({ userID: newUser.userID });
  }

  // Verify user exists after creation/update
  const verifiedUser = dbUser.value();
  if (!verifiedUser) {
    console.error(
      `FATAL ERROR: Failed to create/retrieve user ${msg.author.username}`
    );
    process.exit(1);
  }

  console.log(`User data for ${msg.author.username}:`, {
    userID: verifiedUser.userID,
    streak: verifiedUser.streak,
    bestStreak: verifiedUser.bestStreak,
    lastUpdate: verifiedUser.lastUpdate,
  });

  return dbUser;
};

const userStreakUpdatedInPastWeek = (user) => {
  if (!user || !user.lastUpdate) return false;
  const userLastUpdate = new Date(user.lastUpdate);
  const timeSinceLastUpdate = new Date() - userLastUpdate;
  return timeSinceLastUpdate < 7 * ONE_DAY && isWeekday(userLastUpdate);
};

module.exports = {
  db,
  getOrCreateDBUser,
};
