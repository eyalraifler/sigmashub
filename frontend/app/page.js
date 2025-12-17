import Link from "next/link"
import NavBar from "./components/NavBar"
import ParticlesBackground from "./components/ParticlesBackground";
import { leagueSpartan, arial } from "./fonts";

export default function Home() {
  return (
    <main className="bg-[#141D29]">
      <ParticlesBackground />

      <NavBar />

      <section className="relative overflow-hidden black_pointy">


        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-8 pb-24 pt-16 text-center">
          <p className={"pointy font-arial font-black text-[#EE7951] tracking-[0.03em] text-8xl"}>
            LET&apos;S FEED
          </p>

          <p className="pointy relative inline-block cursor-pointer origin-center font-black">
            YOUR AURA
          </p>




          <p className="mt-8 max-w-xl text-lg text-white/80">
            A <span className="font-semibold text-white">modern</span> social platform built{" "}
            <span className="font-semibold text-white">for sigmas</span>, by sigmas
          </p>

          <Link
            href="/signup"
            className="pointy mt-10 rounded-full bg-[#50FF6C] px-12 py-3 text-lg font-semibold text-black hover:brightness-110 active:brightness-95"
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