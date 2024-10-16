const ONE_DAY = new Date(1000 * 60 * 60 * 24);

const isWeekday = (date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday is 1, Friday is 5
};

const getMostRecentWeekdayStart = (dayStartHour, dayStartMinute) => {
  console.log("getMostRecentWeekdayStart()");
  const mostRecentWeekdayStart = new Date();

  // Adjust for the current day's start time
  if (
    mostRecentWeekdayStart.getHours() < dayStartHour ||
    (mostRecentWeekdayStart.getHours() == dayStartHour &&
      mostRecentWeekdayStart.getMinutes() < dayStartMinute)
  ) {
    mostRecentWeekdayStart.setDate(mostRecentWeekdayStart.getDate() - 1);
  }

  // Find the most recent weekday
  while (!isWeekday(mostRecentWeekdayStart)) {
    mostRecentWeekdayStart.setDate(mostRecentWeekdayStart.getDate() - 1);
  }

  mostRecentWeekdayStart.setHours(dayStartHour, dayStartMinute, 0, 0);
  return mostRecentWeekdayStart;
};

module.exports = {
  ONE_DAY,
  isWeekday,
  getMostRecentWeekdayStart,
};
