const { SlashCommandBuilder } = require("discord.js");
const { getRewardTable } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rewards")
    .setDescription("Learn about the glifbux reward system"),
  async execute(interaction) {
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

    await interaction.reply({ content: response });
  },
};
