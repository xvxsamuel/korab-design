type NavProps = {
  active: string;
};

const links = [
  { id: 'about',   label: 'about' },
  { id: 'works',   label: 'works' },
];

export default function Nav({ active }: NavProps) {
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const scroll = () =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // If a project page is up, let it shrink back into its star first: the
    // page stays scroll-locked until the star has landed, so scrolling any
    // sooner would move the star out from under it.
    const panelUp = document.querySelector('.work-panel.is-up');
    if (panelUp) {
      window.addEventListener('works:closed', () => requestAnimationFrame(scroll), { once: true });
      window.dispatchEvent(new CustomEvent('works:close'));
    } else {
      scroll();
    }
  };

  return (
    <nav className="nav" aria-label="primary">
      <div className="nav-links">
        {links.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={active === id ? 'active' : ''}
            onClick={(e) => go(e, id)}
            aria-current={active === id ? 'page' : undefined}
          >
            <span className="nav-label-base">{label}</span>
            <span className="nav-label-alt" aria-hidden="true">{label}</span>
          </a>
        ))}
        <a
          href="#contact"
          className={`nav-contact${active === 'contact' ? ' active' : ''}`}
          onClick={(e) => go(e, 'contact')}
          aria-current={active === 'contact' ? 'page' : undefined}
        >
          <span className="nav-label-base nav-contact-base" aria-hidden="true">
            {'contact'.split('').map((ch, i) => (
              <span key={i} className="nav-contact-char" style={{ '--i': i } as React.CSSProperties}>{ch}</span>
            ))}
          </span>
          <span className="nav-label-alt nav-contact-alt" aria-hidden="true">let's talk</span>
          <span className="sr-only">contact</span>
        </a>
      </div>
    </nav>
  );
}
