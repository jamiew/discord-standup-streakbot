const { getOrCreateDBUser } = require("./db");
const { addToStreak, userStreakNotAlreadyUpdatedToday } = require("./streaks");
const { awardGlifbux, getBalance } = require("./economy");
const { addReactions } = require("./reactions");
const { calculateGlifbuxReward } = require("./utils");
const { db } = require("./db");

const generateThreadName = (username, date) => {
  return `${username}'s standup ${date.toLocaleDateString()}`;
};

const findTodayThread = async (channel, userId, username) => {
  try {
    const expectedThreadName = generateThreadName(username, new Date());
    const threads = await channel.threads.fetch();
    return threads.threads.find((thread) => thread.name === expectedThreadName);
  } catch (error) {
    console.error("Error finding today's thread:", error);
    return null;
  }
};

const handleDuplicatePost = async (msg, lastUpdate) => {
  console.log(
    `[${new Date().toISOString()}] Duplicate standup detected from ${
      msg.author.username
    } - already posted today at ${new Date(lastUpdate).toISOString()}`
  );

  // Try to find today's thread
  const existingThread = await findTodayThread(
    msg.channel,
    msg.author.id,
    msg.author.username
  );

  let reply;
  if (existingThread) {
    reply = `You've already posted your standup for today. Please continue the conversation in your existing thread: ${existingThread.url}`;
  } else {
    reply = `You've already posted your standup for today. Please edit your existing post if you need to make updates.`;
  }

  await msg.reply({ content: reply });
};

const createThreadForPost = async (
  msg,
  config,
  streakCount,
  previousUpdateDate
) => {
  try {
    // Create the thread first using the consistent naming function
    const thread = await msg.startThread({
      name: generateThreadName(msg.author.username, new Date()),
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

    // Format last update message
    const lastUpdateText = previousUpdateDate
      ? `Last Updated: ${new Date(previousUpdateDate).toLocaleString()}`
      : "First post!";

    // Format reward info
    const weekNumber = Math.floor((streakCount - 1) / 5) + 1;
    const rewardInfo = `${glifbuxReward} glifbux (Week ${weekNumber} reward rate)`;

    // Send thread messages with detailed info
    await thread.send(`- Your current Streak: ${streakText}
- ${lastUpdateText}
- Reward for this post: ${rewardInfo}

This thread will automatically archive in 24 hours
Run \`/help\` for more info`);

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
  // Default createThreads to false if not specified in config
  const createThreads = config.createThreads ?? false;
  // Ignore if not in the right channel/guild
  if (msg.author.bot) return;
  if (msg.guildId !== process.env.GUILD_ID) return;
  if (msg.channel.name !== config.channelName) return;
  if (msg.channel.isThread()) return;

  // Get user data first
  const dbUser = getOrCreateDBUser(msg);
  const userData = dbUser.value();

  // Store the previous update time before any changes
  const previousUpdateDate = userData?.lastUpdate;

  // Check if user has already posted today
  const canPost = userStreakNotAlreadyUpdatedToday(
    userData,
    config.dayStartHour,
    config.dayStartMinute
  );

  if (!canPost) {
    await handleDuplicatePost(msg, userData.lastUpdate);
    return;
  }

  console.log(`Valid new standup post - processing for ${msg.author.username}`);

  // Try to update streak (this will only succeed on valid weekdays)
  // Note: lastUpdate is now handled inside addToStreak
  const streakUpdated = addToStreak(msg, dbUser);

  if (streakUpdated) {
    // Get fresh user data after streak update
    const updatedUser = db.get("users").find({ userID: msg.author.id }).value();
    console.log(`Fresh user data after streak update:`, {
      streak: updatedUser.streak,
      lastUpdate: updatedUser.lastUpdate,
    });

    // Add reactions regardless of thread creation
    await addReactions(msg, 2);

    // Calculate and award glifbux
    const streakCount = updatedUser.streak || 1;
    const glifbuxReward = calculateGlifbuxReward(streakCount);

    try {
      await awardGlifbux(msg.author, glifbuxReward);
      console.log(
        `Awarded ${glifbuxReward} glifbux to ${msg.author.username} for standup post (streak: ${streakCount})`
      );
    } catch (error) {
      console.error("Error awarding glifbux:", error);
      await msg.reply(
        "❌ There was an error awarding glifbux for this post. The API might be down."
      );
    }

    // Only create thread if enabled in config
    if (createThreads) {
      await createThreadForPost(msg, config, streakCount, previousUpdateDate);
    }
  }
};

module.exports = {
  processStandupMessage,
};
