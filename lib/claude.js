const fetch = require('node-fetch');

// Simple adapter for Claude/Anthropic. Add more providers as needed.
async function generateReview({ title, body, diff, repo, prNumber }) {
  const prompt = buildPrompt({ title, body, diff, repo, prNumber });
  const provider = process.env.CLAUDE_PROVIDER || 'anthropic';

  if (provider === 'anthropic') {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY required for Anthropic provider');

    const model = process.env.CLAUDE_MODEL || 'claude-2';

    const payload = {
      model,
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      max_tokens_to_sample: Number(process.env.CLAUDE_MAX_TOKENS || 800)
    };

    const res = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${t}`);
    }

    const data = await res.json();
    // Different Anthropic client versions return text in different fields. Try common ones.
    const completion = data.completion || data.completion?.[0] || data.output?.[0]?.content?.[0]?.text || data.text;
    return formatComment(completion || JSON.stringify(data));
  }

  throw new Error(`Unsupported CLAUDE_PROVIDER: ${provider}`);
}

function buildPrompt({ title, body, diff, repo, prNumber }) {
  // Keep the prompt size reasonable — trim very large diffs
  const MAX_DIFF = 12000; // characters
  const trimmedDiff = diff && diff.length > MAX_DIFF ? diff.slice(-MAX_DIFF) : diff;

  return `You are an experienced code reviewer. Provide a concise, constructive review for a pull request.

Repository: ${repo}
PR: #${prNumber}
Title: ${title}
Description: ${body}

Diff (last ${trimmedDiff ? Math.min(trimmedDiff.length, MAX_DIFF) : 0} chars):\n${trimmedDiff || '<no diff available>'}

Instructions:
- Summarize what changed in 2-4 short paragraphs.
- Point out any bugs, correctness issues, or security concerns.
- Suggest concrete fixes or code examples when appropriate.
- Keep the response to ~600-900 words and use Markdown where helpful.
`;
}

function formatComment(text) {
  // Ensure it's a string and within GitHub comment size limits
  const body = `## Automated Claude review\n\n${text}`;
  const MAX = 65536; // GitHub comment limit
  return body.length > MAX ? body.slice(0, MAX - 3) + '...' : body;
}

module.exports = { generateReview };
