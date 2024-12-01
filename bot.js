const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const schedule = require("node-schedule");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

require("dotenv").config();
if (!process.env.GUILD_ID) throw new Error("missing GUILD_ID env var");
if (!process.env.BOT_TOKEN) throw new Error("missing BOT_TOKEN env var");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

db.defaults({
  users: [],
}).write();

const ONE_DAY = new Date(1000 * 60 * 60 * 24);

const dayStartHour = process.env.DAY_START_HOUR
  ? parseInt(process.env.DAY_START_HOUR)
  : 0;
const dayStartMinute = process.env.DAY_START_MINUTE
  ? parseInt(process.env.DAY_START_MINUTE)
  : 0;

const morningAnnouncementHour = process.env.MORNING_ANNOUNCEMENT_HOUR
  ? parseInt(process.env.MORNING_ANNOUNCEMENT_HOUR)
  : 7;
const morningAnnouncementMinute = process.env.MORNING_ANNOUNCEMENT_MINUTE
  ? parseInt(process.env.MORNING_ANNOUNCEMENT_MINUTE)
  : 0;

const midWeekSummaryHour = process.env.MID_WEEK_SUMMARY_HOUR
  ? parseInt(process.env.MID_WEEK_SUMMARY_HOUR)
  : 13;
const midWeekSummaryMinute = process.env.MID_WEEK_SUMMARY_MINUTE
  ? parseInt(process.env.MID_WEEK_SUMMARY_MINUTE)
  : 0;

const midWeekDayOfWeek = process.env.MID_WEEK_DAY_OF_WEEK
  ? parseInt(process.env.MID_WEEK_DAY_OF_WEEK)
  : 3;

const channelName = process.env.CHANNEL_NAME || "standups";

let morningAnnouncementJob;
let midDayReminderJob;
let reconnectJob;
let midweekJob;

const isWeekday = (date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

const scheduleJobs = () => {
  if (!morningAnnouncementJob) {
    morningAnnouncementJob = schedule.scheduleJob(
      `00 ${morningAnnouncementMinute
        .toString()
        .padStart(2, "0")} ${morningAnnouncementHour
        .toString()
        .padStart(2, "0")} * * 1-5`,
      () => {
        console.log(`New day starting: ${new Date().toUTCString()}`);
        broadcastMorningAnnouncement();
      }
    );
  }

  if (!midweekJob) {
    midweekJob = schedule.scheduleJob(
      `00 ${midWeekSummaryMinute
        .toString()
        .padStart(2, "0")} ${midWeekSummaryHour
        .toString()
        .padStart(2, "0")} * * ${midWeekDayOfWeek}`,
      () => {
        if (isWeekday(new Date())) {
          broadcastSummary();
        }
      }
    );
  }
};

client.on("ready", () => {
  scheduleJobs();
});

client.on("error", (error) => {
  console.error(error);
});

client.on("disconnect", async (msg, code) => {
  if (code === 0) return console.error(msg);
  disconnectCleanup();
  await connect();
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guildId !== process.env.GUILD_ID) return;
  if (message.channel.name !== channelName) return;
  if (message.channel.isThread()) return;

  if (message.content.startsWith("!")) {
    if (message.content == "!summary") {
      broadcastSummary();
    } else if (message.content == "!gm") {
      broadcastMorningAnnouncement();
    } else if (message.content == "!reminder") {
      broadcastReminder();
    } else if (message.content == "!help" || message.content == "!debug") {
      standupChannel().send(`current debug commands:
!summary
!gm
!reminder
!help

active guild: ${process.env.GUILD_ID}
active channel: #${channelName}
      `);
    } else {
      standupChannel().send(
        `sorry, I don't understand the command \`${message.content}\`. please try again.`
      );
    }
    return;
  }

  // Process streak before creating thread
  processMessageForStreak(message);

  // Create thread for discussion
  try {
    const thread = await message.startThread({
      name: `${
        message.author.username
      }'s standup ${new Date().toLocaleDateString()}`,
      autoArchiveDuration: 1440, // 24 hours in minutes
    });
    await thread.send(
      "Feel free to discuss this standup here! This thread will automatically archive in 24 hours."
    );
  } catch (error) {
    console.error("Error creating thread:", error);
  }
});

