# linkbruh

A Discord bot that rewrites X/Twitter and Instagram post links to embed-proxy
domains so videos and images play inline in Discord. It replies with the fixed
link and suppresses the original broken embed.

<!-- Placeholder copy. Rewrite this README in your own voice. -->

## Requirements

- Node.js 20.18+ (uses the built-in `--env-file-if-exists` flag)
- A Discord application + bot token

## Local run

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your env file and fill in the token:

   ```sh
   cp .env.example .env
   # edit .env and set DISCORD_TOKEN
   ```

3. Start the bot:

   ```sh
   npm start
   ```

Run the tests with:

```sh
npm test
```

## Discord Developer Portal setup

1. Go to the [Developer Portal](https://discord.com/developers/applications) and
   create an application.
2. Under **Bot**, create the bot and copy the token into your `.env` as
   `DISCORD_TOKEN`. Copy the **Application ID** (General Information) into
   `CLIENT_ID`.
3. Under **Bot → Privileged Gateway Intents**, enable **Message Content
   Intent**. The bot cannot read message text without it.

### Invite the bot

Use the OAuth2 URL below, replacing `CLIENT_ID` with your application ID. The
`permissions` value grants View Channels, Send Messages, Embed Links (so the
bot's fixed links render as embeds), Read Message History, and Manage Messages
(needed to suppress the original embed):

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot&permissions=93184
```

## Configuration

All proxy domains live at the top of `src/config.js`, as priority lists per
service (`X_PROXIES`, `INSTAGRAM_PROXIES`). Before posting, the bot probes the
candidates and uses the first that actually serves a video embed, so a degraded
domain is skipped automatically. Instagram domains rotate often; when embeds
stop working, move a current InstaFix-class domain to the front of the list.

| Env var         | Required | Purpose                                    |
| --------------- | -------- | ------------------------------------------ |
| `DISCORD_TOKEN` | yes      | Bot token from the Developer Portal        |
| `CLIENT_ID`     | no       | Application ID, used only for the invite URL |

## Deploy on Railway

1. Push this repo to GitHub.
2. In [Railway](https://railway.app), create a new project from the repo.
3. Under **Variables**, add `DISCORD_TOKEN` (and optionally `CLIENT_ID`).
4. Railway installs dependencies and runs `npm start` automatically. No `.env`
   is needed in the deploy — the start command falls through to the platform
   environment variables.
5. Confirm the service is running by checking the deploy logs for the login
   line.

## Usage

Post an X/Twitter or Instagram link in a channel the bot can see. It replies
with a fixed link and hides the original broken embed. To remove the bot's
reply, the original poster reacts to it with ❌.
