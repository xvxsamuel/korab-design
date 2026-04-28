export default function Contact() {
  return (
    <section id="contact" className="contact">
      <h2 className="section-title">Contact</h2>
      <div className="contact-body">
        <p className="contact-lead">
          Got a project in mind? Let's talk.
        </p>
        <a className="contact-email" href="mailto:samuel@korab.me">
          samuel@korab.me
          <span className="contact-arrow" aria-hidden="true">→</span>
        </a>
        <p className="contact-note">
          Open to full-time roles and freelance work.<br />
          Available on-site and remotely.
        </p>
      </div>
    </section>
  );
}
