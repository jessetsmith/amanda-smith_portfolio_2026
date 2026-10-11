import { defineField, defineType } from "sanity";

export const researchItem = defineType({
  name: "researchItem",
  title: "Research item",
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
      name: "researchType",
      type: "string",
      options: {
        list: [
          { title: "Award", value: "award" },
          { title: "Grant", value: "grant" },
          { title: "Presentation", value: "presentation" },
          { title: "Study", value: "study" },
          { title: "Other", value: "other" },
        ],
      },
    }),
    defineField({ name: "year", type: "string" }),
    defineField({ name: "institution", type: "string" }),
    defineField({
      name: "collaborators",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({ name: "url", type: "url" }),
  ],
});
