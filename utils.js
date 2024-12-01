const ONE_DAY = 24 * 60 * 60 * 1000;

const isWeekday = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

const getMostRecentWeekdayStart = (dayStartHour, dayStartMinute) => {
  const now = new Date();
  let mostRecentWeekdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    dayStartHour,
    dayStartMinute
  );

  // If we're before the start time for today, look at yesterday
  if (now < mostRecentWeekdayStart) {
    mostRecentWeekdayStart.setDate(mostRecentWeekdayStart.getDate() - 1);
  }

  // Keep going back until we hit a weekday
  while (!isWeekday(mostRecentWeekdayStart)) {
    mostRecentWeekdayStart.setDate(mostRecentWeekdayStart.getDate() - 1);
  }

  return mostRecentWeekdayStart;
};

// Calculate glifbux reward based on streak length
const calculateGlifbuxReward = (streakLength) => {
  // Base reward is 5 glifbux
  const baseReward = 5;

  // Calculate week number (1-based)
  const weekNumber = Math.floor((streakLength - 1) / 5) + 1;

  // Add 1 glifbux per week, capping at 10 total
  const reward = Math.min(baseReward + (weekNumber - 1), 10);

  return reward;
};

// Get reward table for /rewards command
const getRewardTable = () => {
  const table = [];
  for (let week = 1; week <= 6; week++) {
    const streakDay = (week - 1) * 5 + 1; // First day of each week
    const reward = calculateGlifbuxReward(streakDay);
    table.push({
      week,
      reward,
      example: `Day ${streakDay}-${streakDay + 4}`,
    });
  }
  return table;
};

module.exports = {
  ONE_DAY,
  isWeekday,
  getMostRecentWeekdayStart,
  calculateGlifbuxReward,
  getRewardTable,
};
