const { ONE_DAY, isWeekday, getMostRecentWeekdayStart } = require("./utils");

const userStreakNotAlreadyUpdatedToday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  if (!user.streak) {
    return true;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart(
    dayStartHour,
    dayStartMinute
  );
  const userLastUpdate = new Date(user.lastUpdate);
  return userLastUpdate < mostRecentWeekdayStart;
};

const userStreakLastUpdatedLastWeekday = (
  user,
  dayStartHour,
  dayStartMinute
) => {
  if (!user.lastUpdate) {
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

const userStreakUpdatedInPastWeek = (user) => {
  const userLastUpdate = new Date(user.lastUpdate);
  const timeSinceLastUpdate = new Date() - userLastUpdate;
  return timeSinceLastUpdate < 7 * ONE_DAY && isWeekday(userLastUpdate);
};

const addToStreak = (msg, dbUser) => {
  if (!isWeekday(new Date())) {
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
