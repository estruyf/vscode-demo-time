# Social posts

Images and texts for announcing Demo Time features on social media. Each post has its own folder:

| File | What it is |
|---|---|
| `index.html` | The image as a 1200×630 page. It links `../shared/base.css` and uses the logo from `docs/src/assets`. |
| `image.png` | The rendered image (2400×1260). |
| `posts.md` | The texts for X, Bluesky, Mastodon and LinkedIn, the links and the alt text. |

`shared/base.css` holds the look every image shares (the website's dark background, yellow and fonts, copy on the left, a slide mockup on the right in front of the logo's yellow circle). `_template/` is a starting point for a new post.

To render a post after changing its `index.html`:

```bash
social/render.sh code-blocks
```

It needs Google Chrome (or set `CHROME` to another Chromium binary) and an internet connection for the Google Fonts. The `social-post` skill in `.claude/skills/` walks through making a new one.

| Post | About |
|---|---|
| [code-blocks](code-blocks/posts.md) | Code blocks on slides: line steps, diff and focus notations, titles and line numbers, code from workspace files (2.5.0 beta) |
