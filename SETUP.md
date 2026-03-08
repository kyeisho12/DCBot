# Setup: All Required Keys

Copy `.env.example` to `.env` and fill in the values below.

---

## Discord (3 keys)

| Key | Where to get it |
|-----|-----------------|
| **DISCORD_TOKEN** | [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot** → **Reset Token** / **View Token**. Copy the token (keep it secret). |
| **CLIENT_ID** | Same portal → your app → **General Information** → **Application ID**. Copy the numeric ID. |
| **GUILD_ID** | In Discord (desktop): enable **Developer Mode** (Settings → App Settings → Advanced). Right‑click your server → **Copy Server ID**. |

---

## Google Sheets (3 keys)

You need a **Service Account** so the bot can edit the spreadsheet without logging in as a user.

### 1. Create a project and enable the API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select one) → **APIs & Services** → **Library**.
3. Search for **Google Sheets API** → **Enable**.

### 2. Create a Service Account and key

1. **APIs & Services** → **Credentials** → **Create Credentials** → **Service account**.
2. Give it a name (e.g. `discord-hours-bot`) → **Create and Continue** → **Done**.
3. Open the new service account → **Keys** → **Add Key** → **Create new key** → **JSON** → **Create**. A JSON file downloads.

### 3. Fill in the three env vars from the JSON file

Open the downloaded JSON. You need three values:

| Key | In the JSON file |
|-----|------------------|
| **GOOGLE_SHEET_ID** | Not in the JSON. From your **Google Sheet**: open the sheet in the browser and copy the ID from the URL: `https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit`. |
| **GOOGLE_SERVICE_ACCOUNT_EMAIL** | `client_email` (e.g. `something@project-id.iam.gserviceaccount.com`). |
| **GOOGLE_PRIVATE_KEY** | `private_key`. Copy the **entire** key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. In `.env` you can paste it in double quotes and keep the `\n` as literal backslash-n, or use real newlines. Example: `GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"` |

### 4. Share the spreadsheet with the bot

1. Open your Google Sheet.
2. **Share** → add the **GOOGLE_SERVICE_ACCOUNT_EMAIL** (the `client_email` from the JSON) as **Editor**. The bot will then be able to read and write that sheet.

---

## Optional

| Key | Default | Description |
|-----|---------|-------------|
| **SHEET_NAME** | `Hours` | Name of the **tab** inside the spreadsheet where hours are stored. The bot will create it if missing. |

---

## Checklist

- [ ] `.env` created (copy from `.env.example`)
- [ ] `DISCORD_TOKEN` set
- [ ] `CLIENT_ID` set
- [ ] `GUILD_ID` set
- [ ] Google Sheets API enabled
- [ ] Service account created and JSON key downloaded
- [ ] `GOOGLE_SHEET_ID` set (from sheet URL)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` set (from JSON `client_email`)
- [ ] `GOOGLE_PRIVATE_KEY` set (from JSON `private_key`)
- [ ] Spreadsheet shared with the service account email as Editor
- [ ] Run `npm run deploy` to register slash commands
- [ ] Run `npm start` to start the bot
