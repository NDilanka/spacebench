"""Single source for SpaceBench design tokens.
Writes tokens/tokens.css, tokens/tokens.json, tokens/tokens.ts and js/sb-tokens.js.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.normpath(os.path.join(HERE, ".."))

NEUTRAL = {
    "0": "#FFFFFF", "50": "#FAFAF8", "100": "#F3F3F1", "200": "#E9E9E6", "300": "#DCDCD8",
    "400": "#C2C2BD", "500": "#8A8A84", "600": "#7A7A74", "700": "#5C5C57", "800": "#3A3A37",
    "850": "#2A2A28", "900": "#1B1B1A", "950": "#121211", "1000": "#0A0A09",
}
VIOLET = {
    "50": "#F1EDFF", "100": "#E4DCFF", "200": "#CBBDFF", "300": "#AC95FF", "400": "#8E6BFF",
    "500": "#6B3BFF", "600": "#5526E0", "700": "#411BB0", "800": "#2D137A", "900": "#1B0C4A", "950": "#150B33",
}
ORANGE = {
    "50": "#FFF1E8", "100": "#FFE0CC", "200": "#FFC29E", "300": "#FF9E66", "400": "#FF7A33",
    "500": "#FF5A0A", "600": "#DB4700", "700": "#A83600", "800": "#752600", "900": "#471700", "950": "#2B0E00",
}
NAMES = {
    "n-0": "Card white", "n-100": "Paper", "n-200": "Board", "n-500": "Datum gray", "n-950": "Ink", "n-1000": "Void",
    "violet-500": "Ion violet", "violet-400": "Ion violet, on ink", "orange-500": "Burn orange", "orange-400": "Burn orange, on ink",
}
N = lambda k: NEUTRAL[k]

THEMES = {
    "light": {
        "bg": N("100"), "bg-sunken": N("200"), "surface": N("50"), "surface-raised": N("0"),
        "line": N("300"), "line-strong": N("400"),
        "fg": N("950"), "fg-2": N("700"), "fg-3": N("500"), "fg-inverse": N("100"),
        "alert": "#D92D12",
    },
    "dark": {
        "bg": N("950"), "bg-sunken": N("1000"), "surface": N("900"), "surface-raised": N("850"),
        "line": N("850"), "line-strong": N("800"),
        "fg": N("100"), "fg-2": N("500"), "fg-3": N("600"), "fg-inverse": N("950"),
        "alert": "#FF5A45",
    },
}
# accent: fills and graphics. accent-text: accent used as text on the ground. accent-contrast: text on an accent fill.
SIMS = {
    "parent": {
        "label": "SpaceBench", "rotation": 0,
        "light": {"accent": N("950"), "accent-text": N("950"), "accent-contrast": N("100"), "accent-soft": N("200"), "accent-line": N("400")},
        "dark": {"accent": N("100"), "accent-text": N("100"), "accent-contrast": N("950"), "accent-soft": N("900"), "accent-line": N("800")},
    },
    "dock": {
        "label": "SpaceBench Dock", "rotation": 90,
        "light": {"accent": VIOLET["500"], "accent-text": VIOLET["500"], "accent-contrast": "#FFFFFF", "accent-soft": VIOLET["50"], "accent-line": VIOLET["200"]},
        "dark": {"accent": VIOLET["400"], "accent-text": VIOLET["300"], "accent-contrast": N("1000"), "accent-soft": VIOLET["950"], "accent-line": VIOLET["800"]},
    },
    "landing": {
        "label": "SpaceBench Landing", "rotation": 180,
        "light": {"accent": ORANGE["500"], "accent-text": ORANGE["700"], "accent-contrast": N("950"), "accent-soft": ORANGE["50"], "accent-line": ORANGE["200"]},
        "dark": {"accent": ORANGE["400"], "accent-text": ORANGE["400"], "accent-contrast": N("1000"), "accent-soft": ORANGE["950"], "accent-line": ORANGE["800"]},
    },
}
# Reserved for later simulations. Not assigned; listed so nobody picks a clashing hue.
RESERVE = {"Limb blue": "#1A3DFA", "Signal lime": "#C8F031", "Telemetry mint": "#05DA96", "Abort red": "#E93625"}

FONT = {
    "sans": '"Geist", "Helvetica Neue", Helvetica, Arial, sans-serif',
    "mono": '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
    "matrix": '"SB Matrix", "Geist Mono", ui-monospace, monospace',
}
# name: (size px, line-height, tracking em, weight, family)
TYPE = {
    "display-xl": (120, 0.9, -0.055, 600, "sans"),
    "display": (72, 0.95, -0.05, 600, "sans"),
    "h1": (44, 1.02, -0.04, 600, "sans"),
    "h2": (30, 1.1, -0.03, 600, "sans"),
    "h3": (20, 1.2, -0.02, 600, "sans"),
    "lead": (20, 1.4, -0.015, 400, "sans"),
    "body": (15, 1.5, -0.005, 400, "sans"),
    "small": (13, 1.45, 0, 400, "sans"),
    "label": (11, 1.2, 0.07, 500, "mono"),
    "micro": (9.5, 1.2, 0.08, 500, "mono"),
    "code": (13, 1.5, 0, 400, "mono"),
    "readout-xl": (112, 1, 0, 400, "matrix"),
    "readout": (44, 1, 0, 400, "matrix"),
    "readout-sm": (20, 1, 0, 400, "matrix"),
}
SPACE = {"0": 0, "1": 2, "2": 4, "3": 8, "4": 12, "5": 16, "6": 24, "7": 32, "8": 48, "9": 64, "10": 96, "11": 128}
RADIUS = {"0": "0px", "1": "2px", "2": "6px", "3": "10px", "pill": "999px", "icon": "22.5%"}
MOTION = {
    "pulse": "120ms", "burn": "240ms", "coast": "480ms",
    "ease-coast": "cubic-bezier(0.2, 0, 0, 1)", "ease-brake": "cubic-bezier(0.3, 0, 0.1, 1)",
}
SHADOW = {
    "card": "0 1px 0 rgba(18,18,17,.04), 0 12px 32px -16px rgba(18,18,17,.16)",
    "card-dark": "0 0 0 1px rgba(243,243,241,.04)",
}

def lum(h):
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)

CONTRAST = []
for th, t in THEMES.items():
    for fgk in ("fg", "fg-2", "fg-3"):
        for bgk in ("bg", "surface"):
            CONTRAST.append({"theme": th, "pair": f"{fgk} on {bgk}", "fg": t[fgk], "bg": t[bgk], "ratio": contrast(t[fgk], t[bgk])})
    for sim in ("dock", "landing"):
        s = SIMS[sim][th]
        CONTRAST.append({"theme": th, "pair": f"{sim} accent-text on bg", "fg": s["accent-text"], "bg": t["bg"], "ratio": contrast(s["accent-text"], t["bg"])})
        CONTRAST.append({"theme": th, "pair": f"{sim} accent-contrast on accent", "fg": s["accent-contrast"], "bg": s["accent"], "ratio": contrast(s["accent-contrast"], s["accent"])})
        CONTRAST.append({"theme": th, "pair": f"{sim} accent on bg (graphics)", "fg": s["accent"], "bg": t["bg"], "ratio": contrast(s["accent"], t["bg"])})

# ------------------------------------------------------------------ CSS
L = []
A = L.append
A("/* SpaceBench design tokens. Generated by brand/build/build_tokens.py. Do not edit by hand. */")
A('@font-face{font-family:"Geist";src:url("../fonts/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}')
A('@font-face{font-family:"Geist Mono";src:url("../fonts/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}')
A('@font-face{font-family:"SB Matrix";src:url("../fonts/SBMatrix.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}')
A("")
A(":root{")
for k, v in NEUTRAL.items(): A(f"  --sb-n-{k}:{v};")
for k, v in VIOLET.items(): A(f"  --sb-violet-{k}:{v};")
for k, v in ORANGE.items(): A(f"  --sb-orange-{k}:{v};")
for k, v in FONT.items(): A(f"  --sb-font-{k}:{v};")
for k, (size, lh, tr, wt, fam) in TYPE.items():
    A(f"  --sb-type-{k}:{wt} {size}px/{lh} var(--sb-font-{fam});")
    A(f"  --sb-track-{k}:{tr}em;")
for k, v in SPACE.items(): A(f"  --sb-space-{k}:{v}px;")
for k, v in RADIUS.items(): A(f"  --sb-radius-{k}:{v};")
for k, v in MOTION.items(): A(f"  --sb-{'time-' if 'ms' in v else ''}{k}:{v};")
A("  --sb-hairline:1px;")
A("  --sb-stroke:1.5px;")
A("}")
A("")
def ld(light, dark):
    return f"light-dark({light},{dark})"

A("/* Ground. Colours use light-dark(), so they resolve where they are used. A dark panel")
A("   inside a light page, or any deeper nesting, needs only data-theme on the panel. */")
A(":root{color-scheme:light dark}")
A('[data-theme="light"]{color-scheme:light}')
A('[data-theme="dark"]{color-scheme:dark}')
A(":root{")
for k in THEMES["light"]:
    A(f"  --sb-{k}:{ld(THEMES['light'][k], THEMES['dark'][k])};")
A(f"  --sb-shadow-card:{SHADOW['card']};")
A("}")
A(f'[data-theme="light"]{{--sb-shadow-card:{SHADOW["card"]}}}')
A(f'[data-theme="dark"]{{--sb-shadow-card:{SHADOW["card-dark"]}}}')
A("@media (prefers-color-scheme:dark){:root:not([data-theme]){--sb-shadow-card:" + SHADOW["card-dark"] + "}}")
A("")
A("/* Accent. The parent brand has none: its accent is the foreground. */")
for sim in SIMS:
    sel = ':root,[data-sim="parent"]' if sim == "parent" else f'[data-sim="{sim}"]'
    A(sel + "{")
    for k in SIMS[sim]["light"]:
        A(f"  --sb-{k}:{ld(SIMS[sim]['light'][k], SIMS[sim]['dark'][k])};")
    A("}")
A("")
os.makedirs(os.path.join(BRAND, "tokens"), exist_ok=True)
with open(os.path.join(BRAND, "tokens", "tokens.css"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(L))

data = {
    "color": {"neutral": NEUTRAL, "violet": VIOLET, "orange": ORANGE, "names": NAMES, "reserve": RESERVE},
    "theme": THEMES, "sim": SIMS, "font": FONT,
    "type": {k: {"size": v[0], "lineHeight": v[1], "tracking": v[2], "weight": v[3], "family": v[4]} for k, v in TYPE.items()},
    "space": SPACE, "radius": RADIUS, "motion": MOTION, "shadow": SHADOW, "contrast": CONTRAST,
}
with open(os.path.join(BRAND, "tokens", "tokens.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, indent=2); f.write("\n")
with open(os.path.join(BRAND, "tokens", "tokens.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write("// Generated by brand/build/build_tokens.py. Do not edit by hand.\n")
    f.write("export const tokens = " + json.dumps({k: v for k, v in data.items() if k != "contrast"}, indent=2) + " as const;\n")
    f.write("export type SimId = keyof typeof tokens.sim;\nexport type ThemeId = keyof typeof tokens.theme;\n")
os.makedirs(os.path.join(BRAND, "js"), exist_ok=True)
with open(os.path.join(BRAND, "js", "sb-tokens.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write("/* Generated by brand/build/build_tokens.py. Do not edit by hand. */\n")
    f.write("(function(root){root.SBTokens=" + json.dumps(data, separators=(",", ":")) + ";})(typeof window!=='undefined'?window:globalThis);\n")

for c in CONTRAST:
    print(f"{c['theme']:5} {c['pair']:38} {c['fg']} on {c['bg']}  {c['ratio']}")
