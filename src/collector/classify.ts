import type { BrandConfig } from "../lib/brands";
import { THEMES } from "../lib/brands";
import type { Mention, Sentiment, SignalType } from "../lib/types";
import { makeMentionId } from "../lib/store";
import { detectCompetitors, detectProducts, env, type RawHit } from "./util";

/**
 * Turn a raw hit into a fully classified Mention.
 *
 * LLM backends, in order of preference:
 *   1. Azure AI Foundry (AZURE_AI_API_KEY + AZURE_AI_ENDPOINT + AZURE_AI_DEPLOYMENT)
 *   2. Groq (GROQ_API_KEY)
 * With no key configured, a keyword heuristic keeps the pipeline working
 * (signal type, sentiment, themes via keyword hints, templated draft reply).
 */
const SIGNAL_TYPES: SignalType[] = [
  "buying-decision",
  "competitor-frustration",
  "unanswered-question",
  "brand-mention",
  "content-gap",
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

interface LlmResult {
  signalType: SignalType;
  sentiment: Sentiment;
  themes: string[];
  draftResponse: string;
}

function systemPrompt(brand: BrandConfig): string {
  const themeList = THEMES.map((t) => `${t.id} (${t.label})`).join(", ");
  return [
    `You analyze internet conversations for ${brand.name}, a brand that makes ${brand.tagline}.`,
    `Classify each conversation into exactly one signalType:`,
    `- buying-decision: actively choosing/comparing products to buy now`,
    `- competitor-frustration: frustration with a competitor (${brand.competitors.slice(0, 3).join(", ")}...)`,
    `- unanswered-question: a question that ranks or could rank on Google`,
    `- brand-mention: a direct mention of the brand with no strong intent`,
    `- content-gap: a topic with no good existing content to point to`,
    `Rate sentiment toward ${brand.name} as positive, neutral, or negative.`,
    `Pick 1-4 themes (a post can belong to several) from: ${themeList}.`,
    `Write a short (max 60 words), helpful, non-salesy draftResponse in the brand's friendly expert voice.`,
    `Respond ONLY with compact JSON: {"signalType":"...","sentiment":"...","themes":["..."],"draftResponse":"..."}.`,
  ].join("\n");
}

/** One OpenAI-compatible chat call — Azure AI Foundry or Groq. */
async function chatJson(
  system: string,
  user: string,
): Promise<Record<string, unknown> | null> {
  const azureKey = env("AZURE_AI_API_KEY");
  const azureEndpoint = env("AZURE_AI_ENDPOINT");
  const groqKey = env("GROQ_API_KEY");

  let url: string;
  let headers: Record<string, string>;
  let model: string | undefined;

  if (azureKey && azureEndpoint) {
    const deployment = env("AZURE_AI_DEPLOYMENT") ?? "gpt-4o-mini";
    const apiVersion = env("AZURE_AI_API_VERSION") ?? "2024-08-01-preview";
    url = `${azureEndpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    headers = { "api-key": azureKey, "Content-Type": "application/json" };
  } else if (groqKey) {
    url = "https://api.groq.com/openai/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    };
    model = env("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
  } else {
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(model ? { model } : {}),
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`  [classify] LLM HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return JSON.parse(json.choices[0].message.content) as Record<
      string,
      unknown
    >;
  } catch (e) {
    console.warn(`  [classify] LLM error: ${String(e).slice(0, 100)}`);
    return null;
  }
}

async function classifyWithLlm(
  hit: RawHit,
  brand: BrandConfig,
): Promise<LlmResult | null> {
  const parsed = await chatJson(
    systemPrompt(brand),
    `Title: ${hit.title}\nContext: ${hit.context ?? ""}\nText: ${hit.excerpt}`,
  );
  if (!parsed) return null;
  const signalType = parsed.signalType as SignalType;
  if (!SIGNAL_TYPES.includes(signalType)) return null;
  const themes = Array.isArray(parsed.themes)
    ? (parsed.themes as string[]).filter((t) => THEME_IDS.has(t)).slice(0, 4)
    : [];
  return {
    signalType,
    sentiment: (parsed.sentiment as Sentiment) ?? "neutral",
    themes,
    draftResponse: typeof parsed.draftResponse === "string" ? parsed.draftResponse : "",
  };
}

/** Keyword-hint theme detection — multi-label, used when no LLM ran. */
function detectThemesHeuristic(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  return THEMES.filter((theme) =>
    theme.hints.some((h) => t.includes(h)),
  )
    .map((theme) => theme.id)
    .slice(0, 4);
}

/** Cheap keyword heuristic used when no LLM key is configured. */
function classifyHeuristic(hit: RawHit, brand: BrandConfig): LlmResult {
  const t = `${hit.title} ${hit.excerpt}`.toLowerCase();
  const competitors = brand.competitors.map((c) => c.toLowerCase());
  const negativeWords = ["broken", "clog", "leak", "fail", "disappoint", "frustrat", "junk", "worst", "not working", "won't", "stuck", "overheat", "flicker", "dim"];
  const positiveWords = ["love", "great", "awesome", "best", "recommend", "worth", "amazing"];

  const isComparison = /\bvs\b|versus|compare|which|should i (buy|get)|recommend|reviews?|best /.test(t);
  const isDesignGap = /design|ideas|spacing|how deep|color temperature|uplighting|2700k|3000k|layout/.test(t);
  const isQuestion = t.includes("?") || /how (do|to|can|deep)|why|anyone|help|troubleshoot/.test(t);

  let signalType: SignalType = "brand-mention";
  if (hit.kind === "topic") {
    signalType = isComparison
      ? "buying-decision"
      : isDesignGap
        ? "content-gap"
        : "unanswered-question";
  } else if (isComparison) {
    signalType = "buying-decision";
  } else if (
    (hit.kind === "competitor" || competitors.some((c) => t.includes(c))) &&
    (negativeWords.some((n) => t.includes(n)) || hit.kind === "competitor")
  ) {
    signalType = "competitor-frustration";
  } else if (isQuestion) {
    signalType = "unanswered-question";
  } else if (/no (guide|content|video|tutorial)|wish there was|deep dive/.test(t)) {
    signalType = "content-gap";
  }

  let sentiment: Sentiment = "neutral";
  if (negativeWords.some((n) => t.includes(n))) sentiment = "negative";
  else if (positiveWords.some((p) => t.includes(p))) sentiment = "positive";

  return {
    signalType,
    sentiment,
    themes: detectThemesHeuristic(`${hit.title} ${hit.excerpt}`),
    draftResponse: templateDraft(signalType, brand),
  };
}

/** Generic per-signal draft used when no LLM is available. Clearly a starting point. */
function templateDraft(signal: SignalType, brand: BrandConfig): string {
  switch (signal) {
    case "buying-decision":
      return `Worth adding ${brand.name} to your shortlist — happy to share a quick comparison for your setup so you can weigh it against the others.`;
    case "competitor-frustration":
      return `Sorry you're dealing with that. A lot of folks in this spot have had a better experience with ${brand.name} — glad to point you to the right product or an installer.`;
    case "unanswered-question":
      return `Great question — here's how this works with ${brand.name}. Let us know the specifics of your setup and we can give a more exact answer.`;
    case "content-gap":
      return `Good topic — we can put together a clear ${brand.name} guide on this. Thanks for flagging the gap.`;
    default:
      return `Thanks for mentioning ${brand.name}! Happy to help if any questions come up.`;
  }
}

export async function classifyHit(
  hit: RawHit,
  brand: BrandConfig,
): Promise<Mention> {
  const result =
    (await classifyWithLlm(hit, brand)) ?? classifyHeuristic(hit, brand);

  const text = `${hit.title} ${hit.excerpt}`;
  const competitors = detectCompetitors(text, brand.competitors);
  const products = detectProducts(text, brand.products, hit.brandMentioned);
  // Ensure themes exist even when the LLM skipped them.
  const themes = result.themes.length
    ? result.themes
    : detectThemesHeuristic(text);

  return {
    id: makeMentionId({ source: hit.source, url: hit.url, excerpt: hit.excerpt }),
    brand: hit.brand,
    source: hit.source,
    title: hit.title,
    excerpt: hit.excerpt,
    url: hit.url,
    author: hit.author,
    context: hit.context,
    publishedAt: hit.publishedAt,
    collectedAt: new Date().toISOString(),
    signalType: result.signalType,
    sentiment: result.sentiment,
    engagement: hit.engagement,
    competitors: competitors.length ? competitors : undefined,
    products: products.length ? products : undefined,
    themes: themes.length ? themes : undefined,
    brandMentioned: hit.brandMentioned,
    draftResponse: result.draftResponse || undefined,
  };
}
