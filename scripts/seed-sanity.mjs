/**
 * Seed Sanity from migrated 2024 content + local fixtures.
 * Reads .env.local (never committed).
 * Usage: node scripts/seed-sanity.mjs
 */
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) {
    throw new Error(".env.local missing");
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

if (!projectId || !token) {
  console.error("Missing projectId or token in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

function readJson(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), "utf8"));
}

function toPortable(text) {
  if (!text) return [];
  return [
    {
      _type: "block",
      _key: "b1",
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: "s1", text, marks: [] }],
    },
  ];
}

function mapGridItems(items) {
  return items.map((item, index) => {
    const { id, ...rest } = item;
    return {
      _type: "gridItem",
      _key: id || `item-${index + 1}`,
      ...rest,
    };
  });
}

const PROJECTS = [
  {
    _id: "project-echos-of-migration",
    title: "Echos of Migration: Where We Go Together",
    slug: "echos-of-migration",
    year: "2024–25",
    projectType: "exhibition",
    collaborators: ["Andrew Julo"],
    venues: [
      "University of Arizona",
      "Universidad de Sonora",
      "Instituto Interamericano de Educación Superior para la Salud",
    ],
    summary:
      "Binational PhotoVoice exhibition exploring wellness, belonging, and resilience through movement and shared space — co-developed with Andrew Julo and nursing students across Arizona and Sonora.",
  },
  {
    _id: "project-teatro-delle-relazioni",
    title: "Teatro delle Relazioni — Theater of Relations",
    slug: "teatro-delle-relazioni",
    year: "2025",
    projectType: "exhibition",
    venues: ["Istituto Europeo di Design, Firenze", "Palazzo Strozzi"],
    summary:
      "Investigates community as belonging and as artistic production — encounter, staged proximity, and shared authorship.",
  },
  {
    _id: "project-spojme-stodulky",
    title: "Spojme Stodůlky — Connecting Stodůlky",
    slug: "spojme-stodulky",
    year: "2023",
    projectType: "other",
    venues: ["Prague — Stodůlky"],
    summary:
      "Community art proposal bridging Czech, Russian, and Ukrainian residents of Prague’s Stodůlky district through shared art experiences.",
  },
  {
    _id: "project-vita-darte",
    title: "Vita d’Arte and Other Works",
    slug: "vita-darte",
    year: "2023",
    projectType: "art",
    venues: ["Saint Louis Art Gallery, Oxford UK"],
    summary:
      "Featured artist in a virtual exhibition presenting selected works from the Vita d’Arte practice.",
  },
  {
    _id: "project-repose-as-resistance",
    title: "Repose as Resistance",
    slug: "repose-as-resistance",
    year: "2023",
    projectType: "other",
    venues: ["Terra Foundation", "The Recovery Plan"],
    summary:
      "Collective born from a Terra Foundation symposium and retreat — designed and coordinated by The Recovery Plan.",
  },
  {
    _id: "project-remaining-bittersweet",
    title: "Remaining Bittersweet",
    slug: "remaining-bittersweet",
    year: "Ongoing",
    projectType: "other",
    summary:
      "Substack essays on trauma-informed curating, resilience, creative recovery, and architectures of care.",
  },
  {
    _id: "project-bittersweet-woman",
    title: "Bittersweet Woman",
    slug: "bittersweet-woman",
    year: "Ongoing",
    projectType: "other",
    summary:
      "Author platform for memoir, poetry, and criticism within a broader ethical and aesthetic framework.",
  },
  {
    _id: "project-dolce-amara",
    title: "[Dolce) + (amara ]",
    slug: "dolce-amara",
    year: "Ongoing",
    projectType: "art",
    summary:
      "Visual art venture by M.J. Smith capturing moments where joy and pain coexist.",
  },
];

