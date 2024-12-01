const { getOrCreateDBUser } = require("./db");
const {
  addToStreak,
  userStreakNotAlreadyUpdatedToday,
  updateLastUpdate,
} = require("./streaks");
const { awardGlifbux, getBalance } = require("./economy");
const { addReactions } = require("./reactions");
const { calculateGlifbuxReward } = require("./utils");
const { db } = require("./db");

const findTodayThread = async (channel, userId) => {
  try {
    const today = new Date().toLocaleDateString();
    const threads = await channel.threads.fetch();
    return threads.threads.find(
      (thread) => thread.name.includes(today) && thread.ownerId === userId
    );
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
  const existingThread = await findTodayThread(msg.channel, msg.author.id);

  let reply;
  if (existingThread) {
    reply = `You've already posted your standup for today. Please continue the conversation in your existing thread: ${existingThread.url}`;
  } else {
    reply = `You've already posted your standup for today. Please edit your existing post if you need to make updates.`;
  }

  try {
    const replyMsg = await msg.reply({ content: reply });

    // Delete the duplicate message
    await msg.delete();

    // Delete our reply after 30 seconds
    setTimeout(async () => {
      try {
        await replyMsg.delete();
      } catch (error) {
        console.error("Error deleting reply message:", error);
      }
    }, 30000);
  } catch (error) {
    console.error("Error handling duplicate post:", error);
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

    // Get fresh user data from database
    const freshUserData = db
      .get("users")
      .find({ userID: msg.author.id })
      .value();

    // Calculate glifbux reward based on streak
    const glifbuxReward = calculateGlifbuxReward(streakCount);

    // Get current balance
    const currentBalance = await getBalance(msg.author);

    // Format streak message
    const streakText =
      streakCount === 1 ? "first day" : `${streakCount} day streak`;
    const lastUpdateDate = new Date(freshUserData.lastUpdate).toLocaleString();

    // Format reward info
    const weekNumber = Math.floor((streakCount - 1) / 5) + 1;
    const rewardInfo = `${glifbuxReward} glifbux (Week ${weekNumber} reward rate)`;

    // Send thread messages with detailed info
    await thread.send(
      `🕒 This thread will automatically archive in 24 hours\n\n` +
        `📊 **Streak Status**\n` +
        `• Current Streak: ${streakText}\n` +
        `• Last Updated: ${lastUpdateDate}\n\n` +
        `💰 **Glifbux Info**\n` +
        `• Reward for this post: ${rewardInfo}\n` +
        `• Current balance: ${currentBalance} glifbux\n\n` +
        `Use /rewards to see how rewards increase with streak length!`
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

  // Check if user has already posted today using fresh database check
  const canPost = userStreakNotAlreadyUpdatedToday(
    msg.author.id,
    config.dayStartHour,
    config.dayStartMinute
  );

  if (canPost) {
    // yep
    console.log(
      `Validdd new standup post - processing for ${msg.author.username}`
    );

    // Get user data and always update lastUpdate
    const dbUser = getOrCreateDBUser(msg);
    const lastUpdateSuccess = updateLastUpdate(msg, dbUser);

    if (!lastUpdateSuccess) {
      console.error(`Failed to update lastUpdate for ${msg.author.username}`);
      return;
    }

    // Try to update streak (this will only succeed on valid weekdays)
    const streakUpdated = addToStreak(msg, dbUser);

    if (streakUpdated) {
      // Get fresh user data after streak update
      const updatedUser = db
        .get("users")
        .find({ userID: msg.author.id })
        .value();
      console.log(`Fresh user data after streak update:`, {
        streak: updatedUser.streak,
        lastUpdate: updatedUser.lastUpdate,
      });

      await createThreadForPost(msg, config, updatedUser.streak || 1);
    }
  } else {
    // Get fresh user data for duplicate handling
    const userData = db.get("users").find({ userID: msg.author.id }).value();
    await handleDuplicatePost(msg, userData.lastUpdate);
  }
};

module.exports = {
  processStandupMessage,
};
