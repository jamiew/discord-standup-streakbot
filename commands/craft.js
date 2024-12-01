const { SlashCommandBuilder } = require("discord.js");
const { getInventory } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("craft")
    .setDescription("Craft an Unwrapped Collectible Trading Card"),
  async execute(interaction) {
    try {
      // Get user's current inventory
      const inventory = await getInventory(interaction.user);

      // Create new card
      const newCard = {
        name: "Unwrapped Collectible Trading Card",
        description: "A mysterious trading card, still in its wrapper",
        rarity: "Common",
        quantity: 1,
      };

      // Add to inventory
      inventory.push(newCard);

      // Save updated inventory
      await interaction.client.db
        .get("inventories")
        .find({ userId: interaction.user.id })
        .assign({ items: inventory })
        .write();

      await interaction.reply({
        content:
          "🎴 You crafted an Unwrapped Collectible Trading Card! Check your /inventory to see it.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error crafting card:", error);
      await interaction.reply({
        content: "Error crafting card! The inventory API might be down.",
        ephemeral: true,
      });
    }
  },
};
