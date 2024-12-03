const { config, client, rest, standupChannel, connect } = require("./setup");
const { Routes } = require("discord.js");
const { loadCommands, handleInteraction } = require("./command-loader");
const { processStandupMessage } = require("./message-handler");
const { db } = require("./db");
const Scheduler = require("./scheduler");

const scheduler = new Scheduler();

// Validate database and required tables
const validateDatabase = () => {
  console.log("Validating database...");

  // Check if database exists and has users table
  const users = db.get("users").value();
  if (!users) {
    console.error("FATAL ERROR: Database missing required 'users' table");
    process.exit(1);
  }

  // Verify we can write to the database
  try {
    const testUser = {
      userID: "test",
      username: "test",
      lastUpdate: new Date().toISOString(),
    };
    db.get("users").push(testUser).write();

    db.get("users").remove({ userID: "test" }).write();

    console.log("Database validation successful");
  } catch (error) {
    console.error("FATAL ERROR: Database write test failed:", error);
    process.exit(1);
  }
};

client.on("ready", async () => {
  console.log("Bot is ready, registering slash commands...");
  try {
    const { commands } = loadCommands();
    console.log(
      "Installing commands:",
      commands.map((c) => `/${c.name}`)
    );
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
const main = async () => {
  try {
    // Validate database before starting
    validateDatabase();

    // Connect to Discord
    await connect();
  } catch (error) {
    console.error("Fatal error during startup:", error);
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
