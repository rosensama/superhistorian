/**
 * Mock data generator for Super Historian.
 * Produces historically plausible splits at any depth without calling an LLM.
 * Uses a seeded hash of the parent node to produce deterministic but varied results.
 */

import { HistoryNode, SplitByTimeResponse, SplitByGeoResponse, JumpToTopicResponse, EssayResponse } from "./types";

// ----- Deterministic hash for consistent mock results -----
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: readonly T[], hash: number, index: number): T {
  const item = arr[(hash + index * 7) % arr.length];
  if (item === undefined) throw new Error("pick() needs a non-empty array");
  return item;
}

// ----- Rich content banks -----

const TIME_SPLITS: Record<string, SplitByTimeResponse> = {
  "History of Earth": {
    phases: [
      { title: "The Hadean Inferno", start: "4.5 billion years ago", end: "4 billion years ago", summary: "Earth forms from a swirling disk of gas and dust. The surface is molten rock, bombarded by asteroids, and the Moon is born from a colossal impact." },
      { title: "The Archean Dawn", start: "4 billion years ago", end: "2.5 billion years ago", summary: "The first oceans form and the earliest life appears — simple single-celled organisms. The atmosphere is toxic, with no free oxygen." },
      { title: "The Great Oxygenation", start: "2.5 billion years ago", end: "541 million years ago", summary: "Cyanobacteria flood the atmosphere with oxygen, triggering the first mass extinction. Complex cells (eukaryotes) evolve, and the first multicellular life appears." },
      { title: "The Phanerozoic Explosion", start: "541 million years ago", end: "66 million years ago", summary: "The Cambrian Explosion fills the seas with complex animals. Fish, plants, insects, dinosaurs — life conquers land and sea through dramatic rises and catastrophic extinctions." },
      { title: "The Age of Mammals", start: "66 million years ago", end: "Present", summary: "An asteroid wipes out the dinosaurs. Mammals diversify to fill every niche. Primates evolve, and eventually one species — Homo sapiens — begins to reshape the planet." },
    ],
  },
};

// Templates for generating splits at any depth
const PERIOD_ADJECTIVES = ["Early", "High", "Late", "Golden", "Tumultuous", "Flourishing", "Declining", "Revolutionary", "Classical", "Post-"];
const PERIOD_NOUNS = ["Period", "Age", "Era", "Epoch", "Phase", "Chapter", "Dawn", "Twilight", "Renaissance", "Awakening"];
const GEO_REGIONS: Record<string, string[][]> = {
  Global: [
    ["East Asia", "South Asia", "Europe", "Africa", "The Americas"],
    ["The Mediterranean World", "Central Asia & the Silk Road", "Sub-Saharan Africa", "East Asia & Pacific", "The Atlantic World"],
  ],
  Europe: [
    ["The British Isles", "France & the Low Countries", "The Germanic Lands", "The Italian Peninsula", "Iberia"],
    ["Scandinavia & the Baltic", "Eastern Europe & Russia", "The Mediterranean Coast", "Central Europe", "The Balkans & Greece"],
  ],
  "East Asia": [
    ["China", "Japan", "Korea", "Mongolia", "Southeast Asia"],
    ["Northern China", "Southern China", "The Japanese Archipelago", "The Korean Peninsula", "The Steppe Frontier"],
  ],
  "South Asia": [
    ["The Indus Valley", "The Gangetic Plain", "The Deccan Plateau", "Sri Lanka & the Islands", "The Northwest Frontier"],
  ],
  Africa: [
    ["North Africa & the Maghreb", "West Africa", "East Africa & the Horn", "Central Africa", "Southern Africa"],
  ],
  "The Americas": [
    ["Mesoamerica", "The Andes & South America", "North America", "The Caribbean", "The Amazon Basin"],
  ],
};

const SUMMARY_TEMPLATES = [
  "This period saw dramatic transformations in {scope}. Power shifted between rival factions, and new ideas emerged that would reshape society for centuries to come.",
  "A time of great upheaval and creativity in {scope}. Trade routes expanded, cities grew, and cultural exchange accelerated across previously isolated regions.",
  "In {scope}, this era was defined by conflict and innovation. Wars redrew borders while scholars and artisans pushed the boundaries of human achievement.",
  "The people of {scope} experienced profound change during this period. Old institutions crumbled as new ones rose to take their place, often amid great turmoil.",
  "This chapter in the history of {scope} brought both prosperity and crisis. Economic booms were followed by devastating setbacks, yet the era left an indelible mark.",
  "Across {scope}, this was an age of exploration and discovery. New lands were charted, new technologies developed, and the foundations of modern society were laid.",
  "In {scope}, this period witnessed the rise of powerful new movements — political, religious, and cultural — that challenged the existing order and forged a new world.",
  "The history of {scope} during this time is one of remarkable resilience. Despite natural disasters, invasions, and internal strife, civilization not only survived but flourished.",
];

