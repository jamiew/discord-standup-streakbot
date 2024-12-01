const { getRandomEmojis } = require("./emojis");

// Function to add multiple emoji reactions to a message
const addReactions = async (message, count = 3) => {
  console.log(`Adding ${count} emoji reactions to message...`);
  try {
    // Always add star for standup posts
    await message.react("⭐");

    // Add random fun emojis
    const randomEmojis = getRandomEmojis(count - 1); // -1 because we already added star
    for (const emoji of randomEmojis) {
      await message.react(emoji);
    }
    console.log(
      "Successfully added emoji reactions:",
      ["⭐", ...randomEmojis].join(", ")
    );
  } catch (error) {
    console.error("Error adding reactions:", error);
  }
};

module.exports = {
  addReactions,
};
