import { connection } from "next/server";
import { AdminGridApp } from "@/components/admin/AdminGridApp";
import { loadGridItems } from "@/lib/grid-sync";

export default async function AdminPage() {
  await connection();
  const { items, source } = await loadGridItems();
  return <AdminGridApp initialItems={items} initialSource={source} />;
}
