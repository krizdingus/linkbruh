# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Proxy domains are now configured as priority lists per service
  (`X_PROXIES`, `INSTAGRAM_PROXIES`) instead of single values.

### Added

- Self-healing proxy selection. Before posting, the bot probes the candidate
  proxy domains for a link and posts the first one that actually serves a video
  embed, falling back to the primary if none verify. A silently-degraded proxy
  (e.g. `fxtwitter.com` returning a card with no video metadata) no longer
  breaks the fix.
- Instagram video fallback. Instagram proxies are unreliable because Instagram
  login-walls Discord's scraper. For Instagram links, when a proxy exposes the
  video the bot downloads it and re-uploads it as a native Discord attachment
  (within a size limit), which plays inline regardless of Discord's scrape. X
  links are unaffected and stay link-only.

### Fixed

- Invite URL now requests the Embed Links permission (`permissions=93184`).
  Without it Discord will not render the bot's fixed links as embeds, so no
  video appears regardless of the proxy.

## [0.1.0] - 2026-06-01

### Added

- Initial bot: detects X/Twitter and Instagram post links and replies with
  embed-proxy versions so they play inline in Discord.
- Suppresses the original message's broken embed (requires Manage Messages).
- React-to-delete: the original author can remove the bot's reply with ❌.
- Link detection skips spoiler tags, inline code, code blocks, and
  angle-bracket-wrapped links, and ignores links already on a proxy domain.
- All domain mappings live in a single config file for fast editing.
- `node:test` suite covering the link-detection and rewrite logic.

[Unreleased]: https://example.com/linkbruh/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/linkbruh/releases/tag/v0.1.0
