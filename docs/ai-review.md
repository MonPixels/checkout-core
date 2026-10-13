# AI review on every pull request (backup copy)

This branch holds a ready-made copy of the AI reviewer, kept as a backup for the Mel video. On camera, Mel builds its own version in VS Code.

## What it does

When a pull request is opened or gets new commits, a GitHub Action:

1. Reads the pull request's changes.
2. Asks an AI model for real bugs and risky changes (no style nitpicks), at most 5, most severe first.
3. Posts one "AI review" comment on the pull request, and updates that same comment on later commits.

It skips draft pull requests.

## Set it up

In the repository on GitHub, open Settings, then Secrets and variables, then Actions:

| Name | Where | What to put |
| --- | --- | --- |
| `AI_API_KEY` | Secrets | Your AI provider's API key |
| `AI_MODEL` | Variables | The model name your provider uses |
| `AI_BASE_URL` | Variables (optional) | Your provider's OpenAI-compatible address. Leave it out to use `https://api.openai.com/v1` |

Any provider with an OpenAI-compatible chat completions API works.

## Files

- `.github/workflows/ai-review.yml`: runs the review on pull requests.
- `scripts/ai-review.mjs`: reads the diff, calls the model, posts or updates the comment. No packages needed, only Node 22.
