# Master Prompt: Neon Horizon v2 (Complete Recreation)

**Role:** Act as a Senior Frontend Game Developer specializing in Retro Arcade Engines, React, and HTML5 Canvas.

**Objective:** Build a 1:1 replica of "Neon Horizon v2", a pseudo-3D racing game inspired by *OutRun*. The game features 5 distinct stages, a day/night cycle, complex audio synthesis, and a specific "Synthwave" aesthetic.

**Tech Stack:**
- **Framework:** React 19 (Functional Components, Hooks, Refs).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (for UI overlays).
- **Graphics:** HTML5 Canvas API (Raw 2D context, `requestAnimationFrame`).
- **Audio:** Web Audio API (Oscillators for engine/jingles) + Speech Synthesis API (TTS).

---

## 1. Core Architecture (`App.tsx` & `types.ts`)

*   **Game Loop:** Use `requestAnimationFrame`. Use `useRef` to store mutable game state (`playerX`, `position`, `speed`, `score`, `skyOffset`) to prevent React re-renders during the 60FPS loop. React state should only be used for UI updates (score display, gear, stage).
*   **State Machine:** Implement states: `MENU`, `START` (traffic lights), `PLAYING`, `GAMEOVER`.
*   **Inputs:**
    *   Arrow Keys: Accelerate, Brake, Steer.
    *   'Z' or 'Shift': Toggle Gear (LOW/HIGH).
    *   'Space', '1-4': Change Radio Channel.

## 2. Physics Engine (`App.tsx` logic)

*   **Movement:** `dx = dt * 2 * (speed/max_speed)`.
*   **Centrifugal Force:** Apply negative X movement based on curve strength when moving.
*   **Gears:**
    *   LOW: Max Speed ~170 km/h (High acceleration).
    *   HIGH: Max Speed ~293 km/h (Lower acceleration).
*   **Collision:**
    *   Detect overlap with NPC cars.
    *   **Crucial:** Set collision width tolerance to `0.25` (narrow) to allow tight overtakes.
*   **Off-road:** Decelerate rapidly if `playerX` is > 1 or < -1.

## 3. Pseudo-3D Renderer (`engine/renderer.ts`)

*   **Projection:** Map 3D world coordinates to 2D screen coordinates using `scale = cameraDepth / (z - cameraZ)`.
*   **Visuals:**
    *   Draw the road using polygon fills (Road, Rumble, Grass, Lane).
    *   **Lighting:** Calculate `ambientLight` (0.0 to 1.0) based on `timeOfDay`. Darken colors at night.
*   **Environment Effects:**
    *   **Sun:** Draw a gradient sun. In Stage 5, apply retro "scanlines" to the sun.
    *   **Background:** Implement parallax scrolling clouds.
    *   **Water Reflection (Stage 5 only):** If Stage is 5, replacing the "Grass/Terrain" drawing with a gradient reflection of the sky + procedural wave lines on the bottom half of the screen.
*   **Player Car:**
    *   Draw a pixel-art style red sports car (Ferrari Testarossa style) using Canvas primitives.
    *   Implement "Bounce" (sin wave based on speed) and "Lean" (based on turn).
    *   **Headlights:** At night (`light < 0.7`), draw two gradient beams projecting from the car. **Crucial:** The beams must converge and overlap slightly at the center of the horizon.

## 4. Track Generation (`engine/track.ts`)

*   Implement a `TrackEngine` class generating segments.
*   **Stages (Seamless transition):**
    1.  **Beach:** Palm Trees, Sand Dunes. (Bright Blue Sky).
    2.  **Desert:** Cacti, Billboards. (Heat Haze).
    3.  **City:** Skyscrapers, Streetlights. (Night).
    4.  **Finland:** Spruce & Pine trees, hilly terrain. (Dusk).
    5.  **Lakeside:** "Sunset Chrome" aesthetic. Purple/Orange sky, Water on the right side, sparse city in distance.
*   **Traffic:** Generate `npcCars` with random lane offsets and speeds.

## 5. Audio Engine (`engine/audio.ts`)

*   **Engine:** Use a Sawtooth Oscillator. Modulate frequency and gain based on car speed.
*   **Radio:**
    *   Channels 1-3: External MP3s.
    *   Channel 4: "AI NEWS" (Text-to-Speech).
*   **AI Host:**
    *   Use `window.speechSynthesis`.
    *   Generate "News Headlines" and "Weather" (Context: Finnish language/Finland references mixed with OutRun lore).
    *   **Traffic Announcements:** Trigger urgent TTS warnings (e.g., "Hirvivaroitus") based on the current stage.
    *   **Jingles:** Procedurally generate audio jingles (Arpeggios/Beeps) using Oscillators before news segments.

## 6. UI Components

*   **HUD:** Retro dashboard.
    *   Analog Tachometer (CSS rotation).
    *   Digital Speedometer.
    *   Stereo Visualizer (Canvas bars).
    *   Flash "CHECKPOINT" animation on stage complete.
*   **Menu:** Neon/Synthwave styled CSS overlay ("Press Start").

## 7. Constants & Localization (`constants.ts`)

*   Define physics constants (`MAX_SPEED = 12000`, `FPS = 60`).
*   **Localization:** The `TRAFFIC_ANNOUNCEMENTS`, `WEATHER_FORECASTS`, and `NEWS_HEADLINES` arrays must be in **Finnish** (e.g., "Rantatiellä on raportoitu hidastelevia matkailuautoja...").

**Execution Order:**
1.  Set up the types and constants.
2.  Build the Audio engine (it's independent).
3.  Build the Renderer and Track logic.
4.  Assemble the Game Loop in `App.tsx`.
5.  Style the Components.

Ensure the final result looks "pixelated" (`image-rendering: pixelated`) and maintains a consistent 80s arcade atmosphere.
