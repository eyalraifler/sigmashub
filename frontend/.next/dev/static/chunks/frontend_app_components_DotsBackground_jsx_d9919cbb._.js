(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/frontend/app/components/DotsBackground.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ToneDotsBg
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function ToneDotsBg() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(8);
    if ($[0] !== "ab501cfe07d1cd91cac646144077c525ee7a123bfc4c24bd4a42e1cd9941df55") {
        for(let $i = 0; $i < 8; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ab501cfe07d1cd91cac646144077c525ee7a123bfc4c24bd4a42e1cd9941df55";
    }
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ({
            "ToneDotsBg[useEffect()]": ()=>{
                const el = ref.current;
                if (!el) {
                    return;
                }
                const onMove = {
                    "ToneDotsBg[useEffect() > onMove]": (e)=>{
                        const r = el.getBoundingClientRect();
                        const x = e.clientX - r.left;
                        const y = e.clientY - r.top;
                        el.style.setProperty("--mx", `${x}px`);
                        el.style.setProperty("--my", `${y}px`);
                        el.style.setProperty("--px", `${(x / r.width - 0.5) * 2}`);
                        el.style.setProperty("--py", `${(y / r.height - 0.5) * 2}`);
                    }
                }["ToneDotsBg[useEffect() > onMove]"];
                const onLeave = {
                    "ToneDotsBg[useEffect() > onLeave]": ()=>{
                        el.style.setProperty("--mx", "-9999px");
                        el.style.setProperty("--my", "-9999px");
                        el.style.setProperty("--px", "0");
                        el.style.setProperty("--py", "0");
                    }
                }["ToneDotsBg[useEffect() > onLeave]"];
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseleave", onLeave);
                return ()=>{
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseleave", onLeave);
                };
            }
        })["ToneDotsBg[useEffect()]"];
        t1 = [];
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    let t3;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = {
            "--mx": "-9999px",
            "--my": "-9999px",
            "--px": "0",
            "--py": "0"
        };
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute inset-0 bg-black"
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/DotsBackground.jsx",
            lineNumber: 67,
            columnNumber: 10
        }, this);
        $[3] = t2;
        $[4] = t3;
    } else {
        t2 = $[3];
        t3 = $[4];
    }
    let t4;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute inset-0 opacity-70",
            style: {
                backgroundImage: "\n            radial-gradient(circle, rgba(255,80,80,0.55) 1px, transparent 1.5px),\n            radial-gradient(circle, rgba(90,200,255,0.45) 1px, transparent 1.6px),\n            radial-gradient(circle, rgba(140,255,160,0.40) 1px, transparent 1.6px)\n          ",
                backgroundSize: "22px 22px, 28px 28px, 34px 34px",
                backgroundPosition: "\n            calc(50% + var(--px) * 10px) calc(50% + var(--py) * 10px),\n            calc(50% + var(--px) * 18px) calc(50% + var(--py) * 18px),\n            calc(50% + var(--px) * 26px) calc(50% + var(--py) * 26px)\n          ",
                filter: "saturate(1.25)"
            }
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/DotsBackground.jsx",
            lineNumber: 76,
            columnNumber: 10
        }, this);
        $[5] = t4;
    } else {
        t4 = $[5];
    }
    let t5;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute inset-0",
            style: {
                backgroundImage: "\n            radial-gradient(240px 240px at var(--mx) var(--my),\n              rgba(255,120,80,0.22),\n              rgba(120,120,255,0.10) 35%,\n              rgba(0,0,0,0) 70%\n            )\n          ",
                mixBlendMode: "screen"
            }
        }, void 0, false, {
            fileName: "[project]/frontend/app/components/DotsBackground.jsx",
            lineNumber: 88,
            columnNumber: 10
        }, this);
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    let t6;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: ref,
            "aria-hidden": "true",
            className: "pointer-events-none fixed inset-0 z-0",
            style: t2,
            children: [
                t3,
                t4,
                t5,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0",
                    style: {
                        background: "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.06), transparent 65%), radial-gradient(900px 700px at 50% 100%, rgba(255,255,255,0.03), transparent 70%)"
                    }
                }, void 0, false, {
                    fileName: "[project]/frontend/app/components/DotsBackground.jsx",
                    lineNumber: 98,
                    columnNumber: 117
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/app/components/DotsBackground.jsx",
            lineNumber: 98,
            columnNumber: 10
        }, this);
        $[7] = t6;
    } else {
        t6 = $[7];
    }
    return t6;
}
_s(ToneDotsBg, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = ToneDotsBg;
var _c;
__turbopack_context__.k.register(_c, "ToneDotsBg");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=frontend_app_components_DotsBackground_jsx_d9919cbb._.js.map