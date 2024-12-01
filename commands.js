const { SlashCommandBuilder } = require("discord.js");
const { getBalance, sendGlifbux, getInventory } = require("./economy");

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
  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Check inventory")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to check inventory for (optional)")
        .setRequired(false)
    ),
];

// Format inventory item for display
const formatInventoryItem = (item) => {
  const parts = [
    `**${item.name}**`,
    item.description && `• ${item.description}`,
    item.rarity && `• Rarity: ${item.rarity}`,
    item.quantity > 1 && `• Quantity: ${item.quantity}`,
    item.durability && `• Durability: ${item.durability}`,
    item.weight && `• Weight: ${item.weight}`,
  ].filter(Boolean);

  return parts.join("\n");
};

// Command handlers
const handleBalance = async (interaction) => {
  try {
    const targetUser = interaction.options.getUser("user") || interaction.user;
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
};

const handleSend = async (interaction) => {
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
};

const handleInventory = async (interaction) => {
  try {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const inventory = await getInventory(targetUser);

    if (inventory.length === 0) {
      const message =
        targetUser.id === interaction.user.id
          ? "You don't have any items in your inventory yet!"
          : `${targetUser.username} doesn't have any items in their inventory yet!`;
      await interaction.reply(message);
      return;
    }

    const header =
      targetUser.id === interaction.user.id
        ? "Your inventory:"
        : `${targetUser.username}'s inventory:`;

    const itemsList = inventory.map(formatInventoryItem).join("\n\n");

    await interaction.reply(`${header}\n\n${itemsList}`);
  } catch (error) {
    console.error("Error getting inventory:", error);
    await interaction.reply({
      content: "Error checking inventory! The inventory API might be down.",
      ephemeral: true,
    });
  }
};

// Command handler map
const commandHandlers = {
  balance: handleBalance,
  send: handleSend,
  inventory: handleInventory,
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
          content:
            "There was an error processing your command! The API might be down.",
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
