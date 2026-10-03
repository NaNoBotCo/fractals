#!/usr/bin/env python3
"""build.py — writes docs/index.html (English), docs/th/index.html (Thai), sitemap.xml, robots.txt,
llms.txt and icon.svg. All copy, both languages, is in copy_text.py; photo credits in credits.json.

Run:  python3 tools/build.py
"""
import html
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from copy_text import UI, NAV, WORDS, SOURCES  # noqa: E402

DOCS = os.path.join(HERE, "..", "docs")
BASE = "https://nanobotco.github.io/fractals/"
E = html.escape
CSS = open(os.path.join(HERE, "site.css")).read()
PHOTOS = json.load(open(os.path.join(HERE, "credits.json")))
PHOTO_ORDER = ["romanesco", "fern", "prang", "delta", "lightning", "snowflake", "tree"]
GOOGLE_ESCAPE = '<script>if(/[.]translate[.]goog$/.test(location.hostname))location.replace("https://"+location.hostname.slice(0,-15).replace(/--/g,"~").replace(/-/g,".").replace(/~/g,"-")+location.pathname+location.search.replace(/([?&])_x_tr_[^&]*/g,"$1").replace(/[?&]+$/,"").replace(/[?]&+/,"?")+location.hash)</script>'


def paras(ps):
    return "".join(f"<p>{p}</p>" for p in ps)


def rng(id_, label, lo, hi, step, val):
    return f'<label class="lab" for="{id_}">{E(label)} <b id="{id_}v"></b></label><input id="{id_}" type="range" min="{lo}" max="{hi}" step="{step}" value="{val}">'


def ro(*pairs):
    return '<div class="readout">' + "".join(f'<div><span>{E(a)}</span><b id="{b}">–</b></div>' for a, b in pairs) + "</div>"


def btn(id_, label, hot=False, pressed=None):
    p = f' aria-pressed="{pressed}"' if pressed is not None else ""
    return f'<button id="{id_}" class="pill{" hot" if hot else ""}" type="button"{p}>{E(label)}</button>'


def sec(id_, cls, kick, h, body):
    return f'<section id="{id_}" class="sec {cls}"><div class="in">{f"<p class=kick>{kick}</p>" if kick else ""}<h2>{h}</h2>{body}</div></section>\n'


