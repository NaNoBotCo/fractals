# Play with Fractals · เล่นกับแฟร็กทัล

Fractals to play with, drawn live, in English and Thai.

https://nanobotco.github.io/fractals/ · https://nanobotco.github.io/fractals/th/

- `tools/copy_text.py` holds all copy (EN + TH); `tools/build.py` writes `docs/index.html`, `docs/th/index.html`, `llms.txt`, `sitemap.xml`, `robots.txt` and `icon.svg`.
- `docs/gl.js` draws the escape-time fractals on the GPU (z → z² + c): the hero, the Mandelbrot explorer, the Julia sets. `docs/app.js` holds the other toys: Koch snowflake, chaos game, tree, Barnsley fern, dragon curve, coastline dividers, make-your-own with its similarity dimension.
- `?card` at 1200×630 renders the share card (`docs/card.jpg`); `?t=` fixes the hero's moment.
- Photographs come from Wikimedia Commons (`tools/credits.json`), each credited on the page.

Text CC BY 4.0, NaNoBotCo. Code MIT.
