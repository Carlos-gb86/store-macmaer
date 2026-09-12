type SocialName = "instagram" | "youtube" | "etsy" | "pinterest";

function SocialIcon({ name }: { name: SocialName }) {
  if (name === "instagram")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.25" />
        <circle className="social-icon-fill" cx="17.4" cy="6.7" r="1" />
      </svg>
    );
  if (name === "youtube")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 8.1a3 3 0 0 0-2.1-2.2C17 5.4 12 5.4 12 5.4s-5 0-6.9.5A3 3 0 0 0 3 8.1 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.9a3 3 0 0 0 2.1 2.2c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .4-3.9 31 31 0 0 0-.4-3.9Z" />
        <path className="social-icon-fill" d="m10 15.2 5.2-3.2L10 8.8Z" />
      </svg>
    );
  if (name === "etsy")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10.5l.4 4.1h-1.2c-.5-1.8-1.3-2.5-3.4-2.5H11v5.5h1.8c1.6 0 2-.5 2.3-1.9h1.1v5.4h-1.1c-.3-1.5-.7-2-2.3-2H11v5.8h2.6c2.4 0 3.2-.8 3.9-3h1.2L18.2 20H7v-1.1c1.5-.2 1.8-.5 1.8-1.7V6.8c0-1.2-.3-1.5-1.8-1.7Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2a8.8 8.8 0 0 0-3.2 17c-.1-1.4 0-3 .4-4.3l1.1-4.5s-.3-.7-.3-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.2 0 3.8-2.3 3.8-5.6 0-2.9-2.1-5-5.1-5-3.5 0-5.5 2.6-5.5 5.3 0 1 .4 2.2.8 2.8.1.1.1.2.1.4l-.3 1.3c-.1.4-.4.5-.8.3-1.7-.8-2.7-3-2.7-4.8 0-3.9 2.8-7.5 8.2-7.5 4.3 0 7.6 3.1 7.6 7.2 0 4.3-2.7 7.7-6.4 7.7-1.3 0-2.4-.6-2.8-1.4l-.8 2.9a17 17 0 0 1-1.8 3.8c1 .3 2.1.5 3.2.5a8.8 8.8 0 1 0 0-17.6Z" />
    </svg>
  );
}

export const socialLinks: {
  name: SocialName;
  label: string;
  href: string;
}[] = [
  {
    name: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/macmaer_knots/?hl=en",
  },
  {
    name: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@macmaerknots5116",
  },
  {
    name: "etsy",
    label: "Etsy",
    href: "https://www.etsy.com/shop/Macmaer",
  },
  {
    name: "pinterest",
    label: "Pinterest",
    href: "https://www.pinterest.se/macmaerknots/",
  },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`social-links ${className}`.trim()}>
      {socialLinks.map((social) => (
        <a
          key={social.name}
          className="social-link"
          href={social.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Follow Macmaer on ${social.label}`}
          title={social.label}
        >
          <SocialIcon name={social.name} />
        </a>
      ))}
    </div>
  );
}
