# Discord Standup Streakbot

A Discord bot that tracks user standup streaks and creates discussion threads.

## Setup

1. Copy the environment template:

```bash
cp .env.sample .env
```

2. Fill in your `.env` file with:

- `BOT_TOKEN`: Your Discord bot token
- `GUILD_ID`: Your Discord server ID
- Optional settings:
  - `CHANNEL_NAME`: Channel to monitor (default: "standups")
  - `DAY_START_HOUR`: Hour when day starts (default: 0)
  - `DAY_START_MINUTE`: Minute when day starts (default: 0)
  - `MORNING_ANNOUNCEMENT_HOUR`: Hour for morning message (default: 7)
  - `MORNING_ANNOUNCEMENT_MINUTE`: Minute for morning message (default: 0)

3. Install dependencies:

```bash
pnpm install
```

## Running the Bot

Development mode (with auto-reload):

```bash
pnpm dev
```

Production mode:

```bash
pnpm start
```

## Features

- Tracks user standup streaks
- Creates 24-hour discussion threads for each standup
- Automated daily morning announcements on weekdays
- Reward system with glifbux currency
- Crafting system for items
- Slash commands for easy interaction

## Available Commands

- `/help` - Show reward system info and available commands
- `/summary` - Show who posted in the past week
- `/tip` - Share glifbux with others
- `/balance` - Check your current balance
- `/inventory` - See your items
- `/craft` - Craft items using your glifbux
