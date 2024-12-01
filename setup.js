const {
  Client,
  GatewayIntentBits,
  ChannelType,
  REST,
  Routes,
} = require("discord.js");
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
  threadRewardAmount: 5, // Amount of glifbux awarded for creating a thread
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

const standupChannel = () => {
  return client.channels.cache.find(
    (c) =>
      c.guildId == process.env.GUILD_ID &&
      c.name === config.channelName &&
      c.type === ChannelType.GuildText
  );
};

const connect = async () => {
  await client.login(process.env.BOT_TOKEN);
};

module.exports = {
  config,
  client,
  rest,
  standupChannel,
  connect,
};
