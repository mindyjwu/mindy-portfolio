import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Quantum Playground",
  description: "An interactive, honest guide to quantum computing: learn, simulate, and see what's real today.",
};

// Runs before paint to avoid a theme flash. Defaults to dark; respects a saved choice.
const themeScript = `try{var t=localStorage.getItem('qp.theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}else if(window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.dataset.theme='light'}else{document.documentElement.dataset.theme='dark'}}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-5xl border-t border-line px-4 py-8 text-sm text-muted sm:px-6">
          Quantum Playground is an educational project. Simulations run in your browser and use ideal, noise-free qubits, so real hardware behaves differently.
          Claims cite primary sources where possible; where experts disagree, timelines are marked uncertain.
        </footer>
      </body>
    </html>
  );
}
