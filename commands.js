const { SlashCommandBuilder } = require("discord.js");
const { glifbuxAPI } = require("./economy");

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check glifbux balance")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to check balance for (optional)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
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
];

// Command handlers
const handleBalance = async (interaction) => {
  try {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const balance = await glifbuxAPI.getBalance(targetUser);

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
      content: "Error checking balance!",
      ephemeral: true,
    });
  }
};

const handleSend = async (interaction) => {
  const targetUser = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount");

  try {
    await glifbuxAPI.sendGlifbux(interaction.user, targetUser, amount);
    const newBalance = await glifbuxAPI.getBalance(interaction.user);
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
        content: "Error processing transfer!",
        ephemeral: true,
      });
    }
  }
};

// Command handler map
const commandHandlers = {
  balance: handleBalance,
  send: handleSend,
};

// Main interaction handler
const handleInteraction = async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = commandHandlers[interaction.commandName];
  if (!handler) return;

  try {
    await handler(interaction);
  } catch (error) {
    console.error("Error handling slash command:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "There was an error processing your command!",
          ephemeral: true,
        });
      }
    } catch (e) {
      console.error("Error sending error message:", e);
    }
  }
};

module.exports = {
  commands,
  handleInteraction,
};
