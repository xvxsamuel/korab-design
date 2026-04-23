import Sun from './Sun';

type NavProps = {
  active: string;
};

const links = [
  { id: 'home', label: 'home' },
  { id: 'works', label: 'works' },
  { id: 'about', label: 'about' }
];

export default function Nav({ active }: NavProps) {
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="nav" aria-label="primary">
      {/* orbit-anchor marks this mark as a body on the shared orbit
          (see .sun-orbit in App.tsx) — the ring is drawn globally, not
          per-anchor, so both suns share a single circle. */}
      <span className="brand-orbit orbit-anchor" aria-hidden="true">
        <span className="brand-orbit-body">
          <Sun size={40} className="brand-mark" />
        </span>
      </span>
      <div className="nav-links">
        {links.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={active === id ? 'active' : ''}
            onClick={(e) => go(e, id)}
            aria-current={active === id ? 'page' : undefined}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
