"use client";

import { useEffect, useRef } from "react";

export default function PostSuccessAnimation({ onDone }) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let tl;

    import("animejs/lib/anime.es.js").then((mod) => {
      const anime = mod.default ?? mod;

      const icons_x_offset = -50;
      const icons_fadeout_delay = 400;
      const rays_animation_delay = 2300;
      const rays_animation_delay2 = 2400;
      const checkmark_delay = 2200;
      const rays_fadeOut_delay = 3200;

      tl = anime.timeline({ autoplay: true, loop: false });

      tl
        .add({ targets: "#ps-phone", opacity: [0, 1], easing: "easeInQuad", duration: 200 }, 50)
        .add({ targets: "#ps-email", opacity: [0, 1], easing: "easeInQuad", duration: 200 })
        .add({ targets: "#ps-apps", opacity: [0, 1], easing: "easeInQuad", duration: 200 }, "-=100")
        .add({ targets: "#ps-photos", opacity: [0, 1], easing: "easeInQuad", duration: 200 }, "-=100")
        .add({ targets: "#ps-contacts", opacity: [0, 1], easing: "easeInQuad", duration: 200 }, "-=100")

        .add({
          targets: "#ps-email",
          opacity: { value: [1, 0], delay: icons_fadeout_delay, duration: 300 },
          easing: "easeInQuad",
          translateY: [-50, 150],
          translateX: { value: [icons_x_offset, 0], delay: 50 },
          duration: 500,
        }, "-=500")
        .add({
          targets: "#ps-apps",
          opacity: { value: [1, 0], delay: icons_fadeout_delay, duration: 300 },
          easing: "easeInQuad",
          translateY: [-20, 220],
          translateX: { value: [icons_x_offset, 0], delay: 50 },
          duration: 500,
        }, "-=500")
        .add({
          targets: "#ps-photos",
          opacity: { value: [1, 0], delay: icons_fadeout_delay, duration: 300 },
          easing: "easeInQuad",
          translateY: [-20, 290],
          translateX: { value: [icons_x_offset, 0], delay: 60 },
          duration: 500,
        }, "-=500")
        .add({
          targets: "#ps-contacts",
          opacity: { value: [1, 0], delay: 400, duration: 300 },
          easing: "easeInQuad",
          translateY: [-20, 360],
          translateX: { value: [icons_x_offset, 0], delay: 70 },
          duration: 500,
        }, "-=500")

        .add({
          targets: "#ps-phone",
          easing: "easeInOutQuad",
          rotate: [-8, 0],
          duration: 1000,
        }, "-=1400")

        .add({
          targets: "#ps-Line",
          strokeDashoffset: [anime.setDashoffset, 0],
          duration: 600,
          easing: "easeInOutSine",
        }, "-=500")

        // checkmark
        .add({
          targets: "#ps-checkmark_group",
          scale: [0, 1],
          rotate: [190, 0],
          opacity: [0, 1],
          duration: 1000,
        }, checkmark_delay)
        .add({
          targets: "#ps-Line_2",
          strokeDashoffset: [anime.setDashoffset, 0],
          duration: 500,
          easing: "easeInOutSine",
        }, checkmark_delay)

        // rays
        .add({ targets: "#ps-line1", translateY: [40, 0], translateX: [-19, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay2)
        .add({ targets: "#ps-line2", translateY: [40, 0], translateX: [-100, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay)
        .add({ targets: "#ps-line3", translateY: [-10, 0], translateX: [-30, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay2)
        .add({ targets: "#ps-line4", translateY: [-20, 0], translateX: [-10, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay)
        .add({ targets: "#ps-line5", translateY: [-20, 0], translateX: [5, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay2)
        .add({ targets: "#ps-line6", translateY: [-20, 0], translateX: [25, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay)
        .add({ targets: "#ps-line7", translateY: [5, 0], translateX: [20, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay2)
        .add({ targets: "#ps-line8", translateY: [20, 0], translateX: [10, 0], opacity: { value: [0, 1], delay: 50 }, duration: 1000 }, rays_animation_delay)
        .add({ targets: ["#ps-line1", "#ps-line2", "#ps-line3", "#ps-line4", "#ps-line5", "#ps-line6", "#ps-line7", "#ps-line8"], opacity: [1, 0], duration: 300, easing: "easeInSine" }, rays_fadeOut_delay)

        // bells
        .add({ targets: "#ps-bell_1", translateY: [5, 0], translateX: [70, 0], opacity: { value: [0, 1], delay: 50 }, duration: 800 }, 1450)
        .add({ targets: "#ps-bell_2", translateY: [5, 0], translateX: [70, 0], opacity: { value: [0, 1], delay: 50 }, duration: 800 }, 1400)
        .add({ targets: ["#ps-bell_stroke_1", "#ps-bell_stroke_2", "#ps-bell_stroke_3"], strokeDashoffset: [anime.setDashoffset, 0], duration: 300, easing: "easeOutQuad" }, 1600)
        .add({ targets: ["#ps-bell_stroke_4", "#ps-bell_stroke_5", "#ps-bell_stroke_6"], strokeDashoffset: [anime.setDashoffset, 0], duration: 300, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_1", translateY: [20, 0], translateX: [-5, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_2", translateY: [20, 0], translateX: [15, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_3", translateY: [5, 0], translateX: [15, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_4", translateY: [5, 0], translateX: [15, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1800)
        .add({ targets: "#ps-bell_circ_5", translateY: [5, 0], translateX: [15, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1800)
        .add({ targets: "#ps-bell_circ_6", translateY: [5, 0], translateX: [15, 0], opacity: { value: [0, 1] }, duration: 500, easing: "easeOutQuad" }, 1800)
        .add({ targets: "#ps-bell_circ_7", translateY: [30, 0], translateX: [40, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_8", translateY: [30, 0], translateX: [-5, 0], opacity: { value: [0, 1] }, duration: 700, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_9", translateY: [30, 0], translateX: [30, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-bell_circ_10", translateY: [10, 0], translateX: [-30, 0], opacity: { value: [0, 1] }, duration: 400, easing: "easeOutQuad" }, 1800)
        .add({ targets: "#ps-bell_circ_11", translateY: [10, 0], translateX: [-30, 0], opacity: { value: [0, 1] }, duration: 500, easing: "easeOutQuad" }, 1850)
        .add({ targets: "#ps-bell_circ_12", translateY: [10, 0], translateX: [-30, 0], opacity: { value: [0, 1] }, duration: 600, easing: "easeOutQuad" }, 1900)

        // stars & sparks
        .add({ targets: "#ps-star_1", rotate: [180, 0], opacity: { value: [0, 1], delay: 20, duration: 500 }, duration: 1000, easing: "easeOutQuad" }, 1700)
        .add({ targets: "#ps-star_2", rotate: [-250, 0], opacity: { value: [0, 1], delay: 20, duration: 500 }, duration: 800, easing: "easeOutQuad" }, 1750)
        .add({ targets: "#ps-star_3", rotate: [-250, 0], opacity: { value: [0, 1], delay: 20, duration: 500 }, duration: 1000, easing: "easeOutQuad" }, 1800)
        .add({ targets: "#ps-spark_line_1", translateY: [50, 0], translateX: [5, 0], opacity: { value: [0, 1], delay: 20, duration: 200 }, duration: 500 }, 1800)
        .add({ targets: "#ps-spark_line_3", translateY: [40, 0], opacity: { value: [0, 1], delay: 20, duration: 200 }, duration: 500 }, 1850)
        .add({ targets: "#ps-spark_line_2", translateY: [20, 0], translateX: [-50, 0], opacity: { value: [0, 1], delay: 20, duration: 200 }, duration: 500 }, 1900)

        // bg lines
        .add({
          targets: ["#ps-bgline_1", "#ps-bgline_2", "#ps-bgline_3", "#ps-bgline_4", "#ps-bgline_5"],
          strokeDashoffset: [anime.setDashoffset, 0],
          opacity: [0, 1],
          duration: 1500,
          easing: "easeOutSine",
        }, 1000)

        // fade out whole thing
        .add({
          targets: "#ps-completed",
          opacity: [1, 0],
          duration: 500,
          easing: "easeOutSine",
          endDelay: 500,
        }, 4500);

      // dismiss overlay after animation finishes
      setTimeout(() => {
        if (onDone) onDone();
      }, 5600);
    });

    return () => {
      if (tl) tl.pause();
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="500"
        height="500"
        viewBox="0 130 365 371"
        fill="none"
      >
        <g id="ps-completed">
          <path id="ps-bgline_5" d="M310.428 433.503H33.6582" stroke="#ECECEC" strokeWidth="21.4836" strokeLinecap="round"/>
          <path id="ps-bgline_4" d="M274.588 413.201H94.2936" stroke="#ECECEC" strokeWidth="21.4836" strokeLinecap="round"/>
          <path id="ps-bgline_3" d="M267.55 454.098H119.414" stroke="#ECECEC" strokeWidth="21.4836" strokeLinecap="round"/>
          <path id="ps-bgline_2" d="M300.393 378.002H271.9" stroke="#ECECEC" strokeWidth="21.4836" strokeLinecap="round"/>
          <path id="ps-bgline_1" d="M77.5288 466.516H58.4198" stroke="#ECECEC" strokeWidth="21.4836" strokeLinecap="round"/>
          <path id="ps-star_1" d="M77.8884 343.515C76.4244 341.835 73.6864 342.471 73.2169 344.6L71.1685 353.891C70.9783 354.754 70.3635 355.456 69.5284 355.765L60.3898 359.146C58.2434 359.94 58.0918 362.879 60.1401 363.983L68.4384 368.456C69.2771 368.909 69.8258 369.755 69.8848 370.689L70.4629 379.825C70.6037 382.05 73.2761 383.197 74.9588 381.755L82.4502 375.336C83.1006 374.779 83.9908 374.572 84.8412 374.781L94.6358 377.185C96.8359 377.725 98.6377 375.538 97.6672 373.506L93.6821 365.161C93.2748 364.309 93.3439 363.318 93.8641 362.551L99.0114 354.954C100.282 353.079 98.7012 350.543 96.4094 350.78L86.6514 351.788C85.7597 351.88 84.8693 351.527 84.276 350.846L77.8884 343.515Z" fill="white" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round" style={{transformOrigin:"center center",transformBox:"fill-box"}}/>
          <path id="ps-star_3" d="M273.395 445.423C273.16 444.365 271.796 444.051 271.061 444.887L265.678 451.009C265.379 451.349 264.934 451.525 264.489 451.479L256.209 450.636C255.06 450.519 254.264 451.791 254.902 452.726L259.303 459.173C259.565 459.556 259.599 460.053 259.392 460.481L255.991 467.531C255.501 468.545 256.397 469.636 257.499 469.367L265.73 467.36C266.153 467.257 266.596 467.358 266.919 467.633L273.208 472.977C274.05 473.692 275.386 473.114 275.458 472.004L275.958 464.288C275.989 463.819 276.266 463.394 276.689 463.167L283.798 459.366C284.829 458.814 284.759 457.343 283.682 456.948L275.93 454.108C275.513 453.955 275.207 453.607 275.111 453.177L273.395 445.423Z" fill="white" stroke="black" strokeWidth="2.71871" strokeLinecap="round" strokeLinejoin="round" style={{transformOrigin:"center center",transformBox:"fill-box"}}/>
          <path id="ps-star_2" d="M53.3703 414.022C52.2617 413.702 51.2451 414.729 51.6676 415.742L53.4098 419.919C53.5797 420.326 53.5189 420.788 53.248 421.146L50.4671 424.822C49.7916 425.715 50.5177 426.939 51.6802 426.867L56.4488 426.57C56.9167 426.541 57.3673 426.736 57.6464 427.088L60.489 430.673C61.1812 431.546 62.6468 431.274 62.9413 430.218L64.1578 425.855C64.2758 425.432 64.6127 425.091 65.0542 424.95L69.6037 423.488C70.7052 423.134 70.8856 421.743 69.9056 421.161L65.8812 418.769C65.4861 418.535 65.2454 418.128 65.2415 417.688L65.202 413.207C65.1924 412.115 63.8369 411.527 62.9374 412.225L59.2345 415.098C58.8738 415.378 58.3878 415.469 57.942 415.341L53.3703 414.022Z" fill="white" stroke="black" strokeWidth="2.71871" strokeLinecap="round" strokeLinejoin="round" style={{transformOrigin:"center center",transformBox:"fill-box"}}/>
          <g id="ps-bell_2">
            <g>
              <path fillRule="evenodd" clipRule="evenodd" d="M117.931 433.013L157.569 463.666C158.975 464.756 160.974 464.849 162.494 463.894C164.011 462.935 164.686 461.157 164.157 459.511L149.285 413.099" fill="white"/>
              <path d="M117.931 433.013L157.569 463.666C158.975 464.756 160.974 464.849 162.494 463.894C164.011 462.935 164.686 461.157 164.157 459.511L149.285 413.099" stroke="black" strokeWidth="3.62495" strokeLinejoin="round"/>
            </g>
            <path fillRule="evenodd" clipRule="evenodd" d="M148.55 410.653C151.346 414.601 146.264 422.434 137.193 428.151C128.119 433.864 118.509 435.297 115.705 431.351C112.912 427.403 118.002 419.569 127.062 413.853C136.136 408.137 145.753 406.705 148.55 410.653Z" fill="white" stroke="black" strokeWidth="3.62495" strokeLinejoin="round"/>
          </g>
          <path id="ps-bell_stroke_1" d="M134.225 403.415C128.639 395.52 130.891 384.842 139.255 379.565" stroke="#CD040B" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_stroke_3" d="M114.018 416.153C108.428 408.258 97.1119 406.134 88.7334 411.409" stroke="#CD040B" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_stroke_2" d="M121.099 395.201L119.406 382.486" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_circ_2" fillRule="evenodd" clipRule="evenodd" d="M108.973 385.2C109.532 385.993 109.305 387.071 108.466 387.602C107.624 388.133 106.482 387.919 105.919 387.124C105.356 386.33 105.583 385.253 106.426 384.722C107.268 384.191 108.41 384.405 108.973 385.2Z" stroke="#CD040B" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_circ_1" fillRule="evenodd" clipRule="evenodd" d="M144.541 394.218C145.103 395.013 144.876 396.09 144.034 396.621C143.192 397.152 142.05 396.938 141.487 396.143C140.924 395.349 141.151 394.271 141.993 393.74C142.836 393.21 143.978 393.424 144.541 394.218Z" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <g id="ps-bell_1">
            <g>
              <path fillRule="evenodd" clipRule="evenodd" d="M124.282 438.239L164.322 461.061C165.746 461.87 166.439 463.464 166.032 464.988C165.62 466.512 164.204 467.601 162.541 467.674L115.677 469.753" fill="white"/>
              <path d="M124.282 438.239L164.322 461.061C165.746 461.87 166.439 463.464 166.032 464.988C165.62 466.512 164.204 467.601 162.541 467.674L115.677 469.753" stroke="black" strokeWidth="3.62495" strokeLinejoin="round"/>
            </g>
            <path fillRule="evenodd" clipRule="evenodd" d="M113.223 469.902C117.677 470.968 123.271 464.456 125.72 455.352C128.164 446.247 126.542 438.012 122.088 436.939C117.636 435.875 112.042 442.395 109.591 451.489C107.144 460.596 108.77 468.836 113.223 469.902Z" fill="white" stroke="black" strokeWidth="3.62495" strokeLinejoin="round"/>
          </g>
          <path id="ps-bell_stroke_6" d="M102.254 460.483C93.3501 458.357 84.2978 463.439 82.0343 471.836" stroke="#CD040B" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_stroke_5" d="M90.7608 452.336L78.6481 454.838" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_stroke_4" d="M93.4904 442.199L84.1003 434.553" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_circ_3" fillRule="evenodd" clipRule="evenodd" d="M102.346 428.928C103.244 429.145 104.157 428.632 104.383 427.784C104.611 426.939 104.067 426.077 103.171 425.863C102.275 425.648 101.361 426.161 101.134 427.006C100.906 427.852 101.45 428.713 102.346 428.928Z" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_circ_4" fillRule="evenodd" clipRule="evenodd" d="M77.9424 445.544C78.8369 445.756 79.7502 445.243 79.9794 444.401C80.2068 443.555 79.6632 442.694 78.7669 442.479C77.8707 442.265 76.9574 442.777 76.73 443.623C76.5026 444.468 77.0462 445.33 77.9424 445.544Z" stroke="#CD040B" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="ps-bell_circ_5" fillRule="evenodd" clipRule="evenodd" d="M97.0098 471.658C97.906 471.872 98.8193 471.36 99.0467 470.514C99.2742 469.669 98.7305 468.807 97.8343 468.593C96.9381 468.378 96.0248 468.891 95.7974 469.736C95.57 470.582 96.1136 471.443 97.0098 471.658Z" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeLinejoin="round"/>
          <g id="ps-phone" style={{transformOrigin:"center center",transformBox:"fill-box"}}>
            <g>
              <path fillRule="evenodd" clipRule="evenodd" d="M217.242 464.046C216.378 469.23 211.216 472.776 205.721 471.961L160.916 465.319C155.42 464.504 151.661 459.636 152.525 454.452L167.39 365.231C168.254 360.042 173.415 356.5 178.911 357.315L223.715 363.957C229.211 364.772 232.971 369.636 232.107 374.825L217.242 464.046Z" fill="white"/>
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M217.917 463.452C217.06 468.601 211.864 472.112 206.32 471.291L161.127 464.591C155.583 463.769 151.78 458.923 152.637 453.775L167.401 365.166C168.259 360.013 173.454 356.506 178.998 357.328L224.192 364.028C229.735 364.85 233.539 369.69 232.681 374.844L217.917 463.452Z" stroke="black" strokeWidth="3.881" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M187.044 361.718L215.103 365.877" stroke="black" strokeWidth="3.881" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </g>
            <path id="ps-Line" d="M167.446 414.707L161.148 452.494C160.739 454.944 162.428 457.231 164.92 457.6L183.168 460.307" stroke="black" strokeWidth="3.62495" strokeLinecap="round" strokeDasharray="63.44 9.06"/>
          </g>
          <g id="ps-spark">
            <path id="ps-spark_line_3" d="M237.948 358.798L247.371 347.195" stroke="#CD040B" strokeWidth="3.26107" strokeLinecap="round" strokeLinejoin="round"/>
            <path id="ps-spark_line_2" d="M243.363 366.452L252.052 365.476" stroke="#CD040B" strokeWidth="3.26107" strokeLinecap="round" strokeLinejoin="round"/>
            <path id="ps-spark_line_1" d="M228.676 355.718L227.23 345.416" stroke="#CD040B" strokeWidth="3.26107" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <g id="ps-checkmark_group" style={{transformOrigin:"center center",transformBox:"fill-box"}}>
            <g style={{transformOrigin:"center center",transformBox:"fill-box"}}>
              <g id="ps-checkmark_circle" style={{transformOrigin:"center center",transformBox:"fill-box"}}>
                <path d="M220.872 463.206C233.761 463.206 244.199 452.734 244.199 439.829C244.199 426.924 233.761 416.451 220.872 416.451C207.984 416.451 197.546 426.924 197.546 439.829C197.546 452.734 207.984 463.206 220.872 463.206Z" fill="#00AC3E" stroke="white" strokeWidth="5.2"/>
                <path id="ps-Line_2" d="M211.41 437.432L218.294 444.707L229.263 432.955" stroke="white" strokeWidth="4.49741"/>
              </g>
              <g id="ps-line1" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="241.288" y1="374.271" x2="234.874" y2="398.207" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line2" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="282.736" y1="408.681" x2="261.276" y2="421.071" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line3" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="287.715" y1="462.316" x2="263.779" y2="455.902" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line4" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="253.307" y1="503.764" x2="240.916" y2="482.303" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line5" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="211.296" y1="486.203" x2="204.882" y2="510.139" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line6" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="182.38" y1="466.619" x2="160.92" y2="479.009" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line7" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="175.782" y1="432.324" x2="151.847" y2="425.911" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
              <g id="ps-line8" style={{transformOrigin:"center center",transformBox:"fill-box"}}><line x1="195.368" y1="403.409" x2="182.977" y2="381.948" stroke="#00AC3E" strokeWidth="5.39689" strokeLinecap="round"/></g>
            </g>
          </g>
          <ellipse id="ps-bell_circ_9" cx="55.7662" cy="323.721" rx="4.36141" ry="4.114" fill="#D91B1B"/>
          <ellipse id="ps-bell_circ_7" cx="46.3619" cy="384.085" rx="4.36141" ry="4.114" fill="black"/>
          <ellipse id="ps-bell_circ_10" cx="285.177" cy="412.675" rx="4.36141" ry="4.114" fill="#D91B1B"/>
          <ellipse id="ps-bell_circ_11" cx="280.816" cy="384.729" rx="4.36141" ry="4.114" fill="#D91B1B"/>
          <ellipse id="ps-bell_circ_12" cx="333.465" cy="393.143" rx="4.36141" ry="4.114" fill="black"/>
          <ellipse id="ps-bell_circ_8" cx="133.355" cy="343.118" rx="4.36141" ry="4.114" fill="#D91B1B"/>
          <ellipse id="ps-bell_circ_6" cx="40.9263" cy="445.996" rx="4.36141" ry="4.114" fill="#D91B1B"/>
          <g id="ps-contacts">
            <g>
              <rect x="164.379" y="28.7227" width="28.9242" height="7.27991" fill="white"/>
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M197.723 33.7764V25.3904H168.373C166.058 25.3904 164.18 27.2668 164.18 29.5834C164.18 31.8979 166.058 33.7764 168.373 33.7764H199.82V73.6096H168.373C166.058 73.6096 164.18 71.7311 164.18 69.4166V29.5834" fill="white"/>
                <path d="M197.723 33.7764V25.3904H168.373C166.058 25.3904 164.18 27.2668 164.18 29.5834C164.18 31.8979 166.058 33.7764 168.373 33.7764H199.82V73.6096H168.373C166.058 73.6096 164.18 71.7311 164.18 69.4166V29.5834" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <path d="M168.373 29.5834H193.531V33.7764" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M187.241 47.4035C187.241 50.2988 184.895 52.6447 182 52.6447C179.105 52.6447 176.759 50.2988 176.759 47.4035C176.759 44.5083 179.105 42.1623 182 42.1623C184.895 42.1623 187.241 44.5083 187.241 47.4035Z" stroke="#D63339" strokeWidth="2.5" strokeLinejoin="round"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M182 52.6447C178.526 52.6447 172.565 55.0221 172.565 63.1271H191.434C191.434 55.0221 185.471 52.6447 182 52.6447Z" stroke="#D63339" strokeWidth="2.5" strokeLinejoin="round"/>
            </g>
          </g>
          <g id="ps-photos">
            <rect x="173.521" y="111.309" width="32.4903" height="33.1789" transform="rotate(5.56323 173.521 111.309)" fill="white"/>
            <g>
              <path fillRule="evenodd" clipRule="evenodd" d="M159.707 138.524H197.026V101.205H159.707V138.524Z" fill="white" stroke="black" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M190.438 131.938L183.853 115.474L178.364 127.548L172.876 120.962L166.291 131.938" stroke="#D63339" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M201.432 114.115L205.805 114.512L202.813 147.305L170.02 144.313" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M159.705 131.939H197.025" stroke="black" strokeWidth="2.5" strokeLinejoin="round"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M172.876 111.083C172.876 112.901 171.401 114.376 169.583 114.376C167.766 114.376 166.291 112.901 166.291 111.083C166.291 109.266 167.766 107.791 169.583 107.791C171.401 107.791 172.876 109.266 172.876 111.083Z" stroke="#D63339" strokeWidth="2.5" strokeLinejoin="round"/>
            </g>
          </g>
          <g id="ps-apps">
            <g>
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M182 208.625L158.109 198.125V179.151L182 168.764L205.891 179.151V198.125L182 208.625Z" fill="white"/>
                <path d="M205.891 185.384L182 195.771L158.109 185.384" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M205.891 191.616L182 202.003L158.109 191.616" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M205.891 197.849L182 208.236L158.109 197.849" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <g>
                  <path fillRule="evenodd" clipRule="evenodd" d="M182 189.539L158.109 179.151L182 168.764L205.891 179.151L182 189.539Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M182 189.539L158.109 179.151L182 168.764L205.891 179.151L182 189.539Z" fill="white"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M182 189.539L158.109 179.151L182 168.764L205.891 179.151L182 189.539Z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </g>
              <g>
                <g>
                  <path fillRule="evenodd" clipRule="evenodd" d="M175.474 181.581C175.474 181.581 184.707 183.06 188.006 181.619C191.811 179.958 189.102 176.633 183.606 178.03C187.362 175.387 182.248 173.113 178.443 174.774C175.144 176.215 175.474 181.581 175.474 181.581Z" stroke="#D52B1E" strokeWidth="2.5" strokeLinejoin="round"/>
                </g>
              </g>
            </g>
          </g>
          <g id="ps-email">
            <g>
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M196.844 249.467L204.761 254.995V276.102C204.761 277.766 203.431 279.117 201.792 279.117H162.207C160.568 279.117 159.238 277.766 159.238 276.102V254.995L167.155 249.467" fill="white"/>
                <path d="M196.844 249.467L204.761 254.995V276.102C204.761 277.766 203.431 279.117 201.792 279.117H162.207C160.568 279.117 159.238 277.766 159.238 276.102V254.995L167.155 249.467" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <path d="M165.176 273.087L175.073 265.046H188.927L198.824 273.087" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M204.761 254.995L192.886 263.036" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M159.238 254.995L171.114 263.036" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M196.844 260.356V232.883H167.155V260.356" fill="white"/>
                <path d="M196.844 260.356V232.883H167.155V260.356" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <path fillRule="evenodd" clipRule="evenodd" d="M185.485 247.959C185.485 249.915 183.925 251.499 181.999 251.499C180.075 251.499 178.516 249.915 178.516 247.959C178.516 246.003 180.075 244.419 181.999 244.419C183.925 244.419 185.485 246.003 185.485 247.959Z" stroke="#D52B1E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M187.033 255.433C185.602 256.43 183.866 257.005 182 257.005C177.081 257.005 173.093 252.956 173.093 247.959C173.093 242.963 177.081 238.913 182 238.913C186.918 238.913 190.907 242.963 190.907 247.959V248.747C190.907 250.267 189.693 251.499 188.197 251.499C186.699 251.499 185.485 250.267 185.485 248.747V247.959" stroke="#D52B1E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
