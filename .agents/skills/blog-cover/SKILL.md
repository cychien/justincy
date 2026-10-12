---
name: blog-cover
description: Make the cover image and the OG (social preview) image for a post in app/content/blog. Use this whenever the user asks for a cover, thumbnail, hero, card image, OG image, social preview, or "a picture for this post", wants one redone or recolored, or has just finished a blog post that still has no thumb in its frontmatter.
---

# Blog cover

Produce, for one post, everything the index card and link previews need:

| Output                                   | Path                                                            | Size          |
| ---------------------------------------- | --------------------------------------------------------------- | ------------- |
| Cover (card image, no text on it)        | `public/images/blog/<slug>/cover.webp`                          | 1440x1080 4:3 |
| OG image (template: title + small cover) | `public/images/blog/<slug>/og.jpg`                              | 1200x630      |
| Frontmatter                              | `thumb`, `thumbAlt`, `ogImage` in `app/content/blog/<slug>.mdx` |               |

Work files go to `tmp/blog-cover/<slug>/`, which is gitignored. Run every script from the project root as `node $S/<script>.ts` with `S=.agents/skills/blog-cover/scripts`; each prints usage when called without arguments.

Prerequisites: macOS with the Xcode command line tools (`swiftc`; `cutout.ts` lifts subjects with the Vision framework), Google Chrome (renders the OG page), `yt-dlp` plus `ffmpeg` (video frames), and `codex` (its built-in `image_gen`, no API key) for idea-path images and backdrops. Check them with `which` before starting so a missing tool fails early.

## What makes a good cover

Judge every decision in this order. A later concern never overrides an earlier one.

1. **It says what the post is about at a glance.** Someone scrolling `/blog` who has not read the post should recognise its subject from the cover alone. Concrete beats symbolic: a post about a person shows that person, a post about a tool shows the tool. A metaphor, diagram or mood shot that only makes sense after reading fails this test, however handsome it is. A person must look as readers know them now, which means as they appear in the post's own video or images when it has any: same face, hair and glasses.
2. **It is real.** A real person or thing appears only in real photographs or video frames, never generated, and never edited by `image_gen`, which redraws every pixel and so changes the face even when asked only to remove a logo. A likeness of a real person is a fabrication, however close.
3. **It is a picture the post does not already show.** The cover sits above the post, so a reader meets it and then meets the post's own images and the poster frame of every embedded video. Repeating one of them, even re-cropped or on a new background, makes the cover feel like a placeholder.
4. **It reads as a card.** One clear subject that survives at about 360px wide, no burned-in captions, logos or watermarks, and no title text, since the OG image carries the title.
5. **It sits well on the page.** Covers should feel calm together rather than compete. Behind a real subject goes a designed backdrop - a painted canvas, printed paper, a color or a quiet pattern - not an invented scene, which would be as fake as an invented face.

## Workflow

### 1. Read the post and name the subject

Read the whole `.mdx`. When redoing a cover, first name what failed in the old one against the criteria above; a redo that changes the wrong thing lands back on the same complaint. Finish the sentence "at a glance, a reader should see ..." and let the answer pick the path:

- **Subject path** when the post centres on something real: a person (their workflow, talk, interview, ideas), a product, a tool, a place, an event. When a post is about a person, the person is the subject even if the post also discusses their ideas; their face is what makes the post recognisable.
- **Idea path** only when there is no concrete subject: a reflection, a principle, a stage of life. The cover is a generated image that carries the post's feeling.

### 2a. Subject path: find real shots

Collect into `tmp/blog-cover/<slug>/material/`, and spend the effort here: the cover can only be as good as the best real shot.

- **The web**: personal site, speaker pages, podcast or interview pages, conference photos, profile photos, press kits. Speaker-page headshots are often years old, heavily retouched or of a namesake, so keep a photo only when it is unmistakably the person in the post's own material.
- **Other videos of the subject**: talks, interviews, podcasts, streams. `yt-dlp --flat-playlist --print "%(id)s %(title)s" "ytsearch10:<name> podcast"` (or `interview`) finds them, and cuts through namesakes better than web search; webcam interviews give sharper, closer frames than conference stages. Pull frames with `node $S/frames.ts <slug> <youtube-id>` and read the `sheet.png` it names; each video and range gets its own folder. Talks often cut to screen share; when the sheet is mostly slides, rerun with `--from`/`--to` around the stretch where the person fills the frame.
- **Anything the user attached.**

Save what the reader already sees as references only: the images in the post under `public/images/blog/<slug>/`, and the poster of each embedded YouTube video, `https://i.ytimg.com/vi/<id>/maxresdefault.jpg`, which the embed shows until it plays. They tell you what the subject looks like, but they cannot be the cover, and neither can a frame of the embedded video from the poster's camera angle.

