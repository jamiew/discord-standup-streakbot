const { SlashCommandBuilder } = require("discord.js");
const { sendGlifbux, getBalance } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("Send glifbux to another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to send glifbux to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of glifbux to send")
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    try {
      await sendGlifbux(interaction.user, targetUser, amount);
      const newBalance = await getBalance(interaction.user);
      await interaction.reply(
        `Successfully sent ${amount} glifbux to ${targetUser}! Your new balance: ${newBalance} glifbux 💸`
      );
    } catch (error) {
      if (error.message === "Insufficient glifbux") {
        await interaction.reply({
          content: "❌ You do not have enough glifbux for this transfer!",
          ephemeral: true,
        });
      } else {
        console.error("Error sending glifbux:", error);
        await interaction.reply({
          content: "Error processing transfer! The glifbux API might be down.",
          ephemeral: true,
        });
      }
    }
  },
};
