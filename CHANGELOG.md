# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
