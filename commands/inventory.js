const { SlashCommandBuilder } = require("discord.js");
const { getInventory, discordEmbedFromInventoryItem } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Check inventory")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to check inventory for (optional)")
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const inventory = await getInventory(targetUser);

      if (inventory.length === 0) {
        const message =
          targetUser.id === interaction.user.id
            ? "You don't have any items in your inventory yet!"
            : `${targetUser.username} doesn't have any items in their inventory yet!`;
        await interaction.reply({ content: message, ephemeral: true });
        return;
      }

      const header =
        targetUser.id === interaction.user.id
          ? "Your inventory:"
          : `${targetUser.username}'s inventory:`;

      const embeds = inventory.map((item) =>
        discordEmbedFromInventoryItem(item)
      );

      await interaction.reply({
        title: header,
        ephemeral: true,
        embeds,
      });
    } catch (error) {
      console.error("Error getting inventory:", error);
      await interaction.reply({
        content: "Error checking inventory! The inventory API might be down.",
        ephemeral: true,
      });
    }
  },
};
