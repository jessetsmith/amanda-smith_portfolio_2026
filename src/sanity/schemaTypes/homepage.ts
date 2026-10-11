import { defineField, defineType } from "sanity";

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      initialValue: "Homepage",
    }),
    defineField({
      name: "introMaskText",
      type: "string",
      title: "Intro mask text",
      description: "Large scrolling text used as the Vermeer-style video mask",
    }),
    defineField({
      name: "introSupport",
      type: "text",
      title: "Intro support line",
    }),
    defineField({
      name: "introVideoUrl",
      type: "url",
      title: "Intro video URL",
      description: "Prefer Mux / CDN URL — not Sanity file hosting for video",
    }),
    defineField({
      name: "introPosterUrl",
      type: "url",
      title: "Intro poster URL",
    }),
    defineField({
      name: "gridItems",
      type: "array",
      of: [{ type: "gridItem" }],
    }),
  ],
});
