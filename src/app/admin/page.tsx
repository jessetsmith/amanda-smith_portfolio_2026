import { connection } from "next/server";
import { AdminGridApp } from "@/components/admin/AdminGridApp";
import { readGridItems } from "@/lib/grid-store";

export default async function AdminPage() {
  await connection();
  const items = await readGridItems();
  return <AdminGridApp initialItems={items} />;
}
