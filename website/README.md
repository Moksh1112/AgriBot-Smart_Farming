# AgriBot website (Next.js)

The AgriBot landing page has three parts:

- **Branded preloader:** shown on first load, and whenever a link takes the visitor away.
- **3D story:** a scroll-driven rover story built with three.js. It opens on a plain forest-green studio hero, drives through the field, targets and scans a diseased plant, probes the soil and sends the phone alert. It ends on a top view with every sensor labelled.
- **App carousel:** pinned while you scroll, over a blurred background.
- **APK download.**

It's built with **Next.js 16 (App Router) + TypeScript + three.js**. It exports to static files, so any static host can serve it.

## Commands

```bash
cd website
npm install
npm run dev        # http://localhost:3000 (use localhost, not 127.0.0.1)
npm run build      # static export → out/
npm start          # serve out/ locally
npm run lint && npm run typecheck
```

## Structure

```text
website/
├── app/
│   ├── layout.tsx        Metadata, Inter via next/font, global CSS
│   ├── page.tsx          Section order
│   ├── globals.css       All styles (story, overlays, carousel, specs, download, mobile)
│   └── icon.svg          Favicon
├── components/
│   ├── Nav.tsx           Top navigation
│   ├── Preloader.tsx     Branded loading screen (first load and outgoing links)
│   ├── Story.tsx         Pinned 3D story (client). Loads lib/scene lazily and drives overlays and callouts
│   ├── Icon.tsx          App-style metric icons
│   ├── AppCarousel.tsx   Pinned horizontal carousel with blurred, cross-fading background (client)
│   ├── Specs.tsx         Specs grid
│   └── Download.tsx      APK button that enables itself when the file exists (client)
├── lib/
│   ├── scene.ts          Procedural rover + tomato field + story keyframes (three.js)
│   ├── content.ts        All copy: chapters, sensor readings, screens, specs, APK path
│   └── scroll.ts         Scroll progress and easing helpers
└── public/
    ├── screens/          App screenshots for the carousel
    └── downloads/        Put agribot.apk here
```

## How the 3D story works

- **Pinned scene:** the `#story` section is `1000vh` tall with a sticky canvas. Its scroll position becomes a 0–1 progress value.
- **Smooth motion:** every frame, the scene eases toward the scroll target, so motion stays fluid instead of jumping.
- **Keyframes:** `KEYS` in `lib/scene.ts` sets the scene at each progress point: the rover's position, the camera position and target relative to the rover, the mast aim, the arm deployment and the scan beam. Values are blended with smoothstep easing.
- **Sensor arm:** inverse kinematics solves the arm, so the probe lands in the soil beside the diseased plant.
- **Overlays:** the reticle, the detection box, the sensor cards and the notification are HTML. The detection box follows the plant's projected screen position.
- **Studio hero:** at the start, a forest-green studio sphere, a floor and a CSS hatch cover the field. They fade out as the rover drives off.
- **Top-view finale:** from progress 0.82 the camera rises above the rover. `anchors()` projects each sensor's position on the rover to the screen. `Story` then places the callout cards in two balanced columns with leader lines, or as numbered markers and a legend on phones.
- **Chapters and sensors:** to edit the story text and the callouts, change `CHAPTERS` and `SENSORS` in `lib/content.ts`. Chapter `start` and `end` values are progress ranges.

## Adding the Android APK

Copy the file to `public/downloads/agribot.apk` and rebuild. The button checks for the file when the page loads and switches from "Coming soon" to a download link on its own.

## Deploy

- **Render:** `render.yaml` defines the static site `agribot-site`. It runs `npm ci && npm run build` and publishes `out/`.
- **Vercel or Netlify:** import the repo, set the root directory to `website`, and use the defaults.
- **Social previews:** set `NEXT_PUBLIC_SITE_URL` to your domain, so preview images use absolute URLs.

## Refreshing the app screenshots

The carousel images come from the real Flutter app running against a demo backend.

- **With an iOS simulator:** run `flutter_app/tool/screenshots.sh`.
- **With a browser:** build the web version with `flutter build web` and capture it at 390×790.

Save the images as `public/screens/NN-name.jpg`, about 780 px wide.
