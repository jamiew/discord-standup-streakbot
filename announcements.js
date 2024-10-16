const db = require("./database");
const {
  userStreakLastUpdatedLastWeekday,
  userStreakStillNeedsUpdatingToday,
  userStreakUpdatedInPastWeek,
} = require("./streakManager");

const getUsersWhoPostedYesterday = () => {
  console.log("getUsersWhoPostedYesterday()");
  let listText = "";
  const users = db.get("users").value();
  const activeStreakUsers = users.filter(userStreakLastUpdatedLastWeekday);

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

const getUsersWhoCouldLoseTheirStreak = () => {
  console.log("getUsersWhoCouldLoseTheirStreak()");
  let listText = "";
  const users = db.get("users").value();
  const atRiskUsers = users.filter(userStreakStillNeedsUpdatingToday);
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
  console.log("getUsersWhoPostedInThePastWeek()");
  let listText = "";
  const users = db.get("users").value();
  const pastWeekUsers = users.filter(userStreakUpdatedInPastWeek);
  if (pastWeekUsers.length > 0) {
    // Sort users by best streak in descending order
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

const broadcastMorningAnnouncement = (channel) => {
  console.log("Sending morning announcement...");
  let announcement =
    "Let the new day begin! Post your standup to start or continue your daily streak. Check the pinned messages for a full explanation.";
  announcement += "\n\n";
  announcement += getUsersWhoPostedYesterday();
  channel.send(announcement);
};

const broadcastReminder = (channel) => {
  console.log("Sending reminder announcement...");
  let announcement =
    "The day is half done! Don't forget to post an update if you haven't. A quick note about what you plan to do tomorrow is great too.";
  announcement += "\n\n";
  announcement += getUsersWhoCouldLoseTheirStreak();
  channel.send(announcement);
};

const broadcastSummary = (channel) => {
  console.log("Sending summary...");
  const announcement = getUsersWhoPostedInThePastWeek();
  channel.send(announcement);
};

module.exports = {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
};
