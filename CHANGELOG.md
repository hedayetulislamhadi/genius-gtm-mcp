# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- `LICENSE` file (MIT)
- `CHANGELOG.md` to track version history

## [1.0.0] - 2026-07-31

### Added
- Initial public release
- 19 GTM v2 API tools: `gtm_account`, `gtm_container`, `gtm_workspace`, `gtm_tag`, `gtm_trigger`, `gtm_variable`, `gtm_built_in_variable`, `gtm_folder`, `gtm_client`, `gtm_zone`, `gtm_template`, `gtm_transformation`, `gtm_gtag_config`, `gtm_version`, `gtm_version_header`, `gtm_environment`, `gtm_destination`, `gtm_user_permission`, `gtm_raw`
- 2 analytics tools: `genius_datalayer_builder`, `genius_capi_validator` (Meta CAPI / TikTok / Snapchat payload generation)
- 3 Cloudflare tools: `cloudflare_zone_lookup`, `cloudflare_dns_manager`, `cloudflare_worker_deploy`
- 2 Stape.io tools: `stape_container_manager`, `stape_domain_manager`
- Google OAuth desktop flow (`auth` command) with local credential storage at `~/.genius-gtm-mcp/config.json`
- Cloudflare auth flow (`cf-auth` command)
- Stape.io auth flow (`stape-auth` command)
- Multi-account support via environment variable override (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`)
- Cross-platform browser auto-open for sign-in (macOS, Windows, Linux)
- `status` and `logout` CLI commands