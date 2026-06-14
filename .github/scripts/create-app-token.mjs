import { createSign } from "node:crypto";
import { appendFileSync } from "node:fs";

const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
const appId = requiredEnv("APP_ID");
const privateKey = requiredEnv("APP_PRIVATE_KEY");
const repository = requiredEnv("GITHUB_REPOSITORY");
const permissions = JSON.parse(process.env.TOKEN_PERMISSIONS || "{}");
const outputPath = requiredEnv("GITHUB_OUTPUT");

const jwt = createJwt(appId, privateKey);
const installation = await request(
  `${apiUrl}/repos/${repository}/installation`,
  {
    headers: appHeaders(jwt),
  },
);

const tokenResponse = await request(
  `${apiUrl}/app/installations/${installation.id}/access_tokens`,
  {
    method: "POST",
    headers: {
      ...appHeaders(jwt),
      "content-type": "application/json",
    },
    body: JSON.stringify({ permissions }),
  },
);

mask(tokenResponse.token);
setOutput("token", tokenResponse.token);
setOutput("installation-id", String(installation.id));

if (installation.app_slug) {
  setOutput("app-slug", installation.app_slug);
}

function createJwt(issuer, key) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "RS256", typ: "JWT" });
  const payload = base64url({
    iat: now - 60,
    exp: now + 600,
    iss: issuer,
  });
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(key, "base64url");
  return `${signingInput}.${signature}`;
}

function appHeaders(jwt) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${jwt}`,
    "x-github-api-version": "2022-11-28",
  };
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (response.ok) {
    return response.json();
  }

  const body = await response.text();
  throw new Error(
    `GitHub API request failed: ${response.status} ${response.statusText}\n${body}`,
  );
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function setOutput(name, value) {
  appendFileSync(outputPath, `${name}=${value}\n`);
}

function mask(value) {
  console.log(`::add-mask::${value}`);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
