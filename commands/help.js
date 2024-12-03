const { SlashCommandBuilder } = require("discord.js");
const { getRewardTable } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show reward system info and available commands"),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const rewardTable = getRewardTable();
      let response = "**🎁 Daily Standup Reward System**\n\n";
      response +=
        "Post your daily standup to earn glifbux! The longer your streak, the more you earn:\n\n";

      // Format the reward table
      rewardTable.forEach(({ week, reward, example }) => {
        response += `Week ${week}: ${reward} glifbux per day (${example})\n`;
      });

      response += "\n**Additional Info:**\n";
      response += "• Streaks only count on weekdays\n";
      response += "• You must post in the standup channel to earn rewards\n";
      response += "• Only one standup post per day counts\n";
      response += "• Edit your existing post if you need to make updates\n";
      response += "• Use /tip to share glifbux with others\n";
      response += "• Use /balance to check your current balance\n";
      response += "• Use /inventory to see your items\n";

      response += "\n**Debug Information:**\n";
      response += "Available debug commands:\n";
      response += "!summary\n";
      response += "!gm\n";
      response += "!reminder\n";
      response += "!help\n\n";
      response += `Active guild: ${interaction.guildId}\n`;
      response += `Active channel: #${interaction.client.config.channelName}`;

      await interaction.editReply({ content: response });
    } catch (error) {
      console.error("Error showing help:", error);
      await interaction.editReply({
        content: "Error showing help information! Please try again later.",
      });
    }
  },
};
