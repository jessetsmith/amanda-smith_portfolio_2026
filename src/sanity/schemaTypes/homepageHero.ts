import { defineField, defineType } from "sanity";

/**
 * Singleton cover / IntroMask content — kept separate from homepage.gridItems
 * so hero copy + media are a clear CMS category.
 * Localized fields use localeString/localeText (Studio language dropdown).
 */
export const homepageHero = defineType({
  name: "homepageHero",
  title: "Homepage hero",
  type: "document",
  fields: [
    defineField({
      name: "titleText",
      type: "localeString",
      title: "Hero title",
      description: "Large cover name (e.g. Amanda Smith)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "supportText",
      type: "localeText",
      title: "Support line / quote",
      description: "Quote above the cover name",
    }),
    defineField({
      name: "titleTextColor",
      type: "string",
      title: "Title text color",
      description:
        "Outline/stroke color for the cover name. Empty = soft paper stroke (current look).",
    }),
    defineField({
      name: "titleTextSize",
      type: "number",
      title: "Title text size (px)",
      description:
        "Cover name size in pixels (12–144 ladder). Empty = responsive clamp.",
      options: {
        list: [
          12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128,
          144,
        ].map((n) => ({ title: `${n}px`, value: n })),
      },
    }),
    defineField({
      name: "supportTextColor",
      type: "string",
      title: "Quote text color",
      description: "Color for the quote above the name. Empty = ink.",
    }),
    defineField({
      name: "supportTextSize",
      type: "number",
      title: "Quote text size (px)",
      description:
        "Quote size in pixels (12–144 ladder). Empty ≈ 16–17px default.",
      options: {
        list: [
          12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128,
          144,
        ].map((n) => ({ title: `${n}px`, value: n })),
      },
    }),
    defineField({
      name: "videoUrl",
      type: "string",
      title: "Background video URL",
      description:
        "Absolute CDN URL, site path, or YouTube link. Prefer Mux/CDN for large files.",
    }),
    defineField({
      name: "poster",
      type: "image",
      title: "Video poster",
      description:
        "Still shown while the video loads / on failure. Prefer this Sanity asset so GitHub Pages can load cdn.sanity.io URLs.",
      options: { hotspot: true },
    }),
    defineField({
      name: "backgroundImage",
      type: "image",
      title: "Background image",
      description:
        "Still cover when there is no video, or alternate poster. Sanity asset preferred for production.",
      options: { hotspot: true },
    }),
    defineField({
      name: "posterUrl",
      type: "url",
      title: "Video poster URL (override)",
      description:
        "Optional absolute URL fallback. Ignored when a Poster image asset is set. Do not use local /media/uploads paths for production.",
      validation: (Rule) =>
        Rule.uri({ allowRelative: true, scheme: ["http", "https"] }),
    }),
    defineField({
      name: "imageUrl",
      type: "url",
      title: "Background image URL (override)",
      description:
        "Optional absolute URL fallback. Ignored when a Background image asset is set.",
      validation: (Rule) =>
        Rule.uri({ allowRelative: true, scheme: ["http", "https"] }),
    }),
    defineField({
      name: "watchUrl",
      type: "url",
      title: "Watch full video URL",
      description:
        "Optional link shown on the cover (“Watch full video”) — opens in a new tab. YouTube, Vimeo, or any absolute URL.",
      validation: (Rule) =>
        Rule.uri({
          allowRelative: true,
          scheme: ["http", "https"],
        }),
    }),
    defineField({
      name: "stampHint",
      type: "localeString",
      title: "Handprint stamp tip",
      description:
        "Shown on first hover over the public cover (“click to leave your mark”). Clears after the first stamp. Leave empty to use the default copy.",
    }),
    defineField({
      name: "subtext",
      type: "localeText",
      title: "Grid intro subtext",
      description:
        "Tagline under the nav / above the homepage grid. Phrases that match site definitions keep hover underlines. Blank allowed.",
    }),
    defineField({
      name: "subtextTextColor",
      type: "string",
      title: "Subtext text color",
      description:
        "Optional CSS color for the grid intro subtext (e.g. #1a1a1a). Empty = soft ink (current look).",
    }),
    defineField({
      name: "subtextTextSize",
      type: "string",
      title: "Subtext text size",
      description: "Optional size for the grid intro subtext. Empty = medium (current look).",
      options: {
        list: [
          { title: "Small", value: "sm" },
          { title: "Medium (default)", value: "md" },
          { title: "Large", value: "lg" },
          { title: "Extra large", value: "xl" },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: "titleText.en",
      subtitle: "videoUrl",
      media: "poster",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Homepage hero",
        subtitle: subtitle || "No video set",
        media,
      };
    },
  },
});
