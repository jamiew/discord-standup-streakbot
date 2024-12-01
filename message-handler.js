const { getOrCreateDBUser } = require("./db");
const { addToStreak, userStreakNotAlreadyUpdatedToday } = require("./streaks");
const { awardGlifbux } = require("./economy");
const { addReactions } = require("./reactions");
const { calculateGlifbuxReward } = require("./utils");

const handleDuplicatePost = async (msg, lastUpdate) => {
  console.log(
    `Duplicate standup post detected from ${
      msg.author.username
    } - already posted today at ${new Date(lastUpdate).toISOString()}`
  );
  const reply = `You've already posted your standup for today. Please edit your existing post if you need to make updates.`;

  await msg
    .reply({ content: reply, ephemeral: true })
    .catch((e) => console.error("error replying", e));

  try {
    await msg.delete();
    console.log(`Deleted duplicate standup post from ${msg.author.username}`);
  } catch (error) {
    console.error("Error deleting duplicate message:", error);
  }
};

const createThreadForPost = async (msg, config, streakCount) => {
  try {
    // Create the thread first
    const thread = await msg.startThread({
      name: `${
        msg.author.username
      }'s standup ${new Date().toLocaleDateString()}`,
      autoArchiveDuration: 1440, // 24 hours in minutes
    });

    console.log(`Created new thread for ${msg.author.username}: ${thread.url}`);

    // Then add reactions to the original standup post
    await addReactions(msg, 2);

    // Calculate glifbux reward based on streak
    const glifbuxReward = calculateGlifbuxReward(streakCount);

    // Format streak message
    const streakText =
      streakCount === 1 ? "first day" : `${streakCount} day streak`;
    const rewardText = `You earned ${glifbuxReward} glifbux for your standup today!`;

    // Send thread messages
    await thread.send(
      `This thread will automatically archive in 24 hours\n` +
        `You're on a ${streakText}! 🎉\n` +
        `${rewardText} 💰`
    );

    // Award glifbux
    try {
      await awardGlifbux(msg.author, glifbuxReward);
      console.log(
        `Awarded ${glifbuxReward} glifbux to ${msg.author.username} for standup post (streak: ${streakCount})`
      );
    } catch (error) {
      console.error("Error awarding glifbux:", error);
      await thread.send(
        "❌ There was an error awarding glifbux for this post. The API might be down."
      );
    }
  } catch (error) {
    console.error("Error creating thread or adding reactions:", error);
  }
};

const processStandupMessage = async (msg, config) => {
  // Ignore if not in the right channel/guild
  if (msg.author.bot) return;
  if (msg.guildId !== process.env.GUILD_ID) return;
  if (msg.channel.name !== config.channelName) return;
  if (msg.channel.isThread()) return;

  const dbUser = getOrCreateDBUser(msg);
  const user = dbUser.value();

  console.log(
    `[${new Date().toISOString()}] Standup post from ${msg.author.username} (${
      msg.author.id
    })`
  );
  console.log(
    `Current streak: ${user.streak || 0}, Best streak: ${user.bestStreak || 0}`
  );
  console.log(
    `Last update: ${
      user.lastUpdate ? new Date(user.lastUpdate).toISOString() : "Never"
    }`
  );

  if (
    userStreakNotAlreadyUpdatedToday(
      user,
      config.dayStartHour,
      config.dayStartMinute
    )
  ) {
    console.log(
      `Valid new standup post - processing streak update for ${msg.author.username}`
    );
    addToStreak(msg, dbUser);

    // Get updated streak count after addToStreak
    const updatedUser = dbUser.value();
    await createThreadForPost(msg, config, updatedUser.streak || 1);
  } else {
    await handleDuplicatePost(msg, user.lastUpdate);
  }
};

module.exports = {
  processStandupMessage,
};
