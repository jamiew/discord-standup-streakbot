require("dotenv").config();

module.exports = {
  GUILD_ID: process.env.GUILD_ID,
  BOT_TOKEN: process.env.BOT_TOKEN,
  CHANNEL_NAME: process.env.CHANNEL_NAME || "standups",
  DAY_START_HOUR: process.env.DAY_START_HOUR
    ? parseInt(process.env.DAY_START_HOUR)
    : 0,
  DAY_START_MINUTE: process.env.DAY_START_MINUTE
    ? parseInt(process.env.DAY_START_MINUTE)
    : 0,
  MORNING_ANNOUNCEMENT_HOUR: process.env.MORNING_ANNOUNCEMENT_HOUR
    ? parseInt(process.env.MORNING_ANNOUNCEMENT_HOUR)
    : 7,
  MORNING_ANNOUNCEMENT_MINUTE: process.env.MORNING_ANNOUNCEMENT_MINUTE
    ? parseInt(process.env.MORNING_ANNOUNCEMENT_MINUTE)
    : 0,
  MID_WEEK_SUMMARY_HOUR: process.env.MID_WEEK_SUMMARY_HOUR
    ? parseInt(process.env.MID_WEEK_SUMMARY_HOUR)
    : 13,
  MID_WEEK_SUMMARY_MINUTE: process.env.MID_WEEK_SUMMARY_MINUTE
    ? parseInt(process.env.MID_WEEK_SUMMARY_MINUTE)
    : 0,
  MID_WEEK_DAY_OF_WEEK: process.env.MID_WEEK_DAY_OF_WEEK
    ? parseInt(process.env.MID_WEEK_DAY_OF_WEEK)
    : 3,
};
