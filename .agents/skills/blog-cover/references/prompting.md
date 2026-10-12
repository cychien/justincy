# Prompting image_gen for covers

`generate.ts` wraps your prompt with the size and the save instruction; you write only the brief. Use labelled lines: `image_gen` follows them better than a paragraph, and they stop you from dropping a constraint.

Never use `image_gen` on a real person, not even for a small edit; see the criteria in `SKILL.md`. It makes idea-path covers and empty backdrops for a real subject.

## A backdrop for a real subject

The cutout is composited in front later, so ask for the backdrop alone, filling the frame edge to edge. Name the material and say what to leave out; `image_gen` tends to add a bright centre, a vignette or a white border unless told not to.

```text
Asset type: empty backdrop for a portrait, a real person will be composited in front of it later; it is shown as a small 4:3 blog card
Subject: a hand-painted photography studio canvas backdrop, the kind used by editorial portrait photographers, filling the whole frame
Scene/backdrop: only the backdrop itself, seen straight on, no floor, no edges of the canvas, no stand
Style/medium: real photograph of a mottled, hand-painted canvas backdrop with soft cloudy brushwork and subtle fabric texture
Composition/framing: full bleed, even all-over texture edge to edge; no focal point, no bright spot anywhere, no vignette
Lighting/mood: soft, even studio light across the whole surface; calm, refined, editorial
Color palette: <hues that part from the subject's clothes and hair - see Separation in SKILL.md>
Constraints: no people, no silhouettes, no objects, no text, no letters, no logos, no watermark, no light rays, no glow
Avoid: glossy digital gradients, bokeh, lens flare, stock-photo look, hotspots of light
```

For other materials swap the subject and medium lines: risograph-printed shapes on matte paper, fine-line print on heavyweight paper. Shapes in a print sit behind the person, so weight them toward the side the person will not cover. Line and contour prints come back with a white border or a fade more often than canvas does; repeat "full bleed" in the framing line.

## Generating from an idea (idea path)

The image should carry the post's feeling through something tangible, and look mature and calm.

```text
Asset type: blog cover, shown as a small 4:3 card next to other covers
Subject: <one concrete thing or scene>
Scene/backdrop: <where it sits; mostly empty>
Style/medium: <editorial photograph | soft matte illustration | ...>
Composition/framing: <wide/close, where the subject sits, how much negative space>
Lighting/mood: <light source and quality>, <specific mood words>
Color palette: <a restrained palette that fits the mood>
Constraints: no text, no letters, no logos, no watermark
Avoid: <clichés and finishes that would break the mood>
```

Keep the subject in the middle two-thirds of the frame. Generation is 3:2 and the cover is 4:3, so the outer edges get cropped.

Translate the idea into one tangible thing. The test: would a reader recognise the post's feeling from the picture? Name the material and the light; `image_gen` renders "linen", "unglazed ceramic", "overcast window light" more reliably than "calm". Skip the stock metaphors (lightbulb, handshake, robot, glowing brain); they say "a blog post" rather than "this post".

| Post is about                    | Stand-ins that work                                            |
| -------------------------------- | -------------------------------------------------------------- |
| Reflection, a birthday, a decade | a single chair by a window; a desk with one notebook, cold tea |
| Discipline, routine, practice    | a worn wooden tool on a bench; stacked, well-used bowls        |
| Letting go, simplifying          | an almost empty shelf; a cleared desk with one object left     |
| Slow growth, patience            | moss on a stone step; a seedling in a plain pot                |

## Iterating

One change per edit, with the parent attached as `--ref`:

```text
Input images: Image 1 is the edit target.
Primary request: change only <X>.
Constraints: keep everything else exactly as it is.
```
