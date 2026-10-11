export const metadata = {
  title: "Studio | Portfolio 2026",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black [&_header]:static">
      {children}
    </div>
  );
}