const PUBLICATIONS = [
  {
    _id: "publication-vik-muniz-fotocubismo",
    title: "Exhibition Review: Vik Muniz | Fotocubismo",
    slug: "vik-muniz-fotocubismo",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/5/10/exhibition-review-vik-muniz-fotocubismo",
    summary:
      "Cubist reimaginings through collage, photograph, and hand manipulation — blurring the line between the real and the imagined.",
  },
  {
    _id: "publication-gosta-peterson",
    title: "Exhibition Review: Gösta Peterson | Deborah Bell Photographs",
    slug: "gosta-peterson-deborah-bell",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/4/19/exhbition-review-gsta-peterson-deborah-bell-photographs",
    summary:
      "Fashion photographs from the 1960s–70s — Twiggy, Naomi Sims, and a generation of covers.",
  },
  {
    _id: "publication-expo-chicago-2023",
    title: "Exhibition Review: Expo Chicago 2023",
    slug: "expo-chicago-2023",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/4/11/exhibiton-review-expo-chicago-2023",
    summary:
      "Fair notes including Southern Guild’s Cape Town debut and cross-disciplinary programming.",
  },
  {
    _id: "publication-schema-world-as-diagram",
    title: "Schema: World as Diagram",
    slug: "schema-world-as-diagram",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/6/13/schema-world-as-diagram",
    summary:
      "Symbolism, abstraction, and figuration — challenging conventional artistic boundaries through visual synthesis.",
  },
  {
    _id: "publication-azuma-makoto",
    title: "Exhibition Review: Azuma Makoto | Frozen Flowers",
    slug: "azuma-makoto-frozen-flowers",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/3/10/exhibition-review-azuma-makoto-frozen-flowers",
    summary:
      "Botanical arrangements from AMKK studio — floral artistry beyond conventional design.",
  },
  {
    _id: "publication-michal-chelbin",
    title: "Exhibition Review: Michal Chelbin | Sailboats and Swans",
    slug: "michal-chelbin-sailboats-and-swans",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/3/29/exhibition-review-michal-chelbin-sailboats-and-swans",
    summary:
      "Prison portraits over six years — complex gaze and multifaceted images of incarcerated subjects.",
  },
  {
    _id: "publication-kehinde-wiley-havana",
    title: "Exhibition Review: Kehinde Wiley | Havana",
    slug: "kehinde-wiley-havana",
    year: "2023",
    venue: "Musée Magazine",
    url: "https://museemagazine.com/culture/2023/5/9/exhibtion-review-kehinde-wiley",
    summary:
      "Heroic portraiture challenging traditional representations of power and privilege.",
  },
];

const RESEARCH = [
  {
    _id: "research-trauma-informed-archive",
    title: "Research Archive — Qualitative Research & Trauma-Informed Museum Practice",
    slug: "trauma-informed-museum-practice-archive",
    year: "2024",
    researchType: "study",
    institution: "Bittersweet Woman Research",
    url: "https://research.bittersweetwoman.com/",
    summary:
      "Digital archive of field observations, media documentation, academic analysis, and theoretical frameworks on designing spaces for healing and connection.",
  },
  {
    _id: "research-graduate-scholar-award",
    title: "Graduate Student Scholar Award",
    slug: "graduate-student-scholar-award",
    year: "2025",
    researchType: "award",
    institution: "Arizona Women's Hall of Fame",
    summary: "Graduate Student Scholar Award recognizing research and public scholarship.",
  },
  {
    _id: "research-csw-encounter",
    title: "CSW Award — En·coun·ter",
    slug: "csw-award-encounter",
    year: "2026",
    researchType: "award",
    institution: "UA Commission on the Status of Women",
    summary:
      "Award for En·coun·ter: Designing Environments for Psychological Respite and Advocacy.",
  },
];

