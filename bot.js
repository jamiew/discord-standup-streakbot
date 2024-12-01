const { getOrCreateDBUser } = require("./db");
const { addToStreak } = require("./streaks");
const { awardGlifbux } = require("./economy");
const {
  broadcastMorningAnnouncement,
  broadcastReminder,
  broadcastSummary,
  broadcastHelp,
} = require("./broadcasts");
const { config, client, rest, standupChannel, connect } = require("./setup");
const { commands, handleInteraction } = require("./commands");
const { addReactions } = require("./reactions");
const { Routes } = require("discord.js");
const Scheduler = require("./scheduler");

const scheduler = new Scheduler();

// Check if user has already posted today based on their lastUpdate timestamp
const hasPostedToday = (user) => {
  if (!user.lastUpdate) return false;

  const lastUpdate = new Date(user.lastUpdate);
  const now = new Date();

  return lastUpdate.toDateString() === now.toDateString();
};

const processMessageForStreak = async (msg) => {
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

  if (!hasPostedToday(user)) {
    console.log(
      `Valid new standup post - processing streak update for ${msg.author.username}`
    );
    addToStreak(msg, dbUser);
    return true;
  } else {
    console.log(
      `Duplicate standup post detected from ${
        msg.author.username
      } - already posted today at ${new Date(user.lastUpdate).toISOString()}`
    );
    const reply = `You've already posted your standup for today. Please edit your existing post if you need to make updates.`;

    await msg
      .reply({ content: reply, ephemeral: true })
      .catch((e) => console.error("error replying", e));

    // Delete the duplicate message
    try {
      await msg.delete();
      console.log(`Deleted duplicate standup post from ${msg.author.username}`);
    } catch (error) {
      console.error("Error deleting duplicate message:", error);
    }
    return false;
  }
};

client.on("ready", async () => {
  console.log("Bot is ready, registering slash commands...");
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Successfully registered slash commands");
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }

  scheduler.scheduleJobs(standupChannel(), config);
});

client.on("error", (error) => {
  console.error(error);
});

client.on("disconnect", async (msg, code) => {
  if (code === 0) return console.error(msg);
  scheduler.cleanup();
  await connect();
});

// Handle slash commands
client.on("interactionCreate", handleInteraction);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guildId !== process.env.GUILD_ID) return;
  if (message.channel.name !== config.channelName) return;
  if (message.channel.isThread()) return;

  if (message.content.startsWith("!")) {
    if (message.content === "!summary") {
      await broadcastSummary(standupChannel());
    } else if (message.content === "!gm") {
      await broadcastMorningAnnouncement(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!reminder") {
      await broadcastReminder(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!help" || message.content === "!debug") {
      await broadcastHelp(
        standupChannel(),
        process.env.GUILD_ID,
        config.channelName
      );
    } else {
      await standupChannel().send(
        `sorry, I don't understand the command \`${message.content}\`. please try again.`
      );
    }
    return;
  }

  // Process streak and only continue if it's their first post today
  const isFirstPost = await processMessageForStreak(message);

  if (isFirstPost) {
    // Create thread for discussion
    try {
      // Create the thread first
      const thread = await message.startThread({
        name: `${
          message.author.username
        }'s standup ${new Date().toLocaleDateString()}`,
        autoArchiveDuration: 1440, // 24 hours in minutes
      });

      console.log(
        `Created new thread for ${message.author.username}: ${thread.url}`
      );

      // Then add reactions to the original standup post (just ⭐ and one random emoji)
      await addReactions(message, 2);

      // Get updated user data after streak processing
      const updatedUser = getOrCreateDBUser(message).value();
      const streakCount = updatedUser.streak || 1;
      const streakText =
        streakCount === 1 ? "first day" : `${streakCount} day streak`;

      // Send thread messages without reactions
      await thread.send(
        `This thread will automatically archive in 24 hours\nYou're on a ${streakText}! 🎉`
      );

      // Award glifbux for creating a thread
      try {
        await awardGlifbux(message.author, config.threadRewardAmount);
        await thread.send(
          `You've been awarded ${config.threadRewardAmount} glifbux for creating this thread! Check your balance with /balance`
        );
        console.log(
          `Awarded ${config.threadRewardAmount} glifbux to ${message.author.username} for thread creation`
        );
      } catch (error) {
        console.error("Error awarding glifbux:", error);
        await thread.send(
          "❌ There was an error awarding glifbux for this thread. The API might be down."
        );
      }
    } catch (error) {
      console.error("Error creating thread or adding reactions:", error);
    }
  }
});

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
