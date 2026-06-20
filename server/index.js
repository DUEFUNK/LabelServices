# Simple GitHub webhook listener that asks Claude for a PR review and posts a comment

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { generateReview } = require('../lib/claude');

const app = express();
const PORT = process.env.PORT || 3000;

// Need raw body for signature verification
app.use(express.json({verify: (req, res, buf) => { req.rawBody = buf; }}));

function verifySignature(secret, rawBody, signatureHeader) {
  if (!secret) return false;
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch (e) {
    return false;
  }
}

app.post('/webhook', async (req, res) => {
  const sig = req.headers['x-hub-signature-256'];
  if (!verifySignature(process.env.GITHUB_WEBHOOK_SECRET, req.rawBody, sig)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  try {
    if (event === 'pull_request') {
      const action = payload.action;
      // react to opened, reopened, edited, synchronize
      if (['opened','reopened','edited','synchronize'].includes(action)) {
        await handlePullRequest(payload);
      }
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).send('internal error');
  }
});

async function handlePullRequest(payload) {
  const pr = payload.pull_request;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = pr.number;

  // Fetch the PR diff
  const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.diff'
    }
  });
  const diff = await diffRes.text();

  // Generate a review using Claude
  const review = await generateReview({ title: pr.title, body: pr.body, diff, repo: `${owner}/${repo}`, prNumber });

  // Post the comment on the PR
  const commentRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: review })
  });

  if (!commentRes.ok) {
    const text = await commentRes.text();
    throw new Error(`Failed to post comment: ${commentRes.status} ${text}`);
  }

  console.log(`Posted Claude review to ${owner}/${repo}#${prNumber}`);
}

app.get('/', (req, res) => res.send('LabelServices Claude webhook listener'));

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
