const {
  getUsersWhoPostedYesterday,
  getUsersWhoCouldLoseTheirStreak,
  getUsersWhoPostedInThePastWeek,
} = require("./streaks");
const { getRewardTable } = require("./utils");

const broadcastMorningAnnouncement = (
  channel,
  dayStartHour,
  dayStartMinute
) => {
  console.log(`New day starting: ${new Date().toUTCString()}`);
  let announcement =
    "Let the new day begin! Post your standup to start or continue your daily streak. Check the pinned messages for a full explanation.";
  announcement += "\n\n";
  announcement += getUsersWhoPostedYesterday(dayStartHour, dayStartMinute);
  channel.send(announcement);
};

const broadcastReminder = (channel, dayStartHour, dayStartMinute) => {
  let announcement =
    "The day is half done! Don't forget to post an update if you haven't. A quick note about what you plan to do tomorrow is great too.";
  announcement += "\n\n";
  announcement += getUsersWhoCouldLoseTheirStreak(dayStartHour, dayStartMinute);
  channel.send(announcement);
};

const broadcastSummary = (channel) => {
  const announcement = getUsersWhoPostedInThePastWeek();
  channel.send(announcement);
};

const broadcastHelp = (channel, guildId, channelName) => {
  const rewardTable = getRewardTable();

  let response = "**🎁 Daily Standups: The Game**\n\n";
  response +=
    "Post some info about what you're working on to thrill your coworkers _and_ earn glifbux! The longer your streak, the more you earn:\n\n";
  response += `Active server: ${guildId}\n`;
  response += `Active channel: #${channelName}`;

  response += "\n**Rules:**\n";
  response += "- Streaks only count on weekdays\n";
  response += "- Bot automatically turns your post into a thread";
  response += "- You must post in the #standups channel\n";
  response += "- Only one standup post per day counts\n";
  response += "- Edit your existing post if you need to add something\n";

  response += "\n**Commands:**\n";
  response += "- `/summary` - show leaderboard of streakers\n";
  response += "- `/help` - this command\n";

  response += "\n**Experimental:**\n";
  response += "- /tip - send some glifbux to others\n";
  response += "- /balance - how many glifbux you have (or someone else)\n";
  response += "- /inventory - to see your items (or someone else)\n";
  response += "- /craft - test out making an item... WIP\n";

  reponse += "\n\n**Rewards:**\n";
  response +=
    "Daily rewards increase as your streak gets longer. Here's the breakdown:\n\n";
  rewardTable.forEach(({ week, reward, example }) => {
    response += `Week ${week}: ${reward} glifbux per day (${example})\n`;
  });

  channel.send(response);
};

module.exports = {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
  broadcastHelp,
};
