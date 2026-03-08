# DCBot — Discord Time Tracking Bot

A Discord bot that tracks work hours via slash commands and logs them to Google Sheets. Users clock in and clock out; the bot records timestamps and calculates hours automatically.

## Features

- **Clock in / Clock out** — Simple slash commands to start and end work sessions
- **Google Sheets integration** — Logs to a `BotSheet` tab with columns: Date, User, Discord ID, Clock In, Clock Out, Hours
- **Timezone support** — Display times in your timezone (e.g. `Asia/Manila`)
- **Weekly reports** — View total hours per user (`/weeklyhours`) or leaderboard (`/weeklyreport` for admins)
- **Validation** — Prevents double clock-in and clock-out without clock-in

## Commands

| Command | Description |
|---------|-------------|
| `/clockin` | Record your work start time |
| `/clockout` | Record your work end time and log the session to the sheet |
| `/weeklyhours` | Show your total hours for the current week |
| `/weeklyreport` | Admin only — Weekly hours leaderboard |

## Prerequisites

- Node.js 18+
- A [Discord Application](https://discord.com/developers/applications) with a bot
- A Google Cloud project with Sheets API enabled and a Service Account

## Quick Start

```bash
# Clone the repo
git clone https://github.com/kyeisho12/DCBot.git
cd DCBot

# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env

# Register slash commands (run once, or when commands change)
npm run deploy

# Start the bot
npm start
```

## Configuration

Create a `.env` file from `.env.example`. See [SETUP.md](SETUP.md) for detailed instructions on obtaining each value.

### Required

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | Server (guild) ID where the bot will run |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from the sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email from Google Cloud |
| `GOOGLE_PRIVATE_KEY` | Private key from the service account JSON |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_TIMEZONE` | System local | Timezone for display (e.g. `Asia/Manila`, `America/Los_Angeles`) |

**Important:** Share your Google Sheet with the service account email as **Editor** so the bot can write to it.

## Google Sheet Structure

The bot appends rows to a sheet tab named **BotSheet** with these columns:

| DATE | USER | DISCORD_ID | CLOCK_IN | CLOCK_OUT | HOURS |
|------|------|------------|----------|-----------|-------|
| 3/8/2026 | kyeisho | 7658723801989 | 13:06 | 17:30 | 4.40 |

- **DATE** — Month/day/year format
- **CLOCK_IN / CLOCK_OUT** — 24-hour time (HH:mm)
- **HOURS** — Decimal hours (e.g. 4.25 for 4h 15m)

Your payroll sheet can pull data from BotSheet using formulas.

## Project Structure

```
DCBot/
├── bot.js              # Entry point
├── deploy-commands.js  # Register slash commands
├── commands/
│   ├── clockin.js
│   ├── clockout.js
│   ├── weeklyhours.js
│   └── weeklyreport.js
├── services/
│   └── sheetsService.js  # Google Sheets API
├── utils/
│   ├── timeUtils.js
│   ├── logger.js
│   ├── retry.js
│   └── safeReply.js
├── .env.example
├── SETUP.md            # Detailed setup guide
└── package.json
```

Ensure all environment variables are set in your hosting provider's dashboard.
