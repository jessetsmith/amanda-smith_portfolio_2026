/**
 * Seed / patch Sanity locale fields from authored translations
 * (src/data/i18n/translations.json) + UI chrome defaults.
 * Usage: node scripts/seed-i18n.mjs
 */
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) throw new Error(".env.local missing");
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const LOCALES = ["en", "es", "it", "pt", "fr", "de"];

function asLocale(value, fallbackEn = "") {
  if (typeof value === "string" && value.trim()) {
    return { en: value.trim() };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out = {};
    for (const code of LOCALES) {
      if (typeof value[code] === "string" && value[code].trim()) {
        out[code] = value[code].trim();
      }
    }
    if (!out.en && fallbackEn) out.en = fallbackEn;
    return out;
  }
  return fallbackEn ? { en: fallbackEn } : {};
}

function mergeLocale(base, overlay) {
  return { ...asLocale(base), ...asLocale(overlay) };
}

const UI_COPY = {
  open: {
    en: "Open",
    es: "Abrir",
    it: "Apri",
    pt: "Abrir",
    fr: "Ouvrir",
    de: "Öffnen",
  },
  lead: {
    en: "Lead",
    es: "Destacado",
    it: "In evidenza",
    pt: "Destaque",
    fr: "À la une",
    de: "Lead",
  },
  watchFullVideo: {
    en: "Watch full video",
    es: "Ver vídeo completo",
    it: "Guarda il video completo",
    pt: "Ver vídeo completo",
    fr: "Voir la vidéo complète",
    de: "Ganzes Video ansehen",
  },
  soundOn: {
    en: "Sound on",
    es: "Sonido activado",
    it: "Audio attivo",
    pt: "Som ligado",
    fr: "Son activé",
    de: "Ton an",
  },
  soundOff: {
    en: "Sound off",
    es: "Sonido desactivado",
    it: "Audio disattivato",
    pt: "Som desligado",
    fr: "Son coupé",
    de: "Ton aus",
  },
  muteCover: {
    en: "Mute cover video",
    es: "Silenciar vídeo de portada",
    it: "Disattiva audio del video di copertina",
    pt: "Silenciar vídeo de capa",
    fr: "Couper le son de la vidéo de couverture",
    de: "Cover-Video stummschalten",
  },
  unmuteCover: {
    en: "Unmute cover video",
    es: "Activar sonido del vídeo de portada",
    it: "Attiva audio del video di copertina",
    pt: "Ativar som do vídeo de capa",
    fr: "Activer le son de la vidéo de couverture",
    de: "Cover-Video Ton einschalten",
  },
  gridIntro: {
    en: "An archival modernism practice shaped by relational space and trauma-informed research across exhibitions and writing.",
    es: "Una práctica de modernismo de archivo marcada por el espacio relacional y la investigación sensible al trauma, a través de exposiciones y escritura.",
    it: "Una pratica di modernismo d’archivio plasmata dallo spazio relazionale e dalla ricerca trauma-informed tra mostre e scrittura.",
    pt: "Uma prática de modernismo de arquivo moldada pelo espaço relacional e pela pesquisa sensível ao trauma, entre exposições e escrita.",
    fr: "Une pratique de modernisme d’archives façonnée par l’espace relationnel et une recherche attentive au trauma, entre expositions et écriture.",
    de: "Eine archivalisch-modernistische Praxis, geprägt von relationalem Raum und traumainformierter Forschung in Ausstellungen und Schreiben.",
  },
  cvEyebrow: {
    en: "Curriculum vitae",
    es: "Curriculum vitae",
    it: "Curriculum vitae",
    pt: "Curriculum vitae",
    fr: "Curriculum vitae",
    de: "Lebenslauf",
  },
  cvExpertise: {
    en: "Key expertise",
    es: "Experiencia clave",
    it: "Competenze chiave",
    pt: "Competências-chave",
    fr: "Expertises clés",
    de: "Schwerpunkte",
  },
  cvExperience: {
    en: "Experience",
    es: "Experiencia",
    it: "Esperienza",
    pt: "Experiência",
    fr: "Expérience",
    de: "Erfahrung",
  },
  cvAwards: {
    en: "Awards",
    es: "Premios",
    it: "Premi",
    pt: "Prémios",
    fr: "Distinctions",
    de: "Auszeichnungen",
  },
  cvSpeaking: {
    en: "Speaking",
    es: "Ponencias",
    it: "Interventi",
    pt: "Palestras",
    fr: "Interventions",
    de: "Vorträge",
  },
  cvEducation: {
    en: "Education",
    es: "Formación",
    it: "Formazione",
    pt: "Formação",
    fr: "Formation",
    de: "Ausbildung",
  },
  cvSkills: {
    en: "Skills",
    es: "Habilidades",
    it: "Competenze",
    pt: "Competências",
    fr: "Compétences",
    de: "Kenntnisse",
  },
  cvPublications: {
    en: "Publications",
    es: "Publicaciones",
    it: "Pubblicazioni",
    pt: "Publicações",
    fr: "Publications",
    de: "Publikationen",
  },
  backToPortfolio: {
    en: "← Back to portfolio",
    es: "← Volver al portafolio",
    it: "← Torna al portfolio",
    pt: "← Voltar ao portefólio",
    fr: "← Retour au portfolio",
    de: "← Zurück zum Portfolio",
  },
  present: {
    en: "Present",
    es: "Actualidad",
    it: "Attuale",
    pt: "Atualidade",
    fr: "Présent",
    de: "Heute",
  },
  language: {
    en: "Language",
    es: "Idioma",
    it: "Lingua",
    pt: "Idioma",
    fr: "Langue",
    de: "Sprache",
  },
  primaryNav: {
    en: "Primary",
    es: "Principal",
    it: "Principale",
    pt: "Principal",
    fr: "Principale",
    de: "Hauptnavigation",
  },
  image: {
    en: "Image",
    es: "Imagen",
    it: "Immagine",
    pt: "Imagem",
    fr: "Image",
    de: "Bild",
  },
  media: {
    en: "Media",
    es: "Medios",
    it: "Media",
    pt: "Média",
    fr: "Médias",
    de: "Medien",
  },
  project: {
    en: "Project",
    es: "Proyecto",
    it: "Progetto",
    pt: "Projeto",
    fr: "Projet",
    de: "Projekt",
  },
  colorCell: {
    en: "Color cell",
    es: "Celda de color",
    it: "Cella colore",
    pt: "Célula de cor",
    fr: "Cellule couleur",
    de: "Farbzelle",
  },
};

