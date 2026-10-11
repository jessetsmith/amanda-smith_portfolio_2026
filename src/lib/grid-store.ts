import { promises as fs } from "fs";
import path from "path";
import seed from "@/data/homepage-grid.json";
import type { GridItem } from "@/types/grid";
import { normalizeGridItems } from "@/lib/grid-normalize";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "homepage-grid.json");

export async function readGridItems(): Promise<GridItem[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as GridItem[];
    if (!Array.isArray(parsed)) {
      return normalizeGridItems(seed as GridItem[]);
    }
    return normalizeGridItems(parsed);
  } catch {
    return normalizeGridItems(seed as GridItem[]);
  }
}

export async function writeGridItems(items: GridItem[]): Promise<GridItem[]> {
  const normalized = normalizeGridItems(items);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function resetGridItems(): Promise<GridItem[]> {
  const normalized = normalizeGridItems(seed as GridItem[]);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
