import { defineArrayMember, defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "siteTitle", type: "string" }),
    defineField({
      name: "nav",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "label", type: "string" },
            { name: "href", type: "string" },
          ],
        }),
      ],
    }),
    defineField({ name: "contactEmail", type: "string" }),
    defineField({ name: "contactNote", type: "text" }),
  ],
});
