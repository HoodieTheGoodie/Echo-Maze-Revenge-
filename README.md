# Echo-Maze-Revenge-
The Squeal to Echo Maze

## Tech Stack (Best fit for your goals)

This project now uses **TypeScript + Phaser 3 + Vite**.

- TypeScript keeps the game code organized as the project grows.
- Phaser 3 is excellent for 2D games with sprites, animations, particles, rooms, and enemies.
- Vite gives fast browser live-reload preview while you develop.

## Current MVP Implemented

- Main Menu with:
	- Title
	- Play
	- Settings (placeholder)
	- Equipment (placeholder)
	- Skill Spin (placeholder)
- Computer-core / circuit-board style background theme.
- Play loads into a level scene.
- Player is a blue circle with WASD movement.
- In-level Pause button with:
	- Resume (stays in level)
	- Exit to Main Menu

## Run Locally (Live Preview)

```bash
npm install
npm run dev
```

Then open the local URL printed in terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## Next Step

Next we can add Archero-style room progression:

- random room generation,
- random enemy wave generation,
- clear-room gate/door to next room.
