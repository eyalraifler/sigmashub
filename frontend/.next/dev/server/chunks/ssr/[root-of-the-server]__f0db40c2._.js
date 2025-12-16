module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/frontend/app/components/DotsBackground.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ToneDotsBg
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function ToneDotsBg() {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = ref.current;
        if (!el) return;
        const onMove = (e)=>{
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            // px values for gradients
            el.style.setProperty("--mx", `${x}px`);
            el.style.setProperty("--my", `${y}px`);
            // 0..1 values for subtle parallax shift
            el.style.setProperty("--px", `${(x / r.width - 0.5) * 2}`);
            el.style.setProperty("--py", `${(y / r.height - 0.5) * 2}`);
        };
        const onLeave = ()=>{
            el.style.setProperty("--mx", `-9999px`);
            el.style.setProperty("--my", `-9999px`);
            el.style.setProperty("--px", `0`);
            el.style.setProperty("--py", `0`);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseleave", onLeave);
        return ()=>{
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseleave", onLeave);
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        "aria-hidden": "true",
        className: "pointer-events-none fixed inset-0 z-0",
        style: {
            // Default mouse position (offscreen)
            ["--mx"]: "-9999px",
            ["--my"]: "-9999px",
            ["--px"]: "0",
            ["--py"]: "0"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-black"
            }, void 0, false, {
                fileName: "[project]/frontend/app/components/DotsBackground.jsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 opacity-70",
                style: {
                    // Two dot layers with different sizes for depth
                    backgroundImage: `
            radial-gradient(circle, rgba(255,80,80,0.55) 1px, transparent 1.5px),
            radial-gradient(circle, rgba(90,200,255,0.45) 1px, transparent 1.6px),
            radial-gradient(circle, rgba(140,255,160,0.40) 1px, transparent 1.6px)
          `,
                    backgroundSize: "22px 22px, 28px 28px, 34px 34px",
                    backgroundPosition: `
            calc(50% + var(--px) * 10px) calc(50% + var(--py) * 10px),
            calc(50% + var(--px) * 18px) calc(50% + var(--py) * 18px),
            calc(50% + var(--px) * 26px) calc(50% + var(--py) * 26px)
          `,
                    filter: "saturate(1.25)"
                }
            }, void 0, false, {
                fileName: "[project]/frontend/app/components/DotsBackground.jsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0",
                style: {
                    backgroundImage: `
            radial-gradient(240px 240px at var(--mx) var(--my),
              rgba(255,120,80,0.22),
              rgba(120,120,255,0.10) 35%,
              rgba(0,0,0,0) 70%
            )
          `,
                    mixBlendMode: "screen"
                }
            }, void 0, false, {
                fileName: "[project]/frontend/app/components/DotsBackground.jsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0",
                style: {
                    background: "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.06), transparent 65%), radial-gradient(900px 700px at 50% 100%, rgba(255,255,255,0.03), transparent 70%)"
                }
            }, void 0, false, {
                fileName: "[project]/frontend/app/components/DotsBackground.jsx",
                lineNumber: 93,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/app/components/DotsBackground.jsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f0db40c2._.js.map