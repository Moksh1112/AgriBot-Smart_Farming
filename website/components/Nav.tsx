export function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="AgriBot home">
        <span className="brand-mark"><LeafIcon /></span>
        AgriBot
      </a>
      <nav aria-label="Primary">
        <a href="#story">How it works</a>
        <a href="#app">The app</a>
        <a href="#specs">Specs</a>
        <a className="nav-cta" href="#download">Get the app</a>
      </nav>
    </header>
  );
}
