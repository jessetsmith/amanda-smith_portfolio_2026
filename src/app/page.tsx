import { connection } from "next/server";
import { IntroBand } from "@/components/IntroBand";
import { HomepageGrid } from "@/components/grid/HomepageGrid";
import { readGridItems } from "@/lib/grid-store";

export default async function Home() {
  await connection();
  const items = await readGridItems();

  return (
    <main className="flex flex-1 flex-col">
      <IntroBand />
      <HomepageGrid items={items} />
    </main>
  );
}
