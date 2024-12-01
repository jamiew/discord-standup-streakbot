const { SlashCommandBuilder } = require("discord.js");
const { broadcastMorningAnnouncement } = require("../broadcasts");

// lol

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gm")
    .setDescription("Broadcast the morning announcement"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      await broadcastMorningAnnouncement(
        interaction.channel,
        interaction.client.config.dayStartHour,
        interaction.client.config.dayStartMinute
      );
      await interaction.deleteReply();
    } catch (error) {
      console.error("Error broadcasting morning announcement:", error);
      await interaction.reply({
        content: "Error sending morning announcement!",
        ephemeral: true,
      });
    }
  },
};
