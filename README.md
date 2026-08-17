# PawPrints 🐾

**Your dog's world. Your trusted community.**

PawPrints is a mobile-first React prototype created for the DEV Community **Weekend Challenge: Dog Days Edition**.

It connects two related experiences:

- 💜 **PawPrints** — dog profiles, Paw Friends, PawFeed, memories, invitations, notifications, and community discovery.
- 🌲 **PawPark** — location-aware, dog-aware trail planning, weather context, safety guidance, B.A.R.K. Ranger progress, and PawPassport adventure history.

The core journey is:

**Discover → Connect → Plan → Adventure → Share → Remember**

A dog can meet a Paw Friend in PawPrints, make plans through Paw Together, head into PawPark for an adventure, and bring that memory back into PawPrints.

## What the prototype includes

### 💜 PawPrints community

- Dog-first profiles with owner-written bios
- Multi-dog household support
- Paw Friends and searchable friend lists
- Dog discovery by name or breed
- PawFeed with photo, video, memory, and adventure posts
- Clickable dog profiles from PawFeed and Paw Together
- **Paws** as post reactions
- **Barks** as comments
- **Paw Friends** as social connections, tracked separately from Paws
- Profile visibility controls:
  - 🌎 Everyone
  - 💜 Paw Friends
  - 🔒 Only Me
- Guest mode with view-only access to public profiles
- Mixed public and Paw-Friends-only demo profiles
- Paw Together invitations:
  - Looking for a Play Buddy
  - Let's Adventure
  - Looking for a Sleepover
  - Happy to Host
- `Sniff` as a lightweight “I'm interested” signal before accepting an invitation
- Invitation response flow with Wag back / Decline
- Notifications for:
  - 👃 profile visits / “dog sniffing”
  - invitation responses
  - Paw Friend invitations
  - Paw Friend milestones
- Encouragement actions for friends who reach milestones
- **In Memory 🌈** profiles that preserve a dog's profile, memories, photos, posts, and PawPassport while pausing future invitations and trail planning

### 🌲 PawPark adventures

PawPark now starts with **where the outing is happening**.

The user can:

- 📍 use the browser's current location
- enter a ZIP code manually

The prototype currently demonstrates two trail regions:

- **Bay Area / San Francisco / Bay Point** — including Bay Area `94xxx` ZIP codes such as `94565`
- **San Diego** — including `92126` and other `921xx` ZIP codes

If location permission is unavailable during the demo, PawPark falls back to the Bay Area demo region and says so clearly. ZIP codes outside the current prototype coverage show an honest coverage message instead of pretending nationwide trail data is available.

The recommendation flow is:

**Location → nearby trails → dog suitability → weather → ranked recommendation**

That means PawPark first narrows the seeded trail catalog to trails relevant to the selected region, then evaluates those trails using the dog's profile and local forecast.

The dog-aware trail ranking considers:

- age
- size
- energy
- coat and heat tolerance
- mobility and joints
- social comfort
- water preferences

Weather-aware outing context comes from **Open-Meteo**.

Trail details include:

- distance
- elevation
- surface
- shade
- water availability
- leash rules
- season and crowd notes
- paw-surface heat guidance

PawPark also includes:

- PawPassport stamps and badges
- B.A.R.K. Ranger pledge experience
- adventure completion that can become a PawPrints memory
- multi-dog planning where the more limited dog sets the practical ceiling for the outing

The goal is not simply to answer **“Is this trail dog-friendly?”** but to move toward **“Is this nearby trail a reasonable fit for this particular dog, in these conditions, today?”**

## Demo experience

The prototype includes a seeded community of dogs with different breeds, personalities, Paw Friend relationships, privacy settings, posts, invitations, and PawPassport activity so the social experience is usable immediately.

It also includes an Instagram-style demo dog video in PawFeed with muted autoplay, looping, inline playback, a poster image, and sound controls.

For the PawPark location demo, try:

- **Use my current location** while in the Bay Area
- enter **`94565`** for Bay Area / Bay Point coverage
- enter **`92126`** for San Diego coverage

## Product principles

PawPrints is intentionally designed around **relationships first**, rather than follower counts, swiping, or marketplace behavior.

The prototype focuses on:

- dogs as the center of the social identity
- trusted Paw Friend relationships
- lightweight invitations instead of matching mechanics
- privacy choices that owners control
- adventures that turn into memories
- preserving a lifetime of Paw Prints, including In Memory profiles

## Tech

- React
- Vite
- Open-Meteo weather data
- Browser Geolocation API for current-location trail selection
- ZIP-based prototype region selection
- Browser/local storage for prototype persistence
- Embedded demo media for reliable challenge-demo playback

The prototype also contains experimental AI-assisted caption and guidance hooks. For a production deployment, third-party AI API calls should be moved behind a secure server-side endpoint rather than called directly from the browser.

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

## Prototype limitations / production next steps

This repository is a working product prototype, not a production social network yet.

A production version would need:

- real authentication and account security
- a database-backed multi-user social graph
- server-side profile privacy enforcement
- real-time notifications and invitation delivery
- production messaging / conversation infrastructure
- object storage and CDN delivery for user photos and videos
- secure server-side AI integrations
- moderation, reporting, and abuse-prevention tools
- production trail and location data coverage beyond the seeded Bay Area and San Diego prototype regions
- real geocoding and broader trail discovery rather than ZIP-to-demo-region mapping

For the challenge prototype, community profiles, notifications, social activity, trail regions, and some interactions are intentionally seeded or stored locally so the complete product flow can be demonstrated without a backend.

## AI-assisted development

I'm not a developer by profession. I approached PawPrints as a product builder: I defined the problem, designed the experience, tested the flows, and used **ChatGPT** and **Claude** as development collaborators to turn the concept into a working React prototype.

The product direction, vocabulary, privacy model, social flows, PawPark integration, testing decisions, and final experience were refined iteratively through that collaboration.

---

### 💜 PawPrints
**Connect. Share. Trust.**

### 🌲 PawPark
**Explore. Adventure. Together.**

**PawPrints helps dogs and their humans connect, adventure, help each other, and leave a lifetime of paw prints behind.**