def page(lang):
    u = UI[lang]
    root = "" if lang == "en" else "../"
    url = BASE if lang == "en" else BASE + "th/"
    js = dict(u["js"])
    for k in ("m_stays", "m_leaves", "j_one", "j_dust", "d_R", "d_L", "d_unfold", "km", "c_axis_x", "c_axis_y", "y_hint", "places", "colours"):
        js[k] = u[k]
    js["lang"] = lang
    nav = "".join(f'<a href="#{a}">{E(b)}</a>' for a, b in zip(NAV, u["nav"]))
    ol = u["lang_other"]
    head = f'''<!doctype html><html lang="{lang}" translate="no" class="notranslate"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate">
{GOOGLE_ESCAPE}
<title>{E(u["title"])} · {E(u["other_title"])}</title>
<meta name="description" content="{E(u["desc"])}">
<meta name="theme-color" content="#0b0a1c">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{BASE}"><link rel="alternate" hreflang="th" href="{BASE}th/"><link rel="alternate" hreflang="x-default" href="{BASE}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Play with Fractals · เล่นกับแฟร็กทัล">
<meta property="og:title" content="{E(u["title"])}"><meta property="og:description" content="{E(u["desc"])}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}card.jpg"><meta property="og:image:secure_url" content="{BASE}card.jpg"><meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{E(u["card_alt"])}">
<meta property="og:locale" content="{"en_US" if lang == "en" else "th_TH"}"><meta property="og:locale:alternate" content="{"th_TH" if lang == "en" else "en_US"}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{BASE}card.jpg">
<link rel="icon" href="{root}icon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="{BASE}llms.txt" title="llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Noto+Sans+Thai:wght@400;600;700&family=Noto+Serif+Thai:wght@600;700&display=swap" rel="stylesheet">
<script>if(/[?&]card/.test(location.search))document.documentElement.classList.add("card")</script>
<style>{CSS}</style>
</head><body>
<header class="top"><div class="in"><a class="brand" href="#top"><img src="{root}icon.svg" width="28" height="28" alt=""><span>{E(u["title"])}</span></a>
<nav aria-label="{E(u["nav_label"])}">{nav}</nav>
<span class="lang"><b>{E(u["lang_this"])}</b> | <a href="{ol[0]}" hreflang="{ol[2]}">{E(ol[1])}</a></span></div></header>
'''
    hero = f'''<section id="top" class="hero"><canvas id="scene" role="img" aria-label="{E(u["hero_alt"])}"></canvas>
<div class="hero-t"><p class="kick">{E(u["kicker"])}</p><h1>{E(u["title"])}</h1><p class="lede">{E(u["lede"])}</p>
<p class="go"><a class="pill hot" href="#mandel">{E(u["hero_go"])}</a></p>
<p class="cardline">{E(u["other_title"])} · {E(u["cardline"])}<br><span>nanobotco.github.io/fractals</span></p></div></section>
'''
    what = sec("what", "", E(u["what_kick"]), E(u["what_h"]), paras(u["what_p"]))

    koch = sec("koch", "dark", E(u["koch_kick"]), E(u["koch_h"]), f'''<div class="two"><div><canvas id="kochcv" class="cv sq" role="img" aria-label="{E(u["koch_h"])}"></canvas></div>
<div>{paras(u["koch_p"])}{rng("klevel", u["k_level"], 0, 7, 1, 3)}
<div class="btns">{btn("kzoom", u["k_zoom"], pressed="false")}</div>
{ro((u["k_sides"], "ksides"), (u["k_outline"], "kout"), (u["k_area"], "karea"))}<p class="note">{u["koch_note"]}</p></div></div>''')

    rules = "".join(f'<button class="pill" type="button" data-rule="{i}" aria-pressed="{"true" if i == 0 else "false"}">{E(r)}</button>' for i, r in enumerate(u["g_rules"]))
    chaos = sec("chaos", "", E(u["chaos_kick"]), E(u["chaos_h"]), f'''<div class="two"><div><canvas id="chaoscv" class="cv sq" role="img" aria-label="{E(u["chaos_h"])}"></canvas></div>
<div>{paras(u["chaos_p"])}{rng("gn", u["g_corners"], 3, 8, 1, 3)}{rng("gr", u["g_jump"], 0.3, 0.9, 0.001, 0.5)}
<div class="seg" role="group">{rules}</div>
<div class="btns">{btn("gfit", u["g_fit"])}{btn("gstep", u["g_step"])}{btn("gclear", u["g_clear"])}</div>
{ro((u["g_dots"], "gdots"))}<p class="note">{u["chaos_note"]}</p></div></div>''')

    tree = sec("tree", "rock", E(u["tree_kick"]), E(u["tree_h"]), f'''{paras(u["tree_p"][:2])}
<canvas id="treecv" class="cv wide" role="img" aria-label="{E(u["tree_h"])}"></canvas>
<div class="ctl4"><div>{rng("tlev", u["t_levels"], 1, 13, 1, 10)}</div><div>{rng("tang", u["t_angle"], 0, 120, 1, 28)}</div><div>{rng("tshr", u["t_shrink"], 0.3, 0.85, 0.01, 0.72)}</div><div>{rng("twind", u["t_wind"], 0, 1, 0.01, 0.35)}</div></div>
<div class="btns">{btn("tbloom", u["t_bloom"], pressed="true")}</div>
{ro((u["t_tips"], "ttips"), (u["t_length"], "tlen"))}{paras(u["tree_p"][2:])}''')

    fern = sec("fern", "dark", E(u["fern_kick"]), E(u["fern_h"]), f'''<div class="two"><div><canvas id="ferncv" class="cv tall" role="img" aria-label="{E(u["fern_h"])}"></canvas></div>
<div>{paras(u["fern_p"])}{rng("flean", u["f_lean"], -10, 10, 0.1, 0)}{rng("fleaf", u["f_leaf"], 0.4, 1.5, 0.01, 1)}
<div class="btns">{btn("fcol", u["f_colour"], pressed="false")}{btn("fclear", u["g_clear"])}</div>
{ro((u["f_dots"], "fdots"))}</div></div>''')

    dragon = sec("dragon", "", E(u["dragon_kick"]), E(u["dragon_h"]), f'''<div class="two"><div><canvas id="dragoncv" class="cv sq" role="img" aria-label="{E(u["dragon_h"])}"></canvas></div>
<div>{paras(u["dragon_p"])}{rng("dfold", u["d_folds"], 1, 15, 1, 10)}
<div class="btns">{btn("dunfold", u["d_unfold"], hot=True)}{btn("dfour", u["d_four"], pressed="false")}</div>
{ro((u["d_pieces"], "dpieces"))}<p class="creases"><span>{E(u["d_creases"])}</span> <b id="dcre"></b></p></div></div>''')

    places = "".join(f'<button class="pill" type="button" data-place="{i}">{E(p)}</button>' for i, p in enumerate(u["places"]))
    cols = "".join(f'<button class="pill" type="button" data-pal="{k}" aria-pressed="{"true" if k == "gold" else "false"}">{E(n)}</button>' for k, n in zip(("gold", "sea", "fire", "candy"), u["colours"]))
    mandel = sec("mandel", "night", E(u["mandel_kick"]), E(u["mandel_h"]), f'''{paras(u["mandel_p"][:2])}
<div class="stage"><canvas id="mandelcv" class="cv wide big" role="img" aria-label="{E(u["mandel_h"])}"></canvas><canvas id="mandelov" class="ov" aria-hidden="true"></canvas>
<div class="zb">{btn("min", "+")}{btn("mout", "−")}</div></div>
<p class="lab">{E(u["m_places"])}</p><div class="seg" role="group">{places}</div>
<div class="ctl2"><div>{rng("msteps", u["m_steps"], 50, 2000, 10, 400)}</div><div><p class="lab">{E(u["m_colours"])}</p><div class="seg" role="group">{cols}</div></div></div>
{ro((u["m_zoom"], "mzoom"), (u["m_point"], "mpt"), (u["m_path"], "mpath"))}
{paras(u["mandel_p"][2:])}<p class="note">{u["mandel_note"]}</p>''')

    julia = sec("julia", "dark", E(u["julia_kick"]), E(u["julia_h"]), f'''{paras(u["julia_p"])}
<div class="jgrid"><div><p class="lab">{E(u["j_map"])}</p><div class="stage"><canvas id="pickcv" class="cv sq" role="img" aria-label="{E(u["j_map"])}"></canvas><canvas id="pickov" class="ov" aria-hidden="true"></canvas></div>
<div class="btns">{btn("jwalk", u["j_walk"], hot=True, pressed="false")}</div>{ro(("c", "jc"), ("", "jkind"))}</div>
<div><canvas id="juliacv" class="cv jw" role="img" aria-label="{E(u["julia_h"])}"></canvas></div></div>''')

    coast = sec("coast", "", E(u["coast_kick"]), E(u["coast_h"]), f'''{paras(u["coast_p"])}
<canvas id="coastcv" class="cv wide" role="img" aria-label="{E(u["coast_h"])}"></canvas>
<div class="two" style="margin-top:18px"><div>{rng("cruler", u["c_ruler"], 0, 1, 0.001, 0.209)}
<div class="btns">{btn("cnew", u["c_new"])}</div>
{ro((u["c_steps"], "csteps"), (u["c_len"], "clen"), (u["c_dim"], "cdim"))}</div>
<div><canvas id="loglog" class="cv ll" role="img" aria-label="{E(u["c_dim"])}"></canvas></div></div><p class="note">{u["coast_note"]}</p>''')

    pre = "".join(f'<button class="pill" type="button" data-pre="{i}" aria-pressed="{"true" if i == 0 else "false"}">{E(p)}</button>' for i, p in enumerate(u["presets"]))
    make = sec("make", "rock", E(u["make_kick"]), E(u["make_h"]), f'''{paras(u["make_p"])}
<div class="mgrid"><div><canvas id="gencv" class="cv gen" role="img" aria-label="{E(u["y_hint"])}"></canvas>
<p class="lab">{E(u["y_from"])}</p><div class="seg" role="group">{pre}</div>{rng("ylev", u["y_levels"], 0, 8, 1, 4)}
{ro((u["y_pieces"], "ypieces"), (u["y_dim"], "ydim"), (u["y_segs"], "ysegs"))}<div class="btns">{btn("ysave", u["y_save"])}</div><p class="note">{u["make_note"]}</p></div>
<div><canvas id="makecv" class="cv mk" role="img" aria-label="{E(u["make_h"])}"></canvas></div></div>''')

    by = {p["key"]: p for p in PHOTOS}
    figs = []
    for k in PHOTO_ORDER:
        p = by.get(k)
        if not p:
            continue
        licl = f'<a href="{p["license_url"]}">{E(p["license"])}</a>' if p.get("license_url") else E(p["license"])
        cap = u["photo"][k]
        figs.append(f'<figure><img loading="lazy" src="{root}img/{p["file"]}" width="{p["width"]}" height="{p["height"]}" alt="{E(cap)}"><figcaption>{E(cap)} <a href="{p["commons_page"]}">{E(p["author"])}</a> · {licl}</figcaption></figure>')
    nature = sec("nature", "", E(u["nature_kick"]), E(u["nature_h"]), paras(u["nature_p"]) + f'<div class="ph">{"".join(figs)}</div>')

    tl = "".join(f'<li><b>{y}</b><span>{t}</span></li>' for y, t in u["hist"])
    history = sec("history", "dark", E(u["hist_kick"]), E(u["hist_h"]), f'<ol class="tl">{tl}</ol>')

    i = 0 if lang == "en" else 1
    words = "".join(f'<div><b>{E(w[i])}</b><i>{E(w[1 - i])}</i><p>{w[2 + i]}</p></div>' for w in WORDS)
    wd = sec("words", "", "", E(u["words_h"]), f'<div class="glos">{words}</div>')
    src = "".join(f'<li><a href="{h}">{E(t)}</a></li>' for t, h in SOURCES)
    so = sec("sources", "", "", E(u["src_h"]), f'<p>{E(u["src_p"])}</p><ul class="src">{src}</ul>')

    tail = f'''<footer class="bot"><div class="in">{E(u["foot"])} · <a href="https://github.com/NaNoBotCo/fractals">GitHub</a> · <a href="https://motdang.net/">motdang.net</a> · <a href="https://hongdam.net/">hongdam.net</a></div></footer>
<script>window.UI={json.dumps(js, ensure_ascii=False)};</script>
<script src="{root}gl.js"></script><script src="{root}app.js"></script><script src="{root}top.js"></script>
</body></html>
'''
    return head + "<main>" + hero + what + koch + chaos + tree + fern + dragon + mandel + julia + coast + make + nature + history + wd + so + "</main>" + tail


