import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Homepage")
        .id("homepage")
        .child(S.document().schemaType("homepage").documentId("homepage")),
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings"),
        ),
      S.listItem()
        .title("CV")
        .id("cv")
        .child(S.document().schemaType("cv").documentId("cv")),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) =>
          !["homepage", "siteSettings", "cv"].includes(item.getId() ?? ""),
      ),
    ]);
