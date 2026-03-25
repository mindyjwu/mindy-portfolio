export default function Footer() {
  return (
    <footer className="px-8 py-8 border-t border-ink/10 mt-auto">
      <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <p className="font-mono text-xs text-ink-muted">
          © {new Date().getFullYear()} Mindy Wu
        </p>
        <div className="flex gap-6">
          <a
            href="https://linkedin.com/in/mindyjwu/"
            target="_blank"
            rel="noopener"
            className="font-mono text-xs text-ink-muted hover:text-clay transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://mindys-ai-guide.vercel.app"
            target="_blank"
            rel="noopener"
            className="font-mono text-xs text-ink-muted hover:text-clay transition-colors"
          >
            AI Guide
          </a>
        </div>
      </div>
    </footer>
  );
}
