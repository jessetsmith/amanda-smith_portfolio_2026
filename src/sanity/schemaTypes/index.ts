import {
  definitionMark,
  gridItem,
  portableBody,
} from "./objects";
import { project } from "./project";
import { publication } from "./publication";
import { researchItem } from "./researchItem";
import { cv } from "./cv";
import { homepage } from "./homepage";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [
  definitionMark,
  portableBody,
  gridItem,
  project,
  publication,
  researchItem,
  cv,
  homepage,
  siteSettings,
];
