import pfp from '../assets/face.jpg';

const EMAIL = 'samuel@korab.me';

const SERVICES = [
  'Product Design',
  'UX Research',
  'Brand Identity',
  'Web Development',
];

export default function About() {
  return (
    <section id="about" className="about">
      <h2 className="section-title">About</h2>
      <div className="about-body">
        <div className="about-img-wrap">
          <img src={pfp} alt="Korab" className="about-img" />
        </div>
        <div className="about-left">
          <p className="about-lead">
            Product &amp; UX designer based in The Hague, NL.
          </p>
          <p className="about-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <div className="about-meta">
            <div className="about-meta-block">
              <h3 className="about-meta-title">Services</h3>
              <ul className="about-services">
                {SERVICES.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="about-meta-block">
              <h3 className="about-meta-title">Contact</h3>
              <ul className="about-contact">
                <li>
                  <a className="about-contact-link" href={`mailto:${EMAIL}`}>
                    {EMAIL}
                  </a>
                </li>
                <li>The Hague, NL</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
