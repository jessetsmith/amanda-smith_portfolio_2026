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
          { title: "Blank spacer", value: "blankCell" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "id",
      type: "string",
      title: "Stable id",
      description: "Client id mirrored from admin (falls back to _key).",
      hidden: true,
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
      name: "rowStart",
      type: "number",
      title: "Row start",
      description:
        "Explicit 1-based row from section-isolated packing (keeps bands from reflowing).",
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "rowSpan",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(4),
    }),
    defineField({
      name: "sectionRows",
      type: "number",
      title: "Section rows",
      description:
        "Title-row only: explicit section band height. Omit to hug content.",
      validation: (Rule) => Rule.min(1).max(24),
    }),
    defineField({
      name: "hidden",
      type: "boolean",
      title: "Hidden from public",
      description:
        "Title-row only: hide this section (title + band) on the public site. Still visible in admin.",
      initialValue: false,
    }),
    defineField({
      name: "featured",
      type: "boolean",
      title: "Featured highlight",
      description:
        "Mark as the section highlight (larger type/image). One per section, right after the title row.",
      initialValue: false,
    }),
    defineField({
      name: "textColor",
      type: "string",
      title: "Text color",
      description:
        "Optional CSS color for block text (e.g. #1a1a1a). Empty = black/ink default.",
    }),
    defineField({
      name: "textSize",
      type: "string",
      title: "Text size",
      description: "Optional size for block text. Empty = default (md).",
      options: {
        list: [
          { title: "Small", value: "sm" },
          { title: "Medium (default)", value: "md" },
          { title: "Large", value: "lg" },
          { title: "Extra large", value: "xl" },
        ],
      },
    }),
    defineField({
      name: "layouts",
      type: "object",
      title: "Breakpoint layouts",
      description:
        "Independent tablet/mobile placement overrides. Desktop uses colStart/colSpan/row* above.",
      fields: [
        defineField({
          name: "tablet",
          type: "object",
          title: "Tablet (~768)",
          fields: [
            defineField({ name: "colStart", type: "number" }),
            defineField({ name: "colSpan", type: "number" }),
            defineField({ name: "rowStart", type: "number" }),
            defineField({ name: "rowSpan", type: "number" }),
            defineField({ name: "order", type: "number" }),
          ],
        }),
        defineField({
          name: "mobile",
          type: "object",
          title: "Mobile (~390)",
          fields: [
            defineField({ name: "colStart", type: "number" }),
            defineField({ name: "colSpan", type: "number" }),
            defineField({ name: "rowStart", type: "number" }),
            defineField({ name: "rowSpan", type: "number" }),
            defineField({ name: "order", type: "number" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "fill",
      type: "string",
      options: {
        list: ["rust", "ochre", "sage", "tan", "paper", "ink"],
      },
    }),
    defineField({
      name: "label",
      type: "localeString",
      title: "Label",
    }),
    defineField({
      name: "subcategory",
      type: "localeString",
      title: "Subcategory",
      description:
        "Color cells only — optional segments after the label. Separate values with commas; commas become middle-dots (·) on the live site (e.g. Channel, Happenings → Channel · Happenings). Leave empty to omit.",
      hidden: ({ parent }) => parent?.kind !== "colorCell",
    }),
    defineField({
      name: "prose",
      type: "localeText",
      title: "Long text / prose",
      description:
        "Color cells only — optional poetry or prose. Leave empty to omit from the public grid.",
      hidden: ({ parent }) => parent?.kind !== "colorCell",
    }),
    defineField({
      name: "meta",
      type: "localeString",
      description: "Top of card stack (meta → title → image → description)",
    }),
    defineField({ name: "headline", type: "localeString" }),
    defineField({ name: "title", type: "localeString" }),
    defineField({ name: "subtitle", type: "localeString" }),
    defineField({
      name: "year",
      type: "string",
      description: "Year / range (usually shared across locales)",
    }),
    defineField({
      name: "imageSrc",
      type: "string",
      description:
        "Image between title and description — absolute URL or site path (/media/...)",
    }),
    defineField({
      name: "imageAlt",
      type: "localeString",
      title: "Image alt",
    }),
    defineField({
      name: "placeholderTone",
      type: "string",
      options: { list: ["warm", "cool", "ink"] },
      description: "Placeholder image tone when imageSrc is empty",
    }),
    defineField({ name: "excerpt", type: "localeText" }),
    defineField({ name: "summary", type: "localeText" }),
    defineField({ name: "caption", type: "localeString" }),
    defineField({ name: "description", type: "localeText" }),
    defineField({
      name: "href",
      type: "url",
      title: "Link URL",
      description:
        "Original resource (opens in a new tab on the public grid). Leave empty for non-linked cells.",
    }),
    defineField({
      name: "projectRef",
      type: "reference",
      to: [{ type: "project" }],
    }),
  ],
  preview: {
    select: {
      kind: "kind",
      title: "title.en",
      headline: "headline.en",
      label: "label.en",
      featured: "featured",
      hidden: "hidden",
    },
    prepare({ kind, title, headline, label, featured, hidden }) {
      const flags = [
        featured ? "featured highlight" : null,
        hidden ? "hidden" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        title: title || headline || label || kind,
        subtitle: flags ? `${kind} · ${flags}` : kind,
      };
    },
  },
});
