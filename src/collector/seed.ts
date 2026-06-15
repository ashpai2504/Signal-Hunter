/**
 * Generates a realistic mock dataset so the dashboard is fully alive before
 * any real API keys are plugged in. Run with `npm run seed`.
 *
 * Everything here is synthetic — URLs point at plausible-but-fake threads.
 * Swap this out for the real collector (`npm run collect`) once keys exist.
 */
import { writeStore, makeMentionId } from "../lib/store";
import { BRAND_BY_ID } from "../lib/brands";
import { detectCompetitors } from "./util";
import type {
  BrandId,
  Mention,
  Sentiment,
  SignalType,
  SourceId,
} from "../lib/types";

interface Template {
  brand: BrandId;
  source: SourceId;
  context: string;
  author: string;
  title: string;
  excerpt: string;
  signalType: SignalType;
  sentiment: Sentiment;
  engagement: number;
  draftResponse?: string;
  urlBase: string;
  /** False for competitor-only "open field" threads (our brand unnamed). */
  brandMentioned?: boolean;
}

const TEMPLATES: Template[] = [
  // ---- Hunter Industries ----
  {
    brand: "hunter",
    source: "reddit",
    context: "r/lawncare",
    author: "u/sprinkler_steve",
    title: "Hunter Pro-C vs Rain Bird ESP-TM2 for a 6-zone yard?",
    excerpt:
      "About to redo my system and I'm torn between the Hunter Pro-C and the Rain Bird ESP-TM2. Anyone running the Pro-C with Hydrawise? Worth the upgrade?",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 142,
    draftResponse:
      "Great question! The Pro-C pairs really well with Hydrawise for smart, weather-based watering — most homeowners find the app scheduling pays for itself in water savings within a season. Happy to share a zone-planning guide if useful.",
    urlBase: "https://www.reddit.com/r/lawncare/comments/1abc100/",
  },
  {
    brand: "hunter",
    source: "reddit",
    context: "r/irrigation",
    author: "u/h2o_contractor",
    title: "MP Rotators clogging after winter — anyone else?",
    excerpt:
      "Pulled three Hunter MP Rotator nozzles this spring that were gummed up. Install was clean. Is this a flush issue or a known thing?",
    signalType: "unanswered-question",
    sentiment: "negative",
    engagement: 64,
    draftResponse:
      "Sorry to hear that! MP Rotators are sensitive to debris in the line — a quick flush of the lateral before reinstalling the nozzle usually clears it. If it persists, our team can help diagnose; here's the maintenance walkthrough.",
    urlBase: "https://www.reddit.com/r/irrigation/comments/1abc101/",
  },
  {
    brand: "hunter",
    source: "youtube",
    context: "DIY Irrigation Channel",
    author: "@gregsgreenlawn",
    title: "Comment on 'Smart Controller Shootout 2026'",
    excerpt:
      "Switched from a Rain Bird to the Hunter Hydrawise last month and the flow sensing alone caught a leak that would've cost me hundreds. Wish I'd done it sooner.",
    signalType: "competitor-frustration",
    sentiment: "positive",
    engagement: 210,
    draftResponse:
      "Love hearing this — flow monitoring catching a leak early is exactly what Hydrawise is built for. Thanks for sharing your experience!",
    urlBase: "https://www.youtube.com/watch?v=hunterhw1&lc=",
  },
  {
    brand: "hunter",
    source: "youtube",
    context: "Irrigation Pros",
    author: "@desert_landscapes",
    title: "Comment on 'How to set up Hunter X-Core'",
    excerpt:
      "Can the X-Core handle a master valve and a pump start relay at the same time? The manual is confusing on this.",
    signalType: "unanswered-question",
    sentiment: "neutral",
    engagement: 33,
    draftResponse:
      "Yes — the X-Core supports a pump start relay / master valve on the dedicated P/MV terminal. Here's a wiring diagram that makes it clearer. Let us know if you'd like a hand!",
    urlBase: "https://www.youtube.com/watch?v=xcore22&lc=",
  },
  {
    brand: "hunter",
    source: "forums",
    context: "LawnSite.com",
    author: "turf_management_pro",
    title: "Switching my install base to Hunter — controller reliability?",
    excerpt:
      "I run a 40-account maintenance route. Thinking of standardizing on Hunter Pro-C / Hydrawise for everything. How's the long-term reliability vs what I'm running now?",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 88,
    draftResponse:
      "For a route your size, standardizing on one platform saves a ton of truck time. The Pro-C is a workhorse and Hydrawise gives you remote diagnostics across all accounts. We have a contractor program that might fit — happy to connect you.",
    urlBase: "https://www.lawnsite.com/threads/hunter-controller-reliability.900",
  },
  {
    brand: "hunter",
    source: "web",
    context: "GardenForum blog",
    author: "homeowner_diy",
    title: "Best sprinkler heads for clay soil?",
    excerpt:
      "After a lot of research I went with Hunter MP Rotators on clay soil to reduce runoff. The matched precipitation rate really does help with pooling.",
    signalType: "content-gap",
    sentiment: "positive",
    engagement: 51,
    draftResponse:
      "Spot on — matched precipitation and the lower application rate of MP Rotators are ideal for clay and slopes. We have a soil-specific nozzle guide that might be a helpful link to add to your post.",
    urlBase: "https://gardenforum.example.com/clay-soil-sprinklers",
  },
  {
    brand: "hunter",
    source: "reddit",
    context: "r/landscaping",
    author: "u/newhome2026",
    title: "Inherited a Hunter system, no idea how to program it",
    excerpt:
      "Bought a house with a Hunter X-Core already installed. Totally lost on programming the zones. Any beginner resources?",
    signalType: "unanswered-question",
    sentiment: "neutral",
    engagement: 47,
    draftResponse:
      "Congrats on the new home! The X-Core is one of the easier ones to learn — here's a 5-minute setup video that covers zones, start times, and run times. Reach out if you get stuck on a specific step.",
    urlBase: "https://www.reddit.com/r/landscaping/comments/1abc102/",
  },
  {
    brand: "hunter",
    source: "reddit",
    context: "r/golf",
    author: "u/super_intendent",
    title: "Course irrigation refresh — Hunter vs Toro central control",
    excerpt:
      "Evaluating a central control overhaul for an 18-hole course. Hunter's reps have been responsive. Anyone running their gear at the course level?",
    signalType: "buying-decision",
    sentiment: "positive",
    engagement: 73,
    urlBase: "https://www.reddit.com/r/golf/comments/1abc103/",
  },

  // ---- FX Luminaire ----
  {
    brand: "fx-luminaire",
    source: "youtube",
    context: "Landscape Lighting Secrets",
    author: "@nightscapes_co",
    title: "Comment on 'Low Voltage Lighting Brands Ranked'",
    excerpt:
      "FX Luminaire with the Luxor controller is on another level for zoning and color. Pricey but the dimming and color tuning win every bid I show it on.",
    signalType: "brand-mention",
    sentiment: "positive",
    engagement: 188,
    draftResponse:
      "Thank you! Luxor's zoning + color tuning is exactly what sets FX apart on high-end installs. If you'd ever like updated spec sheets to include in your bids, just say the word.",
    urlBase: "https://www.youtube.com/watch?v=fxlux9&lc=",
  },
  {
    brand: "fx-luminaire",
    source: "forums",
    context: "Green Industry Pros",
    author: "lighting_designer_tx",
    title: "Luxor ZD vs ZDC — worth the upgrade for color?",
    excerpt:
      "Doing a luxury backyard. Client wants tunable white and some color accents. Is the FX Luminaire Luxor ZDC worth it over the ZD for this?",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 56,
    draftResponse:
      "For tunable white plus color accents, the ZDC is the right call — it adds full color control per zone on top of ZD's dimming. We can share a controller comparison sheet to help justify it to the client.",
    urlBase: "https://www.greenindustrypros.com/forums/luxor-zd-vs-zdc.221",
  },
  {
    brand: "fx-luminaire",
    source: "reddit",
    context: "r/landscaping",
    author: "u/patio_project",
    title: "Are FX Luminaire fixtures worth 3x the box-store price?",
    excerpt:
      "Got a quote with FX Luminaire fixtures and it's way more than the Costco kit. Talk me into or out of it — is the brass and warranty actually worth it?",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 121,
    draftResponse:
      "Totally fair question. The difference is solid brass construction, serviceable LED boards, and a lifetime fixture warranty — they're built to last decades outdoors vs a few seasons. Happy to break down the long-term cost difference.",
    urlBase: "https://www.reddit.com/r/landscaping/comments/1abc104/",
  },
  {
    brand: "fx-luminaire",
    source: "web",
    context: "Houzz discussion",
    author: "design_build_pnw",
    title: "Best path lights that won't corrode near the coast?",
    excerpt:
      "Coastal salt air destroys cheap fixtures. Leaning toward FX Luminaire brass path lights for a beachfront project. Anyone have 5+ year results?",
    signalType: "unanswered-question",
    sentiment: "neutral",
    engagement: 39,
    draftResponse:
      "Coastal installs are exactly where brass earns its keep — FX brass fixtures hold up to salt air far better than aluminum or composite. We have a coastal-spec guide with finish recommendations if helpful.",
    urlBase: "https://www.houzz.com/discussions/coastal-path-lights",
  },
  {
    brand: "fx-luminaire",
    source: "youtube",
    context: "Outdoor Living TV",
    author: "@brightyards",
    title: "Comment on 'Smart Landscape Lighting Setup'",
    excerpt:
      "Tried to integrate FX Luxor with my home automation and it took some doing. Would love an official guide for Control4 integration.",
    signalType: "content-gap",
    sentiment: "neutral",
    engagement: 44,
    draftResponse:
      "Thanks for flagging — Luxor does integrate with Control4 and we have driver documentation that can make this smoother. We'll pass the feedback to the team about a clearer step-by-step guide.",
    urlBase: "https://www.youtube.com/watch?v=fxctrl4&lc=",
  },

  // ---- Lumascape ----
  {
    brand: "lumascape",
    source: "forums",
    context: "Architectural Lighting Forum",
    author: "spec_lighting_eng",
    title: "Lumascape in-grade fixtures for a plaza — thermal ratings?",
    excerpt:
      "Speccing Lumascape in-grade uplights for a public plaza with heavy foot traffic. Need the walk-over temperature ratings and IP/IK specs for the submittal.",
    signalType: "unanswered-question",
    sentiment: "neutral",
    engagement: 31,
    draftResponse:
      "Happy to help with the submittal — Lumascape in-grades carry low walk-over surface temps plus high IP/IK ratings designed for exactly this. We can send the full spec and certification package for your plaza project.",
    urlBase: "https://archlightingforum.example.com/lumascape-inground-specs",
  },
  {
    brand: "lumascape",
    source: "web",
    context: "LinkedIn post",
    author: "Lighting Studio Group",
    title: "Façade lighting case study featuring Lumascape",
    excerpt:
      "Just wrapped a façade lighting project using Lumascape linear grazers — the uniformity and glare control on the stone was exactly what the architect wanted.",
    signalType: "brand-mention",
    sentiment: "positive",
    engagement: 97,
    draftResponse:
      "Beautiful result — glare control and uniformity on stone façades is where the Lumascape optics really shine. Would you be open to us featuring this as a case study with credit to your studio?",
    urlBase: "https://www.linkedin.com/posts/lumascape-facade-case",
  },
  {
    brand: "lumascape",
    source: "forums",
    context: "Green Industry Pros",
    author: "commercial_installer",
    title: "Lumascape vs competitor for a hotel water feature",
    excerpt:
      "Bidding a hotel water feature that needs submersible RGBW. Comparing Lumascape against a competitor — corrosion warranty is my deciding factor.",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 42,
    draftResponse:
      "For submersible RGBW in a hotel feature, warranty and marine-grade materials matter most — Lumascape's underwater line is built for continuous submersion. We can provide the warranty terms and a corrosion-spec comparison.",
    urlBase: "https://www.greenindustrypros.com/forums/lumascape-water-feature.330",
  },
  {
    brand: "lumascape",
    source: "youtube",
    context: "Architecture & Light",
    author: "@urban_glow",
    title: "Comment on 'Lighting Iconic Buildings'",
    excerpt:
      "Lumascape fixtures show up on so many landmark projects but there's almost no DIY-level content explaining their controls. Would watch a deep dive.",
    signalType: "content-gap",
    sentiment: "neutral",
    engagement: 58,
    draftResponse:
      "Appreciate this! You're right that most Lumascape content is spec-level — there's an opportunity for an approachable controls explainer. We'll share this idea with our content team.",
    urlBase: "https://www.youtube.com/watch?v=lumascape7&lc=",
  },

  // ──────────────────────────────────────────────────────────────────────
  // OPPORTUNITIES — competitor-only "open field" threads (brand not named yet).
  // These are the conversations the team should reach first.
  // ──────────────────────────────────────────────────────────────────────
  {
    brand: "hunter",
    source: "reddit",
    context: "r/lawncare",
    author: "u/firsttime_yard",
    title: "Best smart sprinkler controller for 2026? Rachio vs Rain Bird?",
    excerpt:
      "Finally automating my system. Torn between Rachio and Rain Bird — which is more reliable and easier to program? Open to other suggestions too.",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 264,
    brandMentioned: false,
    draftResponse:
      "Both are solid, but it's worth adding the Hunter Hydrawise to your shortlist — it does predictive weather watering plus flow monitoring that catches leaks automatically. Happy to share a side-by-side if it helps you decide.",
    urlBase: "https://www.reddit.com/r/lawncare/comments/1opp200/",
  },
  {
    brand: "hunter",
    source: "reddit",
    context: "r/irrigation",
    author: "u/frustrated_diy",
    title: "Rain Bird controller keeps dropping WiFi — what should I switch to?",
    excerpt:
      "My Rain Bird ESP loses WiFi every few days and I have to reset it. Done with it. What are people switching to that actually stays connected?",
    signalType: "competitor-frustration",
    sentiment: "negative",
    engagement: 173,
    brandMentioned: false,
    draftResponse:
      "That's frustrating. A lot of folks in this spot move to Hunter Hydrawise — the connection is rock-solid and you get leak alerts and remote control from the app. We can point you to an installer or a DIY setup guide if you'd like.",
    urlBase: "https://www.reddit.com/r/irrigation/comments/1opp201/",
  },
  {
    brand: "hunter",
    source: "forums",
    context: "LawnSite.com",
    author: "midwest_irrigation",
    title: "Toro vs Rain Bird rotors — which holds up better on big turf?",
    excerpt:
      "Re-speccing rotors for a few large commercial properties. Toro or Rain Bird? Want something that survives years of abuse without nozzle issues.",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 91,
    brandMentioned: false,
    draftResponse:
      "Worth testing a Hunter I-Series alongside them — the contractors here who run big turf like the gear-drive durability and the radius adjustment without swapping nozzles. We can send spec sheets for a head-to-head.",
    urlBase: "https://www.lawnsite.com/threads/toro-vs-rainbird-rotors.910",
  },
  {
    brand: "fx-luminaire",
    source: "reddit",
    context: "r/landscapelighting",
    author: "u/backyard_glowup",
    title: "Kichler vs VOLT for a backyard — is going 'pro' actually worth it?",
    excerpt:
      "Getting quotes. Kichler and VOLT keep coming up. Is there a meaningful difference, or am I overthinking it for a residential backyard?",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 148,
    brandMentioned: false,
    draftResponse:
      "If you want it to last and look high-end, it's worth looking at FX Luminaire — solid brass, serviceable LED boards, and the Luxor controller lets you zone and dim from your phone. Happy to share examples of residential installs.",
    urlBase: "https://www.reddit.com/r/landscapelighting/comments/1opp202/",
  },
  {
    brand: "fx-luminaire",
    source: "forums",
    context: "Houzz",
    author: "coastal_remodel",
    title: "VOLT landscape lights corroding after 2 years near the coast",
    excerpt:
      "Installed VOLT fixtures two years ago and several are already corroding by the ocean. What brand actually survives salt air long-term?",
    signalType: "competitor-frustration",
    sentiment: "negative",
    engagement: 112,
    brandMentioned: false,
    draftResponse:
      "Coastal salt air is brutal on fixtures. FX Luminaire's solid-brass line is built for exactly this — many coastal installs are still going strong well past the 5-year mark. We have a coastal finish guide we can share.",
    urlBase: "https://www.houzz.com/discussions/volt-corrosion-coastal",
  },
  {
    brand: "lumascape",
    source: "forums",
    context: "Architectural Lighting Forum",
    author: "facade_designer",
    title: "BEGA spec'd but over budget — comparable in-grade alternatives?",
    excerpt:
      "Architect spec'd BEGA in-grades for a civic plaza but we're over budget. Looking for a comparable in-grade fixture with similar IP/IK and walk-over ratings.",
    signalType: "buying-decision",
    sentiment: "neutral",
    engagement: 47,
    brandMentioned: false,
    draftResponse:
      "Lumascape's in-grade range is a strong value alternative here — comparable IP67/IK10 ratings, low walk-over temps, and a competitive lead time. We can put together a BEGA-to-Lumascape equivalency sheet for your submittal.",
    urlBase: "https://archlightingforum.example.com/bega-alternatives-plaza",
  },
  {
    brand: "lumascape",
    source: "web",
    context: "LinkedIn",
    author: "Specifier Network",
    title: "ERCO lead times are painful right now — what are you specifying instead?",
    excerpt:
      "Have a façade project on a tight schedule and ERCO lead times are blowing it up. Curious what comparable architectural exterior brands people are moving to.",
    signalType: "competitor-frustration",
    sentiment: "negative",
    engagement: 68,
    brandMentioned: false,
    draftResponse:
      "Worth a look at Lumascape for exterior façade and grazing — comparable optical control with materially shorter lead times right now. We can get you current availability and photometrics for your specific layout.",
    urlBase: "https://www.linkedin.com/posts/erco-leadtime-alternatives",
  },
];

