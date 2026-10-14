import type { GridItem } from "@/types/grid";

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteSettings {
  source: "fixture" | "sanity";
  siteTitle: string;
  nav: NavItem[];
  contactEmail?: string;
  contactNote?: string;
}

export interface HomepageContent {
  source: "fixture" | "sanity";
  maskText: string;
  support: string;
  videoSrc: string;
  posterSrc?: string;
  /** Still used when video is empty (image-only cover). */
  imageSrc?: string;
  /** Optional “watch full video” link on the cover. */
  watchUrl?: string;
  gridItems: GridItem[];
}

export interface CvHighlight {
  text: string;
}

export interface CvExperience {
  title: string;
  org: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  summary?: string;
  bullets?: string[];
}

export interface CvAward {
  title: string;
  org: string;
  location?: string;
  date?: string;
  description?: string;
}

export interface CvSpeaking {
  role?: string;
  eventTitle: string;
  org?: string;
  location?: string;
  date?: string;
  description?: string;
}

export interface CvEducation {
  credentialType?: string;
  title: string;
  institution: string;
  location?: string;
  startYear?: string;
  endYear?: string;
  notes?: string;
}

export interface CvLanguage {
  language: string;
  level: string;
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
  headline: string;
  phone?: string;
  email?: string;
  location?: string;
  relocationNote?: string;
  summary?: string;
  expertiseTags: string[];
  expertiseHighlights: CvHighlight[];
  experience: CvExperience[];
  awards: CvAward[];
  speaking: CvSpeaking[];
  education: CvEducation[];
  technicalSkills: string[];
  languages: CvLanguage[];
  publications: CvPublication[];
}
