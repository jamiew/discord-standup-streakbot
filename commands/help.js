const { SlashCommandBuilder } = require("discord.js");
const { broadcastHelp } = require("../broadcasts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands and debug information"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      await broadcastHelp(
        interaction.channel,
        interaction.guildId,
        interaction.client.config.channelName
      );
      await interaction.deleteReply();
    } catch (error) {
      console.error("Error broadcasting help:", error);
      await interaction.reply({
        content: "Error showing help information!",
        ephemeral: true,
      });
    }
  },
};
