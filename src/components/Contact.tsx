export default function Contact() {
  return (
    <section id="contact" className="contact">
      <h2 className="section-title">Let&apos;s make something</h2>
      <div className="contact-body">
        <div className="contact-left">
          <a className="email" href="mailto:samuel@korab.me">
            samuel@korab.me
            <span className="email-arrow" aria-hidden="true">→</span>
          </a>
          <p className="contact-note">
            Open to freelance and select full-time. Replies within 48 hours.
          </p>
        </div>
        <div className="contact-right">
          <div className="contact-col">
            <h5>Elsewhere</h5>
            <a href="#">Github</a>
            <a href="#">Dribbble</a>
          </div>
          <div className="contact-col">
            <h5>Availability</h5>
            <a href="#">Freelance · Open</a>
            <a href="#">Full-time · Selective</a>
          </div>
          <div className="contact-col">
            <h5>Located</h5>
            <a href="#">The Hague, NL</a>
            <a href="#">GMT +1</a>
          </div>
        </div>
      </div>
    </section>
  );
}
