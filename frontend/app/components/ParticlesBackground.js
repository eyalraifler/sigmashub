"use client";

import { useCallback, useMemo } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "tsparticles-slim";

export default function ParticlesBg() {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },

      background: {
        color: {
          value: "transparent", // IMPORTANT
        },
      },

      fpsLimit: 60,

      particles: {
        number: {
          value: 140,
          density: { enable: true, area: 900 },
        },
        color: { value: ["#ff4b4b", "#4bffdb", "#ffd74b", "#7b4bff", "#4b7bff"] },
        opacity: { value: { min: 0.2, max: 0.9 } },
        size: { value: { min: 1, max: 4 } },
        move: { enable: true, speed: 0.6 },

        links: {
          enable: false,
        },
      },

      interactivity: {
        detect_on: "window",
        events: {
          onHover: { enable: true, mode: ["bubble"] },
          resize: true,
        },
        modes: {
          bubble: {
            distance: 160,
            size: 6,
            duration: 0.4,
            opacity: 1,
            color: { value: ["#ff4b4b", "#4bffdb", "#ffd74b", "#7b4bff", "#4b7bff"] },
          },
        },
      },

      detectRetina: true,
    }),
    []
  );

  return (
    <Particles
      init={particlesInit}
      options={options}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