const GEO_SUMMARIES = [
  "{region} was a crucible of civilization during this period. Its unique geography shaped distinct cultural traditions, trade networks, and political structures that influenced the wider world.",
  "In {region}, this era saw the rise and fall of dynasties, the spread of religions, and the flourishing of arts and sciences that would leave a lasting legacy.",
  "The people of {region} navigated complex challenges during this time — from environmental pressures to foreign invasions — while creating remarkable works of art, architecture, and literature.",
  "During this period, {region} was a crossroads of cultures. Merchants, missionaries, and migrants brought new ideas, technologies, and beliefs that transformed local societies.",
  "{region} experienced a golden age of sorts during this era. Agriculture expanded, cities prospered, and intellectual life thrived in courts and universities across the land.",
];

const ESSAY_TEMPLATES = [
  `The story of {title} is one of those chapters in history that reminds us how profoundly the human experience can shift within a remarkably short span of time. Set against the backdrop of {scope} during the period from {start} to {end}, this era shaped the world in ways both visible and invisible, its echoes still reverberating through our modern institutions, cultures, and collective memory.

To understand this period, one must first appreciate the forces that preceded it. The tensions — political, economic, cultural — had been building for generations. When the dam finally broke, it unleashed a torrent of change that swept across {scope} with breathtaking speed. Old certainties dissolved. New possibilities emerged from the wreckage of the familiar.

At the heart of this transformation were ordinary people making extraordinary choices. Farmers left their fields for factory floors or battlefields. Scholars challenged doctrines that had stood for centuries. Women and men whose names history has largely forgotten performed acts of courage, creativity, and defiance that collectively bent the arc of civilization.

The leaders of this era — some visionary, others catastrophically misguided — navigated waters no one had charted before. Their decisions, made in rooms filled with maps and anxiety, determined the fates of millions. Some built enduring institutions. Others left scars that took generations to heal. Most did both.

What makes {title} particularly fascinating is the sheer density of consequential events. Every year of this period seems to contain enough drama, innovation, and tragedy for an entire century. Technologies emerged that would have seemed magical to previous generations. Social structures that had endured for millennia were dismantled and rebuilt, sometimes overnight.

The cultural output of this era was equally remarkable. Artists, writers, and thinkers — driven by the urgency of their times — produced works that still move us today. They captured something essential about the human condition as it existed in that particular moment, under those particular pressures.

Looking back from our vantage point, we can see how {title} was both an ending and a beginning. The world that emerged from this period was fundamentally different from the one that entered it. And we, whether we know it or not, are still living in the world it created.`,

  `When historians speak of {title}, they speak of a period that defies easy categorization. Spanning from {start} to {end} in {scope}, this era was simultaneously one of tremendous achievement and profound suffering, of breathtaking progress and devastating regression. It was, in short, deeply human.

The geography of {scope} played a crucial role in shaping events. Rivers served as highways of commerce and corridors of conquest. Mountains formed natural barriers that protected some communities while isolating others. Coastlines invited exploration and trade, connecting distant peoples in networks of exchange that would eventually girdle the globe.

The economic transformations of this period were seismic. New forms of wealth creation emerged, displacing ancient modes of production and upending social hierarchies that had seemed as permanent as the mountains themselves. Some grew fabulously rich. Many more were ground down by forces they could neither control nor fully comprehend.

Religion and philosophy wrestled with questions that the era's rapid changes made urgently pressing. What did it mean to be human in a world transforming beyond recognition? What obligations did the powerful owe to the powerless? Could ancient wisdom still guide people through unprecedented challenges? Different thinkers arrived at radically different answers.

The military conflicts of {title} were often brutal beyond imagination, yet they also catalyzed innovations that would ultimately benefit humanity — in medicine, engineering, logistics, and communication. War, that most destructive of human activities, paradoxically accelerated the development of technologies and organizational methods that would later serve peaceful purposes.

Perhaps the most enduring legacy of this period lies in the ideas it generated. Concepts of rights, governance, identity, and justice that were forged in the crucible of {title} continue to shape political discourse and social movements around the world today.

The men and women who lived through this era could not have known that they were making history. They were simply trying to survive, to prosper, to find meaning in their brief lives. But in doing so, they created a world — our world — and understanding their story helps us understand ourselves.`,
];

// ----- Generator functions -----

