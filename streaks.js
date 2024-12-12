const { ONE_DAY, isWeekday, getMostRecentWeekdayStart } = require("./utils");
const { db } = require("./db");

const userStreakNotAlreadyUpdatedToday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  if (!user || !user.lastUpdate) {
    return true;
  }
  const lastUpdate = new Date(user.lastUpdate);
  const now = new Date();
  return lastUpdate.toDateString() !== now.toDateString();
};

const getLastWeekdayDate = (fromDate) => {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - 1);
  while (!isWeekday(date)) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

const userStreakLastUpdatedLastWeekday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  if (!user || !user.lastUpdate) {
    return false;
  }

  const userLastUpdate = new Date(user.lastUpdate);
  const today = new Date();

  // If the last update was today, check if they posted yesterday (last weekday)
  if (userLastUpdate.toDateString() === today.toDateString()) {
    const lastWeekday = getLastWeekdayDate(today);
    // Look for any updates on the last weekday
    const users = db.get("users").value();
    const userHistory = users.find((u) => u.userID === user.userID);
    if (!userHistory) return false;

    const lastWeekdayStr = lastWeekday.toDateString();
    const userLastUpdateDate = new Date(userHistory.lastUpdate);
    return userLastUpdateDate.toDateString() === lastWeekdayStr;
  }

  // If the last update wasn't today, it needs to be the last weekday
  const lastWeekday = getLastWeekdayDate(today);
  return userLastUpdate.toDateString() === lastWeekday.toDateString();
};

const userStreakStillNeedsUpdatingToday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  return (
    userStreakLastUpdatedLastWeekday(user, dayStartHour, dayStartMinute) &&
    userStreakNotAlreadyUpdatedToday(user, dayStartHour, dayStartMinute)
  );
};

const addToStreak = (msg, dbUser) => {
  if (!isWeekday(new Date())) {
    console.warn("addToStreak: ignoring weekday");
    return false;
  }

  const user = dbUser.value();
  if (!user) {
    console.error(`Error: No user data found for ${msg.author.username}`);
    return false;
  }

  // Don't update streak if already posted today
  if (!userStreakNotAlreadyUpdatedToday(user)) {
    console.log(
      `${msg.author.username} already posted today, maintaining streak at ${user.streak}`
    );
    return true;
  }

  const now = new Date();
  let streakData = {
    streak: 1,
    bestStreak: Math.max(1, user.bestStreak || 1),
    lastUpdate: now.toISOString(), // Include lastUpdate in the streak update
  };

  let isNewBest = false;
  let isNewStreak = true;

  // Check if this is a streak continuation
  if (user.streak && userStreakLastUpdatedLastWeekday(user)) {
    const newLevel = user.streak + 1;
    streakData.streak = newLevel;
    streakData.bestStreak = Math.max(newLevel, user.bestStreak || 1);
    isNewStreak = false;
    isNewBest = newLevel > (user.bestStreak || 0);
    console.log(`${msg.author.username} continued a streak to ${newLevel}`);
  } else {
    console.log(`${msg.author.username} started a new streak`);
  }

  if (isNewStreak) {
    msg.react("☄");
  }

  if (isNewBest) {
    msg.react("🌟");
  } else {
    msg.react("⭐");
  }

  // Write to database
  console.log(`Writing streak data for ${msg.author.username}:`, streakData);
  dbUser.assign(streakData).write();

  // Verify the update by reading fresh data
  const verifyUser = dbUser.value();
  if (!verifyUser) {
    console.error(
      `Error: Failed to verify streak update for ${msg.author.username}`
    );
    return false;
  }

  console.log(`Verified streak update for ${msg.author.username}:`, {
    streak: verifyUser.streak,
    bestStreak: verifyUser.bestStreak,
    lastUpdate: verifyUser.lastUpdate,
  });

  return {
    streak: verifyUser.streak,
    bestStreak: verifyUser.bestStreak,
  };
};

const getUsersWhoPostedYesterday = (dayStartHour, dayStartMinute) => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

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

const userStreakUpdatedInPastWeek = (user) => {
  if (!user || !user.lastUpdate) return false;
  const userLastUpdate = new Date(user.lastUpdate);
  const timeSinceLastUpdate = new Date() - userLastUpdate;
  return timeSinceLastUpdate < 7 * ONE_DAY && isWeekday(userLastUpdate);
};

const getUsersWhoPostedInThePastWeek = () => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

  const pastWeekUsers = users.filter(userStreakUpdatedInPastWeek);
  if (pastWeekUsers.length > 0) {
    pastWeekUsers.sort((a, b) => b.streak - a.streak);

    listText += "Users who have posted in the past week:\n";
    pastWeekUsers.forEach((user) => {
      const streak = user.streak || 0;
      listText += `\n\t${user.username} (current streak: ${streak}, best streak: ${user.bestStreak})`;
    });
    listText += "\n\nKeep up the good work!";
  } else {
    listText =
      "\nNo users have posted in the past week! I'll have an existential meltdown now.";
  }
  return listText;
};

module.exports = {
  userStreakNotAlreadyUpdatedToday,
  userStreakLastUpdatedLastWeekday,
  userStreakStillNeedsUpdatingToday,
  getUsersWhoCouldLoseTheirStreak,
  getUsersWhoPostedYesterday,
  getUsersWhoPostedInThePastWeek,
  addToStreak,
};
