/**
 * Seed Sanity from local fixtures. Reads .env.local (never committed).
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

async function main() {
  const grid = readJson("src/data/homepage-grid.json");
  const site = readJson("src/data/site-settings.json");
  const cv = readJson("src/data/cv.json");

  console.log(`Seeding project ${projectId} / ${dataset}…`);

  const projectDoc = {
    _id: "project-echos-of-migration",
    _type: "project",
    title: "Echos of Migration",
    slug: { _type: "slug", current: "echos-of-migration" },
    summary:
      "Exhibition research mapping displacement, memory, and relational space.",
    year: "2024",
    projectType: "exhibition",
    body: toPortable(
      "Exhibition research mapping displacement, memory, and relational space.",
    ),
  };

  const publicationDoc = {
    _id: "publication-schema-world-as-diagram",
    _type: "publication",
    title: "Schema: World as Diagram",
    slug: { _type: "slug", current: "schema-world-as-diagram" },
    summary: "Exhibition review — Musée Magazine.",
    publicationType: "journalEditorial",
    year: "2023",
    venue: "Musée Magazine",
    body: toPortable("Exhibition review published in Musée Magazine."),
  };

  const researchDoc = {
    _id: "research-trauma-informed-practice",
    _type: "researchItem",
    title: "Trauma-informed qualitative practice",
    slug: { _type: "slug", current: "trauma-informed-qualitative-practice" },
    summary: "Awards, grants, and presentations — research strand.",
    researchType: "study",
    year: "2025",
    institution: "University of Arizona",
    body: toPortable(
      "Research strand covering awards, grants, and presentations.",
    ),
  };

  const homepageDoc = {
    _id: "homepage",
    _type: "homepage",
    title: "Homepage",
    introMaskText: "Amanda Smith",
    introSupport:
      "Exhibitions, research, and writing — arranged as one connected grid.",
    introVideoUrl: "/media/intro.mp4",
    gridItems: mapGridItems(grid),
  };

  const siteSettingsDoc = {
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
  };

  const cvDoc = {
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
  };

  const tx = client.transaction();
  for (const doc of [
    projectDoc,
    publicationDoc,
    researchDoc,
    homepageDoc,
    siteSettingsDoc,
    cvDoc,
  ]) {
    tx.createOrReplace(doc);
  }

  const result = await tx.commit();
  console.log(
    `Seed OK — ${result.results?.length ?? 6} docs written (homepage, siteSettings, cv, sample project/publication/research).`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exit(1);
});
