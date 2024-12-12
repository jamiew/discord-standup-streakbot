const { SlashCommandBuilder } = require("discord.js");
const { db } = require("../db");
const { isWeekday, getMostRecentWeekdayStart } = require("../utils");
const { userStreakLastUpdatedLastWeekday } = require("../streaks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Debug your current streak information"),
  async execute(interaction) {
    try {
      const user = db
        .get("users")
        .find({ userID: interaction.user.id })
        .value();

      if (!user) {
        return await interaction.reply({
          content: "No streak data found. Post a standup to start your streak!",
          ephemeral: true,
        });
      }

      const now = new Date();
      const lastUpdate = new Date(user.lastUpdate);
      const hasPostedToday = lastUpdate.toDateString() === now.toDateString();

      let debugInfo = "**🔍 Streak Debug Info**\n\n";
      debugInfo += `**User:** ${user.username}\n`;
      debugInfo += `**Current Streak:** ${user.streak || 0}\n`;
      debugInfo += `**Best Streak:** ${user.bestStreak || 0}\n`;
      debugInfo += `**Last Update:** ${lastUpdate.toLocaleString()}\n`;
      debugInfo += `**Posted Today:** ${hasPostedToday ? "Yes" : "No"}\n`;
      debugInfo += `**Today is Weekday:** ${isWeekday(now) ? "Yes" : "No"}\n`;

      await interaction.reply({
        content: debugInfo,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in streak command:", error);
      await interaction.reply({
        content: "Error getting streak information!",
        ephemeral: true,
      });
    }
  },
};
