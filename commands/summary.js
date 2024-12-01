const { SlashCommandBuilder } = require("discord.js");
const { broadcastSummary } = require("../broadcasts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Show a summary of who posted in the past week"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      await broadcastSummary(interaction.channel);
      await interaction.deleteReply();
    } catch (error) {
      console.error("Error broadcasting summary:", error);
      await interaction.reply({
        content: "Error generating summary!",
        ephemeral: true,
      });
    }
  },
};
