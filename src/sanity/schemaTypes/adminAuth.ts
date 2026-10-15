import { defineField, defineType } from "sanity";

/**
 * Singleton for /admin login. Stores username + bcrypt password hash only.
 * Never query this document from public pages or CDN — server login route only.
 */
export const adminAuth = defineType({
  name: "adminAuth",
  title: "Admin auth",
  type: "document",
  fields: [
    defineField({
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "passwordHash",
      title: "Password hash (bcrypt)",
      type: "string",
      description:
        "bcrypt hash only — never store a plaintext password. Rotate with `npm run sanity:seed-admin`.",
      readOnly: true,
      validation: (Rule) => Rule.required().min(20),
    }),
    defineField({
      name: "updatedAtNote",
      title: "Last rotated (note)",
      type: "string",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "username" },
    prepare: ({ title }) => ({
      title: title ? `Admin: ${title}` : "Admin auth",
      subtitle: "Server-only credentials (hash)",
    }),
  },
});
