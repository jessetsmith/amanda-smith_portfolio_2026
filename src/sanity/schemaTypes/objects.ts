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
      name: "featured",
      type: "boolean",
      title: "Featured lead",
      description:
        "Highlight as the section lead (larger type/image). One per section, right after the title row.",
      initialValue: false,
    }),
    defineField({
      name: "fill",
      type: "string",
      options: {
        list: ["rust", "ochre", "sage", "tan", "paper", "ink"],
      },
    }),
    defineField({ name: "label", type: "string" }),
    defineField({
      name: "meta",
      type: "string",
      description: "Top of card stack (meta → title → image → description)",
    }),
    defineField({ name: "headline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "subtitle", type: "string" }),
    defineField({ name: "year", type: "string" }),
    defineField({
      name: "imageSrc",
      type: "string",
      description:
        "Image between title and description — absolute URL or site path (/media/...)",
    }),
    defineField({ name: "imageAlt", type: "string" }),
    defineField({
      name: "placeholderTone",
      type: "string",
      options: { list: ["warm", "cool", "ink"] },
      description: "Placeholder image tone when imageSrc is empty",
    }),
    defineField({ name: "excerpt", type: "text" }),
    defineField({ name: "summary", type: "text" }),
    defineField({ name: "caption", type: "string" }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "projectRef",
      type: "reference",
      to: [{ type: "project" }],
    }),
  ],
  preview: {
    select: {
      kind: "kind",
      title: "title",
      headline: "headline",
      label: "label",
      featured: "featured",
    },
    prepare({ kind, title, headline, label, featured }) {
      return {
        title: title || headline || label || kind,
        subtitle: featured ? `${kind} · featured lead` : kind,
      };
    },
  },
});
