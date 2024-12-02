const { SlashCommandBuilder } = require("discord.js");
const { addToInventory, discordEmbedFromInventoryItem } = require("../economy");

// everyone gets the same item right now
// this is the same shape as the inventory responses - don't change it without updating both
// TODO typescript! yeesh
const newCard = {
  name: "Unwrapped Collectible Trading Card",
  description: "A mysterious trading card, still in its wrapper",
  image:
    "https://res.cloudinary.com/dzkwltgyd/image/upload/v1733165766/image-input-block-production/apjbm5nfc6yoevwnisxh.jpg",
  rarity: "common",
  quantity: 1,
  type: "card",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("craft")
    .setDescription("Craft an item"),
  async execute(interaction) {
    try {
      // Add to inventory via API
      await addToInventory(interaction.user, newCard);

      await interaction.reply({
        content: "🎴 You crafted a new item! Check your /inventory to see it.",
        // ephemeral: true,
        embeds: [discordEmbedFromInventoryItem(newCard)],
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
