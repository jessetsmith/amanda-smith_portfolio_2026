import { preloadModule } from "react-dom";

const bridgeScript = "https://core.sanity-cdn.com/bridge.js";

export const metadata = {
  title: "Studio | Portfolio 2026",
};

/** Embedded Studio needs the Dashboard bridge (also injected by NextStudio). */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  preloadModule(bridgeScript, { as: "script" });

  return (
    <>
      <script src={bridgeScript} async type="module" />
      <div className="min-h-screen bg-white text-black [&_header]:static">
        {children}
      </div>
    </>
  );
}
