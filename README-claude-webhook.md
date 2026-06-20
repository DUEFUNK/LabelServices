# Claude Webhook Listener for DUEFUNK/LabelServices

This is a minimal middleware service that listens for GitHub pull_request webhooks, sends the PR diff to Claude (Anthropic example adapter), and posts an automated review comment on the PR.

Features added:
- server/index.js: Express webhook endpoint (/webhook) with signature verification
- lib/claude.js: Adapter that calls Anthropic's /v1/complete endpoint (pluggable via CLAUDE_PROVIDER)
- Dockerfile + .dockerignore
- package.json

Quickstart
1) Deploy the service somewhere reachable (Heroku, Render, Fly, VPS, etc.) or run locally.

2) Set environment variables (see .env.example below). Important variables:
- GITHUB_TOKEN: a personal access token or repo token with repo:status, repo:public_repo, repo:repo, or permissions to read PR diffs and post comments.
- GITHUB_WEBHOOK_SECRET: secret used to sign incoming webhooks.
- CLAUDE_PROVIDER: currently supports "anthropic".
- CLAUDE_API_KEY: your Claude/Anthropic API key.
- CLAUDE_MODEL: optional (defaults to claude-2)

3) Create a GitHub webhook (Repository Settings -> Webhooks):
- Payload URL: https://<your-host>/webhook
- Content type: application/json
- Secret: set to the same value as GITHUB_WEBHOOK_SECRET
- Select "Let me select individual events" and choose "Pull requests"

4) Test by opening or updating a PR. The service will fetch the PR diff and post a comment containing Claude's review.

.env.example

GITHUB_TOKEN=ghp_xxx_or_repo_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
CLAUDE_PROVIDER=anthropic
CLAUDE_API_KEY=sk-xxxx
CLAUDE_MODEL=claude-2
PORT=3000

Security and notes
- Keep your CLAUDE_API_KEY and GITHUB_TOKEN secret and store them in a secure place like GitHub Secrets or your hosting provider's environment.
- This is a minimal example. Before using in production you should add rate-limiting, retries, error handling improvements, logging, and a queue if you expect high throughput.

Next steps I can do for you (pick any):
- Add GitHub Actions to automatically deploy this service to a host (e.g., Render/Fly)
- Replace the Anthropic example with another Claude provider (if you're using a different API)
- Extend the service to open PRs with fixes instead of commenting
- Add unit tests and CI