Open the promising shots at full size and pick up to three, from different sources or moments. For a person, prefer a natural, calm expression, eyes open, face sharp and unobstructed, a head-and-shoulders or waist-up framing, and a frame that does not cut them at the sides. The subject should be at least about 700px tall in the source, or it turns soft on the cover; a sharp webcam frame beats a blurry stage photo.

Judge each shot also by how it will cut out, since the composite inherits its edge. Hair against a plain, contrasting background cuts cleanly; dark hair on a dark stage, or clutter touching the head, does not. Always start from the original photo or frame, never from an earlier cover: an image that has been through `image_gen` has lost the real strands at its hair edge, and no compositing brings them back.

### 2b. Idea path: generate concepts

Make three candidates with three different concepts, not three variants of one prompt; comparing ideas is where most of the quality comes from. Read `references/prompting.md` before writing prompts, and run one `generate.ts` call per concept in parallel:

```bash
node $S/generate.ts <slug> --name a-<label> --prompt-file tmp/blog-cover/<slug>/prompt-a.md &
node $S/generate.ts <slug> --name b-<label> --prompt-file tmp/blog-cover/<slug>/prompt-b.md &
wait
```

Each call takes one to two minutes. When no image appears, the reason is in `tmp/blog-cover/<slug>/logs/<name>.log`. Then skip to step 4.

### 3. Subject path: cut out, make a backdrop, compose

#### 3a. Cut out the subject

```bash
node $S/cutout.ts <slug> tmp/blog-cover/<slug>/material/<shot>.jpg [--crop left,top,width,height] [--mode auto|person|subject] [--instance <n>] [--name <name>]
```

`cutout.ts` keeps the photo's own pixels and only decides which are transparent, so everything behind the person goes, logos and captions on the backdrop included. The default `auto` mode suits people, including a microphone or anything else in front of them; use `--mode subject` for an object, or with `--instance` to pick one of several people. `--crop` trims the result to one tile of a split screen, or away from a desk edge, a corner label or another person; give it the box in the photo's pixels, and never crop the photo yourself first, since the model judges the subject from the whole frame. A webcam shot usually ends at the desk above the photo's bottom edge: `--crop` just above the desk, so the person reaches the bottom of the cutout and is anchored to the cover's bottom edge instead of floating with a straight cut across the waist.

Read the `-check.png` it writes, the cutout on a light and a dark ground. Hair, glasses, hands and anything held should be whole. Clutter that touches the person - toys on a shelf behind the head, a chair back - can leave scraps along the edge. The two models fail differently, so when scraps show, cut the same shot with `--mode subject --name <shot>-subject` and keep the cleaner one. When both leave scraps visible at card size, prefer another shot over a cover with debris on it.

#### 3b. Make three backdrops

Generate the backdrop. A real material reads as a portrait sitting; gradients and patterns drawn in code read as a template. Run three `generate.ts` calls in parallel with the backdrop prompt in `references/prompting.md`, varying material and color - a hand-painted studio canvas is the safe first choice, then printed paper or an abstract print. A backdrop holds no people, objects or scene, so `image_gen` never touches the subject. Read each before using it: reject one with a border, a fade to white, a bright centre or anything resembling text. `--bg solid|mesh` remains for when no backdrop works.

- **Separation** comes first: the backdrop must part from the subject's clothes and hair in value or hue, or the silhouette dissolves at card size - a navy canvas swallows a navy jacket. Behind dark clothes and hair go light backdrops or a warm hue opposite the clothing (terracotta behind navy); behind light clothes, deeper ones.
- **Colors**: take the hues from the subject - a muted version of the skin warmth, or the complement of the clothing - rather than a stock palette. A pastel that relates to nothing in the photo is what makes a cutout look dropped in.
- **Light**: ask for an evenly lit backdrop. A bright spot or glow behind the head reads as a halo, and no backdrop can match a stage spotlight anyway; the subject's own lighting carries the picture.

#### 3c. Compose

```bash
node $S/compose.ts <slug> tmp/blog-cover/<slug>/cutouts/<shot>.png --name a-<label> [--image <backdrop.png> | --bg solid|mesh --colors '#rrggbb,...'] [--pattern none|dots|grid|lines] [--pattern-color '#rrggbb'] [--shadow 0..1] [--wrap 0..1] [--depth 0..1] [--ambient 0..1] [--vignette 0..1] [--height 0..1] [--x 0..1]
```

