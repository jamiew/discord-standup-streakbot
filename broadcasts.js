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

  let response = "**🎁 Daily Standup Reward System**\n\n";
  response +=
    "Post your daily standup to earn glifbux! The longer your streak, the more you earn:\n\n";

  // Format the reward table
  rewardTable.forEach(({ week, reward, example }) => {
    response += `Week ${week}: ${reward} glifbux per day (${example})\n`;
  });

  response += "\n**Additional Info:**\n";
  response += "• Streaks only count on weekdays\n";
  response += "• You must post in the standup channel to earn rewards\n";
  response += "• Only one standup post per day counts\n";
  response += "• Edit your existing post if you need to make updates\n";
  response += "• Use /tip to share glifbux with others\n";
  response += "• Use /balance to check your current balance\n";
  response += "• Use /inventory to see your items\n";

  response += "\n**Debug Information:**\n";
  response += "Available debug commands:\n";
  response += "!summary\n";
  response += "!gm\n";
  response += "!reminder\n";
  response += "!help\n\n";
  response += `Active guild: ${guildId}\n`;
  response += `Active channel: #${channelName}`;

  channel.send(response);
};

module.exports = {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
  broadcastHelp,
};
