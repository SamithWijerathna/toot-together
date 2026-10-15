# Toot Together: 3D Co-op Physics Party Game

A playable, comedic 3D multiplayer co-op game inspired by the mechanics of *Fart Together*, featuring original cartoon characters, custom procedural maps, ragdoll tumble physics, and synchronized fart-boost propulsion.

---

## 🎮 Core Features

- **Humorous Fart Boost `[F]`**:
  - Press `F` to activate a directional pressurized gas burst.
  - Launches your character across wide gaps and upward onto tall platforms.
  - Emits cartoon green/yellow puff particle bursts and triggers comedic FM-synthesized fart audio.
  - Features radial blast impulse: knocks back nearby objects and teammates with comical physics!
  - 2.2-second cooldown gauge displayed in the collapsible HUD dock.
- **Physics & Co-op Interaction**:
  - **Push / Carry / Throw `[E]`**: Grab wooden crates, barrels, and beach balls to place them onto switches or launch them forward.
  - **Dual-Switch Barrier Gates**: Step on pressure plates simultaneously or position heavy boxes to hold open obstacle doors.
  - **Slippery Grease & Ice Zones**: Ultra-low friction surfaces where sprinting triggers hilarious ragdoll tumbling.
  - **Ragdoll Recovery `[R]`**: Fall or get blasted into floppy limp state with cartoon spiral dizzy eyes; press `R` or wait 1.8s to shake it off and hop back to your feet.
  - **Bounce Pads / Mega Trampolines**: Spring into high sky arcs.
  - **Checkpoints & Fall Respawn**: Green glowing pillar checkpoints ensure you never lose progress when plunging off sky edges.
- **Real-Time Multiplayer (Socket.IO)**:
  - 2–8 players per room.
  - Create Room with custom name, max player count, map, and privacy settings.
  - Join via short memorable room codes (e.g., `TOOT-42`, `PUFF-19`).
  - Public Room Browser displaying active lobbies, player capacities, and maps.
  - Real-time movement synchronization with linear and rotational interpolation.
  - Synchronized fart boosts, gas particles, and remote knockback impulses.
  - Lobby ready-up system and host-controlled match start.
  - In-lobby and in-game chat messaging.
- **5 Original 3D Maps**:
  1. **Floating Islands**: Cloud-top islands with moving platforms, wind fans, bounce pads, and dual-switch co-op gate.
  2. **Slippery Factory**: Greased conveyor belts, sliding hazard pistons, barrels, and checkpoints.
  3. **Crazy Playground**: Giant seesaws, mega trampolines, bouncy beach balls, and playground towers.
  4. **Sky Bridge Chaos**: High-altitude narrow suspension walkway with swaying gliders.
  5. **Tiny Physics Arena**: Compact gladiator ring with bouncy perimeter bumpers and push crates.
- **5 Game Modes**:
  - Co-op Obby
  - Physics Sandbox
  - Team Challenges
  - Last Player Standing
  - Time Trial Speedrun
- **100% Procedural Web Audio API Sound Synthesizer**:
  - Zero external `.mp3` or `.wav` dependencies / zero 404s.
  - Procedural FM modulated fart rumble with randomized pitch/length.
  - Trampoline spring boing, slide-whistle ragdoll slip, jump whoosh, footstep taps, land thud, and upbeat arcade background music loop.
- **Character Wardrobe**:
  - 10 body skin colors (Toxic Lime, Bubblegum, Neon Cyan, Sunny Orange, Royal Violet, etc.).
  - 6 belly accent tones.
  - 8 goofy accessories (Propeller Beanie, Chef Hat, Party Cone, Viking Horns, Plunger, Sunglasses, Halo, None).
  - 5 facial expressions (Happy, Goofy, Gassy Shocked, Cool, Dizzy).
  - Live rotating 3D mirror preview in the closet.
- **Collapsible Bottom Dock**:
  - Follows Three.js UI Ergonomics: central 3D viewport remains 100% unobstructed.
  - Collapsible Cinema/Zen toggle (`Hide Dock` / `Show Controls`).

---

## ⌨️ Desktop Controls

| Key / Input | Action |
| --- | --- |
| **W, A, S, D** | Character Movement |
| **Mouse Drag / Look** | Rotate Camera Orbit |
| **Spacebar** | Jump / Hop |
| **Shift** | Sprint Dash |
| **F** | 💨 **Fart Rocket Boost** |
| **E** | Pick up / Carry / Throw Physics Object |
| **R** | Recover from Ragdoll / Respawn at Checkpoint |
| **1, 2, 3** | Quick Emotes (Wave, Dance, Laugh) |
| **Esc** | In-Game Pause Menu |

### 📱 Mobile & Tablet Touchscreen Controls

| Touch Control | Action |
| --- | --- |
| **Virtual Joystick (Left Side)** | Drag thumb knob to move character in any direction |
| **Swipe Area (Right Side)** | Drag finger across screen to orbit 3D camera smoothly |
| **💨 Big Fart Button (Bottom-Right)** | Directional rocket boost with cooldown timer ring |
| **🦘 Jump Button** | Hop / jump onto ledges and platforms |
| **⚡ Sprint Toggle** | One-tap lock between Sprinting and Walking |
| **📦 Grab Button** | Pick up or throw crates, barrels, and beach balls |
| **🔄 Recover Button** | Recover immediately from ragdoll slip or respawn |
| **Touch Controls Mode** | Configurable in Settings (*Auto Detect*, *Always On*, or *Disabled*) |

---

## 🚀 Running Locally & Multiplayer Testing

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Full-Stack Dev Server**:
   ```bash
   npm run dev
   ```
   Runs Next.js 16 App Router + Socket.IO server on `http://localhost:3000`.

3. **Multiplayer Testing with Multiple Clients**:
   - Open two browser tabs or an incognito window at `http://localhost:3000`.
   - In Window 1: Click **Create Co-op Room** (e.g. Code `TOOT-12`).
   - In Window 2: Click **Join via Code**, enter `TOOT-12`, and click **Join Room**.
   - Both players appear in the lobby! Customize characters, ready up, and hit **Launch Match**.
   - Test running alongside each other, triggering fart blasts to knock back each other, carrying boxes, and stepping onto dual pressure plates!
