import Link from "next/link"
import NavBar from "./components/NavBar"
import ParticlesBackground from "./components/ParticlesBackground";

export default function Home() {
  return (
    <main>
      <ParticlesBackground />

      <NavBar />

      <section className="relative overflow-hidden">


        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-8 pb-24 pt-16 text-center">
          <p className="text-[52px] font-semibold tracking-[0.25em] text-[#EE7951] sm:text-[64px]">
            LET'S FEED
          </p>

           <h1 className="text-white mt-3 text-[64px] font-light tracking-[0.08em] sm:text-[86px] md:text-[96px]">
            YOUR AURA
          </h1>

          <p className="mt-8 max-w-xl text-lg text-white/80">
            A <span className="font-semibold text-white">modern</span> social platform built{" "}
            <span className="font-semibold text-white">for sigmas</span>, by sigmas
          </p>

          <Link
            href="/signup"
            className="mt-10 rounded-full bg-[#50FF6C] px-12 py-3 text-lg font-semibold text-black hover:brightness-110 active:brightness-95"
          >
            Sign up
          </Link>

          {/* optional: just so you can scroll and see navbar effect */}
          <div className="h-[120vh]" />

        </div>

      </section>
      

    </main>
  )
}