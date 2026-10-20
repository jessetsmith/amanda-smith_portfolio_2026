import { connection } from "next/server";
import { AdminGridApp } from "@/components/admin/AdminGridApp";
import { getSiteSettings } from "@/lib/content";
import { loadGridItems } from "@/lib/grid-sync";
import { loadHero } from "@/lib/hero-sync";

/** Covered by admin/layout `instant = false`; kept explicit on the page too. */
export const instant = false;

export default async function AdminPage() {
  await connection();
  const [{ items, source }, heroResult, site] = await Promise.all([
    loadGridItems(),
    loadHero(),
    getSiteSettings(),
  ]);
  return (
    <AdminGridApp
      initialItems={items}
      initialSource={source}
      initialHero={heroResult.hero}
      initialHeroSource={heroResult.source}
      initialSite={site}
    />
  );
}
