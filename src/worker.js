/**
 * FirstMate Worker
 * - Serves the static chat UI from ./public (via the ASSETS binding)
 * - Exposes POST /api/chat for the rule-based support engine
 *
 * Safety rules enforced here:
 * - Never asks for PIN, password, OTP, card number or CVV
 * - Security-related messages get safety guidance first
 * - Escalations return a case reference (no real ticketing system is connected yet)
 */

const MAX_MESSAGE_LENGTH = 500;

const INTENTS = [
  { id: "security", re: /\b(otp|pin|password|cvv|bvn|hacked?|scam|fraud|stolen account|unauthori[sz]ed|suspicious|someone (is )?using my|someone (took|took my)|phishing)\b/i, escalate: true },
  { id: "card", re: /\b(lost|stolen|missing|swallowed|damaged)\b.*\b(card|atm)\b|\b(card|atm)\b.*\b(lost|stolen|missing|swallowed|damaged)\b/i, escalate: true },
  { id: "transfer", re: /\b(transfer|sent (money|cash)|send money|not received|didn'?t receive|never received|debited|deducted|pending|failed|reversal|refund|no (come|enter)|not (come|enter))\b/i, escalate: false },
  { id: "login", re: /\b(log ?in|sign ?in|can'?t access|cannot access|locked|password reset|forgot password|app not working|account locked|no fit (login|enter))\b/i, escalate: false },
  { id: "airtime", re: /\b(airtime|recharge|data bundle|buy data|pay (bill|bills))\b/i, escalate: false },
  { id: "agent", re: /\b(agent|human|real person|speak to (someone|a person)|talk to (someone|a person)|customer care)\b/i, escalate: true },
  { id: "greeting", re: /^\s*(hi+|hello|hey|good (morning|afternoon|evening)|how far|wetin dey happen)\b/i, escalate: false }
];

const PIDGIN_HINTS = /\b(abeg|wetin|na|dey|no (fit|dey|come|enter|get)|wahala|now-now|don|sef|make i|i fit|i go)\b/i;

const REPLIES = {
  en: {
    security: (h) => `Please do not share your PIN, password or OTP with anyone, including people who say they are from FirstBank. If you think your account is at risk, block your card or access through the official banking app or call the official FirstBank hotline (${h}) right away.`,
    card: (h) => `I'm sorry you're dealing with this. Please block your card straight away in the official FirstBank app or call the hotline (${h}). Do not share your card details with anyone.`,
    transferGuide: "I can guide you. First, check the transaction history in your official banking app. Does it show pending, successful, or failed?",
    transferEscalate: "If it shows failed, or it is still pending longer than expected, I can open a support case so the team can check it.",
    login: "Sorry you can't get in. Try the 'Forgot password' or reset option in the official app first. If it still doesn't work, check your internet connection and try again later. Never share your login details with anyone.",
    airtime: "You can buy airtime or data through the official FirstBank app or by dialling *894# from your phone, using your bank's approved channels. Which would you like help with?",
    agent: "I can connect you to a support agent. I'll open a case so you don't have to repeat everything.",
    greeting: "Hello! I'm FirstMate. I can help with transfers, cards, app access and airtime. What do you need help with today?",
    unknown: "I'm not sure I understood. Could you tell me a bit more, for example: 'my transfer has not arrived', 'I lost my card', or 'I can't log in'?",
    ticket: (ref) => `Your support reference is ${ref}.`
  },
  pcm: {
    security: (h) => `Abeg, no share your PIN, password or OTP with anybody, even if dem say dem be FirstBank people. If you think say your account no safe, block your card or access inside the official app or call the official FirstBank hotline (${h}) now-now.`,
    card: (h) => `Sorry for the wahala. Block your card now-now inside the official FirstBank app or call the hotline (${h}). No share your card details with anybody.`,
    transferGuide: "No worry. First, check your transaction history inside your official banking app. Wetin e show, pending, successful, or failed?",
    transferEscalate: "If e show failed, or e dey pending pass the time wey dem talk, I fit open support case make the team check am.",
    login: "Sorry say you no fit enter. Try 'Forgot password' inside the official app first. If e still no work, check your internet and try again later. No share your login details with anybody.",
    airtime: "You fit buy airtime or data through the official FirstBank app or dial *894# for your phone. Which one you wan do?",
    agent: "I fit connect you to support agent. I go open case so you no need repeat everything.",
    greeting: "Hello! I be FirstMate. I fit help with transfers, cards, app access and airtime. Wetin you need help with today?",
    unknown: "I no sure say I understand well. Abeg tell me small more, like 'my transfer never enter', 'I lost my card', or 'I no fit login'.",
    ticket: (ref) => `Your support reference na ${ref}.`
  }
};

function detectIntent(message) {
  for (const intent of INTENTS) {
    if (intent.re.test(message)) return intent;
  }
  return null;
}

function detectLanguage(requested, message) {
  if (requested === "pcm") return "pcm";
  if (requested === "en") return "en";
  return PIDGIN_HINTS.test(message) ? "pcm" : "en";
}

function newReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "FM-";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export function buildReply({ message, lang, hotline }) {
  const language = detectLanguage(lang, message);
  const R = REPLIES[language];
  const intent = detectIntent(message);
  const id = intent ? intent.id : "unknown";
  let reply;
  let reference = null;

  switch (id) {
    case "security":
      reply = R.security(hotline);
      break;
    case "card":
      reply = R.card(hotline);
      break;
    case "transfer": {
      const failing = /\b(failed|not received|never received|didn'?t receive|no (come|enter)|not (come|enter)|debited|deducted)\b/i.test(message);
      reply = R.transferGuide;
      if (failing) {
        reply += " " + R.transferEscalate;
      }
      break;
    }
    case "login":
      reply = R.login;
      break;
    case "airtime":
      reply = R.airtime;
      break;
    case "agent":
      reply = R.agent;
      break;
    case "greeting":
      reply = R.greeting;
      break;
    default:
      reply = R.unknown;
  }

  const shouldEscalate = intent?.escalate || (id === "transfer" && /\b(failed|not received|never received|didn'?t receive|no (come|enter)|not (come|enter))\b/i.test(message));
  if (shouldEscalate) {
    reference = newReference();
    reply += " " + R.ticket(reference);
  }

  return { reply, intent: id, language, reference };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
      if (!message) {
        return json({ error: "Message is required" }, 400);
      }
      const lang = body?.lang === "pcm" ? "pcm" : body?.lang === "en" ? "en" : "auto";
      const hotline = env.SUPPORT_HOTLINE || "the official FirstBank hotline";
      return json(buildReply({ message, lang, hotline }));
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "firstmate" });
    }

    return env.ASSETS.fetch(request);
  }
};
