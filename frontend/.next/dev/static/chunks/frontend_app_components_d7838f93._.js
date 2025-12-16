(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/frontend/app/components/ToneDotsBg.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DotsCanvasBg
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function DotsCanvasBg() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(4);
    if ($[0] !== "4156359ef79180f62d1e2d8fbf1d08926a1d7526eaa69f3c90f8fb9839fa0639") {
        for(let $i = 0; $i < 4; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "4156359ef79180f62d1e2d8fbf1d08926a1d7526eaa69f3c90f8fb9839fa0639";
    }
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "DotsCanvasBg[useEffect()]": ()=>{
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    return;
                }
                const dpr = Math.min(2, window.devicePixelRatio || 1);
                let w = 0;
                let h = 0;
                const mouse = {
                    x: -9999,
                    y: -9999
                };
                const dots = [];
                const resize = function resize() {
                    w = window.innerWidth;
                    h = window.innerHeight;
                    canvas.width = Math.floor(w * dpr);
                    canvas.height = Math.floor(h * dpr);
                    canvas.style.width = `${w}px`;
                    canvas.style.height = `${h}px`;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    dots.length = 0;
                    const cols = Math.ceil(w / 26);
                    const rows = Math.ceil(h / 26);
                    for(let y = 0; y <= rows; y++){
                        for(let x = 0; x <= cols; x++){
                            const ox = x * 26 + (Math.random() - 0.5) * 10;
                            const oy = y * 26 + (Math.random() - 0.5) * 10;
                            dots.push({
                                ox,
                                oy,
                                x: ox,
                                y: oy,
                                r: 0.9 + Math.random() * 0.7000000000000001,
                                hue: 180 + Math.random() * 160
                            });
                        }
                    }
                };
                const onMove = function onMove(e) {
                    mouse.x = e.clientX;
                    mouse.y = e.clientY;
                };
                const onLeave = function onLeave() {
                    mouse.x = -9999;
                    mouse.y = -9999;
                };
                window.addEventListener("resize", resize);
                window.addEventListener("mousemove", onMove, {
                    passive: true
                });
                window.addEventListener("mouseleave", onLeave);
                resize();
                let raf = 0;
                function draw() {
                    ctx.clearRect(0, 0, w, h);
                    const g = ctx.createRadialGradient(w * 0.5, h * 0.1, 0, w * 0.5, h * 0.1, Math.max(w, h) * 0.8);
                    g.addColorStop(0, "rgba(255,255,255,0.06)");
                    g.addColorStop(1, "rgba(0,0,0,0)");
                    ctx.fillStyle = g;
                    ctx.fillRect(0, 0, w, h);
                    for (const d of dots){
                        const dx = d.x - mouse.x;
                        const dy = d.y - mouse.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const t = Math.max(0, 1 - dist / 140);
                        let px = 0;
                        let py = 0;
                        if (t > 0) {
                            const nx = dx / (dist || 1);
                            const ny = dy / (dist || 1);
                            const s = t * t;
                            px = nx * 22 * s;
                            py = ny * 22 * s;
                        }
                        d.x = d.x + (d.ox + px - d.x) * 0.08;
                        d.y = d.y + (d.oy + py - d.y) * 0.08;
                        const hue = d.hue + t * 120;
                        const alpha = 0.22 + t * 0.55;
                        const radius = d.r + t * 1.2;
                        ctx.beginPath();
                        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
                        ctx.fillStyle = `hsla(${hue}, 95%, 65%, ${alpha})`;
                        ctx.fill();
                    }
                    raf = requestAnimationFrame(draw);
                }
                raf = requestAnimationFrame(draw);
                return ()=>{
                    cancelAnimationFrame(raf);
                    window.removeEventListener("resize", resize);
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseleave", onLeave);
                };
            }
        })["DotsCanvasBg[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
            ref: canvasRef,
            className: "fixed inset-0 -z-10 block",
            "aria-hidden": "true"
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/ToneDotsBg.jsx",
            lineNumber: 128,
            columnNumber: 10
        }, this);
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    return t2;
}
_s(DotsCanvasBg, "UJgi7ynoup7eqypjnwyX/s32POg=");
_c = DotsCanvasBg;
var _c;
__turbopack_context__.k.register(_c, "DotsCanvasBg");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/app/components/TiltImage.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TiltImage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function TiltImage(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(20);
    if ($[0] !== "e35e7b16e07a31a0000ddc8d3f60a7f9f002b70ea8be670b93e3556b9dc885b8") {
        for(let $i = 0; $i < 20; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "e35e7b16e07a31a0000ddc8d3f60a7f9f002b70ea8be670b93e3556b9dc885b8";
    }
    const { src, alt, width, height, maxTiltDeg: t1, glare: t2, className: t3 } = t0;
    const maxTiltDeg = t1 === undefined ? 14 : t1;
    const glare = t2 === undefined ? true : t2;
    const className = t3 === undefined ? "" : t3;
    const wrapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t4;
    if ($[1] !== maxTiltDeg) {
        t4 = function onMove(e) {
            const el = wrapRef.current;
            if (!el) {
                return;
            }
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const px = x / r.width;
            const py = y / r.height;
            const rotY = (px - 0.5) * (maxTiltDeg * 2);
            const rotX = -(py - 0.5) * (maxTiltDeg * 2);
            el.style.setProperty("--rx", `${rotX}deg`);
            el.style.setProperty("--ry", `${rotY}deg`);
            el.style.setProperty("--gx", `${px * 100}%`);
            el.style.setProperty("--gy", `${py * 100}%`);
        };
        $[1] = maxTiltDeg;
        $[2] = t4;
    } else {
        t4 = $[2];
    }
    const onMove = t4;
    let t5;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = function onLeave() {
            const el_0 = wrapRef.current;
            if (!el_0) {
                return;
            }
            el_0.style.setProperty("--rx", "0deg");
            el_0.style.setProperty("--ry", "0deg");
            el_0.style.setProperty("--gx", "50%");
            el_0.style.setProperty("--gy", "50%");
        };
        $[3] = t5;
    } else {
        t5 = $[3];
    }
    const onLeave = t5;
    const t6 = `relative inline-block [perspective:900px] ${className}`;
    let t7;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = {
            "--rx": "0deg",
            "--ry": "0deg",
            "--gx": "50%",
            "--gy": "50%"
        };
        $[4] = t7;
    } else {
        t7 = $[4];
    }
    let t8;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = {
            transform: "rotateX(var(--rx)) rotateY(var(--ry)) translateZ(0px)"
        };
        $[5] = t8;
    } else {
        t8 = $[5];
    }
    let t9;
    if ($[6] !== alt || $[7] !== height || $[8] !== src || $[9] !== width) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            src: src,
            alt: alt,
            width: width,
            height: height,
            className: "rounded-2xl select-none",
            draggable: false,
            priority: false
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/TiltImage.jsx",
            lineNumber: 93,
            columnNumber: 10
        }, this);
        $[6] = alt;
        $[7] = height;
        $[8] = src;
        $[9] = width;
        $[10] = t9;
    } else {
        t9 = $[10];
    }
    let t10;
    if ($[11] !== glare) {
        t10 = glare && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-150",
            style: {
                background: "radial-gradient(280px 220px at var(--gx) var(--gy), rgba(255,255,255,0.28), rgba(255,255,255,0) 60%)",
                mixBlendMode: "screen"
            }
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/TiltImage.jsx",
            lineNumber: 104,
            columnNumber: 20
        }, this);
        $[11] = glare;
        $[12] = t10;
    } else {
        t10 = $[12];
    }
    let t11;
    if ($[13] !== t10 || $[14] !== t9) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative rounded-2xl will-change-transform [transform-style:preserve-3d]\r\n                   transition-transform duration-150",
            style: t8,
            children: [
                t9,
                t10
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/app/components/TiltImage.jsx",
            lineNumber: 115,
            columnNumber: 11
        }, this);
        $[13] = t10;
        $[14] = t9;
        $[15] = t11;
    } else {
        t11 = $[15];
    }
    let t12;
    if ($[16] !== onMove || $[17] !== t11 || $[18] !== t6) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: wrapRef,
            onMouseMove: onMove,
            onMouseLeave: onLeave,
            className: t6,
            style: t7,
            children: t11
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/TiltImage.jsx",
            lineNumber: 124,
            columnNumber: 11
        }, this);
        $[16] = onMove;
        $[17] = t11;
        $[18] = t6;
        $[19] = t12;
    } else {
        t12 = $[19];
    }
    return t12;
}
_s(TiltImage, "JHTkXfSwydwAMf5POYLnQr88DCg=");
_c = TiltImage;
var _c;
__turbopack_context__.k.register(_c, "TiltImage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=frontend_app_components_d7838f93._.js.map