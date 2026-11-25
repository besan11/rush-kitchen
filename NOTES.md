# Rush Kitchen — NOTES

## What it is

A complete, playable 2D cooking game in plain HTML5 + JavaScript (no engine,
no libraries, no build step). One 180-second shift: customers arrive with
order tickets, you chop ingredients, cook them on two stoves, assemble dishes
on the plate, and serve the matching customer before their patience runs out.
Earn $120 before the timer ends to win; three walkouts end the shift early.

## Systems (all live, all visible in one 1280x720 frame)

- **Order board** — up to 4 tickets with recipe, price and a patience bar.
- **Customers** — 4 seats, drawn faces, mood changes with patience, click a
  seat to serve.
- **Chop board** — 2.0 s jobs for lettuce / tomato / cheese, with progress bar.
- **Two stoves** — 3.5 s patty, 3.0 s fries; a finished dish burns after 8 s
  if ignored and must be binned.
- **Plate** — holds up to 4 items; shows whether the plate matches an order.
- **Serve bell** — arms serving, then click the matching customer.
- **Money / target, score, best score, combo multiplier, level, walkout
  hearts, shift timer** — every HUD element updates live.
- **Difficulty** — level rises every 45 s: customers arrive faster, patience
  shortens, and 2 more recipes unlock at level 2.
- **Tips + combo** — serving fast pays up to +50% tip; consecutive serves
  raise the combo (x1.1 per serve, best combo tracked).
- **Sound** — synthesized WebAudio (chop, sizzle, ding, serve, walkout);
  mutable with M. No audio files shipped.
- **Screens** — title, play, pause (P, or auto-pause when the tab hides),
  win / lose with stats and restart (R / Space / click).

## Controls

- Mouse: click pantry (1–6 also work) → click chop / stove → click the
  station again to pick up → click plate → click the matching customer.
- Keys: 1–6 pantry, Q chop, W/E stoves, A plate, S serve, T trash, P pause,
  M mute, R restart, Space/Enter start.

## Recipes

| Dish | Needs | Price |
|---|---|---|
| Classic Burger | bun + cooked patty + chopped lettuce | $12 |
| Garden Salad | chopped lettuce + tomato + cheese | $9 |
| Cheese Melt (lvl 2) | bun + cooked patty + chopped cheese + tomato | $14 |
| Crispy Fries (lvl 2) | cooked fries | $6 |

## How to run

```sh
node serve.ts   # then open http://localhost:8080
```

Screenshots are real renders of the game: `shots.json` lists
`?shot=start|play|rush|end` staged scenes, each painted from the real state
objects (see `game/src/shots.js`).

## Limits (honest)

- Single-player, one shift length (180 s), one kitchen layout; no save
  between visits except the best score in localStorage.
- Art is drawn vector shapes + text (no image assets); sound is synthesized
  beeps, not music.
- Difficulty is time-based, not adaptive to player skill.
- The game is tuned for desktop mouse + keyboard; touch works via pointer
  events but the layout is a fixed 1280x720 field scaled to the window.