async function main() {
  const grid = readJson("src/data/homepage-grid.json");
  const site = readJson("src/data/site-settings.json");
  const cv = readJson("src/data/cv.json");

  console.log(`Seeding project ${projectId} / ${dataset}…`);

  const docs = [];

  for (const p of PROJECTS) {
    docs.push({
      _id: p._id,
      _type: "project",
      title: p.title,
      slug: { _type: "slug", current: p.slug },
      summary: p.summary,
      year: p.year,
      projectType: p.projectType,
      collaborators: p.collaborators || [],
      venues: p.venues || [],
      body: toPortable(p.summary),
    });
  }

  for (const pub of PUBLICATIONS) {
    docs.push({
      _id: pub._id,
      _type: "publication",
      title: pub.title,
      slug: { _type: "slug", current: pub.slug },
      summary: pub.summary,
      publicationType: "journalEditorial",
      year: pub.year,
      venue: pub.venue,
      url: pub.url,
      body: toPortable(pub.summary),
    });
  }

  for (const r of RESEARCH) {
    docs.push({
      _id: r._id,
      _type: "researchItem",
      title: r.title,
      slug: { _type: "slug", current: r.slug },
      summary: r.summary,
      researchType: r.researchType,
      year: r.year,
      institution: r.institution,
      url: r.url,
      body: toPortable(r.summary),
    });
  }

  docs.push({
    _id: "homepage",
    _type: "homepage",
    title: "Homepage",
    introMaskText: "Amanda Smith",
    introSupport:
      "Exhibitions, research, and writing — arranged as one connected grid.",
    introVideoUrl: "/media/intro.mp4",
    gridItems: mapGridItems(grid),
  });

  docs.push({
    _id: "siteSettings",
    _type: "siteSettings",
    siteTitle: site.siteTitle,
    nav: site.nav.map((item, i) => ({
      _type: "object",
      _key: `nav-${i + 1}`,
      label: item.label,
      href: item.href,
    })),
    contactEmail: site.contactEmail,
    contactNote: site.contactNote,
  });

  docs.push({
    _id: "cv",
    _type: "cv",
    name: cv.name,
    headline: cv.headline,
    phone: cv.phone,
    email: cv.email,
    location: cv.location,
    relocationNote: cv.relocationNote,
    summary: toPortable(cv.summary),
    expertiseTags: cv.expertiseTags,
    expertiseHighlights: cv.expertiseHighlights.map((h, i) => ({
      _type: "object",
      _key: `eh-${i + 1}`,
      text: h.text,
    })),
    experience: cv.experience.map((e, i) => ({
      _type: "object",
      _key: `ex-${i + 1}`,
      title: e.title,
      org: e.org,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      summary: e.summary,
      bullets: e.bullets,
    })),
    awards: cv.awards.map((a, i) => ({
      _type: "object",
      _key: `aw-${i + 1}`,
      title: a.title,
      org: a.org,
      location: a.location,
      date: a.date,
      description: a.description,
    })),
    speaking: cv.speaking.map((s, i) => ({
      _type: "object",
      _key: `sp-${i + 1}`,
      role: s.role,
      eventTitle: s.eventTitle,
      org: s.org,
      location: s.location,
      date: s.date,
      description: s.description,
    })),
    education: cv.education.map((e, i) => ({
      _type: "object",
      _key: `ed-${i + 1}`,
      credentialType: e.credentialType,
      title: e.title,
      institution: e.institution,
      location: e.location,
      startYear: e.startYear,
      endYear: e.endYear,
      notes: e.notes,
    })),
    technicalSkills: cv.technicalSkills,
    languages: cv.languages.map((l, i) => ({
      _type: "object",
      _key: `lang-${i + 1}`,
      language: l.language,
      level: l.level,
    })),
    publications: cv.publications.map((p, i) => ({
      _type: "object",
      _key: `pub-${i + 1}`,
      title: p.title,
      venue: p.venue,
      date: p.date,
      url: p.url,
    })),
  });

  // Batch commits (Sanity transaction limit ~100 ops)
  const CHUNK = 40;
  let written = 0;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const slice = docs.slice(i, i + CHUNK);
    const tx = client.transaction();
    for (const doc of slice) tx.createOrReplace(doc);
    const result = await tx.commit();
    written += result.results?.length ?? slice.length;
  }

  console.log(
    `Seed OK — ${written} docs written (` +
      `${PROJECTS.length} projects, ${PUBLICATIONS.length} publications, ` +
      `${RESEARCH.length} researchItems, homepage, siteSettings, cv). ` +
      `Homepage gridItems: ${grid.length}.`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exit(1);
});
