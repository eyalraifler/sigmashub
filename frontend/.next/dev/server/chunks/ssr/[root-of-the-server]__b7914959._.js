module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/frontend/app/components/ToneDotsBg.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DotsCanvasBg
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function DotsCanvasBg() {
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        let w = 0;
        let h = 0;
        const mouse = {
            x: -9999,
            y: -9999
        };
        const dots = [];
        const spacing = 26; // smaller = more dots (try 20-34)
        const baseRMin = 0.9;
        const baseRMax = 1.6;
        const influence = 140; // px
        const pushStrength = 22; // px
        function resize() {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            dots.length = 0;
            // grid-ish distribution (looks like "little dots everywhere")
            const cols = Math.ceil(w / spacing);
            const rows = Math.ceil(h / spacing);
            for(let y = 0; y <= rows; y++){
                for(let x = 0; x <= cols; x++){
                    const ox = x * spacing + (Math.random() - 0.5) * 10;
                    const oy = y * spacing + (Math.random() - 0.5) * 10;
                    dots.push({
                        ox,
                        oy,
                        x: ox,
                        y: oy,
                        r: baseRMin + Math.random() * (baseRMax - baseRMin),
                        hue: 180 + Math.random() * 160
                    });
                }
            }
        }
        function onMove(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }
        function onLeave() {
            mouse.x = -9999;
            mouse.y = -9999;
        }
        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", onMove, {
            passive: true
        });
        window.addEventListener("mouseleave", onLeave);
        resize();
        let raf = 0;
        function draw() {
            ctx.clearRect(0, 0, w, h);
            // subtle top glow (tonemaki-ish depth)
            const g = ctx.createRadialGradient(w * 0.5, h * 0.1, 0, w * 0.5, h * 0.1, Math.max(w, h) * 0.8);
            g.addColorStop(0, "rgba(255,255,255,0.06)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            for (const d of dots){
                const dx = d.x - mouse.x;
                const dy = d.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const t = Math.max(0, 1 - dist / influence); // 0..1
                // push away from mouse
                let px = 0, py = 0;
                if (t > 0) {
                    const nx = dx / (dist || 1);
                    const ny = dy / (dist || 1);
                    const s = t * t; // stronger close to cursor
                    px = nx * pushStrength * s;
                    py = ny * pushStrength * s;
                }
                // ease to target (origin + push)
                d.x += (d.ox + px - d.x) * 0.08;
                d.y += (d.oy + py - d.y) * 0.08;
                const hue = d.hue + t * 120; // color shifts near mouse
                const alpha = 0.22 + t * 0.55; // brighter near mouse
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
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        className: "fixed inset-0 -z-10 block",
        "aria-hidden": "true"
    }, void 0, false, {
        fileName: "[project]/frontend/app/components/ToneDotsBg.jsx",
        lineNumber: 132,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b7914959._.js.map