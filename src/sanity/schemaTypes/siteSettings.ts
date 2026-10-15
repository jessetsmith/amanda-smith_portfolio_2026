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
    defineField({ name: "contactEmail", type: "string" }),
    defineField({
      name: "contactNote",
      type: "localeText",
      title: "Contact note",
    }),
  ],
});
