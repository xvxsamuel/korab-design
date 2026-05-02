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
          <span className="contact-chevron" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10 18h4" />
              <path d="M3 8a9 9 0 0 1 9 9v1l1.428 -4.285a12 12 0 0 1 6.018 -6.938l.554 -.277" />
              <path d="M15 6h5v5" />
            </svg>
          </span>
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
        </a>
        <p className="contact-note">
          Open to full-time roles and freelance work.<br />
          Available on-site and remotely.
        </p>
      </div>
    </section>
  );
}
