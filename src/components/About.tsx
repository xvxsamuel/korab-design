export default function About() {
  return (
    <section id="about" className="about">
      <h2 className="section-title">About</h2>
      <div className="about-body">
        <div className="about-left">
          <p className="about-lead">
            Product &amp; UX designer based in The Hague, NL.
          </p>
          <p className="about-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
        <dl className="about-details">
          <div className="about-detail-row">
            <dt>Based</dt>
            <dd>The Hague, NL</dd>
          </div>
          <div className="about-detail-row">
            <dt>Availability</dt>
            <dd>Open to work</dd>
          </div>
          <div className="about-detail-row">
            <dt>Focus</dt>
            <dd>Product · Brand · Web</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
