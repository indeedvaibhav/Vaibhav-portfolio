# Vaibhav Tripathi — Field Log Portfolio

A scroll-driven 3D portfolio where the camera flies along a fixed path through deep space, arriving at each "achievement asteroid" one at a time as the user scrolls. Think of it as a linear narrative journey — not an explorable diorama.

## Quick Start

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## How It Works

1. The page has **900vh of scroll height** — one "screen" per achievement, plus intro/outro
2. **GSAP ScrollTrigger** maps scroll progress (0→1) to a camera position on a **CatmullRomCurve3 spline**
3. The camera flies past 7 asteroid rocks in sequence, lingering at each one
4. **Captions auto-reveal** as each asteroid enters focus — no click needed to read the title
5. **Click an asteroid** while it's in focus to open a detailed dossier panel

## How to Edit Achievements

All data lives in **`src/data/achievements.js`**. Each entry:

```js
{
  id: 'unique-slug',
  title: 'Project Name',
  category: 'Category',
  color: '#6366f1',
  description: 'Full description...',
  summary: 'One-line summary for scroll caption',
  details: { role: '...', stack: '...', period: '...', status: '...' },
  tags: ['tag1', 'tag2'],
  links: { live: 'https://...', github: 'https://...' },
  position: ASTEROID_POSITIONS[index],  // from constants.js
  seed: 42,  // unique shape seed
}
```

## How to Edit the Camera Path

The camera spline is defined in **`src/utils/constants.js`** as `CAMERA_PATH_POINTS` — an array of `[x, y, z]` control points for a `CatmullRomCurve3`. Points near each asteroid are tightly packed (3 units apart) to make the camera linger there, while transition segments are wider (~14 units) for faster flyby.

**Adding a new asteroid:**
1. Add the asteroid data to `achievements.js`
2. Add a new position to `ASTEROID_POSITIONS` in `constants.js`
3. Add 3 new camera path points (approach/center/depart) to `CAMERA_PATH_POINTS`
4. Add the scroll center to `ASTEROID_SCROLL_CENTERS`
5. Increase scroll spacer height in `index.css` (add ~100vh per asteroid)

## Tech Stack

- **React 18 + Vite** — fast dev/build
- **Three.js** via **@react-three/fiber** — declarative 3D
- **@react-three/postprocessing** — real bloom, vignette, chromatic aberration
- **GSAP + ScrollTrigger** — scroll-to-camera mapping with scrub easing
- **Zustand** — state management
- **simplex-noise** — procedural asteroid geometry

## Project Structure

```
src/
├── main.jsx                    # React entry
├── App.jsx                     # Root: scroll spacer + GSAP setup + layers
├── index.css                   # Design system & all styles
├── data/
│   └── achievements.js         # 7 achievements + core identity
├── scene/
│   ├── SpaceScene.jsx          # Canvas + post-processing + fog
│   ├── Starfield.jsx           # Stars along the path
│   ├── Nebula.jsx              # Background gradient
│   ├── CoreSphere.jsx          # Glowing gold core at origin
│   ├── AchievementRock.jsx     # Single asteroid (click when in focus)
│   ├── AchievementField.jsx    # All asteroids container
│   └── CameraController.jsx    # Scroll-driven spline camera
├── ui/
│   ├── Preloader.jsx           # Loading screen
│   ├── TopNav.jsx              # Header with links
│   ├── HUD.jsx                 # Chapter counter + scroll hint
│   ├── ScrollCaption.jsx       # Auto-reveal title/summary per asteroid
│   ├── DetailPanel.jsx         # Click-to-expand dossier panel
│   ├── OutroSection.jsx        # End-of-journey CTA
│   └── AudioToggle.jsx         # Sound toggle
├── hooks/
│   ├── useStore.js             # Zustand state
│   └── useAudio.js             # Web Audio API sounds
└── utils/
    ├── constants.js            # Camera path, scene params
    ├── scrollState.js          # Shared scroll progress (no re-renders)
    └── asteroidGeometry.js     # Procedural mesh generation
```

## Deployment

```bash
npm run build
# Upload dist/ to Vercel, Netlify, etc.
```

For Vercel: connect the repo — auto-detects Vite.

## License

MIT
