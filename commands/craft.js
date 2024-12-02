const { SlashCommandBuilder } = require("discord.js");
const { addToInventory } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("craft")
    .setDescription("Craft an Unwrapped Collectible Trading Card"),
  async execute(interaction) {
    try {
      // Create new card
      const newCard = {
        name: "Unwrapped Collectible Trading Card",
        description: "A mysterious trading card, still in its wrapper",
        rarity: "Common",
        quantity: 1,
        type: "card",
      };

      // Add to inventory via API
      await addToInventory(interaction.user, newCard);

      await interaction.reply({
        content:
          "🎴 You crafted an Unwrapped Collectible Trading Card! Check your /inventory to see it.",
        // ephemeral: true,
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
