#!/usr/bin/env python3
"""Fetch the PR diff, ask an AI model to review it, and post a PR comment."""

import json
import os
import sys
import urllib.error
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

    def ask(model_name):
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": "You are a concise, senior code reviewer."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 1500,
        }
        if base_url == ZAI_BASE_URL:
            payload["thinking"] = {"type": "disabled"}
        req = urllib.request.Request(
            ai_api_url,
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())

    # Try the configured model first; if the provider doesn't know that name, fall back.
    candidates = [model, model.lower()]
    if base_url == ZAI_BASE_URL:
        candidates += ["glm-5.2", "glm-4.6", "glm-4.5"]
    tried = []
    ai_resp = None
    for name in dict.fromkeys(c for c in candidates if c):
        try:
            ai_resp = ask(name)
            model = name
            break
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", errors="replace")
            if err.code in (400, 404) and ("1211" in body or "nknown" in body or "model" in body.lower()):
                tried.append(name)
                continue
            raise RuntimeError(f"HTTP {err.code}: {body[:400]}")
    if ai_resp is None:
        raise RuntimeError(f"No model name worked. Tried: {', '.join(tried)}")
    message = ai_resp["choices"][0]["message"]
    review = (message.get("content") or message.get("reasoning_content") or "").strip()
    if not review:
        raise RuntimeError("The model returned an empty review.")

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
        detail = ""
        if hasattr(exc, "read"):
            try:
                detail = exc.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
        msg = f"AI review failed: {exc} {detail}".replace("\n", " ")
        print(f"::error::{msg}")
        sys.exit(1)
