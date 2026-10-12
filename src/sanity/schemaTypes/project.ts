import { defineField, defineType } from "sanity";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (R) => R.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (R) => R.required(),
    }),
    defineField({ name: "summary", type: "text" }),
    defineField({ name: "body", type: "portableBody" }),
    defineField({ name: "coverImage", type: "image", options: { hotspot: true } }),
    defineField({
      name: "gallery",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({ name: "year", type: "string" }),
    defineField({
      name: "url",
      type: "url",
      title: "External URL",
      description: "Original project / exhibition page (used when linked from the grid).",
    }),
    defineField({
      name: "collaborators",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "venues",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "projectType",
      type: "string",
      options: {
        list: [
          { title: "Exhibition", value: "exhibition" },
          { title: "Art", value: "art" },
          { title: "Other", value: "other" },
        ],
      },
    }),
    defineField({
      name: "relatedPublications",
      type: "array",
      of: [{ type: "reference", to: [{ type: "publication" }] }],
    }),
  ],
});
