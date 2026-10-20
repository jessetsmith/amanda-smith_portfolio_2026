import { defineField, defineType } from "sanity";

const STRING_FIELDS = [
  { name: "open", title: "Grid “Open” cue" },
  { name: "lead", title: "Featured “Highlight” mark" },
  { name: "watchFullVideo", title: "Watch full video" },
  { name: "soundOn", title: "Sound on" },
  { name: "soundOff", title: "Sound off" },
  { name: "muteCover", title: "Mute cover (aria)" },
  { name: "unmuteCover", title: "Unmute cover (aria)" },
  { name: "cvEyebrow", title: "CV eyebrow" },
  { name: "cvExpertise", title: "CV · Key expertise" },
  { name: "cvExperience", title: "CV · Experience" },
  { name: "cvAwards", title: "CV · Awards" },
  { name: "cvSpeaking", title: "CV · Speaking" },
  { name: "cvEducation", title: "CV · Education" },
  { name: "cvSkills", title: "CV · Skills" },
  { name: "cvPublications", title: "CV · Publications" },
  { name: "backToPortfolio", title: "Back to portfolio" },
  { name: "present", title: "Date range · Present" },
  { name: "language", title: "Language control label" },
  { name: "primaryNav", title: "Primary nav aria label" },
  { name: "image", title: "Image placeholder label" },
  { name: "media", title: "Media fallback label" },
  { name: "project", title: "Project fallback meta" },
  { name: "colorCell", title: "Color cell sr-only" },
] as const;

/**
 * Site chrome strings (nav-adjacent UI, CV section titles, cover controls).
 * Edit with the language dropdown on each localeString / localeText field.
 */
export const uiCopy = defineType({
  name: "uiCopy",
  title: "UI copy (translations)",
  type: "document",
  fields: [
    defineField({
      name: "gridIntro",
      title: "Homepage grid intro blurb",
      type: "localeText",
    }),
    ...STRING_FIELDS.map((field) =>
      defineField({
        name: field.name,
        title: field.title,
        type: "localeString",
      }),
    ),
  ],
  preview: {
    prepare() {
      return {
        title: "UI copy",
        subtitle: "EN · ES · IT · PT · FR · DE chrome strings",
      };
    },
  },
});