const disconnectCleanup = () => {
  if (morningAnnouncementJob) {
    morningAnnouncementJob.cancel();
    morningAnnouncementJob = null;
  }
  if (midDayReminderJob) {
    midDayReminderJob.cancel();
    midDayReminderJob = null;
  }
  if (reconnectJob) {
    reconnectJob.cancel();
    reconnectJob = null;
  }
  if (midweekJob) {
    midweekJob.cancel();
    midweekJob = null;
  }
};

const connect = async () => {
  await client.login(process.env.BOT_TOKEN);
};

const standupChannel = () => {
  return client.channels.cache.find(
    (c) =>
      c.guildId == process.env.GUILD_ID &&
      c.name === channelName &&
      c.type === ChannelType.GuildText
  );
};

const broadcastMorningAnnouncement = () => {
  let announcement =
    "Let the new day begin! Post your standup to start or continue your daily streak. Check the pinned messages for a full explanation.";
  announcement += "\n\n";
  announcement += getUsersWhoPostedYesterday();
  standupChannel().send(announcement);
};

const broadcastReminder = () => {
  let announcement =
    "The day is half done! Don't forget to post an update if you haven't. A quick note about what you plan to do tomorrow is great too.";
  announcement += "\n\n";
  announcement += getUsersWhoCouldLoseTheirStreak();
  standupChannel().send(announcement);
};

const broadcastSummary = () => {
  const announcement = getUsersWhoPostedInThePastWeek();
  standupChannel().send(announcement);
};

const getUsersWhoPostedYesterday = () => {
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
  let listText = "";
  const users = db.get("users").value();
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

const processMessageForStreak = (msg) => {
  const dbUser = getOrCreateDBUser(msg);
  if (userStreakNotAlreadyUpdatedToday(dbUser.value())) {
    addToStreak(msg, dbUser);
  } else {
    const reply = `howdy partner, it looks like you posted multiple times to the server's #${msg.channel.name} channel today. We'd like to avoid overshadowing daily status updates with other conversations, so we'd appreciate it if you would move this conversation to a thread or another channel. If you want to update your standup, just edit the existing post`;
    msg.reply(reply).catch((e) => console.error("error replying", e));
  }
};

const getOrCreateDBUser = (msg) => {
  let dbUser = db.get("users").find({ userID: msg.author.id });

  if (dbUser.value()) {
    dbUser.assign({ username: msg.author.username }).write();
  } else {
    const newUser = {
      userID: msg.author.id,
      username: msg.author.username,
      messagesEnabled: true,
      mentionsEnabled: true,
    };
    const dbUsers = db.get("users");
    dbUsers.push(newUser).write();
    dbUser = dbUsers.find({ userID: newUser.userID });
  }
  return dbUser;
};

const userStreakNotAlreadyUpdatedToday = (user) => {
  if (!user.streak) {
    return true;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart();
  const userLastUpdate = new Date(user.lastUpdate);
  return userLastUpdate < mostRecentWeekdayStart;
};

const userStreakLastUpdatedLastWeekday = (user) => {
  if (!user.lastUpdate) {
    return false;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart();
  const userLastUpdate = new Date(user.lastUpdate);
  const timeBeforeWeekdayStart =
    mostRecentWeekdayStart.getTime() - userLastUpdate.getTime();
  const didLastUpdateLastWeekday =
    timeBeforeWeekdayStart > 0 && timeBeforeWeekdayStart <= 3 * ONE_DAY;
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

const getMostRecentWeekdayStart = () => {
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

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
