const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const { getOrCreateDBUser } = require("./db");
const { addToStreak, userStreakNotAlreadyUpdatedToday } = require("./streaks");
const {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
  broadcastHelp,
} = require("./broadcasts");
const Scheduler = require("./scheduler");

require("dotenv").config();
if (!process.env.GUILD_ID) throw new Error("missing GUILD_ID env var");
if (!process.env.BOT_TOKEN) throw new Error("missing BOT_TOKEN env var");

const config = {
  dayStartHour: process.env.DAY_START_HOUR
    ? parseInt(process.env.DAY_START_HOUR)
    : 0,
  dayStartMinute: process.env.DAY_START_MINUTE
    ? parseInt(process.env.DAY_START_MINUTE)
    : 0,
  morningAnnouncementHour: process.env.MORNING_ANNOUNCEMENT_HOUR
    ? parseInt(process.env.MORNING_ANNOUNCEMENT_HOUR)
    : 7,
  morningAnnouncementMinute: process.env.MORNING_ANNOUNCEMENT_MINUTE
    ? parseInt(process.env.MORNING_ANNOUNCEMENT_MINUTE)
    : 0,
  midWeekSummaryHour: process.env.MID_WEEK_SUMMARY_HOUR
    ? parseInt(process.env.MID_WEEK_SUMMARY_HOUR)
    : 13,
  midWeekSummaryMinute: process.env.MID_WEEK_SUMMARY_MINUTE
    ? parseInt(process.env.MID_WEEK_SUMMARY_MINUTE)
    : 0,
  midWeekDayOfWeek: process.env.MID_WEEK_DAY_OF_WEEK
    ? parseInt(process.env.MID_WEEK_DAY_OF_WEEK)
    : 3,
  channelName: process.env.CHANNEL_NAME || "standups",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const scheduler = new Scheduler();

const standupChannel = () => {
  return client.channels.cache.find(
    (c) =>
      c.guildId == process.env.GUILD_ID &&
      c.name === config.channelName &&
      c.type === ChannelType.GuildText
  );
};

const processMessageForStreak = (msg) => {
  const dbUser = getOrCreateDBUser(msg);
  if (
    userStreakNotAlreadyUpdatedToday(
      dbUser.value(),
      config.dayStartHour,
      config.dayStartMinute
    )
  ) {
    addToStreak(msg, dbUser);
  } else {
    const reply = `howdy partner, it looks like you posted multiple times to the server's #${msg.channel.name} channel today. We'd like to avoid overshadowing daily status updates with other conversations, so we'd appreciate it if you would move this conversation to a thread or another channel. If you want to update your standup, just edit the existing post`;
    msg.reply(reply).catch((e) => console.error("error replying", e));
  }
};

client.on("ready", () => {
  scheduler.scheduleJobs(standupChannel(), config);
});

client.on("error", (error) => {
  console.error(error);
});

client.on("disconnect", async (msg, code) => {
  if (code === 0) return console.error(msg);
  scheduler.cleanup();
  await connect();
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guildId !== process.env.GUILD_ID) return;
  if (message.channel.name !== config.channelName) return;
  if (message.channel.isThread()) return;

  if (message.content.startsWith("!")) {
    if (message.content === "!summary") {
      broadcastSummary(standupChannel());
    } else if (message.content === "!gm") {
      broadcastMorningAnnouncement(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!reminder") {
      broadcastReminder(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!help" || message.content === "!debug") {
      broadcastHelp(standupChannel(), process.env.GUILD_ID, config.channelName);
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
    await thread.send("This thread will automatically archive in 24 hours");
  } catch (error) {
    console.error("Error creating thread:", error);
  }
});

const connect = async () => {
  await client.login(process.env.BOT_TOKEN);
};

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
