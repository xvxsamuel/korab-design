const EMAIL = 'samuel@korab.me';

export default function Contact() {
  return (
    <section id="contact" className="contact">
      <h2 className="section-title">Contact</h2>
      <div className="contact-body">
        <p className="contact-lead">
          Got a project in mind? Let's talk.
        </p>
        <a className="contact-email" href={`mailto:${EMAIL}`}>
          <span className="contact-email-text" aria-hidden="true">
            {EMAIL.split('').map((ch, i) => (
              <span
                key={i}
                className="contact-email-char"
                style={{ '--i': i } as React.CSSProperties}
              >
                {ch}
              </span>
            ))}
          </span>
          <span className="sr-only">{EMAIL}</span>
          <span className="contact-chevron" aria-hidden="true">
            <span className="contact-chevron-mark" />
          </span>
        </a>
        <p className="contact-note">
          Open to full-time roles and freelance work.<br />
          Available on-site and remotely.
        </p>
      </div>
    </section>
  );
}
