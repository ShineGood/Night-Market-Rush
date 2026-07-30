# 🏮 Night Market Rush

A cozy-but-tense drag-and-drop food game. Customers at a night market stall each want a specific dish — drag the right food from the tray onto their plate before your hearts or the clock run out.

---

## 📁 File Structure

Keep all three files in the same folder — `index.html` loads the other two via relative paths (`href="styles.css"`, `src="script.js"`). 

```
├── index.html    # Markup & structure
├── styles.css    # All visual styling and animations
└── script.js     # Game logic (state, drag & drop, audio, leaderboard)
```

Just open `index.html` in a browser; no build step, server, or install required.

## 🎮 How to Play

1. **Enter Your Name:** Type your name on the start screen (optional — defaults to "Player").

2. **Serve Customers:** Drag dishes from the tray at the bottom onto the customer whose speech bubble matches that dish.

3. **Correct Match:** Gain points (bigger combo streaks are worth more points) and light up lanterns.

4. **Wrong Match:** Dropping the wrong dish or dropping outside a plate costs you 1 heart.

5. **Win Condition:** Reach 150 points before the 75-second timer runs out. Lose all hearts or run out of time, and it's Game Over!

### Controls & Navigation

-**Drag & Drop:** Fully compatible with mouse or touch drag interactions.

-**⏸ Pause Button** (Top Bar): Pause/resume at any time. The pause menu allows you to restart or return to the main menu to switch players.

- **🔊 Mute Button (Top Bar):** Toggle sound effects and synthesized music on or off.

## ✨ Features

- **Dynamic Gameplay:** 5 customers with rotating food requests drawn from an 8-item food pool.

- **Scoring System:** Dynamic score tracking, combo multipliers, 3-life heart system, and a 75-second countdown timer.

- **Local Leaderboard:** Top 10 high scores stored locally in your browser (`localStorage`) with a built-in "Reset Board" option.

- **Zero External Dependencies:** Audio is synthesized live using the Web Audio API — no external MP3/WAV files required.

- **Cross-Device Ready:** Responsive layout tailored for desktop and mobile touch devices using modern Pointer Events.

- **Accessibility:** Native support for `prefers-reduced-motion`.

## ⚙️ Customization

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

**Styling**: Colors, fonts, and sizing live in the `:root` variables and layout rules at the top of `styles.css`.

## Notes on the Leaderboard

- Scores are saved with `localStorage`, so they persist across sessions **on the same browser and device only** 

- There's no server, so scores won't sync across different computers or phones.

- "Reset Board" clears it for everyone using that browser.

## 🌐 Browser Support & Local Storage
- **Browsers:** Compatible with all modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge).

- **Audio Policy:** Audio initializes automatically upon your first click or tap to adhere to web browser autoplay policies.

- **Leaderboard Data:** High scores persist across sessions on the same browser and device. Resetting the board clears the local storage data.

## 📜 License & Copyright
Copyright © 2026 Night Market Rush. All rights reserved.

This project and its original source code are provided for personal educational and entertainment purposes. Unauthorized reproduction, redistribution, or commercial use without explicit permission from the author is strictly prohibited.