import type { BrandConfig } from "../lib/brands";
import type { Mention, Sentiment, SignalType } from "../lib/types";
import { makeMentionId } from "../lib/store";
import { detectCompetitors, env, type RawHit } from "./util";

/**
 * Turn a raw hit into a fully classified Mention.
 *
 * Uses Groq (free tier, OpenAI-compatible) running Llama to assign the signal
 * type + sentiment and to draft a reply in Hunter's voice. If GROQ_API_KEY is
 * absent we fall back to a fast keyword heuristic so the pipeline still works.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = env("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

const SIGNAL_TYPES: SignalType[] = [
  "buying-decision",
  "competitor-frustration",
  "unanswered-question",
  "brand-mention",
  "content-gap",
];

interface LlmResult {
  signalType: SignalType;
  sentiment: Sentiment;
  draftResponse: string;
}

function systemPrompt(brand: BrandConfig): string {
  return [
    `You analyze internet conversations for ${brand.name}, a brand that makes ${brand.tagline}.`,
    `Classify each conversation into exactly one signalType from this list:`,
    `- buying-decision: someone is actively choosing/comparing products to buy now`,
    `- competitor-frustration: frustration with a competitor (e.g. Rain Bird, Toro)`,
    `- unanswered-question: a question that ranks or could rank on Google`,
    `- brand-mention: a direct mention of the brand with no strong intent`,
    `- content-gap: a topic with no good existing content to point to`,
    `Also rate sentiment as positive, neutral, or negative (toward ${brand.name}).`,
    `Then write a short (max 60 words), helpful, non-salesy draftResponse in the brand's friendly expert voice that the marketing team could post.`,
    `Respond ONLY with compact JSON: {"signalType":"...","sentiment":"...","draftResponse":"..."}.`,
  ].join("\n");
}

async function classifyWithGroq(
  hit: RawHit,
  brand: BrandConfig,
  apiKey: string,
): Promise<LlmResult | null> {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(brand) },
          {
            role: "user",
            content: `Title: ${hit.title}\nContext: ${hit.context ?? ""}\nText: ${hit.excerpt}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`  [classify] Groq HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const parsed = JSON.parse(json.choices[0].message.content) as Partial<LlmResult>;
    if (!parsed.signalType || !SIGNAL_TYPES.includes(parsed.signalType)) return null;
    return {
      signalType: parsed.signalType,
      sentiment: (parsed.sentiment as Sentiment) ?? "neutral",
      draftResponse: parsed.draftResponse ?? "",
    };
  } catch (e) {
    console.warn(`  [classify] Groq error: ${String(e).slice(0, 100)}`);
    return null;
  }
}

/** Cheap keyword heuristic used when Groq is unavailable. */
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
    // Intent threads: a comparison is a buying decision, a design/how-to is a
    // content gap, everything else is an unanswered question to get to first.
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
    // A light templated draft so the feature works without Groq. Add a
    // GROQ_API_KEY for genuinely tailored, on-topic replies.
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
  const apiKey = env("GROQ_API_KEY");
  const result =
    (apiKey && (await classifyWithGroq(hit, brand, apiKey))) ||
    classifyHeuristic(hit, brand);

  const competitors = detectCompetitors(
    `${hit.title} ${hit.excerpt}`,
    brand.competitors,
  );

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
    brandMentioned: hit.brandMentioned,
    draftResponse: result.draftResponse || undefined,
  };
}
