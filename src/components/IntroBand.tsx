export function IntroBand() {
  return (
    <header className="intro-band mx-auto w-full max-w-[90rem] px-4 pt-12 pb-8 sm:px-6 sm:pt-16 md:px-8 md:pb-10">
      <div className="intro-frame">
        <p className="font-mono text-[0.7rem] tracking-[0.28em] text-rust uppercase">
          Amanda Smith
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
          Portfolio
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/65 sm:text-xl">
          Exhibitions, research, and writing — arranged as one connected grid.
        </p>
      </div>
    </header>
  );
}
