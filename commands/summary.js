const { SlashCommandBuilder } = require("discord.js");
const { getUsersWhoPostedInThePastWeek } = require("../streaks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Show a summary of who posted in the past week"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const summary = getUsersWhoPostedInThePastWeek();
      await interaction.editReply({ content: summary });
    } catch (error) {
      console.error("Error showing summary:", error);
      await interaction.editReply({
        content: "Error generating summary! Please try again later.",
      });
    }
  },
};
