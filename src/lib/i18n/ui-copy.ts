import type { LocaleCode } from "@/lib/i18n/locales";
import type { LocaleString } from "@/lib/i18n/resolve";
import { resolveLocale, toLocaleMap } from "@/lib/i18n/resolve";

/** Public UI chrome + short page strings (also seeded into Sanity `uiCopy`). */
export const UI_COPY = {
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
} as const satisfies Record<string, Record<LocaleCode, string>>;

export type UiCopyKey = keyof typeof UI_COPY;

export type UiCopyDoc = Partial<Record<UiCopyKey, LocaleString>>;

export function resolveUiCopy(
  key: UiCopyKey,
  locale: LocaleCode,
  overlay?: UiCopyDoc | null,
): string {
  const fromDoc = overlay?.[key];
  if (fromDoc != null) {
    const resolved = resolveLocale(fromDoc, locale);
    if (resolved) return resolved;
  }
  return UI_COPY[key][locale] || UI_COPY[key].en;
}

export function defaultUiCopyDoc(): Record<UiCopyKey, LocaleString> {
  const out = {} as Record<UiCopyKey, LocaleString>;
  for (const key of Object.keys(UI_COPY) as UiCopyKey[]) {
    out[key] = { ...UI_COPY[key] };
  }
  return out;
}

export function mergeUiCopyDoc(raw: unknown): UiCopyDoc {
  if (!raw || typeof raw !== "object") return defaultUiCopyDoc();
  const doc = raw as Record<string, unknown>;
  const out: UiCopyDoc = {};
  for (const key of Object.keys(UI_COPY) as UiCopyKey[]) {
    out[key] = toLocaleMap(doc[key], UI_COPY[key].en);
  }
  return out;
}
