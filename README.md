# FirstMate

FirstMate is an AI-style banking support assistant prototype: a mobile-friendly web chat with voice input, text input, English and Nigerian Pidgin replies, and escalation with a support reference.

**Status:** independent concept demo. Not an official FirstBank service. It does not connect to real accounts, transactions or ticketing systems.

## Safety rules built in
- Never asks for PIN, password, OTP, BVN, card number or CVV.
- Security and lost-card messages get safety guidance first.
- Escalations return a reference number. Replace this with a real ticketing system before any live use.

## Project layout
```
firstmate/
  public/index.html      Chat UI (voice + text, EN / Pidgin, read-aloud)
  src/worker.js          Cloudflare Worker: serves UI and POST /api/chat
  test/engine.test.js    Tests for the support engine
  wrangler.jsonc         Cloudflare config (set SUPPORT_HOTLINE here)
  package.json
```

## Run locally
```bash
npm install
npm run dev        # http://localhost:8787
npm test
```

## Push to GitHub
```bash
cd firstmate
git init
git add .
git commit -m "Initial FirstMate prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/firstmate.git
git push -u origin main
```
Create the empty `firstmate` repository on GitHub first (github.com/new), without a README.

## Deploy to Cloudflare
1. Set the real hotline in `wrangler.jsonc` (`SUPPORT_HOTLINE`) only after you confirm the official number from FirstBank.
2. Run:
```bash
npx wrangler login
npm run deploy
```
Or connect the GitHub repo in Cloudflare Dashboard > Workers & Pages > Create > Import a repository. Build command: none. Deploy command: `npx wrangler deploy`.

## Before any real launch
- Written approval and branding permission from FirstBank.
- Connect a real, approved AI service and ticketing system (replace the rule engine in `src/worker.js`).
- Privacy, security and compliance review, and controlled user testing.
- Keep the "not an official FirstBank service" notice until approved.
