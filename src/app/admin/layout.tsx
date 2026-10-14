import type { ReactNode } from "react";

/** Admin reads cookies / live Sanity — allow blocking navigations under Cache Components. */
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
