# Discord Standup Streakbot

A Discord bot that tracks user standup streaks and creates discussion threads.

## Development Setup

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

## Running Locally

Development mode (with auto-reload):

```bash
pnpm dev
```

Production mode:

```bash
pnpm start
```

## Running in Production (using Docker)

For production deployments, you can run this bot using Docker:

```bash
docker run -d \
  -e BOT_TOKEN="your-bot-token" \
  -e GUILD_ID="your-guild-id" \
  -e CHANNEL_NAME="standups" \
  ghcr.io/jamie/discord-standup-streakbot:latest
```

### Environment Variables

All configuration is done through environment variables:

Required:

- `BOT_TOKEN`: Your Discord bot token
- `GUILD_ID`: Your Discord server ID

Optional:

- `CHANNEL_NAME`: Channel to monitor (default: "standups")
- `CHAIRMAN_PASSWORD`: Password for glifbux API authorization
- `DAY_START_HOUR`: Hour when day starts (default: 0)
- `DAY_START_MINUTE`: Minute when day starts (default: 0)
- `MORNING_ANNOUNCEMENT_HOUR`: Hour for morning message (default: 7)
- `MORNING_ANNOUNCEMENT_MINUTE`: Minute for morning message (default: 0)
- `MID_DAY_REMINDER_HOUR`: Hour for mid-day reminder (default: 12)
- `MID_DAY_REMINDER_MINUTE`: Minute for mid-day reminder (default: 0)
- `MID_WEEK_SUMMARY_HOUR`: Hour for mid-week summary (default: 13)
- `MID_WEEK_SUMMARY_MINUTE`: Minute for mid-week summary (default: 0)
- `MID_WEEK_DAY_OF_WEEK`: Day for mid-week summary (default: 3)

## Features

- Tracks user standup streaks
- Creates 24-hour discussion threads for each standup
- Daily morning announcements
- Mid-week summaries
- Commands:
  - `!gm`: Force morning announcement
  - `!summary`: Show weekly summary
  - `!reminder`: Send reminder
  - `!help`: Show commands
