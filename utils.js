const ONE_DAY = new Date(1000 * 60 * 60 * 24);

const isWeekday = (date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

const getMostRecentWeekdayStart = (dayStartHour, dayStartMinute) => {
  const mostRecentWeekdayStart = new Date();

  if (
    mostRecentWeekdayStart.getHours() < dayStartHour ||
    (mostRecentWeekdayStart.getHours() == dayStartHour &&
      mostRecentWeekdayStart.getMinutes() < dayStartMinute)
  ) {
    mostRecentWeekdayStart.setDate(mostRecentWeekdayStart.getDate() - 1);
  }

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
