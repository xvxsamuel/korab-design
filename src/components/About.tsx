import pfp from '../assets/face.jpg';
import StarFlat from '../assets/starflat.svg?react';

const PRACTICE = [
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
        <div className="about-side">
          <div className="about-portrait">
            {/* The crop owns the circle; the img inside is zoomed past it so
                the framing has slack to aim with (see .about-img). */}
            <div className="about-img-crop">
              <img
                src={pfp}
                alt="Samuel Korab"
                className="about-img"
                width="800"
                height="1000"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <h3 className="sr-only">What I do</h3>
          {/* Bulleted with the works' waymark mark — static on purpose; the
              turning versions belong to the orbit. */}
          <ul className="about-capabilities">
            {PRACTICE.map((label) => (
              <li key={label}>
                <StarFlat className="capability-star" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="about-left">
          <p className="about-lead">
            I take pride in creating thoughtful and intuitive human experiences.
          </p>
          {/* Bottom of the bio rides the row's bottom edge, level with the
              capabilities list (margin-top: auto in CSS). */}
          <div className="about-bio">
            <p className="about-text">
              Coming from a data science background, I spent years optimizing every aspect of my life, from data pipelines to video games to even my morning routine. Somewhere along the way I noticed one thing absent from all that optimizing: human behaviour, mine included.
            </p>
            <p className="about-text">
              Ever since, I've been chasing that unknown variable. To understand systems at a core level and optimize them for us — paying attention to how we use things, where we hesitate, and what we unknowingly ignore.
            </p>
            <p className="about-text">
              UX gives that curiosity a job: building things that fit how people actually behave, not how we wish they would.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
