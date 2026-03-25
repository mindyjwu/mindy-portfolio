export default function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 h-16 bg-cream/90 backdrop-blur-sm border-b border-ink/10">
      <a href="#" className="font-heading text-xl text-ink">
        Mindy Wu
      </a>
      <ul className="flex gap-8 items-center text-sm font-body font-medium text-ink-soft">
        <li><a href="#work" className="hover:text-clay transition-colors">Work</a></li>
        <li><a href="#about" className="hover:text-clay transition-colors">About</a></li>
        <li><a href="#contact" className="hover:text-clay transition-colors">Contact</a></li>
        <li>
          <a
            href="https://mindys-ai-guide.vercel.app"
            target="_blank"
            rel="noopener"
            className="px-4 py-1.5 rounded-full bg-clay text-white text-sm hover:bg-clay-dark transition-colors"
          >
            AI Guide →
          </a>
        </li>
      </ul>
    </nav>
  );
}
