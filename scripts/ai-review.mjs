// First-pass AI review for a pull request.
// Reads the PR diff, asks an AI model (any OpenAI-compatible API) for real bugs and risky changes,
// then posts one comment on the PR, or updates it when new commits arrive.

const MARKER = "<!-- ai-pr-review -->";
const MAX_DIFF_CHARS = 60_000;

const SYSTEM_PROMPT = [
  "You are a senior engineer doing a first-pass review of a pull request.",
  "Report only real problems: wrong logic, broken edge cases, money or rounding errors, security issues,",
  "and changed behavior with no test. Skip style and naming nitpicks.",
  "For each finding give: severity (High, Medium or Low), the file and line, what goes wrong with a concrete example, and the fix.",
  "List at most 5 findings, most severe first, in Markdown.",
  "If nothing is worth fixing, reply exactly: No problems found.",
].join(" ");

function requireEnv(name, hint) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. ${hint}`);
  return value;
}

async function main() {
  const repo = requireEnv("REPO", "The workflow sets this from github.repository.");
  const prNumber = requireEnv("PR_NUMBER", "The workflow sets this from the pull_request event.");
  const githubToken = requireEnv("GITHUB_TOKEN", "The workflow passes secrets.GITHUB_TOKEN.");
  const apiKey = requireEnv("AI_API_KEY", "Add a repository secret named AI_API_KEY.");
  const model = requireEnv("AI_MODEL", "Add a repository variable named AI_MODEL with your provider's model name.");
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  async function github(path, { method = "GET", headers = {}, body } = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      body,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`GitHub ${method} ${path} failed: ${res.status} ${await res.text()}`);
    return res;
  }

  const pr = await (await github(`/repos/${repo}/pulls/${prNumber}`)).json();
  let diff = await (await github(`/repos/${repo}/pulls/${prNumber}`, { headers: { Accept: "application/vnd.github.diff" } })).text();
  const truncated = diff.length > MAX_DIFF_CHARS;
  if (truncated) diff = diff.slice(0, MAX_DIFF_CHARS);

  const userPrompt = `Pull request: ${pr.title}\n\n${pr.body ?? ""}\n\nDiff${truncated ? " (truncated)" : ""}:\n\n${diff}`;

  const aiRes = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!aiRes.ok) throw new Error(`AI request failed: ${aiRes.status} ${await aiRes.text()}`);
  const review = (await aiRes.json()).choices?.[0]?.message?.content?.trim();
  if (!review) throw new Error("The AI reply had no text.");

  const note = truncated ? " The diff was long, so only its first part was reviewed." : "";
  const body = `${MARKER}\n### AI review\n\n${review}\n\n---\n<sub>Automated first-pass review by ${model}. A person still approves the merge.${note}</sub>`;

  const comments = await (await github(`/repos/${repo}/issues/${prNumber}/comments?per_page=100`)).json();
  const existing = comments.find((comment) => comment.body?.includes(MARKER));
  if (existing) {
    await github(`/repos/${repo}/issues/comments/${existing.id}`, { method: "PATCH", body: JSON.stringify({ body }) });
    console.log(`Updated the AI review comment on PR #${prNumber}.`);
  } else {
    await github(`/repos/${repo}/issues/${prNumber}/comments`, { method: "POST", body: JSON.stringify({ body }) });
    console.log(`Posted the AI review comment on PR #${prNumber}.`);
  }
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