def icon():
    # Koch snowflake, level 3, gold on night
    pts = [(math.cos(math.radians(90 + 120 * k)), -math.sin(math.radians(90 + 120 * k))) for k in range(3)]
    pts = pts[::-1]
    for _ in range(3):
        out = []
        for a, b in zip(pts, pts[1:] + pts[:1]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            p1 = (a[0] + dx / 3, a[1] + dy / 3)
            p2 = (a[0] + 2 * dx / 3, a[1] + 2 * dy / 3)
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            h = math.sqrt(3) / 6
            pk = (mx + dy * h, my - dx * h)
            out += [a, p1, pk, p2]
        pts = out
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    d = "M" + " L".join(f"{32 + (x - cx) * 25:.2f} {32 + (y - cy) * 25:.2f}" for x, y in pts) + "Z"
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0a1c"/><path d="{d}" fill="#ffc94d"/></svg>\n'


def main():
    os.makedirs(os.path.join(DOCS, "th"), exist_ok=True)
    for lang, path in (("en", "index.html"), ("th", "th/index.html")):
        with open(os.path.join(DOCS, path), "w") as f:
            f.write(page(lang))
    with open(os.path.join(DOCS, "icon.svg"), "w") as f:
        f.write(icon())
    with open(os.path.join(DOCS, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                f'<url><loc>{BASE}</loc></url>\n<url><loc>{BASE}th/</loc></url>\n</urlset>\n')
    with open(os.path.join(DOCS, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")
    u = UI["en"]
    strip = lambda s: html.unescape(re.sub("<[^>]+>", "", s))
    lines = ["# Play with Fractals · เล่นกับแฟร็กทัล", "", u["desc"], "", f"English: {BASE}", f"Thai: {BASE}th/", ""]
    for key in ("what", "koch", "chaos", "tree", "fern", "dragon", "mandel", "julia", "coast", "make", "nature"):
        lines += ["## " + strip(u[key + "_h"]), ""] + [strip(p) for p in u[key + "_p"]]
        if key + "_note" in u:
            lines.append(strip(u[key + "_note"]))
        lines.append("")
    lines += ["## " + u["hist_h"], ""] + [f"- {y}: {strip(t)}" for y, t in u["hist"]]
    lines += ["", "## Words", ""] + [f"- {a} · {b}: {strip(c)}" for a, b, c, _ in WORDS]
    lines += ["", "## Sources", ""] + [f"- {t}: {h}" for t, h in SOURCES]
    lines += ["", "## Licence", "", "Text CC BY 4.0, NaNoBotCo. Code MIT. Photographs keep their own licences, listed on the page.", ""]
    with open(os.path.join(DOCS, "llms.txt"), "w") as f:
        f.write("\n".join(lines))
    print("built en + th -> docs/")


if __name__ == "__main__":
    main()
