import { SPECS } from '@/lib/content';

export function Specs() {
  return (
    <section id="specs" className="specs" aria-label="Specifications">
      <div className="specs-inner">
        <p className="eyebrow">Under the hood</p>
        <h2>Built from parts you can fix in the field.</h2>
        <div className="spec-grid">
          {SPECS.map((spec) => (
            <div className="spec" key={spec.title}>
              <strong>{spec.title}</strong>
              <span>{spec.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
