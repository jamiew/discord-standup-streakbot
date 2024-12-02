const { ONE_DAY, isWeekday, getMostRecentWeekdayStart } = require("./utils");

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

const userStreakLastUpdatedLastWeekday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  if (!user || !user.lastUpdate) {
    return false;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart(
    dayStartHour,
    dayStartMinute
  );
  const userLastUpdate = new Date(user.lastUpdate);
  const timeBeforeWeekdayStart =
    mostRecentWeekdayStart.getTime() - userLastUpdate.getTime();
  const didLastUpdateLastWeekday =
    timeBeforeWeekdayStart > 0 && timeBeforeWeekdayStart <= 3 * ONE_DAY;
  return didLastUpdateLastWeekday;
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

const updateLastUpdate = (msg, dbUser) => {
  console.log(`Updating lastUpdate for ${msg.author.username}`);
  const now = new Date();
  const updateData = {
    lastUpdate: now.toISOString(), // Ensure consistent date format
  };

  // Write to database
  console.log(`Writing lastUpdate for ${msg.author.username}:`, updateData);
  dbUser.assign(updateData).write();

  // Verify the update by reading fresh data
  const verifyUser = dbUser.value();
  if (!verifyUser) {
    console.error(
      `Error: Failed to verify lastUpdate for ${msg.author.username}`
    );
    return false;
  }

  console.log(`Verified lastUpdate for ${msg.author.username}:`, {
    lastUpdate: verifyUser.lastUpdate,
  });

  return true;
};

const addToStreak = (msg, dbUser) => {
  if (!isWeekday(new Date())) {
    return false;
  }

  const streakData = {
    streak: 1,
    bestStreak: 1,
  };

  let isNewBest = true;
  let isNewStreak = false;
  const user = dbUser.value();

  if (!user) {
    console.error(`Error: No user data found for ${msg.author.username}`);
    return false;
  }

  if (!user.bestStreak) {
    console.log(`${msg.author.username} started their first streak`);
    isNewStreak = true;
  } else if (!userStreakLastUpdatedLastWeekday(user)) {
    console.log(`${msg.author.username} started a new streak`);
    isNewStreak = true;
    streakData.bestStreak = user.bestStreak;
    isNewBest = false;
  } else {
    const newLevel = user.streak + 1;
    const currentBest = user.bestStreak;
    streakData.streak = newLevel;
    streakData.bestStreak = Math.max(newLevel, currentBest);
    console.log(`${msg.author.username} continued a streak to ${newLevel}`);
    if (newLevel > currentBest) {
      console.log(`\t...and it's a new best! (${newLevel})`);
    } else {
      isNewBest = false;
    }
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
  });

  return true;
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

const getUsersWhoPostedInThePastWeek = () => {
  let listText = "";
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Users table is missing from database");
    process.exit(1);
  }

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
  userStreakNotAlreadyUpdatedToday,
  userStreakLastUpdatedLastWeekday,
  userStreakStillNeedsUpdatingToday,
  getUsersWhoCouldLoseTheirStreak,
  getUsersWhoPostedYesterday,
  getUsersWhoPostedInThePastWeek,
  updateLastUpdate,
  addToStreak,
};
