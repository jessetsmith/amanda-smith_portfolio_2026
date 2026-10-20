import { defineArrayMember, defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "siteTitle",
      type: "localeString",
      title: "Site / brand title",
    }),
    defineField({
      name: "nav",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "label", type: "localeString", title: "Label" },
            { name: "href", type: "string", title: "Href" },
          ],
          preview: {
            select: { title: "label.en", subtitle: "href" },
          },
        }),
      ],
    }),
    defineField({
      name: "navTextColor",
      type: "string",
      title: "Nav text color",
      description:
        "Optional CSS color for brand + nav links (e.g. #1a1a1a). Empty = ink default.",
    }),
    defineField({
      name: "navTextSize",
      type: "string",
      title: "Nav text size",
      description: "Optional size for brand + nav links. Empty = medium (current look).",
      options: {
        list: [
          { title: "Small", value: "sm" },
          { title: "Medium (default)", value: "md" },
          { title: "Large", value: "lg" },
          { title: "Extra large", value: "xl" },
        ],
      },
    }),
    defineField({ name: "contactEmail", type: "string" }),
    defineField({
      name: "contactNote",
      type: "localeText",
      title: "Contact note",
    }),
  ],
});
