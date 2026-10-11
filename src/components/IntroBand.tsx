export function IntroBand() {
  return (
    <header className="intro-band mx-auto w-full max-w-[90rem] px-4 pt-10 pb-6 sm:px-6 sm:pt-14 md:px-8 md:pb-8">
      <div className="intro-frame">
        <p className="font-mono text-[0.7rem] tracking-[0.28em] text-rust uppercase">
          Amanda Smith
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
          Portfolio
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65 sm:text-lg">
          Exhibitions, research, and writing — arranged as one connected grid.
        </p>
      </div>
    </header>
  );
}
