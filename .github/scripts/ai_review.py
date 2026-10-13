#!/usr/bin/env python3
"""Fetch the PR diff, ask an AI model to review it, and post a PR comment."""

import json
import os
import sys
import urllib.request

MAX_DIFF_CHARS = 12000

GITHUB_API = "https://api.github.com"
DEFAULT_BASE_URL = "https://api.openai.com/v1"
ZAI_BASE_URL = "https://api.z.ai/api/paas/v4"


def post(url, token, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main():
    github_token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPOSITORY"]
    pr_number = os.environ["PR_NUMBER"]
    api_key = os.environ["AI_API_KEY"]
    model = (os.environ.get("AI_MODEL") or "").strip()
    base_url = (os.environ.get("AI_BASE_URL") or "").strip().rstrip("/")
    if not base_url:
        base_url = ZAI_BASE_URL if model.lower().startswith("glm") else DEFAULT_BASE_URL
    if not model:
        model = "glm-4.6" if base_url == ZAI_BASE_URL else "gpt-4o-mini"
    ai_api_url = f"{base_url}/chat/completions"

    # Fetch the PR diff.
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/pulls/{pr_number}",
        headers={
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3.diff",
        },
    )
    with urllib.request.urlopen(req) as resp:
        diff = resp.read().decode("utf-8", errors="replace")

    if not diff.strip():
        print("Empty diff; nothing to review.")
        return

    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated]"

    prompt = (
        "Review this pull request diff. Point out only real bugs or risky "
        "changes (correctness, security, data loss, breaking behavior). "
        "Be brief: a short bullet list with file/line references. "
        "If there are none, say exactly: No issues found.\n\n" + diff
    )

    req = urllib.request.Request(
        ai_api_url,
        data=json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a concise, senior code reviewer."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 800,
        }).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        ai_resp = json.loads(resp.read())
    review = ai_resp["choices"][0]["message"]["content"].strip()

    body = f"### AI Review ({model})\n\n{review}"
    post(
        f"{GITHUB_API}/repos/{repo}/issues/{pr_number}/comments",
        github_token,
        {"body": body},
    )
    print("Posted review comment.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"AI review failed: {exc}", file=sys.stderr)
        sys.exit(1)
