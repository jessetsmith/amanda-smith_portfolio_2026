import { connection } from "next/server";
import { CvPageClient } from "@/components/cv/CvPageClient";
import { getCvPageContent, getSiteSettings } from "@/lib/content";

export const metadata = {
  title: "CV | Amanda Smith",
  description: "Curriculum vitae — Amanda Smith",
};

/** Allow request-time CV fetch under Cache Components (Vercel). */
export const instant = false;

export default async function CvPage() {
  if (process.env.GITHUB_PAGES !== "1") {
    await connection();
  }
  const [cv, site] = await Promise.all([getCvPageContent(), getSiteSettings()]);
  return <CvPageClient cv={cv} site={site} />;
}
