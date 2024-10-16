const db = require("./database");
const { ONE_DAY, isWeekday, getMostRecentWeekdayStart } = require("./utils");
const config = require("./config");

const userStreakNotAlreadyUpdatedToday = (user) => {
  console.log(`userStreakNotAlreadyUpdatedToday(${user.username})`);
  if (!user.streak) {
    console.log("\tThis user is starting their first streak");
    return true;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart(
    config.DAY_START_HOUR,
    config.DAY_START_MINUTE
  );
  const userLastUpdate = new Date(user.lastUpdate);
  return userLastUpdate < mostRecentWeekdayStart;
};

const userStreakLastUpdatedLastWeekday = (user) => {
  console.log(`userStreakLastUpdatedLastWeekday(${user.username})`);
  if (!user.lastUpdate) {
    console.log("\tUser's first streak! No last update date.");
    return false;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart(
    config.DAY_START_HOUR,
    config.DAY_START_MINUTE
  );
  const userLastUpdate = new Date(user.lastUpdate);
  const timeBeforeWeekdayStart =
    mostRecentWeekdayStart.getTime() - userLastUpdate.getTime();
  console.log(
    `\tMost recent weekday start: ${mostRecentWeekdayStart.toUTCString()};`
  );
  console.log(`\tuser last update: ${userLastUpdate.toUTCString()};`);
  console.log(
    `\ttime between last update and most recent weekday start: ${timeBeforeWeekdayStart};`
  );
  console.log(`\tOne day is ${ONE_DAY};`);
  const didLastUpdateLastWeekday =
    timeBeforeWeekdayStart > 0 && timeBeforeWeekdayStart <= 3 * ONE_DAY; // Allow for weekend gap
  console.log(`\tResult: ${didLastUpdateLastWeekday}`);
  return didLastUpdateLastWeekday;
};

const userStreakStillNeedsUpdatingToday = (user) => {
  return (
    userStreakLastUpdatedLastWeekday(user) &&
    userStreakNotAlreadyUpdatedToday(user)
  );
};

const userStreakUpdatedInPastWeek = (user) => {
  const userLastUpdate = new Date(user.lastUpdate);
  const timeSinceLastUpdate = new Date() - userLastUpdate;
  return timeSinceLastUpdate < 7 * ONE_DAY && isWeekday(userLastUpdate);
};

const addToStreak = (msg, dbUser) => {
  if (!isWeekday(new Date())) {
    console.log("Ignoring weekend post for streak counting");
    return;
  }

  const streakData = {
    streak: 1,
    bestStreak: 1,
    lastUpdate: new Date(),
  };

  let isNewBest = true;
  let isNewStreak = false;
  const user = dbUser.value();

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

  dbUser.assign(streakData).write();
};

module.exports = {
  userStreakNotAlreadyUpdatedToday,
  userStreakLastUpdatedLastWeekday,
  userStreakStillNeedsUpdatingToday,
  userStreakUpdatedInPastWeek,
  addToStreak,
};
