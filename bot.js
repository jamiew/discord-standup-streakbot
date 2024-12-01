const { getOrCreateDBUser } = require("./db");
const { addToStreak, userStreakNotAlreadyUpdatedToday } = require("./streaks");
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

// Find today's thread for a user
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

const processMessageForStreak = async (msg) => {
  const dbUser = getOrCreateDBUser(msg);
  if (
    userStreakNotAlreadyUpdatedToday(
      dbUser.value(),
      config.dayStartHour,
      config.dayStartMinute
    )
  ) {
    addToStreak(msg, dbUser);
  } else {
    // Find user's existing thread from today
    const existingThread = await findTodayThread(msg.channel, msg.author.id);

    let reply;
    if (existingThread) {
      reply = `You already started a thread for today, please post there instead: ${existingThread.url}`;
    } else {
      reply = `You've already posted your standup for today. I couldn't find your thread (it may have been renamed), but please edit your existing post if you need to make updates.`;
    }

    await msg
      .reply({ content: reply, ephemeral: true })
      .catch((e) => console.error("error replying", e));

    // Delete the duplicate message
    try {
      await msg.delete();
    } catch (error) {
      console.error("Error deleting duplicate message:", error);
    }
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

  // Process streak before creating thread
  await processMessageForStreak(message);

  // Only create thread if this is their first post today
  if (
    userStreakNotAlreadyUpdatedToday(
      getOrCreateDBUser(message).value(),
      config.dayStartHour,
      config.dayStartMinute
    )
  ) {
    // Create thread for discussion
    try {
      // Create the thread first
      const thread = await message.startThread({
        name: `${
          message.author.username
        }'s standup ${new Date().toLocaleDateString()}`,
        autoArchiveDuration: 1440, // 24 hours in minutes
      });

      // Then add reactions to the original standup post (just ⭐ and one random emoji)
      await addReactions(message, 2);

      // Send thread messages without reactions
      await thread.send("This thread will automatically archive in 24 hours");

      // Award glifbux for creating a thread
      try {
        await awardGlifbux(message.author, config.threadRewardAmount);
        await thread.send(
          `🎉 You've been awarded ${config.threadRewardAmount} glifbux for creating this thread! Check your balance with /balance`
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
