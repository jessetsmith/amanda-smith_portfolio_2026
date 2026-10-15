import { defineArrayMember, defineField, defineType } from "sanity";

export const cv = defineType({
  name: "cv",
  title: "CV",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", title: "Name" }),
    defineField({ name: "headline", type: "localeString" }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "location", type: "localeString" }),
    defineField({ name: "relocationNote", type: "localeString" }),
    defineField({
      name: "summary",
      type: "localeText",
      title: "Summary",
      description:
        "Public CV summary. (Portable Text body / PDF remain English-only for this pass.)",
    }),
    defineField({ name: "cvPdf", type: "file", title: "CV PDF" }),
    defineField({
      name: "expertiseTags",
      type: "array",
      of: [defineArrayMember({ type: "localeString" })],
    }),
    defineField({
      name: "expertiseHighlights",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [{ name: "text", type: "localeText" }],
        }),
      ],
    }),
    defineField({
      name: "experience",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "title", type: "localeString" },
            { name: "org", type: "string" },
            { name: "location", type: "localeString" },
            { name: "startDate", type: "string" },
            { name: "endDate", type: "string" },
            { name: "current", type: "boolean" },
            { name: "summary", type: "localeText" },
            {
              name: "bullets",
              type: "array",
              of: [defineArrayMember({ type: "localeString" })],
            },
            {
              name: "relatedProject",
              type: "reference",
              to: [{ type: "project" }],
            },
          ],
          preview: {
            select: { title: "title.en", subtitle: "org" },
          },
        }),
      ],
    }),
    defineField({
      name: "awards",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "title", type: "localeString" },
            { name: "org", type: "string" },
            { name: "location", type: "localeString" },
            { name: "date", type: "string" },
            { name: "description", type: "localeText" },
          ],
          preview: {
            select: { title: "title.en", subtitle: "org" },
          },
        }),
      ],
    }),
    defineField({
      name: "speaking",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            {
              name: "role",
              type: "string",
              options: {
                list: ["presenter", "panelist", "coFacilitator", "lecturer"],
              },
            },
            { name: "eventTitle", type: "localeString" },
            { name: "org", type: "string" },
            { name: "location", type: "localeString" },
            { name: "date", type: "string" },
            { name: "description", type: "localeText" },
          ],
          preview: {
            select: { title: "eventTitle.en", subtitle: "org" },
          },
        }),
      ],
    }),
    defineField({
      name: "education",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            {
              name: "credentialType",
              type: "string",
              options: { list: ["degree", "certificate"] },
            },
            { name: "title", type: "localeString" },
            { name: "institution", type: "string" },
            { name: "location", type: "localeString" },
            { name: "startYear", type: "string" },
            { name: "endYear", type: "string" },
            { name: "notes", type: "localeText" },
          ],
          preview: {
            select: { title: "title.en", subtitle: "institution" },
          },
        }),
      ],
    }),
    defineField({
      name: "technicalSkills",
      type: "array",
      of: [defineArrayMember({ type: "localeString" })],
    }),
    defineField({
      name: "languages",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "language", type: "localeString" },
            { name: "level", type: "localeString" },
          ],
          preview: {
            select: { title: "language.en", subtitle: "level.en" },
          },
        }),
      ],
    }),
    defineField({
      name: "publications",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "title", type: "string" },
            { name: "venue", type: "string" },
            { name: "date", type: "string" },
            { name: "url", type: "url" },
            {
              name: "publicationRef",
              type: "reference",
              to: [{ type: "publication" }],
            },
          ],
        }),
      ],
    }),
  ],
});
