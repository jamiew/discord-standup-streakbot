const { config, client, rest, standupChannel, connect } = require("./setup");
const { Routes } = require("discord.js");
const { loadCommands, handleInteraction } = require("./command-loader");
const { processStandupMessage } = require("./message-handler");
const Scheduler = require("./scheduler");

const scheduler = new Scheduler();

client.on("ready", async () => {
  console.log("Bot is ready, registering slash commands...");
  try {
    const { commands } = loadCommands();
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Successfully registered slash commands");
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }

  // Make config accessible to command handlers
  client.config = config;

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

// Handle standup messages
client.on("messageCreate", (message) => processStandupMessage(message, config));

// Start the bot
connect().catch((e) => {
  console.error(e);
  process.exit(1);
});
