import { defineField, defineType } from "sanity";

/**
 * Singleton cover / IntroMask content — kept separate from homepage.gridItems
 * so hero copy + media are a clear CMS category.
 */
export const homepageHero = defineType({
  name: "homepageHero",
  title: "Homepage hero",
  type: "document",
  fields: [
    defineField({
      name: "titleText",
      type: "string",
      title: "Hero title",
      description: "Large cover name (e.g. Amanda Smith)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "supportText",
      type: "text",
      title: "Support line",
      rows: 3,
      description: "Short line under the title on the cover",
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
  ],
  preview: {
    select: {
      title: "titleText",
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
