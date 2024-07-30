const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const schedule = require("node-schedule");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

// sanity check our required configuration
require("dotenv").config();
if (!process.env.GUILD_ID) throw new Error("missing GUILD_ID env var");
if (!process.env.BOT_TOKEN) throw new Error("missing BOT_TOKEN env var");

// connect to discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// setup our lowdb database
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

const midDayReminderHour = process.env.MID_DAY_REMINDER_HOUR
  ? parseInt(process.env.MID_DAY_REMINDER_HOUR)
  : 12;
const midDayReminderMinute = process.env.MID_DAY_REMINDER_MINUTE
  ? parseInt(process.env.MID_DAY_REMINDER_MINUTE)
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
  return day >= 1 && day <= 5; // Monday is 1, Friday is 5
};

const scheduleJobs = () => {
  if (!morningAnnouncementJob) {
    console.log("Scheduling day start job...");
    morningAnnouncementJob = schedule.scheduleJob(
      `00 ${morningAnnouncementMinute
        .toString()
        .padStart(2, "0")} ${morningAnnouncementHour
        .toString()
        .padStart(2, "0")} * * 1-5`, // Monday to Friday
      () => {
        console.log("Broadcasting morning announcement...");
        broadcastMorningAnnouncement();
      }
    );
  }

  if (!midweekJob) {
    console.log("Scheduling midweek job...");
    midweekJob = schedule.scheduleJob(
      `00 ${midWeekSummaryMinute
        .toString()
        .padStart(2, "0")} ${midWeekSummaryHour
        .toString()
        .padStart(2, "0")} * * ${midWeekDayOfWeek}`,
      () => {
        if (isWeekday(new Date())) {
          console.log("Broadcasting midweek summary...");
          broadcastSummary();
        }
      }
    );
  }
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag} - ${new Date().toUTCString()}`);

  debugGuilds();
  // debugChannels();

  scheduleJobs();

  console.log("Client startup complete.");
});

client.on("error", (error) => {
  console.error(error);
});

client.on("disconnect", (msg, code) => {
  if (code === 0) return console.error(msg);
  console.log("Graceful disconnect occurred.");
  disconnectCleanup();
  connect();
});

client.on("messageCreate", (message) => {
  const currentChannelName = message.channel.name;
  const currentChannelType = message.channel.type;
  const channelDebug =
    currentChannelType == "dm" ? "DM" : `#${currentChannelName}`;

  if (message.author.bot) {
    // console.debug("ignoring message from bot", message.author.name);
    return;
  } else if (message.guildId !== process.env.GUILD_ID) {
    /*
    console.debug("ignoring message from different server than configured", {
      ourGuildId: process.env.GUILD_ID,
      messageGuildId: message.guildId,
    });
    */
    return;
  } else if (message.channel.name !== channelName) {
    /*
    console.debug("ignoring message not in our standup channel", {
      ourChannelName: channelName,
      messageChannelName: message.channel.name,
    });
    */
    return;
  }

  // test out various announcements
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

  // lastly,
  console.log(`Processing message received from ${message.author.username}`);
  processMessageForStreak(message);
});

const disconnectCleanup = () => {
  console.log("Cleaning up after disconnect...");
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

const disconnect = async () => {
  console.log("Disconnecting...");
  await client.destroy();
};

const connect = async () => {
  console.log("Connecting...");
  await client.login(process.env.BOT_TOKEN);
};

const debugGuilds = () => {
  console.log(
    "debugGuilds",
    client.guilds.cache.map((guild) => [guild.id, guild.name])
  );
};

const debugChannels = () => {
  console.log(
    "debugChannels",
    client.channels.cache.map((channel) => [
      channel.guildId,
      channel.id,
      channel.name,
      channel.type,
    ])
  );
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
  console.log("Sending morning announcement...");
  let announcement =
    "Let the new day begin! Post your standup to start or continue your daily streak. Check the pinned messages for a full explanation.";
  announcement += "\n\n";
  announcement += getUsersWhoPostedYesterday();
  standupChannel().send(announcement);
};

const broadcastReminder = () => {
  console.log("Sending reminder announcement...");
  let announcement =
    "The day is half done! Don't forget to post an update if you haven't. A quick note about what you plan to do tomorrow is great too.";
  announcement += "\n\n";
  announcement += getUsersWhoCouldLoseTheirStreak();
  standupChannel().send(announcement);
};

const broadcastSummary = () => {
  console.log("Sending summary...");
  const announcement = getUsersWhoPostedInThePastWeek();
  standupChannel().send(announcement);
};

const getUsersWhoPostedYesterday = () => {
  console.log("getUsersWhoPostedYesterday()");
  let listText = "";
  const users = db.get("users").value();
  const activeStreakUsers = users.filter(userStreakLastUpdatedLastWeekday);

  if (activeStreakUsers.length > 0) {
    listText += "Current running streaks:";
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

const processMessageForStreak = (msg) => {
  const dbUser = getOrCreateDBUser(msg);
  if (userStreakNotAlreadyUpdatedToday(dbUser.value())) {
    console.log("\tUpdating streak...");
    addToStreak(msg, dbUser);
  } else {
    console.log(
      `Extraneous message posted to ${msg.channel.name} by ${
        msg.author.username
      } (${msg.author.tag}) at ${new Date().toISOString()}`
    );
    const reply = `howdy partner, it looks like you posted multiple times to the server's #${msg.channel.name} channel today. We'd like to avoid overshadowing daily status updates with other conversations, so we'd appreciate it if you would move this conversation to a thread or another channel. If you want to update your standup, just edit the existing post`;

    // not everybody can accept DMs, so post as a public reply
    msg.reply(reply).catch((e) => console.error("error replying", e));
  }
};

const getOrCreateDBUser = (msg) => {
  let dbUser = db.get("users").find({ userID: msg.author.id });

  if (dbUser.value()) {
    dbUser.assign({ username: msg.author.username }).write();
    console.log(`Existing user updated: ${JSON.stringify(dbUser.value())}`);
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
    console.log(`New user created: ${JSON.stringify(dbUser.value())}`);
  }
  return dbUser;
};

const userStreakNotAlreadyUpdatedToday = (user) => {
  console.log(`userStreakNotAlreadyUpdatedToday(${user.username})`);
  if (!user.streak) {
    console.log("\tThis user is starting their first streak");
    return true;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart();
  const userLastUpdate = new Date(user.lastUpdate);
  return userLastUpdate < mostRecentWeekdayStart;
};

const userStreakLastUpdatedLastWeekday = (user) => {
  console.log(`userStreakLastUpdatedLastWeekday(${user.username})`);
  if (!user.lastUpdate) {
    console.log("\tUser's first streak! No last update date.");
    return false;
  }
  const mostRecentWeekdayStart = getMostRecentWeekdayStart();
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

const getMostRecentWeekdayStart = () => {
  console.log("getMostRecentWeekdayStart()");
  let mostRecentWeekdayStart = new Date();

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

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
