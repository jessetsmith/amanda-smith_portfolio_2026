import {
  definitionMark,
  gridItem,
  portableBody,
} from "./objects";
import { localeString, localeText } from "./locale";
import { project } from "./project";
import { publication } from "./publication";
import { researchItem } from "./researchItem";
import { cv } from "./cv";
import { homepage } from "./homepage";
import { homepageHero } from "./homepageHero";
import { siteSettings } from "./siteSettings";
import { uiCopy } from "./uiCopy";
import { adminAuth } from "./adminAuth";

export const schemaTypes = [
  localeString,
  localeText,
  definitionMark,
  portableBody,
  gridItem,
  project,
  publication,
  researchItem,
  cv,
  homepage,
  homepageHero,
  siteSettings,
  uiCopy,
  adminAuth,
];
