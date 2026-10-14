import { connection } from "next/server";
import { AdminGridApp } from "@/components/admin/AdminGridApp";
import { loadGridItems } from "@/lib/grid-sync";
import { loadHero } from "@/lib/hero-sync";

export default async function AdminPage() {
  await connection();
  const [{ items, source }, heroResult] = await Promise.all([
    loadGridItems(),
    loadHero(),
  ]);
  return (
    <AdminGridApp
      initialItems={items}
      initialSource={source}
      initialHero={heroResult.hero}
      initialHeroSource={heroResult.source}
    />
  );
}
