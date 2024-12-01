const { SlashCommandBuilder } = require("discord.js");
const { broadcastReminder } = require("../broadcasts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Send a reminder to users who haven't posted today"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      await broadcastReminder(
        interaction.channel,
        interaction.client.config.dayStartHour,
        interaction.client.config.dayStartMinute
      );
      await interaction.deleteReply();
    } catch (error) {
      console.error("Error broadcasting reminder:", error);
      await interaction.reply({
        content: "Error sending reminder!",
        ephemeral: true,
      });
    }
  },
};
