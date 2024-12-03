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

      response += "\n**Available Commands:**\n";
      response += "• /help - Show this help message\n";
      response += "• /summary - Show who posted in the past week\n";
      response += "• /tip - Share glifbux with others\n";
      response += "• /balance - Check your current balance\n";
      response += "• /inventory - See your items\n";
      response += "• /craft - Craft items using your glifbux\n\n";

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
