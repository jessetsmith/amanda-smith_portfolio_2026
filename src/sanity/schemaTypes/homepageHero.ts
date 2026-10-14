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
        "Absolute CDN URL or site path (e.g. /media/intro.mp4). Prefer Mux/CDN for large files.",
    }),
    defineField({
      name: "posterUrl",
      type: "string",
      title: "Video poster URL",
      description: "Still shown before video plays (path or absolute URL)",
    }),
    defineField({
      name: "imageUrl",
      type: "string",
      title: "Background image URL",
      description:
        "Optional still background when video is empty, or used as an alternate poster.",
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
    select: { title: "titleText", subtitle: "videoUrl" },
    prepare({ title, subtitle }) {
      return {
        title: title || "Homepage hero",
        subtitle: subtitle || "No video set",
      };
    },
  },
});
