const { SlashCommandBuilder } = require("discord.js");
const { getBalance } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check glifbux balance")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to check balance for (optional)")
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const balance = await getBalance(targetUser);

      if (targetUser.id === interaction.user.id) {
        await interaction.reply(`Your balance: ${balance} glifbux 💰`);
      } else {
        await interaction.reply(
          `${targetUser.username}'s balance: ${balance} glifbux 💰`
        );
      }
    } catch (error) {
      console.error("Error getting balance:", error);
      await interaction.reply({
        content: "Error checking balance! The glifbux API might be down.",
        ephemeral: true,
      });
    }
  },
};
