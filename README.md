# linkbruh

A Discord bot that rewrites X/Twitter and Instagram post links to embed-proxy
domains so videos and images play inline in Discord. It reposts the fixed link
via a channel webhook under the original poster's name and removes the original.

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
bot's fixed links render as embeds), Read Message History, Manage Messages
(needed to delete the original message and suppress broken embeds), and Manage
Webhooks (needed to repost the fix as the original poster):

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot&permissions=536964096
```

If the bot was previously invited without Manage Webhooks, re-invite it using
the URL above to grant the new permission.

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

Post an X/Twitter or Instagram link in a channel the bot can see. The bot
deletes the original message and reposts it via a channel webhook under the
original poster's name with the fixed link (for X/Twitter video links) or the
uploaded video (for Instagram). To remove the reposted fix, the original poster
reacts to it with ❌.

## Limitations

Age-restricted, private, or removed Instagram posts cannot be fixed. Instagram
serves their video only to a logged-in, age-verified session, so there is no
public video for the bot (or any logged-out tool) to fetch. When a post can't
be fixed the original is left intact and the bot posts a short self-deleting
note. Public Instagram posts and X/Twitter videos are unaffected.