export function mockSplitByTime(node: HistoryNode): SplitByTimeResponse {
  // Check for pre-built responses first
  const prebuilt = TIME_SPLITS[node.title];
  if (prebuilt) return prebuilt;

  const h = simpleHash(node.id + node.title + "time");
  const phases = [];

  // Generate 5 sub-periods
  for (let i = 0; i < 5; i++) {
    const adj = pick(PERIOD_ADJECTIVES, h, i);
    const noun = pick(PERIOD_NOUNS, h, i + 5);
    const summaryTemplate = pick(SUMMARY_TEMPLATES, h, i + 10);
    const title = `${adj} ${node.title.split(" ").slice(0, 2).join(" ")} ${noun}`;
    const summary = summaryTemplate.replace(/\{scope\}/g, node.geographicScope);

    // Create plausible time subdivisions
    const start = i === 0 ? node.timeRange.start : `Phase ${i + 1} start`;
    const end = i === 4 ? node.timeRange.end : `Phase ${i + 1} end`;

    phases.push({ title, start, end, summary });
  }

  return { phases };
}

export function mockSplitByGeo(node: HistoryNode): SplitByGeoResponse {
  const h = simpleHash(node.id + node.title + "geo");

  // Find a matching region set or use defaults
  let regionNames: string[];
  const scopeRegions = GEO_REGIONS[node.geographicScope];
  if (scopeRegions) {
    regionNames = pick(scopeRegions, h, 0);
  } else {
    // Generate plausible sub-regions based on the scope
    regionNames = [
      `Northern ${node.geographicScope}`,
      `Southern ${node.geographicScope}`,
      `Eastern ${node.geographicScope}`,
      `Western ${node.geographicScope}`,
      `Central ${node.geographicScope}`,
    ];
  }

  const regions = regionNames.map((regionName, i) => {
    const template = pick(GEO_SUMMARIES, h, i);
    return {
      regionName,
      summary: template.replace(/\{region\}/g, regionName),
    };
  });

  return { regions };
}

export function mockJumpToTopic(query: string): JumpToTopicResponse {
  const TOPICS: Record<string, JumpToTopicResponse> = {
    "world war": { title: "The Second World War", start: "1939", end: "1945", geographicScope: "Global", summary: "The deadliest conflict in human history, engulfing six continents and reshaping the global order. From the blitzkrieg across Europe to the island-hopping campaigns of the Pacific, the war tested the limits of human endurance and ingenuity. It ended with the dawn of the atomic age and the creation of a new world order." },
    "roman": { title: "The Roman Empire", start: "27 BC", end: "476 AD", geographicScope: "Europe", summary: "From the banks of the Tiber, Rome grew into the greatest empire the Western world had ever seen. Its legions, roads, laws, and language shaped European civilization for millennia. The Pax Romana brought unprecedented peace and prosperity, while its eventual fall ushered in a new era of European history." },
    "renaissance": { title: "The Renaissance", start: "1350", end: "1600", geographicScope: "Europe", summary: "A cultural rebirth that began in the Italian city-states and spread across Europe. Artists like Leonardo and Michelangelo transformed visual culture, while thinkers like Erasmus and Machiavelli reshaped philosophy and politics. The Renaissance laid the groundwork for the modern world." },
    "industrial": { title: "The Industrial Revolution", start: "1760", end: "1840", geographicScope: "Europe", summary: "Beginning in Britain's textile mills and spreading across Europe and North America, the Industrial Revolution fundamentally transformed how humans live and work. Steam power, mechanized factories, and new transportation networks created unprecedented wealth — and unprecedented inequality." },
    "ancient egypt": { title: "Ancient Egypt", start: "3100 BC", end: "30 BC", geographicScope: "North Africa", summary: "For three thousand years, the civilization of the Nile produced some of humanity's most enduring achievements. The pyramids, hieroglyphics, and pharaonic state were marvels of organization and ambition. Egypt's influence on subsequent Mediterranean civilizations cannot be overstated." },
    "silk road": { title: "The Silk Road", start: "130 BC", end: "1453 AD", geographicScope: "Central Asia", summary: "The vast network of trade routes connecting East and West facilitated the exchange of goods, ideas, religions, and diseases across thousands of miles. Silk, spices, paper, and gunpowder traveled these routes, transforming every civilization they touched." },
  };

  const lowerQuery = query.toLowerCase();
  for (const [key, value] of Object.entries(TOPICS)) {
    if (lowerQuery.includes(key)) return value;
  }

  // Default: generate something from the query
  return {
    title: query.charAt(0).toUpperCase() + query.slice(1),
    start: "Ancient times",
    end: "Present",
    geographicScope: "Global",
    summary: `The history of ${query} spans centuries of human endeavor. From its earliest origins to its modern manifestations, this topic has shaped cultures, economies, and societies across the globe. Understanding its evolution reveals fundamental truths about the human experience.`,
  };
}

export function mockEssay(node: HistoryNode): EssayResponse {
  const h = simpleHash(node.id + "essay");
  const template = pick(ESSAY_TEMPLATES, h, 0);
  const essay = template
    .replace(/\{title\}/g, node.title)
    .replace(/\{scope\}/g, node.geographicScope)
    .replace(/\{start\}/g, node.timeRange.start)
    .replace(/\{end\}/g, node.timeRange.end);
  return { essay };
}
