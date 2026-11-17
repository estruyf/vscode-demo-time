---
name: social-post
description: Make a social media announcement for a Demo Time feature or release, with a 1200×630 image in the website's look and post texts for X, Bluesky, Mastodon and LinkedIn, in the repo's social/ folder. Use when asked for a social image, a social post, an announcement, an Open Graph or share image, or "something to post about" a feature or a release.
---

# Social post

Every announcement is one folder in `social/<slug>/` with `index.html` (the image as a page), `image.png` (rendered from it) and `posts.md` (the texts). Read `social/README.md` first, and look at `social/code-blocks/` as the worked example.

## 1. Get the facts

Take what the feature does from the repo, not from memory:

- the root `CHANGELOG.md` (the topmost section, or the release's section) for the wording people already see;
- the docs page in `docs/src/content/docs/` for the syntax and options, and its URL (`demotime.show/<path>/`, or `beta.demotime.show/<path>/` while the docs only live there);
- the real UI and syntax: setting, action and command names in `apps/vscode-extension/package.json` and `docs/public/demo-time.schema.json`, so the mockup shows real labels.

Check what is released: the version in `apps/vscode-extension/package.json`, `git tag`, and whether the CHANGELOG section still has `2026-xx-xx` as its date. An unreleased section ships in the beta (pre-release) version, so say "in the beta" and link `https://demotime.show/beta/`. Write in `posts.md` what isn't released yet and tell the user. Use the Play / Act / Scene / Move terms.

## 2. Make the image

1. Copy `social/_template/` to `social/<slug>/` (a short kebab-case name for the feature).
2. Left column (`.copy`): the `.brand` on top (logo, "Demo Time", and the `.beta` pill while the feature is only in the beta), a yellow `.eyebrow` with the feature name, a headline of two short sentences with the second in `<em>` (yellow), one or two plain sentences in `.sub`, and a `.url` line with where to try or read it ("Try it in the beta → **beta.demotime.show**"). No pills or bold words in the copy.
3. Right column: one dark `.card` with window `.dots` and a title in `.card-head` (a `.aside` on the right for a status such as "Step 2 / 3"), the mockup in `.card-body`, and a `.toast` well under it for output or the markdown that makes it. It is a small, made-up mockup of the feature at work, built in HTML and CSS, not a screenshot. Use the classes in `shared/base.css` (`.code` with `.l` lines, `.steps`, `.toast`) and add the rest in the page's `<style>`. Mark the one thing that matters in yellow (an active row, a highlighted line) and dim the rest. Keep the mockup honest: markdown in the `.toast` must really produce what the card shows.
4. Colours come from the tokens in `base.css`. Other apps in the mockup, such as VS Code, use their own colours, as page variables.
5. Copy is plain, with short sentences and no em dashes.

Give anything only this post needs to the page itself. When something is useful to more posts (a scene list row, a presenter view), move it to `shared/base.css`.

## 3. Render and look

```bash
social/render.sh <slug>
```

Then open `social/<slug>/image.png` with Read and check it, and render again after every fix:

- the fonts loaded (Hubot Sans italic headline, not a serif fallback);
- nothing is clipped and no card runs off the edge;
- the headline keeps a clear gap from the card and breaks at natural places;
- the text in the mockup is large enough to read when the image is shown at half size.

## 4. Write the posts

`posts.md` holds, in this order: the links, anything not yet released, the image's alt text (what the picture shows, for screen readers), then one section per network:

- **X**: at most 280 characters; a link counts as 23 and an emoji as 2.
- **Bluesky**: at most 300 characters, links included.
- **Mastodon**: at most 500 characters, a few hashtags at the end (#VSCode, #DevRel, #PublicSpeaking).
- **LinkedIn**: longer, first person (Elio writes these), what it is, why it helps, a short list of what it does, links and a few hashtags.

Count the characters (for example with `python3`) instead of guessing. Lead with what it does for presenters, not how it's built. At most one emoji per post.

## 5. Finish

Add the post to the table in `social/README.md`. Don't post anything, and don't commit unless the user asks. Tell the user where the image and texts are, and show the image.
