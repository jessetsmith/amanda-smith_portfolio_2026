import { IntroBand } from "@/components/IntroBand";
import { HomepageGrid } from "@/components/grid/HomepageGrid";
import homepageGrid from "@/data/homepage-grid.json";
import type { GridItem } from "@/types/grid";

const items = homepageGrid as GridItem[];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <IntroBand />
      <HomepageGrid items={items} />
    </main>
  );
}
