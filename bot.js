const { Client, Events, GatewayIntentBits, Collection } = require("discord.js");
const RemindersScheduler = require("./reminders");
const { loadCommands } = require("./command-loader");
const { handleMessage } = require("./message-handler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const scheduler = new RemindersScheduler();

const standupChannel = () => {
  const guild = client.guilds.cache.first();
  if (!guild) return null;
  return guild.channels.cache.find(
    (channel) => channel.name === client.config.channelName
  );
};

const connect = async () => {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log("Connected to Discord!");
  } catch (error) {
    console.error("Error connecting to Discord:", error);
    process.exit(1);
  }
};

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await loadCommands(client);
  scheduler.scheduleJobs(standupChannel(), client.config);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  await handleMessage(message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.on("disconnect", (msg) => {
  console.error("Disconnected from Discord:", msg);
});

client.on("error", async (error) => {
  console.error("Discord client error:", error);
  scheduler.cleanup();
  await connect();
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Cleaning up...");
  scheduler.cleanup();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Cleaning up...");
  scheduler.cleanup();
  client.destroy();
  process.exit(0);
});

module.exports = { connect };