const TEXT_FIELDS = [
  "label",
  "meta",
  "headline",
  "title",
  "subtitle",
  "excerpt",
  "summary",
  "caption",
  "description",
  "imageAlt",
];

async function main() {
  const translations = readJson("src/data/i18n/translations.json");
  const heroSeed = readJson("src/data/homepage-hero.json");
  const siteSeed = readJson("src/data/site-settings.json");
  const cvSeed = readJson("src/data/cv.json");

  console.log(`Seeding i18n into ${projectId}/${dataset}…`);

  // —— uiCopy ——
  await client.createOrReplace({
    _id: "uiCopy",
    _type: "uiCopy",
    ...UI_COPY,
  });
  console.log("uiCopy ✓");

  // —— homepageHero ——
  const existingHero = await client.fetch(
    `*[_type == "homepageHero" && _id == "homepageHero"][0]`,
  );
  const heroBase = existingHero || {
    _id: "homepageHero",
    _type: "homepageHero",
    videoUrl: heroSeed.videoUrl,
    watchUrl: heroSeed.watchUrl || undefined,
    posterUrl: heroSeed.posterUrl || undefined,
    imageUrl: heroSeed.imageUrl || undefined,
  };
  await client.createOrReplace({
    ...heroBase,
    _id: "homepageHero",
    _type: "homepageHero",
    titleText: mergeLocale(
      heroBase.titleText || heroSeed.titleText,
      translations.hero.titleText,
    ),
    supportText: mergeLocale(
      heroBase.supportText || heroSeed.supportText,
      translations.hero.supportText,
    ),
    stampHint: mergeLocale(
      heroBase.stampHint || heroSeed.stampHint,
      translations.hero.stampHint,
    ),
  });
  console.log("homepageHero ✓");

  // —— siteSettings ——
  const existingSite = await client.fetch(
    `*[_type == "siteSettings" && _id == "siteSettings"][0]`,
  );
  const navOverlay = translations.site.nav;
  const navSource = existingSite?.nav?.length ? existingSite.nav : siteSeed.nav;
  const nav = navSource.map((item, i) => {
    const overlay = navOverlay.find((n) => n.href === item.href) || navOverlay[i];
    return {
      _type: "object",
      _key: item._key || `nav-${i + 1}`,
      href: item.href,
      label: mergeLocale(item.label, overlay?.label),
    };
  });
  await client.createOrReplace({
    ...(existingSite || {}),
    _id: "siteSettings",
    _type: "siteSettings",
    siteTitle: mergeLocale(
      existingSite?.siteTitle || siteSeed.siteTitle,
      translations.site.siteTitle,
    ),
    nav,
    contactEmail: existingSite?.contactEmail || siteSeed.contactEmail,
    contactNote: mergeLocale(
      existingSite?.contactNote || siteSeed.contactNote,
      translations.site.contactNote,
    ),
  });
  console.log("siteSettings ✓");

  // —— homepage gridItems ——
  const homepage = await client.fetch(
    `*[_type == "homepage" && _id == "homepage"][0]{..., gridItems}`,
  );
  if (homepage?.gridItems?.length) {
    const gridItems = homepage.gridItems.map((item) => {
      const id = item.id || item._key;
      const overlay = translations.grid[id] || {};
      const next = { ...item };
      for (const field of TEXT_FIELDS) {
        if (item[field] != null || overlay[field]) {
          next[field] = mergeLocale(item[field], overlay[field]);
        }
      }
      return next;
    });
    await client.patch("homepage").set({ gridItems }).commit();
    console.log(`homepage gridItems ✓ (${gridItems.length})`);
  } else {
    console.warn("homepage gridItems missing — run sanity:seed first");
  }

  // —— CV (header + summary; body titles keep EN until Studio edit) ——
  const existingCv = await client.fetch(
    `*[_type == "cv" && _id == "cv"][0]`,
  );
  const cvBase = existingCv || { ...cvSeed, _id: "cv", _type: "cv" };
  await client.createOrReplace({
    ...cvBase,
    _id: "cv",
    _type: "cv",
    headline: mergeLocale(cvBase.headline || cvSeed.headline, translations.cv.headline),
    location: mergeLocale(cvBase.location || cvSeed.location, translations.cv.location),
    relocationNote: mergeLocale(
      cvBase.relocationNote || cvSeed.relocationNote,
      translations.cv.relocationNote,
    ),
    summary: mergeLocale(
      typeof cvBase.summary === "string" || cvBase.summary?.en
        ? cvBase.summary
        : cvSeed.summary,
      translations.cv.summary,
    ),
    expertiseTags: (cvBase.expertiseTags || cvSeed.expertiseTags || []).map(
      (tag) => asLocale(tag),
    ),
    expertiseHighlights: (
      cvBase.expertiseHighlights || cvSeed.expertiseHighlights || []
    ).map((h, i) => ({
      _type: "object",
      _key: h._key || `eh-${i + 1}`,
      text: asLocale(h.text || h),
    })),
    experience: (cvBase.experience || cvSeed.experience || []).map((e, i) => ({
      ...e,
      _type: "object",
      _key: e._key || `ex-${i + 1}`,
      title: asLocale(e.title),
      location: e.location ? asLocale(e.location) : undefined,
      summary: e.summary ? asLocale(e.summary) : undefined,
      bullets: Array.isArray(e.bullets)
        ? e.bullets.map((b) => asLocale(b))
        : undefined,
    })),
    awards: (cvBase.awards || cvSeed.awards || []).map((a, i) => ({
      ...a,
      _type: "object",
      _key: a._key || `aw-${i + 1}`,
      title: asLocale(a.title),
      location: a.location ? asLocale(a.location) : undefined,
      description: a.description ? asLocale(a.description) : undefined,
    })),
    speaking: (cvBase.speaking || cvSeed.speaking || []).map((s, i) => ({
      ...s,
      _type: "object",
      _key: s._key || `sp-${i + 1}`,
      eventTitle: asLocale(s.eventTitle),
      location: s.location ? asLocale(s.location) : undefined,
      description: s.description ? asLocale(s.description) : undefined,
    })),
    education: (cvBase.education || cvSeed.education || []).map((e, i) => ({
      ...e,
      _type: "object",
      _key: e._key || `ed-${i + 1}`,
      title: asLocale(e.title),
      location: e.location ? asLocale(e.location) : undefined,
      notes: e.notes ? asLocale(e.notes) : undefined,
    })),
    technicalSkills: (cvBase.technicalSkills || cvSeed.technicalSkills || []).map(
      (t) => asLocale(t),
    ),
    languages: (cvBase.languages || cvSeed.languages || []).map((l, i) => ({
      _type: "object",
      _key: l._key || `lang-${i + 1}`,
      language: asLocale(l.language),
      level: asLocale(l.level),
    })),
  });
  console.log("cv ✓");

  console.log("i18n seed complete.");
}

main().catch((err) => {
  console.error("i18n seed failed:", err.message || err);
  process.exit(1);
});
