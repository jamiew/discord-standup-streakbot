const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const {
  userStreakLastUpdatedLastWeekday,
  userStreakStillNeedsUpdatingToday,
  userStreakUpdatedInPastWeek,
} = require("./streaks");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

db.defaults({
  users: [],
}).write();

const getOrCreateDBUser = (msg) => {
  let dbUser = db.get("users").find({ userID: msg.author.id });

  if (dbUser.value()) {
    dbUser.assign({ username: msg.author.username }).write();
  } else {
    const newUser = {
      userID: msg.author.id,
      username: msg.author.username,
      messagesEnabled: true,
      mentionsEnabled: true,
    };
    const dbUsers = db.get("users");
    dbUsers.push(newUser).write();
    dbUser = dbUsers.find({ userID: newUser.userID });
  }
  return dbUser;
};

const getUsersWhoPostedYesterday = (dayStartHour, dayStartMinute) => {
  let listText = "";
  const users = db.get("users").value();
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
