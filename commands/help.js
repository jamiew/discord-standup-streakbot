const { SlashCommandBuilder } = require("discord.js");
const { broadcastHelp } = require("../broadcasts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show reward system info and available commands"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      await broadcastHelp(
        interaction.channel,
        interaction.guildId,
        interaction.client.config.channelName
      );
      // Don't delete the reply since we want the help info to be visible
      await interaction.editReply({ content: "Help information shown above!" });
    } catch (error) {
      console.error("Error broadcasting help:", error);
      await interaction.editReply({
        content: "Error showing help information! Please try again later.",
      });
    }
  },
};
