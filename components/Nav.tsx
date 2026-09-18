"use client";

const links = [
  { label: "Work", href: "#work" },
  { label: "self-spend", href: "#selfspend" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Nav() {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor: "rgba(248, 247, 244, 0.80)",
      }}
    >
      <div
        className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-5 sm:px-12"
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 400,
            color: "var(--navy)",
            letterSpacing: "0.01em",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Mindy Wu
        </a>

        {/* Links */}
        <ul className="m-0 flex list-none gap-4 p-0 sm:gap-9">
          {links.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                onClick={(e) => handleClick(e, href)}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue-mid)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
