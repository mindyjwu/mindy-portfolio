import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Work from "@/components/Work";
import SelfSpend from "@/components/SelfSpend";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Work />
        <SelfSpend />
        <About />
        <Contact />
      </main>
      <Footer />
      <Chat />
    </>
  );
}
