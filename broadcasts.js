const {
  getUsersWhoPostedYesterday,
  getUsersWhoCouldLoseTheirStreak,
  getUsersWhoPostedInThePastWeek,
} = require("./db");

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
  channel.send(`current debug commands:
!summary
!gm
!reminder
!help

active guild: ${guildId}
active channel: #${channelName}
  `);
};

module.exports = {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
  broadcastHelp,
};
