# ⚡ QUANTUM DRIFT
### ARCADE LAB — Experiment 03

> *Pilot through superposition states. Exist in multiple realities simultaneously — until observed.*

---

## 🎮 How to Play

Open `index.html` in any modern browser. No server required — just double-click and play.

**Best experience:** Chrome or Firefox, fullscreen (`F11`).

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `← →` or `A D` | Switch lanes |
| `1` / `2` / `3` | Shift to quantum state Alpha / Beta / Gamma |
| `Q` / `W` / `E` | Same as 1 / 2 / 3 |
| `SPACE` | Activate Temporal Shield (costs 40 charge) |
| `P` or `ESC` | Pause / Resume |
| **Swipe left/right** | Lane switch (mobile) |

---

## ⚛️ The Quantum Mechanic

This is the core of the game. Understand it and you'll score exponentially higher.

**3 Quantum States:**
- **α ALPHA** — Cyan `#00F5FF`
- **β BETA** — Purple `#7A5CFF`
- **γ GAMMA** — Pink `#FF2DA6`

**The Rule:**
- Obstacle in your **same state** → **SOLID** → you crash into it → dodge by lane-switching OR shift state
- Obstacle in a **different state** → **GHOST** → semi-transparent, you pass through safely
- **DARK MATTER** (orange) → **SOLID in ALL states** → always dodge by switching lanes

**During State Shift:**
- 290ms **SUPERPOSITION** window → you're vulnerable to ALL states briefly
- Plan your shifts — don't shift while already inside an obstacle!

---

## 🏆 Scoring System

| Action | Points |
|---|---|
| Distance travelled | Speed × time × multiplier |
| Same-state orb pickup | 200 × multiplier |
| Different-state orb pickup | 75 × multiplier |
| QUANTUM SLIP (near-miss) | 80 × multiplier |
| Each pickup/slip | +0.5 multiplier |

**Multiplier** caps at `×10.0` and slowly decays. Hitting an obstacle resets it to `×1`.

---

## ⚡ Special Systems

### Temporal Shield
- **Cost:** 40 charge units
- **Duration:** 3.2 seconds
- Makes you immune to all obstacles (including dark matter)
- Visual: blue bubble + orbiting sparks

### Quantum Charge
- Fills by: lane switching (+3), drifting (+13/sec), near-misses (+7), pickups (+4–10)
- Use for: Temporal Shield

### Quantum Overload
- Triggered when multiplier reaches **×10**
- 5 seconds of enhanced aura + lime green visual
- Score bonuses are maximised during this window

### QUANTUM SLIP
- Pass within ~70px of a solid obstacle without hitting it
- Rewards +80 × multiplier + charge
- The highest-skill play in the game

---

## 📈 Difficulty Scaling (Sectors)

Each sector lasts **28 seconds**. A sector transition flashes on screen.

| Sector | Changes |
|---|---|
| 1 | 3 lanes, single-state gates + spikes, slow speed |
| 2 | Speed up, more obstacles, near-miss combos matter |
| 3 | Dark matter appears, bonus orbs alongside obstacles |
| 4 | Spike sub-spikes, patterns get denser |
| 5+ | Wide WALL obstacles (one full lane blocked), aggressive curves |
| 7+ | Track curves become intense, camera swings sharply |
| 10+ | Maximum chaos — all obstacle types, near-max speed |

---

## 🎨 Visual Design

- **Pseudo-3D perspective** track renderer (no 3D library — pure Canvas 2D)
- **Quantum state colour wash** — the whole scene tints to your current state
- **Parallax star field** with per-star twinkle and parallax offset
- **Neon cityscape silhouette** behind the horizon
- **Chromatic aberration** during state shifts
- **Screen shake** on collision
- **Speed lines** radiating from the ship at high velocity
- **Particle burst** on hit / pickup / overload
- **Ship trail** fades with quantum state colour history
- **Ghost obstacles** pulse semi-transparently — beautiful when you know they can't hurt you
- **Scanline + film grain** overlay

---

## 🔊 Audio

Entirely **procedural** — no audio files needed. Built with the Web Audio API:

- **Engine drone**: sawtooth oscillator through a bandpass filter, pitch tracks speed
- **Ambient pad**: sine wave pad that modulates with the quantum state
- **State shift**: exponential frequency sweep upward
- **Pickup**: three-note ascending chime
- **Hit**: square wave crunch pitch-dropping to bass
- **Near-miss**: falling sine sweep
- **Shield**: triangle wave fade-down
- **Sector**: sawtooth + sine dual sweep
- **Overload**: high-energy sawtooth sweep
- **Game over**: long descending sawtooth crash

Audio initialises on first click/keypress (browser autoplay policy).

---

## 🗂️ File Structure

```
quantum-drift/
├── index.html   — Game shell, all UI screens & HUD markup
├── style.css    — Complete UI styling (glassmorphism, animations, responsive)
├── game.js      — Full game engine (695 lines, single IIFE)
└── README.md    — This file
```

### game.js Architecture (in order)
1. Canvas setup & resize handler
2. Game constants
3. Quantum state definitions
4. Web Audio Engine (oscillators, SFX)
5. Star field system
6. Game state & player object
7. Input handling (keyboard + touch)
8. Projection helpers (pseudo-3D math)
9. Background & cityscape renderer
10. Track renderer (strips + lane dashes + rails)
11. Obstacle type table
12. Obstacle spawner & difficulty logic
13. Ghost logic (quantum state collision filter)
14. Obstacle update loop (movement, collision, pickup, near-miss)
15. Obstacle renderers (gate, spike, cube, orb)
16. Player update (lane lerp, tilt, timers, trail)
17. Player renderer (ship hull, cockpit, engines, shield, overload)
18. Particle system (burst, pickupBurst, update, draw)
19. Speed lines system
20. Floating score text system
21. HUD updater
22. Screen effects (flash, vignette, quantum tint, shake)
23. Overload & sector transition handlers
24. Game over handler
25. Input processor
26. Main update loop
27. Main render loop
28. Menu background renderer
29. Main game loop (RAF)
30. Boot / screen management

---

## 🌐 Deployment

Works as a **static site** — just serve the folder:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# Or just open index.html directly in Chrome/Firefox
```

For GitHub Pages: push the folder contents to your repo root or `docs/` folder.

---

*Built for chaos. — ARCADE LAB 2025*
