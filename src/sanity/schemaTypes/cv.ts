import { defineArrayMember, defineField, defineType } from "sanity";

export const cv = defineType({
  name: "cv",
  title: "CV",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string" }),
    defineField({ name: "headline", type: "string" }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "location", type: "string" }),
    defineField({ name: "relocationNote", type: "string" }),
    defineField({ name: "summary", type: "portableBody" }),
    defineField({ name: "cvPdf", type: "file", title: "CV PDF" }),
    defineField({
      name: "expertiseTags",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "expertiseHighlights",
      type: "array",
      of: [defineArrayMember({ type: "object", fields: [{ name: "text", type: "text" }] })],
    }),
    defineField({
      name: "experience",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "title", type: "string" },
            { name: "org", type: "string" },
            { name: "location", type: "string" },
            { name: "startDate", type: "string" },
            { name: "endDate", type: "string" },
            { name: "current", type: "boolean" },
            { name: "summary", type: "text" },
            {
              name: "bullets",
              type: "array",
              of: [{ type: "string" }],
            },
            {
              name: "relatedProject",
              type: "reference",
              to: [{ type: "project" }],
            },
          ],
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
            { name: "title", type: "string" },
            { name: "org", type: "string" },
            { name: "location", type: "string" },
            { name: "date", type: "string" },
            { name: "description", type: "text" },
          ],
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
            { name: "eventTitle", type: "string" },
            { name: "org", type: "string" },
            { name: "location", type: "string" },
            { name: "date", type: "string" },
            { name: "description", type: "text" },
          ],
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
            { name: "title", type: "string" },
            { name: "institution", type: "string" },
            { name: "location", type: "string" },
            { name: "startYear", type: "string" },
            { name: "endYear", type: "string" },
            { name: "notes", type: "text" },
          ],
        }),
      ],
    }),
    defineField({
      name: "technicalSkills",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "languages",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "language", type: "string" },
            { name: "level", type: "string" },
          ],
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
