# 🏮 Night Market Rush

A cozy-but-tense drag-and-drop food game. Customers at a night market stall each want a specific dish — drag the right food from the tray onto their plate before your hearts or the clock run out.

## Files

```
index.html    Markup / structure
styles.css    All visual styling and animations
script.js     Game logic (state, drag & drop, audio, leaderboard)
```

Keep all three files in the same folder — `index.html` loads the other two via relative paths (`href="styles.css"`, `src="script.js"`). Just open `index.html` in a browser; no build step, server, or install required.

## How to Play

1. Enter your name on the start screen (optional — defaults to "Player").
2. Drag dishes from the tray at the bottom onto the customer whose speech-bubble matches that dish.
3. **Correct match** → points (bigger combo streaks are worth more), lanterns light up.
4. **Wrong dish, or dropping outside a plate** → lose a heart.
5. Reach **150 points** before the 75-second timer runs out to win. Run out of hearts or time and it's game over.

### Controls
- **Drag** food items with mouse or touch.
- **⏸ button** (top bar) — pause/resume. The pause menu also offers Restart and "Main Menu (New Player)" to hand the device to someone else.
- **🔊 button** (top bar) — mute/unmute sound.

## Features

- 5 customers with rotating food requests, drawn from an 8-item food pool.
- Score, combo bonus, 3-life heart system, and a 75-second countdown ring.
- Local **leaderboard** (top 10, stored in the browser via `localStorage`) with a "Reset Board" option.
- Pause/resume without losing progress.
- All audio is synthesized live with the Web Audio API — no external sound files.
- Fully responsive (down to mobile widths) and touch-friendly via Pointer Events.
- Respects `prefers-reduced-motion`.

## Customization

Most tunable values live at the top of `script.js` inside the `CONFIG` block:

| Constant | Purpose |
|---|---|
| `TARGET_SCORE` | Points needed to win |
| `START_TIME` | Countdown length in seconds |
| `MAX_LIVES` | Starting hearts |
| `TRAY_SLOTS` | Max food items visible in the tray at once |
| `SPAWN_INTERVAL` | Milliseconds between new tray items |
| `NUM_CUSTOMERS` | How many customers are on screen |
| `FOOD_TYPES` | Emoji + id pairs available as dishes |
| `CUSTOMER_FACES` / `CUSTOMER_NAMES` | Emoji faces and name tags for customers |

Colors, fonts, and sizing live in the `:root` variables and layout rules at the top of `styles.css`.

## Notes on the Leaderboard

Scores are saved with `localStorage`, so they persist across sessions **on the same browser and device only** — there's no server, so scores won't sync across different computers or phones. "Reset Board" clears it for everyone using that browser.

## Browser Support

Any modern browser (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled; sound requires a user interaction to start (browser autoplay policy), which happens automatically on the first tap/click.