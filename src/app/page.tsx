export default function Home() {
  return (
    <main className="flex flex-1 flex-col justify-end px-6 pb-16 pt-24 sm:px-10">
      <p className="text-sm tracking-[0.2em] text-rust uppercase">Scaffold</p>
      <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
        Amanda Smith
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/70">
        Portfolio 2026 foundation. Grid, intro mask, Sanity, and admin DnD come
        next — see the project plan.
      </p>
      <div className="mt-10 flex gap-3" aria-hidden>
        <span className="h-10 w-10 bg-rust" />
        <span className="h-10 w-10 bg-ochre" />
        <span className="h-10 w-10 bg-sage" />
        <span className="h-10 w-10 bg-tan" />
      </div>
    </main>
  );
}
