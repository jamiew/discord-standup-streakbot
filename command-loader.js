const fs = require("fs");
const path = require("path");

function loadCommands() {
  const commands = [];
  const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter((file) => file.endsWith(".js"));

  const commandHandlers = new Map();

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
    commandHandlers.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  }

  return { commands, commandHandlers };
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandHandlers } = loadCommands();
  const command = commandHandlers.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error handling slash command:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "There was an error processing your command! The API might be down.",
          ephemeral: true,
        });
      }
    } catch (e) {
      console.error("Error sending error message:", e);
    }
  }
}

module.exports = {
  loadCommands,
  handleInteraction,
};