`compose.ts` anchors a subject cut off by the photo's bottom edge to the cover's bottom edge, so the cut never shows. It also settles the cutout into the backdrop the way a compositor would: it repaints edge pixels that still carry the old background's color and feathers the cut, blurs the backdrop as a lens focused on the subject would (`--depth`), tints the subject with the backdrop's hue (`--ambient`), casts a soft `--shadow`, lets the backdrop's color bleed into the outer edge (`--wrap`), and darkens the corners a little (`--vignette`). Keep them all on at their defaults; each removes one sign of a paste-up. What they cannot fix is a wrong edge in the source, so when a composite still looks pasted, look at the cutout's hair before tuning the effects.

Compose the best shot on each of the three backdrops. `--height` around 0.85-0.95 suits a head-and-shoulders shot, keeping room above the head while the face stays large; shift `--x` off-centre when the person faces sideways, leaving space in the direction they look. `--pattern` adds a texture that fades out behind the head; use it only on a plain `--bg`, with `--pattern-color` a few steps from the base so it shows at card size. Heed the script's warnings: an enlarged subject turns soft, and a subject cut at a side edge shows a straight line.

### 4. Review and pick

Lay the candidates side by side at card size with `node $S/compare.ts <slug> <candidate>...` and read the sheet it writes, then rank them by the criteria above, in order; check the outline against the backdrop first. For a person, compare the face with the post's own material once more: a wrong person is the worst possible cover. Make at most two rounds of targeted changes on the best one - another backdrop, a different `--height`, or for the idea path a single `image_gen` edit - naming iterations after their parent (`a-mesh-2`) so earlier versions stay comparable.

### 5. Crop and grade

```bash
node $S/grade.ts <slug> tmp/blog-cover/<slug>/candidates/<pick>.png [--box left,top,width,height] [--focus attention|top|center|bottom|left|right] [--strength 0..1] [--preview [--label <name>]]
```

`attention` focus usually finds a face; set `--focus` when the crop clips the subject, or `--box` to frame it tighter than a full-height 4:3 cut. Then read `previews/<pick>-index.png`, which shows the cover beside the other posts' covers as `/blog` lays them out. When two candidates or crops are close, run each with `--preview` first: it writes only the previews, so they can be compared before one becomes the cover; add `--label` to keep two crops of one candidate apart. The grade only takes the edge off: a composed cover is already calm, so use `--strength` 0 to 0.2 for it; for a generated image raise it toward 1 when it is loud (saturated light, neon, heavy contrast). Rerunning is cheap.

### 6. Render the OG image

```bash
node $S/og.ts <slug>
```

The template puts the title and date on the left and the cover, small, on the right. Read the resulting `og.jpg` and check the title wrapped cleanly. The title comes from the frontmatter; fix the post rather than passing `--title`, so the two never drift.

### 7. Wire it into the post

Add to the frontmatter, after `date`, or update the fields already there:

```yaml
thumb: /images/blog/<slug>/cover.webp
thumbAlt: <what is literally in the picture, in the post's language>
ogImage: /images/blog/<slug>/og.jpg
```

`thumbAlt` is read aloud by screen readers; describe the picture, not the post, and rewrite it whenever the picture changes. Then open `/blog` on the dev server (`pnpm dev`) and look at the card in place.

## Report

```
Cover for <slug>
- Subject: <what a reader should see at a glance>
- Path: subject - real shot from <source>, on <background> | idea
- Pick: <candidate> - <why, in terms of the criteria>
- Other candidates: tmp/blog-cover/<slug>/candidates/<a>.png, <b>.png
- Comparison: tmp/blog-cover/<slug>/previews/compare.png
- Files: public/images/blog/<slug>/cover.webp, og.jpg
- Frontmatter updated: thumb, thumbAlt, ogImage
```

Point the user at the comparison sheet: backdrop color is a matter of taste, and seeing the options together is the quickest way for them to choose. Keep the other candidates on disk and name them. Swapping is one `grade.ts` call plus `og.ts`, so the user can overrule the pick without another round.

## When things go wrong

- **No real shot passes**: say so and show the best ones you found, rather than generating the person or reusing the poster. The user may have a photo.
- **Text over the subject itself** (a caption across the chest): `cutout.ts` cannot remove it; pick another frame or trim it away with `cutout.ts --crop`.
- **No image after `generate.ts`**: read the log; a refusal or a safety-policy block shows up there.
- **Chrome missing**: `og.ts` reads `CHROME_PATH`; point it at any Chrome or Chromium binary.
- **Replacing an existing cover**: `grade.ts` and `og.ts` overwrite in place, since the frontmatter already points at those paths. Candidates are never overwritten; use a new `--name`.
