const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const schedule = require("node-schedule");
const config = require("./config");
const db = require("./database");
const { isWeekday } = require("./utils");
const {
  addToStreak,
  userStreakNotAlreadyUpdatedToday,
} = require("./streakManager");
const {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
} = require("./announcements");

// connect to discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

let morningAnnouncementJob;
let midDayReminderJob;
let reconnectJob;
let midweekJob;

const scheduleJobs = () => {
  if (!morningAnnouncementJob) {
    console.log("Scheduling day start job...");
    morningAnnouncementJob = schedule.scheduleJob(
      `00 ${config.MORNING_ANNOUNCEMENT_MINUTE.toString().padStart(
        2,
        "0"
      )} ${config.MORNING_ANNOUNCEMENT_HOUR.toString().padStart(
        2,
        "0"
      )} * * 1-5`, // Monday to Friday
      () => {
        console.log("Broadcasting morning announcement...");
        broadcastMorningAnnouncement(standupChannel());
      }
    );
  }

  if (!midweekJob) {
    console.log("Scheduling midweek job...");
    midweekJob = schedule.scheduleJob(
      `00 ${config.MID_WEEK_SUMMARY_MINUTE.toString().padStart(
        2,
        "0"
      )} ${config.MID_WEEK_SUMMARY_HOUR.toString().padStart(2, "0")} * * ${
        config.MID_WEEK_DAY_OF_WEEK
      }`,
      () => {
        if (isWeekday(new Date())) {
          console.log("Broadcasting midweek summary...");
          broadcastSummary(standupChannel());
        }
      }
    );
  }
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag} - ${new Date().toUTCString()}`);

  debugGuilds();
  debugChannels();

  scheduleJobs();

  console.log("Client startup complete.");
});

client.on("error", (error) => {
  console.error(error);
});

client.on("disconnect", async (msg, code) => {
  if (code === 0) return console.error(msg);
  console.log("Graceful disconnect occurred.");
  disconnectCleanup();
  await connect();
});

client.on("messageCreate", (message) => {
  if (message.author.bot) {
    return;
  } else if (message.guildId !== config.GUILD_ID) {
    return;
  } else if (message.channel.name !== config.CHANNEL_NAME) {
    return;
  } else if (message.channel.isThread()) {
    // Ignore messages in threads
    console.log(`Ignoring message in thread: ${message.channel.name}`);
    return;
  }

  // test out various announcements
  if (message.content.startsWith("!")) {
    if (message.content == "!summary") {
      broadcastSummary(standupChannel());
    } else if (message.content == "!gm") {
      broadcastMorningAnnouncement(standupChannel());
    } else if (message.content == "!reminder") {
      broadcastReminder(standupChannel());
    } else if (message.content == "!help" || message.content == "!debug") {
      standupChannel().send(`current debug commands:
!summary
!gm
!reminder
!help

active guild: ${config.GUILD_ID}
active channel: #${config.CHANNEL_NAME}
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

const connect = async () => {
  console.log("Connecting...");
  await client.login(config.BOT_TOKEN);
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
      c.guildId == config.GUILD_ID &&
      c.name === config.CHANNEL_NAME &&
      c.type === ChannelType.GuildText
  );
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

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
