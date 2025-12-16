// components/ParticlesBackground.js
"use client";

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useState, useEffect, useMemo } from "react";

export default function ParticlesBackground() {
  const [init, setInit] = useState(false);

  // Initialize the tsParticles engine
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Configuration for a dark, subtle, star-like effect
  const options = useMemo(
    () => ({
      // Set the background color to match your body style for safety
      background: {
        color: {
          value: "#141D29", 
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          // Subtle effect when the mouse hovers
          onHover: {
            enable: true,
            mode: "attract",
          },
        },
        modes: {
          attract: {
            distance: 200,
            duration: 0.4,
            speed: 1,
          },
        },
      },
      particles: {
        number: {
          value: 80, // Number of particles
        },
        color: {
          value: "#ffffff", // White particles (can be soft orange/blue)
        },
        links: {
          enable: false, // No lines connecting particles (like stars)
        },
        move: {
          enable: true,
          speed: 0.2, // Very slow movement
          direction: "none",
          random: true,
          straight: false,
          outModes: {
            default: "out",
          },
        },
        opacity: {
          value: { min: 0.1, max: 0.5 }, // Faint, twinkling effect
          animation: {
            enable: true,
            speed: 1,
            minimumValue: 0.1,
          },
        },
        size: {
          value: { min: 1, max: 2 }, // Small, star-like sizes
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (init) {
    // Crucial positioning for background: z-index -1 to put it behind content
    return (
      <div className="fixed inset-0 z-[-1]">
        <Particles id="tsparticles" options={options} />
      </div>
    );
  }

  return null;
}