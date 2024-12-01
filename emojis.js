// Array of fun emojis to randomly choose from
// prettier-ignore
const funEmojis = [
  "🚀", "🎉", "🌟", "🎨", "🎸", "🎮", "🌈", "🦄", "🎪", "🎭",
  "🎯", "🎲", "🎼", "🎧", "💫", "✨", "🌺", "🎵", "🎹", "🎸",
  "🎺", "🥁", "🎨", "🎬", "🎤", "🎩", "🎪", "🌸", "🍀", "🌞",
  "⭐", "🌙", "💝", "💖", "💕", "💓", "💗", "💞",
];

// Function to get random emojis, ensuring no duplicates
const getRandomEmojis = (count) => {
  const shuffled = [...funEmojis].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

module.exports = {
  funEmojis,
  getRandomEmojis,
};
