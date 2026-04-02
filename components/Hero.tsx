"use client";

export default function Hero() {
  return (
    <section
      style={{
        paddingTop: 160,
        paddingBottom: 120,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 48px",
        }}
      >
        {/* Monospaced tag */}
        <p
          className="fade-up fade-up-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 400,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            marginBottom: 28,
          }}
        >
          // based in New York
        </p>

        {/* Headline */}
        <h1
          className="fade-up fade-up-2"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(44px, 6vw, 72px)",
            fontWeight: 400,
            color: "var(--navy)",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            marginBottom: 28,
            maxWidth: 740,
          }}
        >
          Technology Consultant
          <br />& AI Builder
        </h1>

        {/* Subheadline */}
        <p
          className="fade-up fade-up-3"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            fontWeight: 400,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            maxWidth: 520,
            marginBottom: 44,
          }}
        >
          I build and implement AI systems for media &amp; entertainment companies —
          turning strategy into shipped product. Currently open to StratOps and
          Solutions roles at AI-native companies.
        </p>

        {/* CTAs */}
        <div
          className="fade-up fade-up-4"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
        >
          <a
            href="#experience"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#experience")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "11px 24px",
              borderRadius: 8,
              backgroundColor: "var(--navy)",
              color: "#FFFFFF",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "0.01em",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--blue-mid)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--navy)")}
          >
            View My Work
          </a>

          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 24px",
              borderRadius: 8,
              backgroundColor: "transparent",
              color: "var(--navy)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "0.01em",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--blue-mid)";
              e.currentTarget.style.color = "var(--blue-mid)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--navy)";
            }}
          >
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}
