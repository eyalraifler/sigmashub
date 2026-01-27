import Link from "next/link";
import NavBar from "./components/NavBar";
import ParticlesBackground from "./components/ParticlesBackground";
import { leagueSpartan, arial } from "./fonts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import target_bulb_icon from "../public/target_bulb_icon.webp";
import feed_image from "../public/feed_image.webp";
import privacy_image from "../public/privacy_image.webp";
import website_with_cursor_heart from "../public/website_with_cursor_heart.webp";


export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;


  if (token) redirect("/app");


  return (
    <main className="bg-[#141D29]">
      <ParticlesBackground />

      <NavBar />

      <section className="relative overflow-hidden black_pointy">


        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-8 pb-24 pt-16 text-center">
          <p className={"pointy font-arial font-black text-[#EE7951] tracking-[0.03em] text-8xl"}>
            LET&apos;S FEED
          </p>

          <p className="pointy relative inline-block cursor-pointer origin-center font-black text-8xl">
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



          <section id="vision" className="bg-[#141D29] py-24">
            <div className="mx-auto max-w-6xl px-8">
              <div className="mx-auto max-w-3xl text-center">

                <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight">
                  Sigmas Hub is a social platform for sharing moments, ideas, and creativity in a simple and modern way.
                </h2>

                <p className="mt-8 text-lg md:text-xl leading-relaxed text-white/70">
                  The focus is on the essentials - posting content, discovering others, and engaging naturally.{" "}
                  This project is developed independently and continues to evolve, with new features and improvements added over time.{" "}
                  If you’re looking for a new place to share and explore,{" "}
                  <span className="font-semibold text-white">
                    Sigmas Hub is just getting started.
                  </span>
                </p>
              </div>
            </div>
          </section>



          {/* Features section */}
          <section id="features" className="relative bg-[#141D29] py-20">
            <div className="mx-auto max-w-6xl px-8">
              <div className="grid gap-10 md:grid-cols-3">
                {/* Card 1 */}
                <div className="rounded-2xl bg-[#0F1724] p-8 shadow-sm">
                  <div className="mb-6 overflow-hidden rounded-xl">
                    <Image
                      src={privacy_image}
                      alt="Privacy & Control"
                      className="h-auto w-full"
                      priority={false}
                    />
                  </div>

                  <h3 className="text-2xl font-semibold text-white">Privacy & Control</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Decide who sees your content and how you interact, with simple and clear privacy settings.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="rounded-2xl bg-[#0F1724] p-8 shadow-sm">
                  <div className="mb-6 overflow-hidden rounded-xl">
                    <Image
                      src={feed_image}
                      alt="Clean & Familiar Feed"
                      className="h-auto w-full"
                      priority={false}
                    />
                  </div>

                  <h3 className="text-2xl font-semibold text-white">Clean & Familiar Feed</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Browse and discover content through a fast, uncluttered feed that keeps the focus on posts.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="rounded-2xl bg-[#0F1724] p-8 shadow-sm">
                  <div className="mb-6 overflow-hidden rounded-xl">
                    <Image
                      src={website_with_cursor_heart}
                      alt="Create & Share"
                      className="h-auto w-full"
                      priority={false}
                    />
                  </div>

                  <h3 className="text-2xl font-semibold text-white">Create & Share</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Post photos and thoughts quickly through an easy, intuitive creation flow.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="bg-[#141D29] py-24">
            <div className="mx-auto max-w-6xl px-8">
              <div className="max-w-3xl">
                <div className="inline-block">
                  <h2 className="text-2xl font-semibold text-white">
                    About
                  </h2>
                  <div className="mt-2 h-1 w-full rounded-full bg-[#EE7951]" />
                </div>

                <p className="mt-6 text-lg leading-relaxed text-white/75">
                  Sigmas Hub was created by me, Eyal Raifler, as a final school project for cyber class,
                  with the goal of learning how real social platforms are built from the ground up. I wanted
                  to understand how frontend design, backend logic, databases, and user interaction all come
                  together in a working product.
                  <br /><br />
                  I built the platform independently, handling everything from the visual design to the core
                  functionality. The project is inspired by Instagram-style social networks and focuses on
                  features like posting content, discovering others, and interacting through a clean, modern interface.
                  <br /><br />
                  This is an educational project, not a commercial product.
                  <br /><br />
                  It is an open source project, so you're more than welcome to go and check up the code, here:{" "}
                  <a
                    href="https://github.com/eyalraifler/sigmashub"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    github
                  </a>
                  .
                  <br /><br />
                  Big thanks to my teacher, Amir, for directing and helping me every time I needed help.
                </p>
              </div>
            </div>
          </section>



        </div>

      </section>
      

    </main>
  )
}