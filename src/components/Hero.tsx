import Sun from './Sun';

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <h1 className="hero-name">
          <span className="row row1">Samuel</span>
          <span className="row row2">
            <span className="hero-sun" aria-hidden="true">
              <span className="brand-orbit-body">
                <Sun className="sun-inline" />
              </span>
            </span>
            Korab
          </span>
        </h1>
      </div>
    </section>
  );
}
