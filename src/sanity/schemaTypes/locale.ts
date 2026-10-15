import { defineField, defineType } from "sanity";
import { LocaleStringInput } from "@/sanity/components/LocaleStringInput";

const LOCALE_FIELDS = [
  { name: "en", title: "English" },
  { name: "es", title: "Español" },
  { name: "it", title: "Italiano" },
  { name: "pt", title: "Português" },
  { name: "fr", title: "Français" },
  { name: "de", title: "Deutsch" },
] as const;

export const localeString = defineType({
  name: "localeString",
  title: "Localized string",
  type: "object",
  components: { input: LocaleStringInput },
  fields: LOCALE_FIELDS.map((locale) =>
    defineField({
      name: locale.name,
      title: locale.title,
      type: "string",
    }),
  ),
});

export const localeText = defineType({
  name: "localeText",
  title: "Localized text",
  type: "object",
  components: { input: LocaleStringInput },
  fields: LOCALE_FIELDS.map((locale) =>
    defineField({
      name: locale.name,
      title: locale.title,
      type: "text",
      rows: 4,
    }),
  ),
});