/** Spread a template across the last ~30 days so the time window looks real. */
function build(): Mention[] {
  const now = Date.now();
  const out: Mention[] = [];
  TEMPLATES.forEach((t, i) => {
    // Deterministic-ish spread: 1–29 days back, varying per template.
    const daysAgo = 1 + ((i * 7 + 3) % 28);
    const published = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const url = `${t.urlBase}${i}`;
    const competitors = detectCompetitors(
      `${t.title} ${t.excerpt}`,
      BRAND_BY_ID[t.brand].competitors,
    );
    out.push({
      id: makeMentionId({ source: t.source, url, excerpt: t.excerpt }),
      brand: t.brand,
      source: t.source,
      title: t.title,
      excerpt: t.excerpt,
      url,
      author: t.author,
      context: t.context,
      publishedAt: published.toISOString(),
      collectedAt: new Date().toISOString(),
      signalType: t.signalType,
      sentiment: t.sentiment,
      engagement: t.engagement,
      competitors: competitors.length ? competitors : undefined,
      brandMentioned: t.brandMentioned ?? true,
      draftResponse: t.draftResponse,
    });
  });
  return out;
}

async function main() {
  const mentions = build();
  await writeStore({
    generatedAt: new Date().toISOString(),
    mode: "demo",
    mentions,
  });
  console.log(`Seeded ${mentions.length} mock mentions to data/mentions.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
