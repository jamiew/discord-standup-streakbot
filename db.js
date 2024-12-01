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

const getUsersWhoPostedYesterday = (dayStartHour, dayStartMinute) => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

  // Import streak functions here to avoid circular dependency
  const { userStreakLastUpdatedLastWeekday } = require("./streaks");

  const activeStreakUsers = users.filter((user) =>
    userStreakLastUpdatedLastWeekday(user, dayStartHour, dayStartMinute)
  );

  if (activeStreakUsers.length > 0) {
    listText += "Current running streaks:\n";
    activeStreakUsers
      .sort((a, b) => b.streak - a.streak)
      .forEach((user) => {
        const username = user.username;
        listText += `\n\t${username}: ${user.streak} (best: ${user.bestStreak})`;
      });
  }

  return listText;
};

const getUsersWhoCouldLoseTheirStreak = (dayStartHour, dayStartMinute) => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

  // Import streak functions here to avoid circular dependency
  const { userStreakStillNeedsUpdatingToday } = require("./streaks");

  const atRiskUsers = users.filter((user) =>
    userStreakStillNeedsUpdatingToday(user, dayStartHour, dayStartMinute)
  );
  if (atRiskUsers.length > 0) {
    listText +=
      "\nThese users still need to post today if they want to keep their current streak alive:";
    atRiskUsers.forEach((user) => {
      const username = user.username;
      listText += `\n\t${username}: ${user.streak} (best: ${user.bestStreak})`;
    });
  }
  return listText;
};

const getUsersWhoPostedInThePastWeek = () => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

  // Import streak functions here to avoid circular dependency
  const { userStreakUpdatedInPastWeek } = require("./streaks");

  const pastWeekUsers = users.filter(userStreakUpdatedInPastWeek);
  if (pastWeekUsers.length > 0) {
    pastWeekUsers.sort((a, b) => b.bestStreak - a.bestStreak);

    listText += "Users who have posted in the past week:\n";
    pastWeekUsers.forEach((user) => {
      listText += `\n\t${user.username} (best streak: ${user.bestStreak})`;
    });
    listText += "\n\nKeep up the good work!";
  } else {
    listText =
      "\nNo users have posted in the past week! I'll have an existential meltdown now.";
  }
  return listText;
};

module.exports = {
  db,
  getOrCreateDBUser,
  getUsersWhoPostedYesterday,
  getUsersWhoCouldLoseTheirStreak,
  getUsersWhoPostedInThePastWeek,
};
