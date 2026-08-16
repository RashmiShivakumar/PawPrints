# PawPrints 🐾

**Your dog's world. Your trusted community.**

PawPrints is a mobile-first React prototype created for the DEV Community **Weekend Challenge: Dog Days Edition**.

It combines two connected experiences:

- 💜 **PawPrints** — dog profiles, Paw Friends, PawFeed, memories, Paws, Barks, and Paw Together invitations.
- 🌲 **PawPark** — dog-aware trail planning, weather context, safety guidance, B.A.R.K. Ranger progress, and PawPassport adventure history.

## What the prototype includes

- Dog and household profiles
- Paw Friends and PawFeed
- Paws and real Barks/comments
- Paw Together invitations: Play Buddy, Let's Adventure, Sleepover, and Happy to Host
- `Sniff` as a lightweight “I'm interested” action
- Per-memory privacy: Only Me, Paw Friends, or Everyone
- Dog-aware trail recommendations based on age, size, energy, coat/heat tolerance, mobility, social comfort, and water preferences
- Weather-aware outing context using Open-Meteo
- Trail details such as distance, elevation, surface, shade, water, leash rules, and crowd notes
- PawPassport stamps and badges
- B.A.R.K. Ranger pledge experience
- Adventure memories that can flow from PawPark back into PawPrints

## Tech

- React
- Vite
- Open-Meteo weather data
- Browser/local storage for the challenge prototype

The prototype also contains experimental AI-assisted caption and guidance hooks. For a production deployment, any third-party AI API calls should be moved behind a secure server-side endpoint rather than called directly from the browser.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

To create a production build:

```bash
npm run build
npm run preview
```

## AI-assisted development

PawPrints was designed and built with AI-assisted development using **ChatGPT** and **Claude**. The product concept, feature decisions, testing direction, and final experience were guided iteratively through that collaboration.

## Prototype note

This repository is a weekend-challenge MVP. Account creation, local persistence, community data, and some social interactions are intentionally prototype implementations rather than production authentication or backend services.

---

### 💜 PawPrints
**Connect. Share. Trust.**

### 🌲 PawPark
**Explore. Adventure. Together.**
