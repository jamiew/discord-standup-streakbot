const { getOrCreateDBUser } = require("./db");
const { addToStreak, userStreakNotAlreadyUpdatedToday } = require("./streaks");
const { glifbuxAPI } = require("./economy");
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

const processMessageForStreak = (msg) => {
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
    const reply = `howdy partner, it looks like you posted multiple times to the server's #${msg.channel.name} channel today. We'd like to avoid overshadowing daily status updates with other conversations, so we'd appreciate it if you would move this conversation to a thread or another channel. If you want to update your standup, just edit the existing post`;
    msg
      .reply(reply)
      .then((replyMsg) => addReactions(replyMsg, 2))
      .catch((e) => console.error("error replying", e));
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
    let replyMsg;
    if (message.content === "!summary") {
      replyMsg = await broadcastSummary(standupChannel());
    } else if (message.content === "!gm") {
      replyMsg = await broadcastMorningAnnouncement(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!reminder") {
      replyMsg = await broadcastReminder(
        standupChannel(),
        config.dayStartHour,
        config.dayStartMinute
      );
    } else if (message.content === "!help" || message.content === "!debug") {
      replyMsg = await broadcastHelp(
        standupChannel(),
        process.env.GUILD_ID,
        config.channelName
      );
    } else {
      replyMsg = await standupChannel().send(
        `sorry, I don't understand the command \`${message.content}\`. please try again.`
      );
    }
    // Add reactions to command responses
    if (replyMsg) {
      await addReactions(replyMsg, 2);
    }
    return;
  }

  // Process streak before creating thread
  processMessageForStreak(message);

  // Create thread for discussion
  try {
    // Add reactions to the original standup post
    await addReactions(message, 4);

    // Create the thread
    const thread = await message.startThread({
      name: `${
        message.author.username
      }'s standup ${new Date().toLocaleDateString()}`,
      autoArchiveDuration: 1440, // 24 hours in minutes
    });

    // Award glifbux for creating a thread
    try {
      await glifbuxAPI.awardGlifbux(message.author, config.threadRewardAmount);
      await thread.send(
        `🎉 You've been awarded ${config.threadRewardAmount} glifbux for creating this thread! Check your balance with /balance`
      );
    } catch (error) {
      console.error("Error awarding glifbux:", error);
    }

    // Send and react to the archive notice
    const archiveMsg = await thread.send(
      "This thread will automatically archive in 24 hours"
    );
    await addReactions(archiveMsg, 3);

    // Send and react to a welcome message
    const welcomeMsg = await thread.send(
      `Welcome to your standup thread, ${message.author}! Feel free to add more context or discuss your update here. 💬`
    );
    await addReactions(welcomeMsg, 3);
  } catch (error) {
    console.error("Error creating thread or adding reactions:", error);
  }
});

async function main() {
  await connect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
