import type { LocaleString } from "@/lib/i18n/resolve";
import type { UiCopyDoc } from "@/lib/i18n/ui-copy";
import type { CellTextSize, GridItem } from "@/types/grid";

export interface NavItem {
  label: LocaleString;
  href: string;
}

export interface SiteSettings {
  source: "fixture" | "sanity";
  siteTitle: LocaleString;
  nav: NavItem[];
  /** Optional CSS color for nav brand + links. Empty → ink default. */
  navTextColor?: string;
  /** Optional size for nav brand + links. Empty/md → current look. */
  navTextSize?: CellTextSize;
  contactEmail?: string;
  contactNote?: LocaleString;
}

export interface HomepageContent {
  source: "fixture" | "sanity";
  maskText: LocaleString;
  support: LocaleString;
  videoSrc: string;
  posterSrc?: string;
  /** Still used when video is empty (image-only cover). */
  imageSrc?: string;
  /** Optional “watch full video” link on the cover. */
  watchUrl?: string;
  /** Hero stamp hover tip (empty → IntroMask default). */
  stampHint?: LocaleString;
  /** Cover name outline color (homepageHero.titleTextColor). */
  titleTextColor?: string;
  /** Cover name size in px (homepageHero.titleTextSize). */
  titleTextSize?: number;
  /** Quote above name color (homepageHero.supportTextColor). */
  supportTextColor?: string;
  /** Quote size in px (homepageHero.supportTextSize). */
  supportTextSize?: number;
  /** Tagline under nav / above grid (from homepageHero.subtext). */
  subtext?: LocaleString;
  subtextTextColor?: string;
  subtextTextSize?: CellTextSize;
  gridItems: GridItem[];
  /** Optional Sanity-overridden chrome strings. */
  uiCopy?: UiCopyDoc;
}

export interface CvHighlight {
  text: LocaleString;
}

export interface CvExperience {
  title: LocaleString;
  org: string;
  location?: LocaleString;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  summary?: LocaleString;
  bullets?: LocaleString[];
}

export interface CvAward {
  title: LocaleString;
  org: string;
  location?: LocaleString;
  date?: string;
  description?: LocaleString;
}

export interface CvSpeaking {
  role?: string;
  eventTitle: LocaleString;
  org?: string;
  location?: LocaleString;
  date?: string;
  description?: LocaleString;
}

export interface CvEducation {
  credentialType?: string;
  title: LocaleString;
  institution: string;
  location?: LocaleString;
  startYear?: string;
  endYear?: string;
  notes?: LocaleString;
}

export interface CvLanguage {
  language: LocaleString;
  level: LocaleString;
}

export interface CvPublication {
  title: string;
  venue?: string;
  date?: string;
  url?: string;
}

export interface CvData {
  source: "fixture" | "sanity";
  name: string;
  headline: LocaleString;
  phone?: string;
  email?: string;
  location?: LocaleString;
  relocationNote?: LocaleString;
  summary?: LocaleString;
  expertiseTags: LocaleString[];
  expertiseHighlights: CvHighlight[];
  experience: CvExperience[];
  awards: CvAward[];
  speaking: CvSpeaking[];
  education: CvEducation[];
  technicalSkills: LocaleString[];
  languages: CvLanguage[];
  publications: CvPublication[];
  uiCopy?: UiCopyDoc;
}
