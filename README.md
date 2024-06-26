# standup-bot

Standup Cop. A Discord bot for tracking async standup posts in a dedicated `#standups` channel. Rewards users who post daily; chastises users who post more than once per day, or otherwise go off-topic.

Forked and extended from [talrnu/discord-standup-streakbot](https://github.com/talrnu/discord-standup-streakbot)

## How it works

As users post messages, the bot will update a file named `db.json`. You can modify or delete this file yourself, but you need to restart the bot to handle changes you make. Either close the command prompt and start a new one, or input Ctrl+C to kill the bot, then run the "node ." command again.

You can change the channel this bot operates in, as well as the hour and minute that it considers the day to start at. These are constant values near the top of the code in `bot.js`. You'll need to restart the bot for it to detect these changes.

Expected to be installed on a single server (guild). Does not support multiple servers well.

## Installation

### Creating and installing Discord bot

Create an app and a bot in the [Discord Developer Portal](https://discord.com/developers/applications). Make sure to enable "message intents" since we're using raw message reading/writing. To get the initial bot token, click "Reset token" on the Bot page.

Install the bot to your server; you'll need to put in your `client_id` here. The default permissions are read and send mesages

e.g. <https://discord.com/oauth2/authorize?client_id=[YOUR_CLIENT_ID_HERE]&scope=bot&permissions=3072>

Lastly, make sure the bot has permission to access your `#standups` channel (or whatever you set CHANNEL_NAME to)

### Setting up and running the code

Install nodejs and [pnpm](https://pnpm.io) if you don't have them, and clone this repository from GitHub.

Setup your .env config:

1. Copy `.env.sample` to `.env` and edit
2. At a minimum change `BOT_SECRET=[bot_token]`, replacing [bot_token] with the bot's secret token copied from the Discord dev portal.

Install dependencies:

```sh
pnpm install
```

Run the bot using nodemon, auto-restarting on changes to `bot.js`:

```sh
pnpm dev
```

The command prompt should say "Logged in as Discord Standup StreakBot". The bot should appear in the server's user list as online. Leave the command prompt open for as long as you want the bot to run.
