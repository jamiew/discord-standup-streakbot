const { SlashCommandBuilder } = require("discord.js");
const { sendGlifbux, getBalance } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tip")
    .setDescription("Tip another user some glifbux")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to tip glifbux to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of glifbux to tip")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Why are you giving them a tip?")
        .setRequired(true)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    // Validate amount is a number
    if (isNaN(amount)) {
      await interaction.reply({
        content: "❌ The amount must be a valid number!",
        ephemeral: true,
      });
      return;
    }

    try {
      await sendGlifbux(interaction.user, targetUser, amount);
      const newBalance = await getBalance(interaction.user);
      const message = interaction.options.getString("message");
      await interaction.reply(
        `Successfully tipped ${amount} glifbux to ${targetUser} for: "${message}"! Your new balance: ${newBalance} glifbux 💸`
      );
    } catch (error) {
      if (error.message === "Insufficient glifbux") {
        await interaction.reply({
          content: "❌ You do not have enough glifbux for this tip!",
          ephemeral: true,
        });
      } else {
        console.error("Error sending glifbux:", error);
        const message = error?.message;
        await interaction.reply({
          content: `Error processing tip: ${message ?? "unknown"}`,
          ephemeral: true,
        });
      }
    }
  },
};
