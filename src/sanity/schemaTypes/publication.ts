import { defineField, defineType } from "sanity";

export const publication = defineType({
  name: "publication",
  title: "Publication",
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
    defineField({
      name: "publicationType",
      type: "string",
      options: {
        list: [
          { title: "Academic", value: "academic" },
          { title: "Creative", value: "creative" },
          { title: "Journal / editorial", value: "journalEditorial" },
        ],
      },
    }),
    defineField({ name: "year", type: "string" }),
    defineField({ name: "venue", type: "string", title: "Venue / publisher" }),
    defineField({ name: "url", type: "url" }),
    defineField({ name: "pdf", type: "file" }),
    defineField({
      name: "relatedProjects",
      type: "array",
      of: [{ type: "reference", to: [{ type: "project" }] }],
    }),
  ],
});
