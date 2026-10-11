import { defineArrayMember, defineField, defineType } from "sanity";

export const definitionMark = defineType({
  name: "definition",
  title: "Definition",
  type: "object",
  fields: [
    defineField({
      name: "definition",
      title: "Definition text",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
  ],
});

export const portableBody = defineType({
  name: "portableBody",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      marks: {
        annotations: [
          {
            name: "definition",
            type: "object",
            title: "Definition",
            fields: [
              defineField({
                name: "definition",
                type: "text",
                title: "Definition",
                rows: 3,
              }),
            ],
          },
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [
              defineField({
                name: "href",
                type: "url",
                title: "URL",
              }),
            ],
          },
        ],
      },
    }),
  ],
});

export const gridItem = defineType({
  name: "gridItem",
  title: "Grid item",
  type: "object",
  fields: [
    defineField({
      name: "kind",
      type: "string",
      options: {
        list: [
          { title: "Title row", value: "titleRow" },
          { title: "Color cell", value: "colorCell" },
          { title: "Media cell", value: "mediaCell" },
          { title: "Text cell", value: "textCell" },
          { title: "Project cell", value: "projectCell" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "order",
      type: "number",
      initialValue: 1,
    }),
    defineField({
      name: "colStart",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(4),
    }),
    defineField({
      name: "colSpan",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(4),
    }),
    defineField({
      name: "rowSpan",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(4),
    }),
    defineField({
      name: "fill",
      type: "string",
      options: {
        list: ["rust", "ochre", "sage", "tan", "paper", "ink"],
      },
    }),
    defineField({ name: "label", type: "string" }),
    defineField({ name: "headline", type: "string" }),
    defineField({ name: "excerpt", type: "text" }),
    defineField({ name: "meta", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "year", type: "string" }),
    defineField({ name: "summary", type: "text" }),
    defineField({ name: "caption", type: "string" }),
    defineField({
      name: "placeholderTone",
      type: "string",
      options: { list: ["warm", "cool", "ink"] },
    }),
    defineField({
      name: "projectRef",
      type: "reference",
      to: [{ type: "project" }],
    }),
  ],
  preview: {
    select: { kind: "kind", title: "title", headline: "headline", label: "label" },
    prepare({ kind, title, headline, label }) {
      return {
        title: title || headline || label || kind,
        subtitle: kind,
      };
    },
  },
});
