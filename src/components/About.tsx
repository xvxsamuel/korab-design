export default function About() {
  return (
    <section id="about" className="about">
      <h2 className="section-title">A few things</h2>
      <div className="about-body">
        <div className="about-left">
          <div className="portrait">
            <span>Portrait</span>
          </div>
        </div>
        <div className="about-right">
          <p className="lead">
            Creating bold, human-first interfaces which feel as good as they look.
          </p>
          <p className="body">
            Research, flows, systems, handoff.
          </p>
        </div>
      </div>
      <div className="about-meta">
        <div>
          <dt>Shipped</dt>
          <dd>10+</dd>
        </div>
        <div>
          <dt>Years</dt>
          <dd>2</dd>
        </div>
        <div>
          <dt>Based</dt>
          <dd>NL</dd>
        </div>
      </div>
    </section>
  );
}
