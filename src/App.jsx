import React, { useState, useEffect, useRef } from "react";

/* ---------------------------------- data --------------------------------- */

const TRAILS = [
  {
    id: "fort-funston",
    name: "Fort Funston Beach Loop",
    area: "San Francisco, CA",
    miles: 1.7,
    difficulty: "Easy",
    leash: "Off-leash allowed",
    surface: "Sand + packed dirt",
    shade: "None",
    water: "No potable water on trail",
    elevation: 180,
    crowd: "Busy on weekends",
    season: "Year-round",
    note: "Coastal bluffs, steady wind, steep sand descent to the beach.",
  },
  {
    id: "point-isabel",
    name: "Point Isabel Shoreline",
    area: "Richmond, CA",
    miles: 2.1,
    difficulty: "Easy",
    leash: "Off-leash allowed",
    surface: "Paved + gravel",
    shade: "Minimal",
    water: "Fountains and a rinse station",
    elevation: 20,
    crowd: "Very busy",
    season: "Year-round",
    note: "Flat bayside loop. One of the largest off-leash parks in the country.",
  },
  {
    id: "lands-end",
    name: "Lands End Coastal Trail",
    area: "San Francisco, CA",
    miles: 3.4,
    difficulty: "Moderate",
    leash: "Leash required",
    surface: "Dirt + stairs",
    shade: "Partial (cypress groves)",
    water: "Fountains at trailhead only",
    elevation: 460,
    crowd: "Busy",
    season: "Year-round",
    note: "Cliffside trail with long stair sections near Mile Rock.",
  },
  {
    id: "mission-trails",
    name: "Visitor Center Loop",
    area: "Mission Trails, San Diego, CA",
    miles: 1.5,
    difficulty: "Easy",
    leash: "Leash required",
    surface: "Decomposed granite",
    shade: "Sparse",
    water: "Fountains at visitor center",
    elevation: 190,
    crowd: "Moderate",
    season: "Oct–May best",
    note: "Chaparral loop. Radiant heat off the rock in summer.",
  },
  {
    id: "cowles",
    name: "Cowles Mountain Summit",
    area: "San Diego, CA",
    miles: 3.0,
    difficulty: "Strenuous",
    leash: "Leash required",
    surface: "Rock + loose gravel",
    shade: "None",
    water: "None on trail",
    elevation: 950,
    crowd: "Very busy at sunrise",
    season: "Nov–Apr, mornings only",
    note: "Fully exposed climb. Surface temperature spikes by mid-morning.",
  },
  {
    id: "dog-beach-ob",
    name: "Dog Beach, Ocean Beach",
    area: "San Diego, CA",
    miles: 0.9,
    difficulty: "Easy",
    leash: "Off-leash allowed",
    surface: "Sand",
    shade: "None",
    water: "Rinse showers at the lot",
    elevation: 5,
    crowd: "Busy",
    season: "Year-round",
    note: "Open beach, strong social scene, salt water everywhere.",
  },
  {
    id: "penasquitos",
    name: "Los Peñasquitos Canyon",
    area: "San Diego, CA",
    miles: 6.8,
    difficulty: "Moderate",
    leash: "Leash required",
    surface: "Dirt fire road",
    shade: "Good (oak and sycamore)",
    water: "Seasonal creek crossings",
    elevation: 320,
    crowd: "Moderate",
    season: "Year-round",
    note: "Shaded canyon with a waterfall at the midpoint. Rattlesnakes in warm months.",
  },
  {
    id: "mirror-lake",
    name: "Mirror Lake Paved Loop",
    area: "Yosemite Valley, CA",
    miles: 2.0,
    difficulty: "Easy",
    leash: "Leash required, paved section only",
    surface: "Paved",
    shade: "Good",
    water: "Seasonal lake, no fountains",
    elevation: 100,
    crowd: "Busy in summer",
    season: "Apr–Oct",
    note: "Dogs are restricted to the paved portion. Dirt loop beyond is closed to pets.",
  },
];

const COORDS = {
  "fort-funston": [37.7169, -122.503],
  "point-isabel": [37.899, -122.323],
  "lands-end": [37.78, -122.506],
  "mission-trails": [32.839, -117.042],
  cowles: [32.8, -117.033],
  "dog-beach-ob": [32.753, -117.251],
  penasquitos: [32.92, -117.165],
  "mirror-lake": [37.748, -119.556],
};

const TIME_SLOTS = [
  { key: "Early morning", hour: 7, label: "Early morning", note: "around 7am" },
  { key: "Midday", hour: 12, label: "Midday", note: "around noon" },
  { key: "Afternoon", hour: 15, label: "Afternoon", note: "around 3pm" },
  { key: "Evening", hour: 18, label: "Evening", note: "around 6pm" },
];

/* Fetches one forecast covering every trailhead in a single request. */
async function fetchForecast(dateISO, hour) {
  const ids = TRAILS.map((t) => t.id);
  const lat = ids.map((id) => COORDS[id][0]).join(",");
  const lon = ids.map((id) => COORDS[id][1]).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,uv_index,wind_speed_10m` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles` +
    `&start_date=${dateISO}&end_date=${dateISO}`;

  const res = await fetch(url);
  const json = await res.json();
  const blocks = Array.isArray(json) ? json : [json];

  const out = {};
  blocks.forEach((b, i) => {
    const h = b.hourly;
    if (!h) return;
    const idx = Math.min(hour, h.time.length - 1);
    out[ids[i]] = {
      temp: Math.round(h.temperature_2m[idx]),
      feels: Math.round(h.apparent_temperature[idx]),
      uv: Math.round(h.uv_index[idx] * 10) / 10,
      rain: h.precipitation_probability?.[idx] ?? 0,
      wind: Math.round(h.wind_speed_10m[idx]),
    };
  });
  return out;
}

/* Rough surface-heat banding. Deliberately conservative — it drives a warning,
   not a guarantee. */
function pawRisk(w, trail) {
  if (!w) return null;
  const shadeRelief = /good/i.test(trail.shade) ? 12 : /partial/i.test(trail.shade) ? 6 : 0;
  const dark = /paved|rock/i.test(trail.surface) ? 4 : 0;
  const score = w.temp + w.uv * 2 + dark - shadeRelief;
  if (score >= 100) return { band: "High", tone: "#8A4A4A" };
  if (score >= 86) return { band: "Elevated", tone: "#B4622C" };
  return { band: "Low", tone: "#2F5D3A" };
}

function fallbackTrailMatches(subject, wx) {
  const dogs = subject?.pack ? subject.members : [subject];
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const one = (trail, d) => {
    const w = wx?.[trail.id];
    let score = 84;
    const reasons = [];
    if (w) {
      if (/wilts/i.test(d.heat || "") && w.temp >= 80) { score -= 24; reasons.push("heat-sensitive"); }
      else if (w.temp >= 88) { score -= 18; reasons.push("hot conditions"); }
      if (w.uv >= 7 && /none|minimal|sparse/i.test(trail.shade)) { score -= 12; reasons.push("high UV with little shade"); }
    }
    if (/stiff hips|long back|recovering|growing/i.test(d.joints || "") && trail.elevation > 450) { score -= 20; reasons.push("joint load"); }
    if (/low energy/i.test(d.energy || "") && trail.miles > 3) { score -= 16; reasons.push("longer distance"); }
    if (/needs space/i.test(d.social || "") && /off-leash/i.test(trail.leash)) { score -= 22; reasons.push("busy off-leash setting"); }
    if (/swims/i.test(d.water || "") && /beach|lake|shoreline/i.test(trail.name)) { score += 6; reasons.push("water-loving fit"); }
    if (/good/i.test(trail.shade) && w?.temp >= 76) score += 5;
    return { score: clamp(score), reasons };
  };
  const out = {};
  TRAILS.forEach((trail) => {
    const scored = dogs.map((d) => ({ d, ...one(trail, d) })).sort((a,b) => a.score-b.score);
    const worst = scored[0];
    out[trail.id] = {
      id: trail.id,
      score: worst.score,
      why: `${trail.difficulty} ${trail.miles} mi route${worst.reasons.length ? `; watch ${worst.reasons.slice(0,2).join(" and ")}` : " fits this profile well"}.`,
      watch: worst.reasons[0] || (trail.water.toLowerCase().includes("none") ? "Carry extra water" : "Check conditions"),
      ...(subject?.pack ? { limiter: worst.d.name } : {}),
    };
  });
  return out;
}

function fallbackBriefFor(trail, d, w) {
  const hot = w && w.temp >= 82;
  return {
    verdict: hot && /none|minimal|sparse/i.test(trail.shade) ? "Go early or choose a shadier option; this trail may run hot for paws." : "Reasonable outing if your dog is comfortable and current conditions stay similar.",
    paws: hot ? `Air is ${w.temp}°F and ${trail.surface.toLowerCase()} can run hotter; test the surface often.` : `Surface is ${trail.surface.toLowerCase()}; pause if paws look tender or gait changes.`,
    hydration: trail.water.toLowerCase().includes("none") ? "Bring your own water and offer small drinks at regular breaks." : `Water note: ${trail.water}. Still carry a backup supply.`,
    rules: `${trail.leash}. Give other dogs and wildlife plenty of room.`,
    wildlife: /rattlesnake/i.test(trail.note) ? "Warm months can mean rattlesnakes; keep your dog close and out of brush." : "Keep your dog close around wildlife and avoid chasing or approaching animals.",
    turnaround: "End early for heavy panting, slowing down, paw lifting, limping, or reluctance to continue.",
  };
}

const isoDate = (d) => d.toISOString().slice(0, 10);

function dayOptions() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      iso: isoDate(d),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "long" }),
      short: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }
  return out;
}

const DEMO_DOGS = [
  {
    name: "Bella", breed: "Golden Retriever", age: "1–3 years", size: "Large (55–90 lb)",
    coat: "Thick double coat", heat: "Wilts in the heat", energy: "High energy",
    water: "Swims given any chance", joints: "No issues", social: "Off-leash reliable",
    quirk: "Swims at every opportunity",
  },
  {
    name: "Milo", breed: "Corgi", age: "1–3 years", size: "Small (under 25 lb)",
    coat: "Dense double coat", heat: "Wilts in the heat", energy: "Medium energy",
    water: "Wades, won't swim", joints: "Long back, watch the stairs", social: "Friendly, stays leashed",
    quirk: "Overheats fast, refuses to admit it",
  },
  {
    name: "Cooper", breed: "Labrador", age: "4–7 years", size: "Large (55–90 lb)",
    coat: "Short, water-resistant", heat: "Handles heat fine", energy: "High energy",
    water: "Swims given any chance", joints: "No issues", social: "Off-leash reliable",
    quirk: "Will carry the largest available stick",
  },
  {
    name: "Juniper", breed: "Poodle Mix", age: "8+ years", size: "Medium (25–55 lb)",
    coat: "Curly, clipped short", heat: "Average", energy: "Low energy",
    water: "Avoids water", joints: "Stiff hips, short outings", social: "Needs space from other dogs",
    quirk: "Pace of a museum docent",
  },
];

const STEPS = [
  {
    key: "basics", title: "Who's your dog?",
    sub: "The profile drives every trail match from here.", fields: "text",
  },
  {
    key: "age", title: "How old, and how big?",
    sub: "Age and size change how much distance and gain is fair.",
    groups: [
      { name: "age", label: "Age", options: ["Under 1 year", "1–3 years", "4–7 years", "8+ years"] },
      { name: "size", label: "Size", options: ["Small (under 25 lb)", "Medium (25–55 lb)", "Large (55–90 lb)", "Giant (90+ lb)"] },
    ],
  },
  {
    key: "heat", title: "Coat and heat",
    sub: "The single biggest factor in whether a trail is safe or miserable.",
    groups: [
      { name: "coat", label: "Coat", options: ["Short, single coat", "Short, water-resistant", "Dense double coat", "Thick double coat", "Curly, clipped short", "Long and heavy"] },
      { name: "heat", label: "In warm weather", options: ["Wilts in the heat", "Average", "Handles heat fine"] },
    ],
  },
  {
    key: "energy", title: "Pace and water",
    sub: "",
    groups: [
      { name: "energy", label: "Energy", options: ["Low energy", "Medium energy", "High energy"] },
      { name: "water", label: "Around water", options: ["Swims given any chance", "Wades, won't swim", "Avoids water"] },
    ],
  },
  {
    key: "joints", title: "Anything to work around?",
    sub: "This decides how much elevation and stair work we'll suggest.",
    groups: [
      { name: "joints", label: "Mobility", options: ["No issues", "Stiff hips, short outings", "Long back, watch the stairs", "Still growing — limit impact", "Recovering, keep it flat"] },
    ],
  },
  {
    key: "social", title: "Around other dogs?",
    sub: "Off-leash parks are wonderful for some dogs and awful for others.",
    groups: [
      { name: "social", label: "Off-leash areas", options: ["Off-leash reliable", "Friendly, stays leashed", "Needs space from other dogs"] },
    ],
  },
];

/* --------------------------------- helpers -------------------------------- */

const appStorage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage?.get) return window.storage.get(key);
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(key);
    return value == null ? null : { value };
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage?.set) return window.storage.set(key, value);
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return { value };
  },
  async list(prefix) {
    if (typeof window !== "undefined" && window.storage?.list) return window.storage.list(prefix);
    if (typeof localStorage === "undefined") return { keys: [] };
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    return { keys };
  },
};

const INK = ["#2F5D3A", "#7C5BC4", "#B4622C", "#2F6F86"];
const inkFor = (s) => INK[[...(s || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % INK.length];

async function askClaude(prompt, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

function parseJSON(text) {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = clean.search(/[[{]/);
  return JSON.parse(start > 0 ? clean.slice(start) : clean);
}


/* Every dog gets its own ID under one owner email. Siblings are separate
   profiles linked to the same account. */
const dogId = (name) => {
  const stem = (name.replace(/[^a-z]/gi, "") + "DOG").slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${stem}-${rand}`;
};

/* Stand-in for a server lookup: dogs already registered elsewhere that an
   owner can link to their account by ID. */
const REGISTRY = {
  "MIL-8T3R": { ...DEMO_DOGS[1], id: "MIL-8T3R", registeredBy: "M. Alvarez" },
  "COO-2X9F": { ...DEMO_DOGS[2], id: "COO-2X9F", registeredBy: "S. Patel" },
  "JUN-6P1W": { ...DEMO_DOGS[3], id: "JUN-6P1W", registeredBy: "R. Okafor" },
  "BEL-4KQ2": { ...DEMO_DOGS[0], id: "BEL-4KQ2", registeredBy: "T. Nguyen" },
};

/* Badges are computed from what actually happened, never awarded for signing up. */
const BADGES = [
  { key: "trail-pup", name: "Trail Pup", hint: "Finish your first trail", earned: (c) => c.stamps.length >= 1 },
  { key: "water-lover", name: "Water Lover", hint: "Stamp a beach or lakeside trail", earned: (c) => c.stamps.some((s) => /beach|lake|shoreline/i.test(s.name)) },
  { key: "peak-seeker", name: "Peak Seeker", hint: "Summit something strenuous", earned: (c) => c.stamps.some((s) => TRAILS.find((t) => t.id === s.id)?.difficulty === "Strenuous") },
  { key: "long-hauler", name: "Long Hauler", hint: "Ten miles logged", earned: (c) => c.miles >= 10 },
  { key: "social", name: "Social Butterfly", hint: "Share an adventure to PawPrints", earned: (c) => c.posts.length >= 1 },
  { key: "good-dog", name: "B.A.R.K. Ranger", hint: "Take the pledge", earned: (c) => c.pledged },
];

/* Phone photos are far too large to keep in device storage, so downscale hard
   before anything touches persistence. */
function compressImage(file, max = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Sends the photo itself to Claude, so the caption describes what's actually
   in frame rather than guessing from the trail name. */
async function captionFromPhoto(dataUrl, dogDescription, context) {
  const base64 = dataUrl.split(",")[1];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: `Write a caption for this photo, in the voice of the dog's owner posting it.

${dogDescription}
${context ? `Context: ${context}` : ""}

Describe what's actually visible in the photo. Two sentences maximum, under 30 words. Warm and specific, no hashtags, at most one emoji. If the photo doesn't show a dog, just caption what you see honestly. Plain text only.`,
            },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

/* Drawn in-app rather than fetched, so the community always renders — no
   external image service to be blocked or go down. */
const BREED_ART = {
  "Golden Retriever": { coat: "#D9A55C", shade: "#C08E45", muzzle: "#F0DCBE", ears: "floppy", bg: "#F6EDDD", scarf: "#6D3DD1" },
  Labrador: { coat: "#5E483A", shade: "#4A382C", muzzle: "#8A7060", ears: "floppy", bg: "#EDE5DE", scarf: "#2F5D3A" },
  Corgi: { coat: "#D98B4A", shade: "#C0763A", muzzle: "#FBF3E8", ears: "erect", bg: "#F8EADB", scarf: "#B4622C" },
  "Poodle Mix": { coat: "#9C9AA5", shade: "#84828E", muzzle: "#C9C7D0", ears: "curly", bg: "#EDECF1", scarf: "#2F6F86" },
};

function DogArt({ breed, size = 44 }) {
  const a = BREED_ART[breed] || BREED_ART["Golden Retriever"];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="pp-dogart" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={a.bg} />
      {a.ears === "floppy" && (
        <>
          <ellipse cx="24" cy="52" rx="11" ry="20" fill={a.shade} />
          <ellipse cx="76" cy="52" rx="11" ry="20" fill={a.shade} />
        </>
      )}
      {a.ears === "erect" && (
        <>
          <path d="M26 44 L20 16 L42 32 Z" fill={a.shade} />
          <path d="M74 44 L80 16 L58 32 Z" fill={a.shade} />
        </>
      )}
      {a.ears === "curly" && (
        <>
          <circle cx="24" cy="44" r="14" fill={a.shade} />
          <circle cx="76" cy="44" r="14" fill={a.shade} />
          <circle cx="50" cy="20" r="12" fill={a.shade} />
        </>
      )}
      <ellipse cx="50" cy="52" rx="27" ry="26" fill={a.coat} />
      <ellipse cx="50" cy="66" rx="16" ry="13" fill={a.muzzle} />
      <ellipse cx="50" cy="60" rx="5.5" ry="4.2" fill="#2A241F" />
      <path d="M50 64 Q50 70 44 71 M50 64 Q50 70 56 71" stroke="#2A241F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="39" cy="45" r="4.2" fill="#2A241F" />
      <circle cx="61" cy="45" r="4.2" fill="#2A241F" />
      <circle cx="40.4" cy="43.6" r="1.4" fill="#fff" />
      <circle cx="62.4" cy="43.6" r="1.4" fill="#fff" />
      <path d="M22 82 Q50 74 78 82 L78 100 L22 100 Z" fill={a.scarf} />
    </svg>
  );
}

/* Illustrated adventure frames for the seeded community's grid and posts. */
function SceneArt({ seed = "", label }) {
  const h = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const palettes = [
    { sky: ["#8FC4E8", "#D8ECF7"], sun: "#F5C86A", hill: ["#3E7C55", "#2B5A3D"], ground: "#4C7A4E" },
    { sky: ["#F3B26A", "#FBE3C4"], sun: "#F09E5B", hill: ["#8A6A4A", "#5E4834"], ground: "#7A6046" },
    { sky: ["#BFD9EC", "#EAF3F9"], sun: "#EFE1B0", hill: ["#5C7E8F", "#3B5C6B"], ground: "#6B8794" },
  ];
  const p = palettes[h % palettes.length];
  const sky = p.sky;
  return (
    <svg viewBox="0 0 100 100" className="pp-scene" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="100%" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#sky-${h})`} />
      <circle cx={20 + (h % 60)} cy="24" r="9" fill={p.sun} opacity="0.9" />
      <path d={`M0 ${58 + (h % 7)} L28 38 L52 60 L74 42 L100 62 L100 100 L0 100 Z`} fill={p.hill[0]} />
      <path d={`M0 ${72 + (h % 5)} L24 58 L46 74 L70 60 L100 76 L100 100 L0 100 Z`} fill={p.hill[1]} />
      <rect y="86" width="100" height="14" fill={p.ground} />
      <g transform={`translate(${38 + (h % 20)}, 74) scale(0.9)`}>
        <ellipse cx="10" cy="12" rx="9" ry="5.5" fill="#2A241F" />
        <circle cx="19" cy="7" r="4.2" fill="#2A241F" />
        <path d="M21 4 L24 1 L24 6 Z" fill="#2A241F" />
        <path d="M1 10 Q-3 4 2 3" stroke="#2A241F" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="4" y="15" width="2" height="5" fill="#2A241F" />
        <rect x="14" y="15" width="2" height="5" fill="#2A241F" />
      </g>
      {label && <text x="6" y="95" fontSize="6" fill="#fff" opacity="0.9" fontFamily="Nunito, sans-serif">{label}</text>}
    </svg>
  );
}

function AvatarPicker({ name, src, size = 86, onPick, label = "Add photo" }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, 420, 0.78);
      onPick(dataUrl);
    } catch {
      /* leave the initial avatar in place */
    }
    setBusy(false);
  };

  return (
    <div className="pp-avpick">
      <input ref={input} type="file" accept="image/*" onChange={handle} style={{ display: "none" }} />
      <button className="pp-avpick-btn" onClick={() => input.current?.click()} disabled={busy}>
        <Avatar name={name} size={size} src={src} />
        <span className="pp-avpick-badge">{busy ? "…" : src ? "Change" : "+"}</span>
      </button>
      {!src && <p className="pp-avpick-label">{busy ? "Processing…" : label}</p>}
    </div>
  );
}

function MediaPicker({ media, onPick, onClear, label = "Add a photo or video" }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      if (file.type.startsWith("video/")) {
        onPick({ kind: "video", url: URL.createObjectURL(file), persist: false });
      } else {
        const dataUrl = await compressImage(file);
        onPick({ kind: "image", url: dataUrl, persist: true });
      }
    } catch {
      setErr("That file didn't load. Try another.");
    }
    setBusy(false);
  };

  if (media) {
    return (
      <div className="pp-media">
        {media.kind === "video" ? (
          <video src={media.url} controls playsInline className="pp-media-el" />
        ) : (
          <img src={media.url} alt="" className="pp-media-el" />
        )}
        {media.kind === "video" && (
          <p className="pp-medianote">Videos play for this session only — too large to save on device.</p>
        )}
        <button className="pp-ghost" onClick={onClear}>Remove</button>
      </div>
    );
  }

  return (
    <div className="pp-picker">
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        onChange={handle}
        style={{ display: "none" }}
      />
      <button className="pp-uploadbtn" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? "Processing…" : label}
      </button>
      {err && <p className="pp-error">{err}</p>}
    </div>
  );
}

/* Seeded community. These dogs already know each other, so a new account
   lands in a network rather than an empty room. */
const BUDDY_DATA = {
  Bella: {
    friends: ["Cooper", "Juniper"],
    pledged: true,
    photoBreed: "retriever/golden",
    bio: "Three years old and still convinced every wave is a personal challenge. Will detour for any body of water. 🌊",
    trails: [["lands-end", "JUL 28"], ["dog-beach-ob", "AUG 2"], ["fort-funston", "AUG 9"]],
    posts: [
      { id: "b-bella-1", caption: "Stairs at Lands End nearly ended me, not her. Straight into the water afterwards.", trail: "Lands End Coastal Trail", miles: 3.4, paws: 31, barks: 5, when: "3d ago" },
    ],
  },
  Cooper: {
    friends: ["Bella", "Milo", "Juniper"],
    pledged: true,
    photoBreed: "labrador",
    bio: "Five, stocky, and carrying a stick bigger than himself since 2021. Swims first, thinks later.",
    trails: [["dog-beach-ob", "JUL 30"], ["penasquitos", "AUG 6"]],
    posts: [
      { id: "b-cooper-1", caption: "Cooper found a stick roughly the size of a canoe and refused all offers of help carrying it. 🌊", trail: "Dog Beach, Ocean Beach", miles: 0.9, paws: 24, barks: 3, when: "2h ago" },
    ],
  },
  Milo: {
    friends: ["Cooper"],
    pledged: false,
    photoBreed: "corgi/cardigan",
    bio: "Short legs, long back, zero self-awareness about heat. Flat and shaded or nothing.",
    trails: [["point-isabel", "AUG 4"], ["mission-trails", "AUG 11"]],
    posts: [
      { id: "b-milo-1", caption: "Flat, shaded, and every dog in the county was there. Milo's ideal conditions.", trail: "Point Isabel Shoreline", miles: 2.1, paws: 18, barks: 2, when: "Yesterday" },
    ],
  },
  Juniper: {
    friends: ["Bella", "Cooper"],
    pledged: true,
    photoBreed: "poodle/miniature",
    bio: "Eight years old, stiff hips, and absolutely leading the way back regardless of either fact.",
    trails: [["mission-trails", "AUG 8"]],
    posts: [
      { id: "b-juniper-1", caption: "Slow lap at eight years old, and she still insisted on leading the whole way back.", trail: "Visitor Center Loop", miles: 1.5, paws: 41, barks: 7, when: "6h ago" },
    ],
  },
};


const PAW_TOGETHER_TYPES = {
  play: { icon: "🐕", title: "Looking for a Play Buddy", short: "Play Buddy", color: "#6D3DD1" },
  adventure: { icon: "🌲", title: "Let’s Adventure", short: "Adventure", color: "#2F5D3A" },
  sleepover: { icon: "💤", title: "Looking for a Sleepover", short: "Sleepover", color: "#9A5CC8" },
  host: { icon: "🏡", title: "Happy to Host", short: "Host", color: "#B4622C" },
};

const SEEDED_INVITATIONS = [
  {
    id: "invite-bella-play",
    type: "play",
    dog: "Bella",
    breed: "Golden Retriever",
    when: "Saturday · 5:00 PM",
    date: "2026-08-22",
    time: "17:00",
    location: "Dolores Park, San Francisco",
    note: "I have extra Saturday zoomies. Friendly dogs welcome for an easy park hangout.",
    audience: "Paw Friends",
    sniffs: [],
  },
  {
    id: "invite-cooper-adventure",
    type: "adventure",
    dog: "Cooper",
    breed: "Labrador",
    when: "Sunday · 8:00 AM",
    date: "2026-08-23",
    time: "08:00",
    location: "Lands End Trailhead",
    note: "Easy coastal adventure, lots of sniff breaks, no speed records required.",
    audience: "Paw Friends",
    sniffs: ["Juniper"],
  },
  {
    id: "invite-juniper-host",
    type: "host",
    dog: "Juniper",
    breed: "Poodle Mix",
    when: "This weekend",
    date: "2026-08-22",
    time: "10:00",
    location: "Paw Friends only",
    note: "Quiet home, fenced yard, and room for one familiar Paw Friend to hang out.",
    audience: "Paw Friends",
    sniffs: [],
  },
];

const SEEDED_PREFS = {
  Bella: { play: true, adventure: true, sleepover: true, host: false },
  Cooper: { play: true, adventure: true, sleepover: false, host: true },
  Milo: { play: true, adventure: false, sleepover: false, host: false },
  Juniper: { play: false, adventure: true, sleepover: true, host: true },
};

const SEEDED_BARKS = {
  "b-bella-1": [
    { dog: "Cooper", text: "That view! Adding this to my human’s list 🐾", when: "2d" },
    { dog: "Juniper", text: "Was the stair section worth it? My hips are filing a complaint already.", when: "2d" },
  ],
  "b-cooper-1": [
    { dog: "Bella", text: "The stick is basically a tree, Cooper 😂", when: "1h" },
  ],
};

/* Profile photos for the seeded community, embedded so nothing depends on an
   external image service. */
const BUDDY_PHOTOS = {
  Bella: "data:image/jpeg;base64,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",
  Cooper: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAwICQoJBwwKCQoNDAwOER0TERAQESMZGxUdKiUsKyklKCguNEI4LjE/MigoOk46P0RHSktKLTdRV1FIVkJJSkf/2wBDAQwNDREPESITEyJHMCgwR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0f/wgARCAGkAaQDASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAgMBBAUABgf/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAABxetTedTrvFPrnFPrclTrXFWbfFbrZS0+u9FM7JFSLcJT671Uo0IKfXezVWBPOis0jh4R0taLkbZq9ONYy41O1cmNabMjtckx42BMrtTjK7VlcntWUyo1uTK7W6W/ze6xcO4VD+RMO5U83hXOgVD+RHPiky3hXN5F8yaXDeF8zhcskXJzC5ZAEslV8yYVzoFyfCpZwENEHjIVDYUYYIElIPFxWIigYnlgSJBg4JCGETyw+KAY4xfHFkTxiCODumLJ6JWZiJCKOWZTRzdYcxM1tTjtTTjpsGGcCXcRHER3QTPQSJSoF3A9PCJiLDgulAukAkvTuiCYiakeKIA4IOIO6Js7iiugRRkreqmikjOwkc9lEXc6rDdRDdjG0Fp+nyn3OxwHvJCXIHdNd09KEs4Hjgjo4Lu4qGohkcsZIScJHQ93HJavIjIaDi4GTBIWZaimMkAgkLoBWef2/HZsEN3nutt522ucu/VlRdgoz1Ns2LuVLS0PV+M9prAgwt5jg4KYOBWcBRMKXD1lcegIwCUwYSLcs6GDTBNUMrhWdMhcIQTBArdYLDCzpIjkEM1l5exRxurb6xE2xRLYqWVj3Z8Lo1lVxYQiWPZ+e9JvmBcO8zEwhxwSnIkSMQsc3rEqMJREVZWOJuoDawK1iLdkJeObQO1ViUXjquR9rKmMrRYFLNR1VuTNUrmbaxq3VvplVLPOr7CrTEToYXoYruh0s1Ls25FH0dKXdNbevBcOmwRmVnlNImJC4BD4eMs2HiraabGCQ0arapUrciLSuYNDu1CpGvNDUHrIVYqajIzHqGXtZ/PeY/Nk9hk6PFPE2c5WLdCLvMsy1Go02nKQ1Tx7tpm29UdeTZGuWwS0PuITDhRJx1Rx9Ll2bSeelmmxZWI3SpRfCkmSNZtApstd1sSqx46iBpYUtoqe5m5m1TuSuzu6XIT6Pz1dqZNlL+TotMuxXuFrMvZC2N6j6a5ze0Y1mO4xZ9NTyQLHB0GqRUjkSYWwX3cUzAYtdKbOBzZc2xbCzmDRq8GdUzfQUvLnbr5aIibCXy+h7G0M3Ro3qp5/XoqNbz+txgWIXVrXwLCWaR011FFp2bXB2sOED1BIl5rVMilNGZZhkHTwEwMp3H1VusdGcyv3PVqFtoqV3z9avY6Y0sk4tWUshLSaqV3gEw9hnMlEbV/F3gcPcrmBezxNKrCKVwcmhdpbC+Z9X5H1ms6oEWs1wuDkJh2nQxcGaJGrOVGegHpZZHTEsdPYuUl2Zm6+ArtrNUihJtBTObkUnaFgoFfgzaezlFWwlI9BpL23ibSjRatKObp0SLVBoK3or0G9472tfPvded3mbMgNh8ltGEiEJQgw+caVMxjSoG1Yo1ljTAVPPTuPsMGsh3s51ZsrVFuNGKvOIgq/EhUUumeW1NjNYJSqPrjhMS7qYuoEEMMypuZC1RchL0U9EzR08ytn0uVoay7gKzhmeGuNfctGEMVLl9KaesVUsMAYPIh1aLAXN6MubOf6sCqyoQDBEriuX7GTeLtZzlzA1KgpgClrPvgZ6tOiK08vjUt03lnG3MFaqi5GIJdGafQ2arDLWEwdLz6aw2+TpXsJd1A3p6WC4bJ6SgTjrIESxYmBlno4TVs53qwq5UtRmtioRWOrT7VDRCu5diW3ObaBYjhsV2pVs50j5lpfZHD/ADu1jLT4oRc8+rXrlnrLeScGVdnPQSi1jS1xZUT4LDYg4Dj6IEJlISlEka5X8vikuR9GKdhcAVbtUza5rrtXMM1YzWxbqogvKRBdsZDSAnhlmlJsXkWjGoWUKhehRs7fwPVxessVz0qyppyyAJgK5mLMMUXj2pIGglq3aqgbyDAlK2a02WeVxSrHV75t1uJRRYrJi8VkTMG1G3h6rKavpzTzj9s7PPp9OFeaZ6R3O+dX6Q+OsOzCOrEtVNPSMT03miPU+W9ZGqIxy0wCcKhgoBTGTFFwa5TtZCaFl1CKUu0jCr7no62UFaLMYrL3Zvam2AHNIJMD6ltKZXsvN7KBk73WYO4bc1REzACZGNRK4zS5DJo3xPSUczXxN5RbC5VnA2lZvl/X+Z9LZpUbk8aJC2VXTm6mhObVrVzswekJHW9SF250rgx0sVbDLlA2eKTtyznWN3oOjBah2lUQqGmiaiaWkK0sRFpEc0cUxW3zbBL68vXYf1lZV/MtsrKotnF2MPebPGzU0KVvGxcv0uJc3Ns8+vi6GYg+maqtClucLsyzSsZu1y7LiY5dYuUCi2VR2K067TuqRtt28i504P6l1mRY5O851G3TLmpj+nsvlRZT1wcKXcHFqOhXlrwqW820jh6onothlW1L2HeHtkqNvD3nZHMsq2i/Ls2153oM6zaHr/OWUe07OdYbPTHJmM0ezrLnXVLVvQbINgIOFNBhlVbtOSssdV5cw47rjHq3L1XtAuiVmNkdzBLT6wBZJUcWV5t7I1XzSrAFuRh9V7ZK757VstYG1Qire9L2bmeb3UamU/0rM2YsdjSutZEaSZVDURoLTixwVczpFkxiVWKCMag1JTJqx3dzuQDaHp5o9M1moiT4VJCR0iHEwcLAxrucnFdNMJbtHLq7kiy/YVi5kxXpyO8+hyG1ob6OuWNGuQxeF8hLOSrYhksgadSraUyUWIt2K5IzTMvWXYLyrpU1K3Su611eVv5Po+/O8IKGiBhTw2QBwrRIM2sVenjW7TzDssZ9iLO0HNxUuGcaKs9NlSpuKoK9ixjS4KoWUxo6yuS4lSToAuRlVZBKbqIajXqaJqXG40KWFqZydfMXQKtYkt9ldZieo8p67vhcj1MXMC8+3mc93oG5A53WEKz5vVWyFksWjpLIq6NRA7iZE1B07My4k86W0E2XFJu2VrIVs6sMU+yCrsKNkLKVOi4vJbOocpYgyzlRZpW6HM2Qsrtovlf1fo8n7Dxmn357wJeUiipz6D1qxjVKvvkznxety5i9Apqk1VhEMRoWVZbl41oViOzmULljU2Mix5TbVcPr5rRr1tTWCCCSfRUsE5YfMdMKdWBLqFWwREpc7S7itYgJWTia1L7ujxfoMX0PbMjUjnrT63VzRdm6eUUjfLl66LFGuneqiNutJfNLyjNllmdAk1bRouZyamgvNsoC5RMWVmNrzBUrPsqaqmoVLZJubNZd7cVPUpX2RpWWoBpXJi1FsWipbqvsLs3s3EPuzvQs90WUd0iY7luVO5lFvuapVu5rRLuZZb7rlTe7TKv93LXVO7cob/clE+7Okavd0wCe6qur3E5fdF9PdqW6HcqrXdz02t3dMMs90Jxu7HXeju3zLu6ye7j/xAAsEAACAgICAgICAgICAwEBAAABAgADERIEIRMiEDEUIwUyIEEzNCRAQjA1/9oACAEBAAEFAv8A0QjTVvgzv4GYSYCREuYQco4S5GirWw/H7bigk8Rp+PgEZhrM8ZmJiYmIP8sTHzrNZ4XngaeBp4DPAZ4DPA08DTwNPA88DzwNPCZ4DPBPBPCYK3hqaeEzwGeAzwtPC08LTwtPEZ4jPC08Rmtomt00tnjsngafjvPxmn4pn4hn4c/Dn4k/En4c/DM/CM/CM/DM/DM/Dn4c/Dn4cxMTExMTExMTExMTExMf4YmJj5xMfOJj/wBbMz8j/DH+GPn7/wDwP+OJiYmIJiYhmJj4xMTEwP8ADExMD4xMTEwZgzHxk/A7n3MzEx0MTEwf8O/jE7+c/H18Cf7/ANfGPj/fx9Qd/wCHc7momBMTv/Hud/B+M/H0IPaaTHx3maz+kHcH2cwZmDMTMyfgZzO5iYmDATPsGO61A8+mG7dN6bAu9arzBkMpH+I+czMJAnXyfnsTue0+jkT7nrO53CBM4B+p2ZiZnc/2M7f7H38D7nfw99dR5HO6dyzATJ+KL3rNl2qDk2V20Wi6r2mDMzadn5JxBkz7+e/jEExBiETufU8gyMajGPuE4gO0+gCCdlMH2OmaZz89zMGs/wBj4ut8ddjmx8Qia4gTJde1rOUTBsoqccAhE2Sesz1C2JnIHcIx/hidT6g+O8D7Ig6n1M5ZnAntj2hA22PxqJ9Ehs4OMT6J6PedmE9pjMx12ZqZ/I25tAmvrWm7ioENQQUDeShPHcxU2VXOI1jmU1bG1ForotdOR1MCYn+h3PqAwfex3mB8IUwEE6wXqiWVme0C5gRRMGHMIJCAAdAHbOegcjWMyoA3WwMHtD1D3AmIZo8f9ddhLOkx6oNSnvW/oKSIagzNX+tamz+OYnpLCl0ubd5jBM9Z64Bz8dQYnWf95mqmEiYRoTgbNBqjaif1HZLLF8Qn3D1MnY5hnjE9Yz6gPmH6XGNqwcq0H05CzkHezGYAQU7ioMqdLLBkVqJVrNlE3zMlAWy+3vUvkvAwe8TDZwROiJ1/h7QjvFmFFoDMWOzCFhnOIcFQFMsdYNiAH2OFi4joxgUA+uWZlUcnM8mZ5Mz2UK20KmZIjuJd7LYjCIysEXLBZedOODtXMqsztFbEsOx7l3qP4yvD5E7gIMIgWa5mq5ncZtYG2nc+wa1z4wJmoQNuutQgpXY7ADzZ6mZ5Vaecu/kXybUlSaMUisBrMRXczZ89zcGfcsZaFv5LlhZlUOalBV+QAsqdGKicr/8An8WzI9hPHtPFiABYyNvYwrFaNbYtda1+ohZIqr8ZbPxmdH/DWpZvTHYTN5iq4H2NRGFalLgZ6z6GDLBkFbABnVWVg6JFVYR141grxFAxlRL2zZysrbx/ZQNUrwxPspyhouKLyuR5QvUU7jbWdKA+x8FrGsoa7qa+OynyJ3MTs/B1M+oBM9/cPUDJMqZm14Kg0/GoIWukToFbLZ+QuPyUivvHawR2UrW2ZtMmFsRwdq/KX7jPiZaeZZZaqgHZuQTXyL7fKeC/viO3jdXFgsGIiEIU1fxtO2pyzSji4uRUrUr+SAa6Bfv5KE8VGOsYmMz/AFMQzueMQKgjBJ4Un6iVSPqieaqbibiDqM9LE1UmPxtyq+NQ+QbMQsMdmKmYNgNjNjLL6xDymtZVVo1Yac9PjtTx7hZTYqkAKg5A/fRdqGb9lOcLyEj2YuW9WnjfkyzlhRSl4HH44Vyy52EwHH46meDWBcfB+SYHabNBVxsbUADuBEYMukTxtBWlcbkgEoHizpl6jU2tAHSBiJkmAPHfxDkciyx043rWus6FW3pzP6iuMO6nNT+TyDBSX58q/sHHWPZ45/Vl5doI4vlU8esCmqpG6ijUmA4Gczv4BmRPSdTqaiYBHjSGzWWG2BeVF8yL+53PlWZthZICIRWoV60gsqJxPo9zbMv5njmzWW1oWlePEtW0b9dPHs2F6lqxXolje/8A81IVOzWnk1C58tVKbcrbLWzOBwyTn51B+f7AgiZsgh+snAVycTMJyc4nktnjfccYY0wPZQBcS5vWeW7IbkTJABEBfVb9iTWI3N46R+cpj32P8V/8tSItNVOsAwOQSQH1ffZXy1VqanMR+1t0fyETkWLZK9lsuYicTjG11AVc5mRO5myDM1nirM8aZ6ADsZuZmbdDuMVWAo0xMkR+MWi8bWKrCFbttOQTqRNAZ4zNOnvSsnnqI3NtMb2bGAR8r1K7mSV8nvcYs1aW1SttCkurLlqypxPqLZApmTP5A/8Ak/x2PCVrmFEys6myLAQ0x8DAncEBneD/AFXGMLOvgr3raSrhYXrgdcmtzDxLc41N5RJe/p18f6Qd65OsxAOv9Z7BnFsnjat7BtL0CxHwxfWNkjHRM7nDz+UH4+1m3k/js/i9xiFnmTCX7wAfBLYXMGZmbAzYA5M2MO3xmZnUZ2yL7ax+SkFnHjWzk3m2xLzWrbs3eSsA7x0qwdNrrWMCD/jKjaxcJKu5/YABZcpIsUBlciY3XLD4E4is/J5FP4lbHJ/j0dOPMQqPj6mZ3CBOphYZhpqRO5384mBCeTkvTsLeMqb7WeazX4UxFzP9IuToZWmRZX24wrA4UmK+q2eyqJWZviE+rFjLiTD97Qspj/H8QAbuYu/EIw1K615hMysxNjDMLNVnjniaaMJq8K3TxPPCIKxDhQHDQ6w8ZJeygHYwdT7iiMk1iIdvFEq1IUZGAeoRuLelfAQECPYWme+MCYw2BBhryz5w4+BD2MTi3eDkFkdWevkc9KmWaRswPZAwMyIMGYEOonUH1htiUzVZuOzGVnHuJjc2V7gLmNebYcGYn2RkmuvMerDVpgJhbmbAa/I8vS2RW7B75JGHP64iMZ3ni/3FksbMZfWxdC/YxAcFSNGVWmCDP40NuDNpvMnPsIAxGdZ5Oi5Ys/vW5IYdqMVcc27JvtmHBgxhvdexF+ky08TbhdY6eMrpPLkkrn7g7QhgO8bRWxA7Zs7DLDMNqfrjMQ2wwDmKolg9WTMMMRsEOIyiGcFSnG95+yYeKNDtNmy9YsH9SuNehOhUttdikiKWM7B262dhch1rDBJ+MkGEIf8AayehXajPZOs27RyApQLnKmruynWa9/Sq06UFOwGEJ6WBuiSW/wBHoPkxp9lk1XJELs0qrNti1oqDVYXSeQZZsz/Va9OVVWXMwpGVYAT+zY9V+yO59n/YntkqMWMhiBrI+fA+QDGbokiKe9v11fS4LXjKFcz7r/pEJwcBN8lwQT1A0TDKmUOvVp1MAmZn4/j6EI8Vc8aQpXnU5RcErLOmqsqth0tGO/8ATViHMAn+zCSSoxCJgK4qXBcPH+1Z/A3qpJWM0f1cnIT7zYiV8hssektUhoNRGb1EfGFaZGGBlGQUXEZdT/8AFinfH+HG47WFVAXXM1mkAgTdzlhaFvSmhKUWvDEe2wQgyyzRAcKTqf8AcJDro+uuTloqIy2qMD62OzL70EszvMmI+CzlrNlFKe9ZXVk9gcrCu6kvXGwyEwNKiSwxTbYc00FvHa4VbGyFySevipPJZSviqy0XyGMH08hU/S+fvX0VXUqCJuFDYYEHOQq7CZmCVIBJPecpq0ZTsB1+ra79lv8AvO0t9nU9P9Z6lfummGwISrE9Rbsg2dIQ5x40PwrGepNA7b1lsMyR8/xYO1djvZt1V9u2qZwMhonRzN1mfVGGPv4LaQ5FmPWzLytAhfbStsxulA9YN5bnD/1T1j9xugx9piAkTJE9sdzM+4f7RWn38dTbvi+9FowlhimcrjNxz8fxQxxpj3GHI1ZWAYaiH7YZgWBAPjHSe0LBmY+iEMuuayOn7BHTIWU2EKFzCchv7lQVHRJPiswBjsDv4/3gMttRM8LGLwrGH4Lafhtk8VsniNPwmi8HB/AYPWn419sc+3EAPI/kPI4+OEhbghxNfbbpMZ+mJ7AwVzrtPuBIyiIuodsNqcdEqTobqWL8ipT+RWqtyl8Q5JCPdaxx1yl/VUf1k4B6boB2Gfx7dOwczM/j37ArM3qWeYTyAwlps09zFBlnQ29bv2PuNWE/j0Hm/kKz4PjhY/GCegwpHYByGzqoAB/tkYzM6xrdU8mw2Gt19SFuVUI/Is2bdiVxCblHkMXVzrXCwyo2X6TPtnv7Fh9qk25Day2ii4HhWBl4Vhenj11rpWIMTWYMLKIzgDygzcBrHG1ZzVyf6MKza9Xf8cubOZ7cQ1qaz1P44Z4jdRyrqvU2CzHvBM+3IbEfmtu9rsyswTsJriAd1sNn6RPSD2bCRAditrwcK1wv9sHV1xYMiHuFZxv+35XnnxPyHyLrDN2gsOxZt37GPfQZ/wDnJD57X2QfXJG/EOPJV2/AUZtZ9QvkbkAC/wDjv+n/APQInUzkbiPzK8tzcNdzGZDYWK9qNRKx7aPqK8R6WaeO2Gm1g3HcL4XwlFueNx0VPEN/qIMj6lvcUzuWtgcGnNQrSeJBP1ZyDG7A1UfcLah/OAUL3Imq49/GCGbEpyEvyaKdZSs4bsrOekIxy8+fg/8AV+1bOLLAqflvta1tkNbTxLNq6ibelrmIfs9SpUdDRBWwgUpMF4aoDlxXoQcjxrOO3oQdbLIH90bIty9gY+PwkzxAQbYO8061gUCEbMpbyDbBBIAxF2a3I1/MWGx1Wj+2MThD9vI/47VJs5i5Xg2olLcxYeVZr/yNgBNgAxXNnjQFhtSxe1lEysJrENgLeTsckA+bIF8FjYttcGprmf8AItEqvRla5w9DfrtOBZ9ZiE44CbOJ3Mmf2LKTGOJuoVHi/RbupjqeQhNlp8aObFA3Nf8ASxP1cdcN1mjkslrXs6rOawsp4Y3BXFaq4LXOo89mMuQ1ZFa1OzBP2n+P0ZeN+2/iXCVcIsnjpXk1IqA0VllzMGb9aHxUoapn2NbK/kIGoEsGY+MmUIbrP0JA4I94TZM4mQYUDR0GCfXVjWECpghlXWdg7hVrLPVZZXUtnKVk46slefeshbbLlzxLNzyX346sVNlzsOPzqiLdORS3FAr/ABWRONS/l18K2AKCqPThRf8AYVn0zWIHy7NmKzaZzYDmeUEbq5NIJr1dBbWhDZjfTjBM43H8Vf8AU5MO82xPuePJ8QwECg1hoUPjDqrYwPpNF8oIMZ0Dcg+W82fspI/FsYakTScMMLSEKf6yJUgacaoceNV5eRdvdx01RNVdH462y4gix8wn9K5AcajWo3Pxt7dCxy22fdB7bpXK39avIbfSVKArLkWsCf4+mvPkon5Fc883JntP6jJmSYMzuMHwwyoWzTshhsv0r2DLA6dtOJvl1WcdFbkrw6K5Yy1q99ZTjcXzHj0VV10I0slQwN0SHls12X8iFm5CaLb4ssdbIlikMA7uoqqKtZWc1wOAU0tnHdLi+KI1qxWZqsfFuK6+PR+RZpSB1MzI+NczEIUTyrg2IJ5RPKuWXYYmJjq6xCqps7Wb2cfi7pcv7ORZ43zlV5WaeTyRyBw+OL3qqWut38UqLeIvldRcNROxYdt19XVB5GtWqeZ9VfyEDV7O2cFpkCrXE/GssVCaRcLAlacm2KTp2YxVWCtddXSta6iEgQZm0O5mrTVZ6kawqoCtWzeojcipS/KCh73FbMMIrO9nHvY0cPEezRUFnk5jZsrrUxOOu7NlOKi11B23dzubG01OKwyrhodYBrMAzMavePSGWpOw37K9tnRF5NP6VF284o0lpzPNiHNa1217CO5Cfxi/rzn4LHP3AyZzk/Rws0wMjGA5fIRVGrchCnlBS+zd24j12mgFKwfJkxlVhaipQP49XAqULTTXUtiMISdPRS7ipKq7fL1nCOWGlKDZ33V7Vt/FrYspZRMha1sV4FA5FbHNhAs8n7lyhIG6F3ZWZuQleDXWNthLxpXQi18fAhxj41OMBSSsLgQdxmCyy8IPze7uUmiM/jWtpXUbrRSELtqFOk2Hk1QuSpItBipYEtY7ZYhksBIF9lfmF+Jj9p9RlHgYAZ92yIlp3d9Vc2NTax1qUKoU5u0KnE1JXQVMWdpbZY4S8hKmwlnFSw8k5tLqJsuOzCzCHObPLByd7Q6Mq6mvx3lEWx7FopNjVrqldSB62a6upEszsPMqx6q7BblZalnIpULvyFqEo8Wy/sFFQSyo+pAaBBWal7Dw7Mqf0NS7euakawX9g+tzcZTErFYrQbd6Jtgo86B/YZrlrHWoDjOb6a1qmAZiMP2mEZgJMYTUCXWeo46rEqEV11tS2w13V0o+4PFF5ewViAgkjaIyVhraWnGstuJqxyd8jj/sUYUaPrWmqk+KWFjRn9JA1UeMPlnGWQL2fZGfVcqj/cew1sEzGxtWB5eRU9kr6pGYVGCzU0V7CoMCuK3OtzHkHWsJcRYf2TYR3AWpr2CsBWvJxGtt8Yv2p8dtDeBbYnFavkWNobfd6ydgIzZrFWVatWgY+RcPLC4uzilGQx0L1Pnw8dSF9y6HFSskWxAPIQVc5WxvL+sR6yZRTWZ9chqUc5yWDZRAodtVHoFUgE96mxiwrCOS6qqhsAEDXytLv78UcsqotaZVIvJrzWtnIP4a4ShDLytdZbpNWgEtOsQGV2F7FevZ0cHskCXuvlpaxOOu0JcRKUW1HInJW7kXW+VQLK2X1VfChndhspdmqqK12YMRQteWiv2EBbHVYPjdLDda7wFrLdDqbF8iVhW0EcLYowDYwUWvYSnlcfjsY3sKbjZTtrYNHtKUhmYgVtZa1eyw4Y2sTK6ndqgMZ1s/4jhqDspsrdCqsueUruPCqymwNDZ+1v2k8QMFd6RbRdZZ0yrVYSiHSUMFdGGLbzWFq8rH3Rfdat0CZAB6bdn/AKQjtVrrcExAs39a6cH8hWn7mtcevHsaxSOu5QdbGoq1Fd7Tg17Oq6jlIniqssqqxsrcWtWtprc1hBAUZaTo6/sVrO/x2FormnSriMMm8rWvFT0QfHSlOR2pZ5u8PuDsIDmKhl1JazPqbnFoZYVBjEpWgssGJt+y9bbLDqIby1tb4OAqiwGqqwGqhFWGWM4CbaW+ZnsZo6/qf9NVR/8AGH1coEUC1Kj/AOTZ0vJJjEjlU/sDf9zi2vv4KzAx3V28w+n9Qv0Klvv1AjMRXZc4eti6WKDFAnI9eL/HnyBj0D7cr+tOWuIDTHXIPjrCiwWKthUAQO04vuD/AHsqS5VG9qoomMLZ3Uzst2oh+1mYqAD/xAAgEQACAgEFAQEBAAAAAAAAAAABEQAQIAISITBAMUFQ/9oACAEDAQE/AeO1zdNwj0ziMf01NsXoWBHmGSmoLyDPVmooqeYGaihzceKw25gzdCfU+l3zOaXUbXoPUo/Acds2zZBpnHiNKAekerbFSyfgHgEceKswdLjhOTpRQDIYPBGIxZKKC3AaOLvRoc2CbdM4E4hAUIi8Sc2wGM9wio4rrWapwap9itdH210OOfYBe2LjpBjjzVqjB2m3QBiwfQxYyJn2EKcULdEW7MNlfkPHQbORxNH7DDYwHzD/xAAjEQACAgEEAwEBAQEAAAAAAAAAAQIREBIgITETMEADQVFh/9oACAECAQE/AdlZ5OSmUyijQeNmiRpkaZFMplFFFFFFfFZeLxZfx2ai/octiL+VvdZF37bLxfrjxvssvFVitr9K3pIpHGHeLwlhsv0V7qWbHvRW/nFHWFRxi/be+yzsr4aK22jyRHH4rxZKdHkPKh/pY3fyS/VIf630am81mvi/XV/CiMBRKK+VyHKyiy0aiy82/ezkQ2OX8OcUJD9rkjyMi7GRfBPovbxQ+hIUTSaVvtEv0SPKP9WdlESXRDon0ahGmzQxRKKxaxZeyyyVEi6Ixvk01ziJLoh0SVo8YvzKRwT/AE0nkZrkNyLkKTLL2cDRKA4NY1uqOWUxLFYdiZZrJcll4v1McUJLCpDw2XQ5mrfWb3cjGxKzxnReW9z7x0XQmN7rxRpOIjleLHMt5Q3ssawli9n9HL/C+Bmrk7FhcHeOMpjeaKEVihDaRqossTbKzzlJZoWaODvCVY7xZLnEijremxVlf9KOtrKFhn8wxEhZZLYuhdH8wz+DGIl3hY//xAA8EAABAwIEBAUBBgQGAgMAAAABAAIRITESIkFRAxAyYRNxgZGhQiAjM1KCsWKSweEEMEByotFD8DRQ4v/aAAgBAQAGPwL/AENlb/IvyzqjlYFWIViqiV0qyt/oelWVlZWVlZaq3+TRxVT/AJFgrDn1lfiFfildZXUvxF1ldSurq/K6uupdS6l1K6uupdS6v/t6V/yNv9LblT/S9P2I5U5U525W+3orT/n352+3blZWXTz6eVSrn7V1dWpvy6lQn7NuXZVVB9iytHL7xwChlUXE+zlWJ7r7t/obKOLwyzvoqVH2q8p51+1V6pflRwRtyqqq3ryqrq6p8qKKqhVhVEDkecc60V1ndCjguA7qSZ8/sUMjZAgAhYmfyrE1X/yLcrc45aKvOo5ESfVSr8qqjTyoQoVFZUHsu6qqQtFRa/YLpUmvKFHKgXhm/wCyb3uqCo2RYaGblVcrj35V5axyv9iqjnSiqgqnCr8tvRSfRXHshEK3wun2Vgqhqp8KzXLo+VTD3hDCtWrf1UQFYR2VVRdXIcMWF+YpNV6q8hOc1pJFJ2WI5f6qdAE931FSXuUPMHYrG70hMvD9OXQqUV+VlblGA+atysstOVVUEKBVa+6zLKpKylVnyVGx5qhVF0/KtCsFcDyUkLt3VleFr6FUkeq6oXV7Iv4jzRFxueVEKkDdTHYqTZHF9XKCqBSalVum+JMecSmxSKDt9i3K6vyuteVipwiV0qcKo1dC6a+a6I9eWvuomB5qhCpJWpURCyhRErUeRVnyrEr6gVDsbu619VQwuv2VMKk/CaHdMUHLdVMhQ6hWG+JshVRDgoB91NEcMLN7IrESZTGjdUXTPqulUhWC3Wqt786Farqb7oxPopJ/4qGyhQ+gVWklSc3+0KawhJV2A+arBUSQPNQ50+YVm+hVmlS6h81ld8qte8rocpDXuXSV0LUKgaq8NClyhxGmjaQp4VWrZWRsuDxtWOhCFTlOJQEfjlhF07iEUFOVVdQDCuSrLVp81F1WFYqIjz5b8pJ9lMysMU81BnyKkMd/RZWie6zM4ceaqG+i3XWAjTENKKHswlYsT0esoObAK+h3qqthdUDsF0lXI9Ff4WZDDIUuuOVDAWKAV1cjPmsG1uVFXl5qbn9lJoEGNAwhaK6ytC0VYhU5dPO3KjmNX4jSsnFjs1srK8Ed2LNwpPZSeGVTxB+pYpdKifhWlbL6B6KB8NXW0nu1Zmn4Wvov+1GEKjZVeF8qhc1dT11FRoUNhZYuRXcKiBoRrKwCEDsUJpKyar7x1VhYCUZhjd09vDiAYrqgWg4gUHtcYPZXlWVFYqxKgCPPnErMuo8pbnO8BffcIyqAtHZZQffkcXBPm1VxfyKpPq1S19P9qGbLrNFUyB/CoY5582KD+yylpWbCFTiwdmKHPcB5LdRUFAl4P6VcH0UxVYnGps0aKQ735Fm9ubovHIasddOadCsUUUNlAMoT8J+J6mSO66nhh+V4bXEuUE5imt11nlQq/wArVaxz1UkldazLX3VgVldTsqujuvxVTiD1XWPRVI91hcWlQ3Cf1IUgDTGvxeK35U+PIWTiMd5lWBnZfhAhSOFh/UqD3Kq0ejlqqu+V4fBy7uUNsEHAQUDyBFwsWuqzNCOGtVEprXWWMC6lxhYLIcQsoFiLbajVAvcGcIHpGqwsFdETgIJ1K8V0ududFZWJ9FUK6o93urrp50crsVA1dKk4m9oWUV9l95w2DzcqMYv/AIzY3xKzPSVk4ZcsPhPWLDCpxPdZnexWVzR6KhBHdVcwdmhalWcqOJX3jsCuY0CxcQ+QUe6lsGEChznTVQDTVEgZdWo4tUNKL7zpVKDzWM6KaJrnvwuioAUEvIH8SlgA8lUx6qkq3KnK66hy6oXWqiVYBaFWKgl09l90a9wq4W/pVg74VHNYPdaO+FXDCrDVdhC6J8nKQwtn+FX/AOMK8rpWvKGVcsTjiKHeqLfdSnarC5WTJ0HKixA+i8NtNyrxlgd1hIQH7IScRsgNAhxeKKCrRutCunlZaKy2VOIutqqR7KgaurCvxQf0LRaLoHuqNHuvwm/zKA/CzzXWT5FQHe5XQXd1Mt9ll8P3UfdBdXDPkFJbPktZUvaoPDI81JLQqEu8lThf8l1GNuRH8KDBWBErNXZUorypdXzQc01QbPyoUIYxIC+7shFFnGJywt1Tg6GOthCmmHcoAECF1hdSuqD5X91mC1X4U+qoz0VeHHmV+GVZbL+6qVQqj1+I1SX/AArv911OhTwuJ7hZngjaFXByzPHsqQVDsEqGNxd13Uuqo1VOc+iymFmU/spapFl2VULCURzqnYZc+6ou4aJXSTVdPwqSPRf2V1Uhfd/sq8jWFOLnZZh7LX2VjK1Viv7KXcKfVQ5mE+q6x7lU4n/Nf/tT4iz/AOIxDYJoIFdXEqG8UeTRCzfYheSC9ITzyssD7HdXot9uUShBRxCQpb03PNuF2HfyTXcLgRxHGk6J2My6aoD910qSCFR4UYD5hWKo1UDl0FvmV/daL+yjFXyXUFcFWC6VWi6gtFl/xIVeI0/KzcRn8ixtcxvoqe8K7sKhllLnSVU/ZntyEp5Gqw6CpQPqgtkARXsVd3lELRrVRVV1BPKExraH+i8bhgktoJNuQNaqyu7lT9lX9uVYWiuuoFdQV11SrBf35W+eXSv/ACR/tCniDiE7qWt91jPosIMBb8tlfl5KuiCMC1EFPKlzqVTRUCzuX7rFBJ3VY/VVfTzrzedYXEF6KoiNE3DSiq5XX91dUBK/CPuukrVUeV1D+VdQ9lR/wvxvhV4pXW5XJU2A5VVj/OVHCbG5+0FhClV/ME6vU5UTU5267oKSFt2WvopEDzV/damVLW21Jos2H0VPstfpqg7GMKIJGGaL6T+pT4YX4Q91+GweqklXnlYeyrykSquor1ARdghbKJgboQ4ItB80AHYAsykyW6N3Ump/bl25GtUey/Snf7aIxYAcpVCrJwmEG6oC/KYp3RhGSFdziK1spHusTvaVb3+xiGhVOUJxEYdZC6fhdBXRC/sqP+F1z5haKR6qOFF6yo/Kqx6KQsoxaBOHEbhAsAji9OQqVsg0S1u6uTydunNQc7piqJF2uUt8k73QrqpGqr6rERzjdfuhCvylzqbcthrCNY7Bf+wFOEq0rKKKvPzKOZnmBy6TJrRfVy1WZxruiuyhxpKwgXqsUXXT6qRARMGGmKjlaFOIqpQwtvuqmsXWap8uR+EXFkaBYg3sF5WTTNSjMwTy8lg10V0MVkcNuV6KfhQaqoVoAuVMcxaNgpkT5WV7LJyvyvPKpQYPVAAGip+6rHuoar3srVupMiqxoEkgaoSelV1VSFayy0U4iQpk8pUz6LsqAe6Mz3K1OllAaW9055qZgK8wYTp3UDQo78jC22TjYBBeSvCmU3RSTI/dQsy3VBVUWEcod9oucDK6AulqqQshlZorZS4WsszcuuyyQYUBy7LNWUTqtTVSFE8rSNVou6J35Akw1v7o2mNNBsiQYCANVbyTjFJTg6xQGtiidkCyknZZ/dUN1hcc3flJM7BV+V/CrL0VD2RVqndYbSsSsjP2Q9zZ4eqArTvz05S6uGyyUrElYcVNwj4c+e62pHdSqmFCmK7KjPILeUJV5qoEpoa+N9VmqrhYn7p5BhpqnM0aGhEHqKOkNlNx9K/VymYVOm8ItiundSB2WU/zLC8jzWK6n6tyuoV0UgiRz7IFEjRbr+JU5V5NbugyuWkqmL2XUqPr5IZvPdSPNFreG690RE+aAADf4QsOizFeVpQIAnUqvKkqroQdJpsrKWGqywAoaGxqStUAJcP/AGibIpKnVz6DSimamfZP3c1bQhzbLqssg6l6dlit/wBqdFlNro45OsKmplEOKdr353hZgcOg1TmEyDULZVN/sv4gExRQ2cIuSFWiLi5F2gVvReWiiMIHK6P9EdeyIIooQxHVE0iFh3RabeaJrXUmUcEYu6gm11cAd1mV1MYe2ytFFIqQsQvYIlO3U/Zsq8q84nmZntyDhGUwswmF35MxGcQ5uO7uWLZB+3IOvFkHGhClYp91Wy8uWGYUbLBhPZS62yxVA7qrsPdGvkUGYjSqIY0CdVnzAVpug4tKmq2JKbsbN3KwqZsmgC7lStfsiVl2Tz+WAqBHRAkiZQbv8KRVPg9KMHSQs5pqgCaa+Scy7TVvdEcmDvKbxHMwiY5tExJoeUiQumFRYRfZUGKtUS5ZuUCeVNFW6AAU0TnNxYphTxaeaGYQhr5JxYx2busAa6umJYYqfhfiQpBomliCtVd1+/IHBdV5ua70ThlMmbqBHoo8JWcP0Kgf7KjHLpPqsymB3WKsJhPsqVdseTiRZtPVSX4odz4Uug1hWreVjlonupLsQVlAMKOX9FJC81iTi0iBqpxU7KMVZqqmRC+717L701Uiru6BY6n8RR8XhB/qvy7Kx7ldKPD4bpGK/knbKNB9hrO6rxPldRxbq9N1E5dwEcLT6hTlH6VDT7NUgH2VnFNBBEoXUN6lFisETSUDCx/lcOWUyE5+1E+ArVOvJqpmOoQw8E8SKhVop+Vcqt1TzUIS0wMxKJY3yBWLiGeyID6OuEWl2XYLK4GVWJWW8qGNkol4VoajESpgR3qtI/NCnHCEfQ0zHdeipuqXRKPusdMo2X4gH6VV3wupvsvxGx2CuD6KDE60QryEdOoR3ust0A3a5TQYdFz3WaO6g1KcTIog4VmqcVxbdSJaX9XogfUp4FpQUqZ81Rd0dITZaZ1VG5VGHCECZe5HE7DVZRJ76LCLLXyVSBCynhwe6AaGw0R1KrNfzIR61UR/yVabSbI9LvlMI6VAXa5VadlKgqF6J3ELJxFWb/MqgKMPssrKI6eSMBUR+qqDpAi4Cdn0ohqpQmBVQtTSye2NECfy1RouKGgYZmSpJpFVhNAnOjqsuG3spQ0hEkRssoaKKpKxcQYV1rCGye6s3yUuidlcKMSmVhcPVFdSmJ9VoENVGGW7BYhl7KVWVWY3R0lXVbchw23KDG+HAC/6gL8Fvm5yoGj1VcK0VHKe0LOLWKwxAKt6LblxuHxBQGWzsjXKFAY/DaYX0u0om7wqrizugQCYUumbwhxAEMbiR+VZWlWUvqsrQqyUQ5+Xsup07KUBblVy1KytVOU3XSQsQbRCaLHw2klZuH8KcScBw3FDC39SCnldO4xHZqoGr6VmwrXdTJUUQDgqn1QxO90ayAKgKqIa61SgS7ApbaU++Wis3yC7ymn0RT2tGvsiGk4v2TdkcMUcnDZHCYqmhrS8alEngnDuVEqJMLG412Qmia3waE/V9SyvMzTssL+MJ7L7s4/SFLrn4KweHidgtNCiGcLCpcwOd+ykUGwVXEGZR4ZEHRYXEk6nVGXUmioj4fDaBczqhDC7yVT5dlGq78hw5ganssIdQflCycPiO9IX4Meb1/4ghiwyrKIRJzbI2mNF1YcS1my1rdHa0LYFCY3CxEXNNJUucGwYKdgJdtRTfVEp57oxZOi40QdDRJiIUjkGGWmI7I8JpaSbLA4FvFxe4XiC3yieI2KU7L7luKt0HPfFadlLgAXatUkDxYRa2hXDxEzrFU5wuLuDVXL5or7wFrhfumAWNaqJRI0om4JMlMdJO6LeFTzTmzEFTeVDrL/rlfh4jeUK8IKnF9MKpxKf7V+IP5F+KfRqnxeJ7K5WWiMotxUTOG5+YqCZ3KviheIbEU7JpcwAinkgZgDREnp2QDSG6I4Lm6kGXAKi/oFLRPfZO6TeOYEPM7BBou65cao8VnELS2k3WShlNBnEGoPbLSj4gLm6VTeA04JWVxDZwupVNgYnurG6bwxv8IS6CUOE7M5tc11mMs07ItdYWhRhCqUS0zNYKwy2dl9RA0ReCAzUarZA9lIUaLxuKR/DKo4ey19ll4b/AGVOD8roA/UumFOGikDnRvuUSRWboYjou2yiy2UlY3UCmEGusd0RKY3iDKaL8MR3U8SGM2WWZPZWhv51VoNepOMeHidZFkyTrspp3Qa2iLeHwi5tvNBumv8ACnt8Mt4WlLqGcOXPmewVbKpjRUxIZqCyEfRuoJhAl5W5KMwCNk5wbmbQ90IaBN4CJmo0hYuKzw39uQbuoUWYOoqjW0VA32V4XWV1fCufblMx5o35dKs9SBrWeXZUCwT7LMaA+67CwQ4nErs1cOkNBiicBB0Wzm2KOLC7iAWbqgMNk7GThGiwBGGzqgXTiNSES1st17qpOaPTssLadghgqHfCgUNEZcXT8Iv3Cz0anOw4Ggw0boSI3RMSdhomsGtVLSJCiJposgJ3nRDA/LN91Ba59auhOLOJNOkNTXcZ4aCPyqoryLtkOGw9ydkGtAhaLpVlYkqmVQXSpLj6Kw9VRSSEcOnKpMnssvDe5S4eGTpco0c8/wASw4cI7oZK+aDniP6rpmmiY7jGcRsjFAupHBxIO4WIxIvusTWAYhWE4yA2zZTA6JlPLh9UAJ4pWywu990YXh2JCAkvdGuqrVFrYpom6+aAbZuynDTujh6VmqNCiZzkSAoma3Kdh4ZpQnRFmKdgsLTm2QLrHKY3WL8QKOlx03V/hOa2SSZT+K49RgKke6/suyrKoFRXULQKhDvJWgKG1xWQxVgXKnhtxxZO8TMdBsms+vplNDf8QJJ1ugwVF3OUyLVaFCM5gdF+UCyxHiOrWIRdw+I5jppS6DtdTKktoLkBUdJsEBqm+GC/YIueRG2yw0O6KPgtEoud1QsYwz0hqwto9NDW9qqc1ETW9kRYhDB+Ga+qgzI+V4kCbAppe7L21UANaxDhsEUQJZBsQhw+FGWZRzSD1NRIbW2JWXmmtmwrykCPNV53V5VjCuEYd6KZNNBqssMDtSJWFxPEn0WHgtwtikrESXHXAqcPAG6wmxGL8xuu2vZBsjFr3WK0UrZBwPe9FhMQdd06N4WEkGLFNgfUi23dUeCO6a/h8TpNUfEcDw0MKzNgaHdVPlRS17vJEwYBhC1VdFmHFu5TiCA4eYn6kXcKDAhyOglYisU4cJ2RP9EG9QJqifzGAsra7FYuA61C2EzUYcxOiOYv1QdicKbpjNF1NouoeikNKt7quEfKyVTg6AQiSHAaou4bJPwq8ZvD7Bqw+I0vb9Kzku7FEcIBv8QrC8RxJ/iesYfDYosTmnzmysoJwHFAnVS9koDhxO7rALC2L3KEXDbCygGCH4zSU/wsRB+orK4hO8Me5UuJmY9VxSJgr7qMMVK4j21JTm/ULp3EwmR091Umqxi4UIlxcBiyJvBrns7ZYW1c6s7QvvMXE+EBwyGt/KnkNwkqCai5WZGHDCTNUSXnLWqa5lig6bLG4W1XiNcMBqjmJ81AMG6zOkqw6wqlUVbrM30Ui6wtefRUaa/mCLn4oue6DOFxGk6Sj4vFZhY6p7qODmI+VMeywub90bymMJOHZOlOZhgR1IcOtvddxaixcRkBtnbrxXOxaYdl1CG3XEI4kSYELCLL81bDRHFOJ13boYWROi4haCXaQmTxCYoR+ZRFUVj4buoV8kZDmN0GqLr7LKYVfZYpw6IYTKDX1nUBG+8IcMGDon1k7KAYZ2QDXISDKOOpKEfSpccWvIFpnDsUMeXDtqqR4mizlgPkifIqSV1LIZKyu9SU/wC+xYb5YWSJNEYdhEotwHxH1oLqSJp9IQLyWzWMV14gDWs2TWs4ch1E0EuAG1yvEJpEBmyLX1xLFPVbdXQIGUKGza5TpC+6GYis6rFAGGuBAXJ3UcO5RY9wa6KQoxFwNynPeAzht0F3LKJmoUzSxUAKgmSrIggYT0rFIWIkp1HTMHFVdimnQKE3A0HflN0Yb1FZjJUSJRHFBwTYaoTRqfRpbSyIaA3eFeirZZcRHlyGHiZdAarMWnyoiunS4WYkM+qkIBjia2KaHVArGixWghViDuqsgjQqqETPZTqU6Kw5HNm2QfEy6I2UaKGZQvDe+Ir5qX5j2Xi8QNtTdO8MTxPqDtEHOd95EXVbfsgWAYRYygxuGoqVNMWyL3GAg53DA1RwHA2UPDdJOv5UJdJXTLtFidr8J1yRYJwcCO8IOoVQVQxQHaoOxnANAoqwA1ci0ggDVdXqvDmsXWIKiwOUBmEbo6Qhha7svvWhq/Ge3s23INyNI7rDl4ZInEayvD43EBd+UJrmio2VXXsjlIbOqIc1XHaUXsmG0lY2E+ZRZxOJidcoAZp12Rj6qrE6HYrwE17G5mjVSFEyUGt0rFpRfbdO4cV/ohwpnUrVYnUcr+LJosXDOBqzXF06gA+l2qjiQTy4jMJvNkTZGmJHj4z4YFFCLhMxRZsTvNBWWU4Y5XUgQSrI4BrVQDLuy8TimXfsvu5eupoaNAiSVLuHg2VKK6h4kHcKjmjZYRheBoU55a4Qu6ticsvDwtBuVjAMlNdmOkSgHtc79l4bB03qsbQLXQZi8yUMZBgotc9rE2H5Nlhblb5LKYQBvyrHZS+r3VKtyxPIgaowx2G8pnFGpzBZsMLI5VMrL7rE6C7VR/49VgwwLFFrWOeAgQbjkXlZuIMP8Oqsg2dEMBEN3Qc+JGqLODDj8BODnAxsESwVWM9Ka7DhaUSHYibnfkRF7Qhj6lLC+EHTdAyauhOLLxdNduEEHi8wnueATVRoGhYlwuHNHmqY0UBBWJyc0UyqJkRNUeI4Se6Dd09k0HIRy4h4lYNFIRMpvdP4rquDo5YbDsnEaCiOL6KBFQgsLiYFlBRQewQWzHZAuQ4bhlUDRGuqHFdV1UCsPEEhFlmjQIcIDLCpyawHKTBCgUjZR9j/xAAnEAEAAgICAgICAgMBAQAAAAABABEhMUFRYXGBkaGxEMHR4fDxIP/aAAgBAQABPyGmfEJXj+alSq/klMzM/wAVEmGyqbev4fKU1zKHESZmULIswSqZ7hmGe5jk+GVLfCZhHqM6IeSNpwIGBAIwXpLEf42MI3Mzc9kxyTxmMqVKXdSnU8+Hfh3Z5886edO9fc8X2lfL7h0M8T9w62B8M8DLdMt5lWrgNCL2MLZ5Z5Z5v5r1QmEfxED00wxD+CPO/Mv39kX5kU2v4rzp3T7Z5OV7j54rvHiUt5TsU8yebPfL9pftPdPX/wCIX4jlqaz5/wAKfxx5nt/CszW5RwxhgipXmH8FVKlu4K9yvM43KxuZupT2TMBjZxC5n+W/H8Zq5f8AF5nMamNShPwl3qfEyvFVHwiu5hsJZ9dyp+JVuZ+UN6jB58wtVxKlcxMbnqV1A7hnxOkw41A6lcyiOGp5Q/iF7/j5RTio46EAbZvE2qHduI/gwSrMynVk8plwygrUo8SsB7Z6x4DEPRPSY8xsq3sZdbuICmahlWfqV03qZNLmYbIkID5nimTn1Pj4nGncq8hKGaXAd3VzDVvbKJjMUqhb8Qc7+4juJbiLaQ26qK2hF5igv1Lu11KtDc0pLbsJnYyr3fqaxueo2c1GGxJTxmViMhuYcDATGLn7mCoEYtOCb8yvFzCxiKNW+Zddz5grtHzMM0viV4YX4PiOeKOCGdY9kE/uqUDRdMwMRyr+5XojtFlXyGuYWKv5ucCDFu2WYEvzLNwefzF3YHmUq3jdQtqUH9pjouG4B9pbWF/EOmHd1HB7gsUEs8/ECWN8E5lRQDWeZYukuW2xduCaJzRVKe/ZF4nXAWoazuRmBC7oi/4qb1ZNbWW1HWJ2DF/5hVZfPE/5U06gN4TSyXfEBu4m9QoNMLLcsXULaxO+771DhQ58QrwnEwYsIo8cHRFpeUq1FPaN2jHlIel3R9wFvDgierwT8IaEC+YNbw+ZWqIvkhYr6I7/AAmolwCsLDJf1G4RDf8Acqm30S2SFe5mrr3C+0flzMd/HcFobxt+uI+U3lbibgOlzuo3zNzHCpeIM5zGKG88IaV8jwyqXRnIAvuMUGsvxLTYS3phiUuV8EQ5+0wKq/cCjSD0X8x8LlY4fMKEy3jxKC0JRVQru79TkZPUbHfohfAeIFgnhq8zGjbNh1NvK54lmfJzMuHzFykU6gvd9xYftc2MvdoaHEBzaU3dj5YFFoMLuFkeWVKFNJ7zLVWD1LpbySz71oqIHUxtomoc4mE+E8RUSpYuCuZiQdsRX1UFX1DFGTD4iGg4chNFHxLtcFshxCwvCc4a7mwC8ItKYiw4Z5uO/wDMBr+BByhQwYlExcbsLLcbLML4ZV5JQ/tR9NdvMrfKdEBk0h14NA3AQ1OYxLFfU0DcfKC23C+f7mqQvcszg8TmqDCMpM6zfEcaCzyRaQHucQa98T1DuTOfdE4TBopRFcizRgXxUrcNMR1/clo0/EwttWo+WFLlqd8JYjImSkDb/tylVVO22LEQ4kdKmmnghStbqYxNm5v3HemtsfzLC2kmWcvUqbLXuI5s2cT7YthPiPQV3cuwSnTPiOQri139oKaqXDqot5qK6TuYeGWPkuID+FLGatwEM2leLmR3lLTz3Em0PER2T5biCiu6MC4JFmzObalnQ+rRs662xCV9zFI+NCIBRzADzypiE09ZakKKrf0QvzWUywPyZYbIdJQEnw+oClLfqBVlk0fHmoyhDDoXLBgfoeZVWabO41XkZfLRc5ldD6lqN4OpUgFl1xLPG+3cwUhitj1MSBFF6XDRecQ0MEy3X1EBr8Et2OPEDgfic9I+UvdvhgClfKL/AMJUxdC8KW2DbVDSfNsTTEx4OcViFNMXUO1t5YKqM3ouoZqekAtux3jNAPuGuZzcth8dxruz3qYQR7TEWS+3PBM2L3mNqz2WBjb2ytpG74iLK26DDnyIMUP0xHWXtU4xQ7Yzi9LcG00VmbY9Fri4IQ5Y4iUXAZoqIoYF8TIcsU7Tc8wvuWPSpMheRiwoUTgWeY3CM6XMsm+5jcrYOZsPYs+cwaD9sXUV4pM1n846D0Zyg9M8CnUc7Ipf2UADH4mUyh8y2n8Mf+mXUp/aJVD05Srt9xvKd4wykP1kreESqt/QmbU8CGJH2Myyp1BCpnkCWy7JixV9Q/uDNyRqEod3LIHKXqaSqVSKeiI9FbauH6XBUKK/OTsa9xBj0pK2e+YKuz1qKo9DUO7xXaUAcpW4RHI2V+Iq1XvOpZoKX3FpOs5GGzIc33DF/lLuHLCz+nU7J56Iyt2bbP8AU4HbfuLkU1EAUat1nmVNCXNtaYgloyWIbn3sSicmaB6EGA/O6hTC+M2b/Rc1iXU2N1A0B5Yh7FD7WbG+VQWrN5ZlSfHOGLZaSBrXpqD/AFbQH6+odIvhGhX4VM4VnHMANQcKS/DR0f1LPQeFGC5jlG5bwN3uX2zo5Q2/QY7PQAzChb7MRcE2q4pH33HJjszxCzSNhN/Xg6hCyzjMTp3HTDWF+dRrc/X+YMYN0OoltbEIHh1B7PmVOV+obdPm+I611DTPjgfWjlvfqdagu4iXQmRjU3WDzSSqxVuprfalXtb7gUtzJ5MPRCjVZ8y3w8xvti60OljoyuCAzW/4MyqvWM0ApAZXVzFAPSlwFseLSbcfasrkkItZ+gi+xxU0tg7uzMqZ7CYF0WRiOIeeEoFD4RPBflK2ychPPOxamPPfiQtRdXAaHtjtP5igi3xnUYGKodCDPEZAqUB3uFYu9l8kTVQ7KOTUuqA4xmoVg5sGChqIksKsqxCh9NjEk/ERHbWtqWZAAH3YFTwckMFcLAIqvwlDh7qNGn1DtIO5UNjqWQNKtp9YnErUvQH3GC4qWJ7hkjKFLo1PzKFLpmv6jcAN2yzCE9qViUpqj/cuYTihgLfg2nNT6iOa9KRI5WyH7wLUDsyrTPg/MaUqPbh+IM/i4dBo+MTMh9xF5pTt+JhgfnDdfMSwnzEaDDX9lMvHpUt7ePjZZw/pKRdBUoTjb2mZ7JYXrhjTVwPDPmDT7lnZZhlHuVGy11Gjb4S8Z1QHglM5zHhdSsUVy8xKQm2xDvUjX/iOlLgLccEW6cByxUUBycwpS2f7ZlRdviNVunqAm35olboXzNMCepVtfBl9g95jWPsxZkPqX5qGh711/cw8F0rmVYrVjM4FPki5TfSpx2eDcStB5oVLlT7/ADDgF6wqZVyBSv3AyeBeP4hVPOsgn8ERXsl4gq8UXmWrPYP9I6o4iftEKDb98TCq+oNYHKaJVJ3q5fPme+ZMXCtUunipuFkUmIOtRwPMuTA+4SOjzMTOo1AxW2zrqUrL78HUtqg5qv7l6hc57iVjiw3Z6lkKxYlTxmJkhzmsAgsbOHP1Ke/FfQmOV8kvbfRh4w9x1KfcNHpRbvL2zN6e7lHf7nG5rg9wjNz6ljLPqd31ZgDzF/iZA3gAxY/G3y2L9MLI7SjSx+Jmc8iP+Ys0nOv8QQC6YJYGnGGmpWLVzglKg3kBKWnN0Cv1NIMGDG/suO19tQTs+Godrdaq2VKr0H5grtYwO/cH2xgkm5qFqG+yZ3cmSPV1jucTcHfE7JUlf8YlC2RKvScE5IEVYOniDxfKrqZJ3CtphOJwxBk8JMuZasDxAWmg0PxLiby/zE1ye46R7W57PmDkQ9YgN3yT3v3Fea+mX6SW3efiLfBfYMG2l9y1s+c5Ch3OufE/9CXC1cUiS/QOL281GbBXb/WsRCvJAl1U+0zlye0LCOXoIjCl5pjLMbSyeeEu0Bc+KhdyfdMVW9mYO9/SCvXG7KlpF4L0RNVTdsVZu6ZaXMKqvuEoNOniElXuBA5wAZmnzCW8dROHzuaqUy5kmu+sllygV5+fibYsurxK3vBwiKuHkaPcting0SshVZ27l+PvzN8LlZ1+IotK+SUcw1s+srAiPMU/BEf7SZ8zxBD9pOmXjMsiL/ncVjb8Sg5+sXYwUY0N3/X8RbQXS5wm5g0GY7pnlhgBRDhpGjVyNoahPMdAJQHy1iSwHEag1qcGYVQ/DEIab5qGZfqBm49sl/ZdDKVL6l6ZurCE0BzLrWjtFzac2THB5EemK/BmklHBMAC+NJYpyfiYFGpT3iBl1Vb5XkmauvuNAi6TcyLaqc7g9A+pCSodpj1Ab4qrGVwt9ErKRfep4pPEf8hFuzPzmRoPcW3X3ZVQVIC29wZlfUHD+IubZp4Z7PlLevi02QfE3Dfqo9L0lxRSPxUS/poDwnqkAyP2mXFdXQ8lzDFJ9XMdBPGLmL+kJTJenX3LInoKwmivgQFMW64ibC/ax/IJQRVGr8wHPq5bjvCuKdj4jGS78xM2G+cIafkiC/gVLERv1iVTEa1BA41TMTe546/bOd5zklNuzz1MmQFmtHiCcvFTR4P2qWu2YXWGcvKKX4kWbX5tDX+k/wACQ9VR2RbFb9S22mvia4WbbI8H+EeLU+oioTwbnHJRQKRlFpckU5tQzoILZRguC+3+szC9EOwjLFGvj/SZ1UhFZx3moMvLW/1G1XYPxNsjwkouVMRMyktctOMxQjcdwEOU4qruLfF/ghdjA1/qYO3NwUyvhgt/Fqgyh9+Y4L4cLYkiV1zK94Di+JZfFmehL48ytRobPENXguUKvNxcYiqrwykqBREmurUa3pt5htCi+E3oXwz61Ut/OrCfA9E2ibg/GQn4GokV8IlLkKgJ19Sx/mLSjwj/AM2YcxWOKJaPfwwHb4St8EW2BfM0wOq/1Ctbe9vrEEyju6v7ivlEmFsfqIlGhgL35nLN2VHei98QMr+4myWj8S7dIi6age9CAvPdcsF427SMpMsrP3KE5C39EVOs3GC2PjcNjg8TAJhRksmv6KQvSg3fLMwNTAKyuYraE8xyriJbuL/nMSvsfyhWA+OHcuV25Zlb3B1C3aPUvzT7lC2vqWh0lTJQX1X1HogeakroHqFlvvSjVJ+YoUGdr4Ma/wCWUsuPUOKWbgl4z+5bwg9I7x3GCJxr4XAvc5wju+35lXb8mOuLiJd+hzAuv+0R0Malj4QsaNUKmQcufmVcgpnmaz9z3rzrxPEOlgoC93BCcgFRikFhXgsxLjCGOFEG/HCKL4hQ23R1cxWX6hf3d+LjNjHiUtr9ZhVnEsvemVzk4+41SpbH7jCIMsaZRwV+GUbNe5wNW9QVzavMYyOVWbth7Za6HzG+r9Mq5vYgqiNHg+E0n8cu/SIcjLKY0vcsnkfiJlNYu/E8qU7ceW5BWWMv9RCjyU+Camv9wyztlu/iE1yuiDTyxEf+iGwz16OfuEXFD/UGRls8BLTQNHIQ6lLfuXLQqjwTCORxxFzC5WCZq/MTrGENbW7+0weZm50Vq2ih9TJvgeajYCbUIKC/T/KGO0Jbe6gdnMwvuZM6+sAvNuyXJPK4tlcAfhEre15lJhXgTOU+cQx6GJ2/Ay1YEy8+rhoaX1Cpz9zLIXq40YCKlsBNHl0ZuIBWxnuLWNldkruTLWyAw6N2iMO3EAWLeyGPeaj2ZRciX6dEbW5AzK+JfxBU53iLqUCvmJ8IfcBLdfuwoXpHnP8Aw0ZgrpG7ir8LweI+1GXi7hfMrfrKlOOW/U4zh1qOrBhGNW2ENHXWISi16uXbRdI8swEc/aFkY1Zfg7l8qzrr8RJ3UobU+Iu/EXpNFQwpS8RzBFopddXiPDeALPqZsI+kauyGWUO0iuGCKDR4Lszm51Fqp+XbEBzAXhOFACGv9zW0q1q5Usycrl3OdtwLLOYKIUKGJmzv7QHefUooAeDEeKukTma98Qcf1JjbzXqbq7UBvbM/KaydRBuEehi5dizJ5GU5shbGuSINWS1MhImVdBFMfazG5ZqaPhFSfAxt8rJgRlnBF04ULdZr4qWbs/iFNwoOLUdoMua1LFnZypGyvQt5OiXU2hl/ATuAOTX+5floyEzGjpBWGE33+JSDq5Suw1KaiNGtUVm7m/iFxsaPKUyh8cErXPlqCYa+YOQcLStWaT7m/vkwjhLeYFqrLfgjYwdu2KFGfCMfcCwU4s6uc2gKrgiirlDqNylJ6vDqKyTV4NywMGJ/ZjPRhi2EhVnFLnx9ypQL+h4jfulHj+5maGkx7gCtvMt05gC4YJziUrQ/KNSs4bd+Za17ECDC+kbrUtr+5Stta7IlB8rm3dtxwckWlWW47S7bbgNxGUj+v9+It6pMm2YQkrDLtuJjp+bxCz+LZiXRseEiJFqKsltIQ5zLy5Im6S+iA0H5hWI9JrDVTmL4hA3+h3Kkryiyfl/CHsXp4itEtw8GAl7WMuvEZ1jV6liccn4lxAanMuN7kOoF4vCuYIhsWQBFeFFmGBrhbsmCfEXqWnEDXDKqmh8so3h9x5VWhMV9AeJbWFcWBUMI1BcVDTQPUQVFZ0rxHny0OjUvMRT/AHiYjoVUvzCuFNO+5eXTctHmWWwzgI8VKhgkegrrMswXfJAGl6HM2KV0zIosmeIjIfD/AL7lhQPtSlyhC6iI5QXVEEe7o8HLO8KZTqAHRbcFY8VUzNrqNXZOSL1/AI3+eMlQH+wnFRULhMYlVBA4QhFh2EZYDmqjJwDuEIrdaiTepzXEVg1bWaYCdh7jGm64XiIcLgVxC2WRrOG81MayWuJRQ9jFRKafmClpg2M4UdM4ihlx5gY+U+eEYalynwvlBMUV/wDZhCp3o8zFtkva6ualcF+oS4OOV1rs5hHIQZrhlvkoV/tMldztx8S+xcjzMA40KWatCyruJ8KcMqw4dQ8ZbW0d+4xob5XLKKzS09RQgIGHLG4a1DhBCg/aZxEK/fzH3LusS0oN/wCxGKHLxLXLdTbK4I4myqQYDMLigqn7hXQfM04fEUd1OAC+0VCnwCtyn3ZujqUQd75wooAydvmYL6qIodzAyweXTG2T1ziWAZ8sPDlpiUhUXogtc2GtRCVy8dsKSA5Zeo7orsvUMn4IKUNnj8wlSSmthxHdSkHhXPzMaXjzwS6h2XuaW5ZmJvdriivMTeAw/sYY4g8PqcBDb6cssFMG/dxbVHQZxnKuA4ubvlhvBAS+G4IhYeyoK9bCXPuMYxuAQBTzKSLVbSHnbFKV3SorC/CZjhAIN/ghU4W9cQl6XSzU2m0U4gmKOp2Lh6IpWm2bTIBVXYy9ErbPR66jcMuhXHmVSZfv7hQftx7IT0c3HqDkjN3kBGWma20TJXa5rcoutvHMRbkSNfkuX+ofLFdOriZWa1mNgXLqWNd3Zd+oF2zLMy21wtoCmd29IM1HaryhM1FZYQuniF99pYNaB65/EE08NeKndsS2cH5hFh2i3XTC8UrLf0jUpy3WP/Uyxg2vuLBEezniGT8AYrXkKZaXHFxsAy+0yWynqOP7gqXAzFspoGvaVICewlPQaIaWjle42qu5smF/ggKSBjxGHyIIpRRfWZdNrejryQtgFobibTKrOUx8vkxMjKKDhiskG2MbzqDcg1zlAc/STUcxTte4GtqmoAaX3MFcCiOFby6gGlheKIy7K2yS9Rq7XzpBCFddaYs3EZYZsZPEpckWVlVQeH9TVpfTmu2UxNA8TPTfc+/zBTzN16hUF3xCULubhGhiTVjxNlKmLwa3LVWvMs4BhTIp/c1b3FpUXtzepdl9wRbyU7gt985gAuRWu9Qb0AxW7mW0hlQzZQQGv2YMHiP8ZxA3eoJxnG43TPC8ze5R3MgAkIRbOjUy+gWiIEDNX7iUNO+kGqA+RKrHinBLfdGHqILNDU7HSWsN3piiDstsDFVCQEZ4RtFh4S9ql+R1MWspYczstLGIWKVQDhDBM6qV1GT1UodoH+Y7yXm/ATmPNWO2G25VWPWYVEN03dplT8RynmZGYEqGrW41JB5DPYY8weqNNTVSNDzL6C0TxEtrL5f3MAUx68wnY8lXNSxr5vEYHgOWiNKF8+vCZGwM2kRa2iXn9zu4lFu3rEVe9C3b/OWpaBcC1d8Wf3KZvJjTLJFJ2aqVtdurNMsDQLjCOA6EVEN68ep59/RHgDHKjPor7lQ9uGMC2eG5eOS6iCGTDXPUESov7hk/k9fXU+8IooXDRH4LpdbVLSjt/wB1AhHjuPmXfbc3mAiMVQBLJzhn+2M4B5CJU89fmEl6LK4lMpgf7Y47SW+kZg35gaVQsl0gniVYmAmCBdmtx1qLxaO0M3hf3Ank4e4sK8SOXz1jS2/oqF113jlAl6aqVW2VtAZg0tuCnUthyzqWvNLjkbx6lQzi+T/Ur9wPiOGv4quOEZjVRtkzIEOr0Z9EE6SdQXWPfUF4735iMnY45mJdvhxKYCPniZrVvtBwLyBXMyxNT1qUHNwY8LzwiN7RRwx+AtXRt5ith0RhhftVLO6KaMzGiDOJCEM8jrxMWcPJLClXqVCYHkDMNn4HM0WKKK9QLSjUytnbKxdaT3PP1WNYoOqkwohq1zGA+Jl+Dsxv1DRS7XzKqj3yDQsxReBfRgBR7jUU9sIiUPIWHuZTr0CLatSqMxA5AK4Ul8EstCIw3mVGVKXmWt9yS9tABdXKAvzbRE4dSRyxmBbzvco3yLZgoh0/D3Dblrucgv4QtyavxFBNzlqIMoy2xLl3MxIaAeHXmcwHqeWEqHYWpwEOItErjZBUreD+pZo+eviIRliVdEogU7/cRs28Zla1U3d4ZmQAKOCVgcciMqeYV+pkF+EwtF9AvhL72W4HTcZDEG/iDK7Jdx3Stb4hJRsDBzA1CDntxUf6lSDpQ/KZFfMojkPJhlzuGWCyC4DDIN0SlTW5bIoEKailgMwu1ndZm3GY9nEyxtzOusVVLHsRYUVWgReSCo7/AIMHuYcPq9TFBATXiCWFwx9KivpWytTG5wdQ0udr8QEWlv3EH50eVvEwPwuHgNsVKpyljUEiym7puIgElOc5eCZ6rte5qIjhg1PkBqWqmriuLiGiRSLdS2wzFZzKzIKMre3kJUFVMnE8EXIFeRcRiAWo4sixzZhHhBdi9zJKQrqMQeB61G718vKBW8Oyi4tK76mKyv5Rq6YG6wS3Un7RuCaAhvaoUsteSJs2ClN/UdRUZViquvgOD/MycdAcsFV+RMsWMLst4j5ljChVx3DLyfqNqq3eP+ZmlpcV1ieGKYZPmKscs34ltFGtL/M2bXmbmXcUTFA9FwY8tnKRqsDIeIvmWDZlesFwJlbrTf3KXjknMvFboV+JV0cbOYndNVbrzCgW18BLlKHPc7kuCsPn7FMSxwy3IlbJVWYUWcgcs0rDPUcu1dTuHwxsPwEe8yjG4szyQ0dDmuvqFUhmUlb3GL5G1z6lgqqw8yhssdcvmV2z5SjQv5lwM1HjuERFQNwOoIPaBRy12GI18cRY7T2wtVRfUAFll0x6mzASn5HyQDSt5Xkgo3Q3lbvygjl9xARBQww3DS63glqcNQqTS2h6xEtEcpldyqshWuoHLLYBdygwpbpCqo5uUq66pgZjZcdhUMWblGaprNxKoVC197iWZqdDiM5Ujk5O4jff7lh99wLd55zO5ecMyuCAMGOCFwho5JTFfmCQFPAyhBud8y1chqwiAXoSlAHqVuDnOYfmabxmGTRqxhncUvL/AKmYZxxuOxjf6jnqV2GdHU0iHN9w9t9ys/7xYpUdVuXRRTZIpoHDzK6nPrEMEncBXKXYSq8S5xA2f2m80TfmJB9iZSnEmy9uhgW0dLdhAVppvDMSUOjR6lnJW2qh4BBYFAOTAQBGdnpL5NtqvQgbIaZvr3La0B9TChnuXgVsu49oFAfUq4GKOYtwXCVD7pGXUZ8IQOjy5/EcOsALEECN8VntMgzgiKjlfB5hS9JwuPVEi3OP+AhJM2+lihURzmA6Kl6pfTqQJqKbUmVX8zC6UYYHEB6l3FS4tcEcu6uAFgNsqCRbHa6+CY+VjK5uELP8FCyZ6oEgFOBU+5dxPEL6T2X9QFV+ZmBNDomFi+iDfkuCAUHwj3H/ACYjVYKLWaJryAh8Moy6Cl3DBCqeI8xo5pN5wVEZuKDNEpZbKDh9QBV7BiCSL4s+JkQTkeYZXnuWgswF9ynXeETI1Xzs5jgZ+FWM1pZSsBWiUeMAf7QBtPQlCArf6pekvEqh5qNE02Nw1rW0b5P9SjIohcOWOhYl303GlizP6lK7IY6fcFd02sRL462gtdRdsVgWz1KBpGsI16j/APspiBYWFtZeo1G76iiGrIrNwI6W3kT3BoK217maAxb/AM8RWt5bdy9l+OcS2M07gK1XRwmb3n7gEWZl+ka/arLtOOEpth3K3DU29tI5WH4hz1xTLiY/olMFT5ubRrvqHwA2DPCjUzEqj8iWJnTe9wosO118oFyQcxhYCINwsT4KU3EOOCWI3yXUPQUDURTlzLm23ndHqcKaOHmU7aI8GuJdRgyxFbHzeIGENKW+JqYsgF81ORta62dzKzsplCLUVTjnwxikHTUiw9Ihoii8qDDFMbI005ZVCs6a4Z/MDKTvv3MrwZZ5Rg7pXnwIYuKZ/wATeles5lDCswgQaOk6FXK4UbR0J1QuH9wYqxE+kCl1lmp0TwnNHkeJUzWhcuAawP2hfhwnpXqczI+kFZfK0gNu50wGSi3u4VUp4RyiemW5r8zjb6zDb1wQ6wLTI+JjbewbjYMWMyL1qYPUVesA3yy5suWCdFbjoP3UwTVrfKFD0HR/FHTOEpnaXj8VvxESAjjGjuVyvLcXKs1Zv/EpIgN0z/qUp9k1o+UuzS3KqLlDa66lwUNKzDRxU4hrWrgsQMmgiVS2Wm/IwGCINcQEWC7UcH9QcANpVcSxEF7e4uaaOb6mJq6ozCLf2bnNgWPDXEYXWzlvzKHWYdB6+oq9xpW1BFt0WQrYdbfMC936heUAX4iUN93Mjd/+iBYbTVwToeoS5r8JdyT5eYf19ZwJQq9cz5A4XNIV9TKog/mN1WriHYuSUVFb28QVylVHQDx3FmXjlmWQJmU3FHWJB2m2eyeACBguJ1SIStRTR5CXLMVlkEYgrLYyVXRqEeKVQ+OnPmH/AOWQl6tLpCTUQsOKQ3WhD/ZFBwVWdJe8AgCniXIU7L0YYbZQFYI22sLvghiC/W5LirAdf5meDZNAmBLcniEuiqeYk07KzvuoVh5d/KYBF1DY7hsE1/w40RDQE4kwbSmsPtKRaD27mBCfvK8lxqCD2bjoqCOfrECLKfJE69BVRAfvnMUnM2CMByA6ZiF2zxEFj0kOELtRi5yBjuEqmgG3GrS+KnTduJFWbLNZlluLcxAyBwJrkod3aOrdFq4TPCsBxCASzjmVbZveNSgIJcGY0tHQ8pAGeht+I27mTa4Ko8JbiURKcHc0EOGWPUJHdBk7wsaFxQGpiW5yUCIyNh3K+B2HiFio8WCJcIRF2KlvNi5bjFrK88wm2tNjgZQqWOAlkGSNezzBmq/oXxG5vbB/6meGt0cEc6Z8IBsOG3Rjqhsbt1LgjlP7osXz1AAWgvAQiuO44IWZI8/0jvUIsNehLaoNdwX6EVVj8Smy+e5bYN7JfgK5xEbcBSitfGVcwjvejVQ4XdjqlMzeBzA1a/AbdfEz4aDpGWqxSH7Q8hScktRv3Dbq70bCUjoUh/EH2i7AQ1eeiiwDQQVrn7lwksJvVPEqhOwq41SqFFbDuETL5Pm+o9uzoc/ErKVEyaR4hg2lEY9kEwdywV4q4Jb2qf2MwLFbm7Zd7TJvg5+ZQUt0KCBCA+yXGaiMVVsRx6R74Zmse6hlUS5EojB02nuEXuEyYrzKSR/sS/sWDUbCG8A+GHCfkVK929QqC/IYg7ofLmWXzXNx5QvaoW5qX4v6gWu67nEPzDIA9ssZSclEyIVOKiK1nNbiFH0Iq8Jp9oviDkBnkF9pndBa6Y8pZtIr45mmcq1K+9sWGgaLfzLLuUte0yhEZVCKd32f1Rb9LpWaIMpKT9Zd6VoNrUqCV5JU7DyNdyyCtT53EOoJhcVIySGMG+mUqpUMZhooCA2I7y4QbSF2hpqbboYz8TJaWl8kzmwF83HAweCmEtJ0LrPc7HZxhcMHIP8A5LFa8V5lzeXQBupSBoaXW4Q2pXDpNPb0aIY5up5lYV90LlYo22C+O4nWtbkpU2nmpW+Ihb2mFQygqmSOUB5Eu2Dwg06LbiYDO+UFTBbHRASNPYhekr9wS12HBLKeJtVDb+YB/mNls3+0L4E2UXPXlAFGIVdGmNSJyfogNx+L2jkc/uWsUtZR8MRgUea3BB+gkJC2uAECYCKKkvK2WtgfEtV2jLqXhbAlayQrMPhLAsaw4vxLISvIYIw1qzxNI69eY7DFVXSZDWW3u2UQCVCYs6YVtsoMVqFOKHeaeYBi6PgcwXFdt4W2Pl+zNJWmWNi+4+1X4v1Ok+ghSCY0juWxsELahbihRFukG6isy4HAz3GgXUJab05L6hpyXNNM7zcg3HUoDd1KBwHiVdFeiWs9Zms34M8h3TMGZDhiMoBXPKWb5SyV9RpcEG7G0x4ircng6VzNEtmiveMKzVRzI0p7WMv2hrCx6gabDvhlDGaPB8wuGHKQMNBf/HMtivgYV1U5FStMQkEvMj/Eqt5qch4WU4ZGXlY2EcE6/CoFzQxP0I52CqXXuFr7ksnma2iMpXVwwGzRxDY7u76IWa4df9puwsEKoDoqPt+A49RyWXpBcEkcal47nTUzZwQbVu+t09zEtR2amN1dqrHuZtcra6DmE3KNb3BZDRV7Wo3gsrucORF8SkJSpvqKhk2KKo6lnUrnMAA0dENRU1Gmqcaucw+9bG1K9x2fMK0Mm2Irg/E9YEuoxAM0zcBH2PcxaMhPcwtGi+YljrYwF8xZL6SvmGuB/YMUmhQc2RETWaqWuoMH/wAYwN1I07XuEKsliuyXoFKhUVzQsy7ajPATXiX2AW4fUyKHzZ8S5C4jAHqaBeTrL9U11tXmKbDkcVFVK0Ilvy24eiK82uzL5hEgMA4lItNDliRG7zFKsUY4lqooctwoL5V35n4dVwlDXVY3zLG0aLs/MvClBVH9kTtb5RK1XMM2QpOEPEwCl5e5qiuDuBs12NurjA+EqCi4i67lXSoNE6CRVrLCuqLMy+mZguOTvcQm6s53HA3GSEn41KBMIWMG5pADDIWrkPMGiytwbYwwRy/4YkRC1P6nLG28vM+FsN+CLTMetnxDRw8Ygh+UNVNNf7eIAwGFcg0IUV5lQbJaW2W8fEERIwOoI1UcQeGCtfhBFttptXEvUKqSplnSKvaBFNDlAXJG2MUAdCPKbolYVQDlpAwAZpTOFt3Mxe7G3/EtNzVYIDyDrBUZHG0dQQGwhUlwP+YY2IrtCyAPHMqPMDB3LqUZr3Caeg+fMrUqlf6neoX+pRS99i4jLvkTUp4WlMCu2bvfMfApeTuDCVsEW/n7hzWUUHMaxA6dxzHymhG3XmaAbWjF2SjEp7dRUJs6RfMzo+wNH1DyZbCooaoHLzNDjYmZkk08leZQ7knPmH7I8QQnNZuVJI/4Mat0yy1fEvbo8avEsKawTeneFmpkxiFCLVWtlxMCp7x0RQlQsVq4yDb8EIBsb7jLwnc9DBpj3qJeWVdHU6YVKZ/sET5OxiJWeTEdlGYtn1G0KHcaUELHkigVxNUvcxNCoG9RTCpaWs5yqDL2c9zkI7icEBruGRuk1vMwlFXpNy4xeLdxm6IwrVpydsorcD2mz6avE3qDXWDH3A822R9RnWshWJal5ncsonyIEyofCSrmFb8NQdyoRXVQHp5nMqtrub248OZnNtTL4LmT0CuiPgGwLAhEQNjQhavC8zUQWGBSoyKzdC18EurY3uNc0+0dTliXXNe41tcFrgeQQ0k9JfOms+YZdWhEKwq+tSoeXL3OG5XTCUXMK0ZVwysOAeOIFk1NqPE4GeeoDsjWw5i4WYtnZGiJzbTHp6jcXiegjEHKK1L/ACEE3vszqKCW88Eu/U008yhn0IgRRUxeK9+TAGBNsSpoUjwc2zlKl0EAZVn29RJhpz+oIUtw4o7hr7dsCykuABrg/wC043hmtMtRPEIps2syjmYL4i0vG8mozrIOJay7XcQxPsEOWmixjrQ+ZmgzdS4aNXtrMzkAQ5lxW1UriCsAeHq4Rtp8yF2M6bBAEwDLzMhKRP4eo3uGQhaVLxC+FLuBnK4KWIG7JWXVx0fEWLNNxTQyOOWZwa2+EdfICeoghGeurhsnSx2iUpcxjZuUMX+5RgL60IjgcQg7liUpUDEct0X6nBLS33PbTGQI1LK6OGC5isRDmNEJkPMwKEjOIUGCsGEzzYuDnyy1yhF/c//aAAwDAQACAAMAAAAQGf5aOTqKY1F1CqRvk7AEZQm6eRzkcRcYibsk/Jd8pDvAOW/l5Z4AIwJUperEC+5gKZQLUbwZVWEQ8FYgMB+e6SIPXGfN9IMtRp4/uLJ27x9By6yA57SKCVpJo17ooOrffSU77eBoejAHCqZEcT/AlhiNwUlD0ZTf+BtrdUZLfcmvNXvSMuf7QSWpIpBNN5DK51Bh2DiN/P7qLEw1GA0WIzByzhhGPTgsyDDuELPxcDfupATIcmDpRif1TYbmW+SCqP8AGHuZrfDXX1f1Q0n8Z1ouF9UqmPxrSf5ZxeQufMbzb9Hloigr3NfztJE5iCGc2ggMQl9H9xyDe/onBfMOvtsHuzX6XIKTHkSxy0LBZbjIVHIGMs37TPfw1SgrbyiKeJOICkgQIpMXd2iMXDXodjX3w/lWUReYR6YMJaaBM3uOoMdJz6njv+A96ba+wz/AlNBdaVm0Cl5gBtJMlb4cXQxG06918r4C2iHs1eDlLk1U5WWSt29+Y+LDtPmtb8+bPvBU3yphJLdfXOD/ABTz3781A6nDbMBf67jKMyOw+2FLJjTgelYFRRcGD6PEI7JKKtpwZH+dh/WrREcVagv/ACRO6F0u3TmJY3JXmlQ8XXFQ1ZxCNCg8OGTqXr2O9ZtvCEiz2o3IwEVOBTMThq4wl3kSjC7VYFka1DglmJ+cb5/oIYvRvcQDPmjviDbYilkwAO8dABgA+eeA+hDc/wDwfPYHI4XXowv/xAAgEQEBAQADAAMBAQEBAAAAAAABABEQITEgQVEwYXGB/9oACAEDAQE/EMmFhYWEBYX/ALdft1+3X7dfsJ+3/UYtfZw6unAo2lhdWk5ZZ/tlnGWcZZZZ/DLLLOM4yyyP5Z8CE8HNn98s+OQQSCxs4MbLPlv8E+J4OGTbFo+ecZxnGWcZyEM+Q5PX4ZNnJotC7QZKSzvO1mQ8kG8HpLHjLy2221lq1s08gDhh17KXsagAkjksOGM9vPbZdbdXslpltm3kt3BsHwz4LKh32/5bbGXVhYXSVYOTGIkH8FhKtljg4wsLLLJu7LLOM4LP4NttIbZYsbcB/ic58WWFlmxxvbuEsxaQfzPio7jcJ7YX+Qy62WHtvxPmcPC22Sy2XSW3k+R/NFiGbbxEnGZbdvkCXb883j1dbMcZxs+W2HG/DozGbLCwMRI9jvLcjneNOBUW1+CxPYW8RsCbYkvXOyJ80lY1n6CPuLWwWHLPAM43CYkkI9ltxtlXbAz+my4ghZ2EvvAZu7vgYTjLyXLdI4XuESyI0WHkp93fI6Y3lhBPGbIHGd3a6WLBPYOuAk2MQRN1zkP7dNnecdt4ySI19WB5ODbXqdnjjuFZfXD5BAZPUGOrLN4bPPdn7GxOk6rC7sWIknWW5LB98ZYM/kAYTiykrZzuRmeSV2z8g/bCQAdRtM7suEqwp1AtgSNlqEOFpb3HuGTODIeof3L1kbKEDLbbpO46ll7nb6IZBvV0S93t5HVpB4gXAOpI5bDYnuYcnq0teFjL3H7LUvcp92mRRd4Pb28ju3u9bwXuPb9jyPJ9vUxwX0n4QRep9iY9/h//xAAfEQEBAQADAQEBAQEBAAAAAAABABEQITFBIFEwYXH/2gAIAQIBAT8Q7/l3/LH+QP8ALVjI/wAs/iT54v8Aha/kt+Tv5PwIOJA9jiFfy1atWrVu2222238dW8bbbbacm8NscNtttttt/G2/pkWSy28b+3/AbbbbZZNl5f4bxvJtuWzxrzt8/Qzxt0kHGcnCpDtoW7ba8m8BvJl/XsMcb+Ns/bI9WGDb+0rC3WyMzjJZbvJPI93j8ZZZavbBvE/8ZKN+2Z7kLM7bGUsPyYnjNsyNMCF1zt3d2BDB3ZDlowTtpPUxbwfjNhAktH2w4Y22a3Z84KPIzOGyz+wshvVsr+NThgYdSby23jbZ/ZMbt2tWNkF5P0spBgwl/wAt4GLYY5BWEFsvJY80/kv+2RBPXcrjJAj21HSe3u87ZJwf9wvmRx2hL33M/wDLBimnZ6JbobGeST/A5Ou7GL4gnZZ3G6IA3fy39tFyTrfyfJdP8vN59lCdSHS/phAhPd3Rfs9toXf8/DBZdRlgRi7fJB3dBtJ1msjuUIe579bD0lnUlS6e7J7AXX4eEvYm1nUnqz6hWsvpKPNQHwtNqEAHkf8AF4jB7kPLfsv8mYDuTJawJg1d2rX5Nu16RsIREHdh1dIPi/kTSojzsEc4/YjPvAWFOpr/AJMdRbBp1Me2CZYzIspM7us6ljuI6Leoi926WyxYWhCtlhMYzqWizHqPYS2Ltwuju18tT3HRLt/7YXsv5Y5GhsvgLC0PlskafZX2ToWg1YSaW+WEL7e+cZ9mG09CzuXWWvHDpb/yDkz7Yl2Wt2MhCSesYkLug1vPIZ7A+WWpClomXWzSwb/zgN5ew9iEOnds7Xy7aNSq1um5bjYWs4t2+5JiG7YD5YfLX21XIwz0WykwPnIRPpHbSyXQSxye2d+Qas2zruwQWL7PSSdSd2Kx0nDs/RIplinruHG3cgsDbfjADqA/buDpsf1kWzC6Db0iQ9MHXViyQZ27LFR2SBuwYcIuxMnkeHrh5nyPL4vRHl/Y94PTj/ODPN5vfB8vHH//xAAmEAEAAgICAgIDAAMBAQAAAAABABEhMUFRYXGBkaGxwdHh8PEQ/9oACAEBAAE/EM+pS5BB4jypAUxRKamUHPAsQ6YY4Yh1uHn+WAFww7XHMHWC7mP9FdqOxdTFSvmW4EfELFMOEezFlGDCyTIlEVBaxZPrjI4CteRqIi5MahnNYZaYfbrdCQq7TGSGTLlWYENExKoueiZWUcpK1VZ+plyQa0AkUKqCjfxAy3cKblRUEbUb8CohYYmHYuCYEbNJdWP7icJfcJd/kmS37J4r5mdr7IE8mM9EjpJFivzRmOWXpmEX+YI5+yCcHzFnUHXJp06GK37Zi6aP/mLf8JSVeoX3RPXANi9k4a+yJx+CXLQ+iZ4OwIVRHuCODe7jhVEOSh8wndjsY+P2YAd3mKbSCuWC/wADNr+xMdD9z/SxBhf/AIwbX/xDS1hiTeP1Ls3XTA9/XLc/XCzZ9oILSVrIShs+oi2x4lKMPMA7OJQRMniok3j4h3Z6qNVzOxEetmdkccVMaVTE3LXZDcjEA5i2rcof9TB3+I3aMvUTS2ked0Qqux/sA6/UucUgLMKM/pAL4Z8QsCkSi1eZpLIcKJZyBEjscQI7ljePiDfUpnGQqNLnwSsig6g74+4NVaIwRSiNqAFitTC1/SO2YfEoORFmyF4UfZMd4L2XBncerhzxULmCeGoV4CdwWiV5I6Z1i+4l6UeC7lgyGtxWQrwY6o09pd+oIIgFxwgwRR3EltHiZ4b6Y+WbecQLEB7mAAG/ErvJrgIDK3wYqoAsLracsW1GvzKOWFgyifmEIQ1qGBSvUBLMnmDG1omVYTqFGgvoha6K5gKAt6mBZPUIwr45gFsI3QdbxKseJipQafxKgd3GnG+pdcB8EDrQ3Krg+olY9FblYi26YV2P2mxEF8xL0TA4VAhU8io7widqK0sAbF5GVaa9AqUKVLzVkYHs4x4itor+UocIsLu4qhgMl8QogLvBj8y5o5n6lgpRrbMUWgX4+oFFIoc2xLR2XCmsTFVbyW1FiehmKLizUriE6NQCvQ51EXLdMkglmwFYQGN60EwTs9v7iunoGD2PlKg0kcCc6huEiol8W225VRvi4X29JgUoUbshRA7MBFP7nMpaRZrBEihTNrqW5+8x4QHGHMFakPUC4JvcbgJV9k+YcKnOUuuL43LGYx3ClKh23Mgqg+JTgLqof62FAADupuMvNIYSzwZxJ9jMsbg/CA4E+IqRZ2wVKcNXkh2L24j4jWxbyAXUDyaSFRQZi5Qy/cVCyBkco0tPSP7gdE4rNMts1sMsO0qlrBIIsvLK2IBFRiyj4mFtvoxOLd5PwYzd3m4J/mOXEVSwsAA4wCq/mEUFm73HIC60MREhparEAAbWP1MkWzVZQsRBmlz8S5bQBZwwGx5buviOCqAvBoiGlboJgKN3moAAR7JmF9DbXggmNOlhn4XPZeeX5lULdC1b9zFZ6Al8XqVubFvBt8EoeGxKR+Y5dNGuL3Ktgh1FKZjLOSrpgV0bDBL1kfA1KhqjFttQsJPtUCuh/iUEFgfudt+K5igop1BgGvTGJ1hxcCwavJohoDebhAh4GMQZxSlZqBW1s0lP24liGDGFHh5mmJ8mYIK/ImUDoUP/AGMLhNHUswSr3CsakKHnepUqMm/tNCOF+SJBhW+ScuHpzAQwzwhgBHNrieXPMS0at6RbEl2JhUWAE4FVhsQsyOF/ctUb4irta4eFQrEGGk/sDVNwLT8R0Be6O4Vyu7A4+YCj8IKuZAtbj+kuqxYm/rk9xkcW3H/CMAXiWYbgwuIN5PPqbwGnsTw8MQRUBgHm4FYOBuHAcYm3frEeQvmUUA8lV8zCckXHEjfghY7tVeNCBPcW09bQisHDuzJBZL2iTDAHAyxCrvo1UOlK+olFLusUliiQ4o4l2gR3lDApfmWLUvCCFWKHFrKljfluUyKvFJVEraFgnuWai7ouwQSEaBKiqTJW1zE7WSy2ogjSFziBU9MFuPmZ6NNat6lVqOwCQQCJYZUTeXav+IAmji2oCmjwrQBSNdISVE0uAVgOYt15gVSAoC6pauAlANWY9xSQHFKqwtEJ4GAEFnSazQ4DcCigosre4t4ueCWNFuzmaZSqeYXYzhe4tP2EEhTTs5usSv4mW8BKbkUQ5Z2vb8yw0i4eYjmoRq00sqoZTFmUeoZsY6Eq6UMSyjluAn+bkVCL3wS0M8RmAV+ZQRZk32iRnPiISgo6dSoSL85gQIjeYgoB5gZ1ixVifqBCo4I/IRXDmc4PmAw5rAA/9gAGyZcr8pWwF5z2+SPRpWBz+WUo1g9l21HOkMGyRQLps014II2hZwpfMx1aOCAUHbztmnD0Sml2AgH3c2bNWUnzcAevawB+4FQfuMPqGGC1S7ntyMunuYppRsC/gjAiORUlRVvMf8YcJTu/8QjsTtq6mqpF3H7lEChZ3KiQ2u4HUV+Uws/gIwLCKBqnuK6R0Fte/UygWASvACQPdPaGf2wFD56mRcCCrYAZAQwPqd/6YB18ShPGVA4SYplaKrhL8RqgwbIaWcBt0b1L6w7FjGhhyGKgYVhyJBKj5Qwouo2KMbMPm45FRyOI60vgCP8AiK6rrQha9Sgc3GJbSiuoo2xbceISo3ryVWODZFpaqajw2H8iyIGGaXl+WLc29Ww+4wJdtUNOC/SlxtaaW0H4j4p1BD2y5BFIAfC5ao8B+j+yo9TONvpiLdnHt8RXCltuEYpy0N83EjlZ+47oMAOZuZYzPuKgg8k+HcyFAbVRUILHeFqIiVeWhfWoGqC8pWgRQjVCRotywZiIvZdvB5SztNb+H4mSAbAJdUU4VS8t+uY20alBw91HYylBmjENYkUOWwPMXenCVw7q+5bW/cgOIzgMWWyj/qFO7p5BsuBgQWb1wxJq1K57b8dRt5fijVXh2ylmstwsIFANxrF4OYypPEq/Mx017UX2D2kMwHKlLXE1bSIholMlbhqqQ6RlvlOlqExRuxcaojW4LK8iomtyA1X1FqYGKsCUrXyW3wQsomAvD4qpeBZkYK+SKW/tD4pY5GI2hs+lmZWrTs+46TPvJUqmUj7EJsNIbX7uWouPBXzDhqDiiogFRbdkeiYpa08r9ygI++BYVmHG/MEWAw1X9yqHdDzNMcqhT0xAWVgAx1qPpekrr1FJyq7X8S5E9/23GVLwAS/NRWhvG/6efEPtjsaec+f8R23XAGvOYAyuk6VllYkxUA6Dm+WPk15C83C+oGmtNiravdQrwNjVMulfMBpzeEnqOnX/ACpOfEpTLoHnsDqWAWJrw8HgjIMBYy/XXmIhbsCmr0HxNATWvDg4Dic+qIxWX4XA9wyIjCh5uYEMVZ4LRFin/OoCzy5ugooFa2GUqle719QLS2ngTAmHSotuo0kKAAuzb8wWw18wB9TYr+EqQdUg/FythKwGPO4UW9gUq8rA1J5Rp83DqhNDHteJdBzqnTwUu5QO/NKN/Vymj5KVe2YAxppH5hj9wAfDt9xfJKBr0G4gnjJQ/cKpR8m383A2/MWX1gg5y0APxLQFPBc+quM4JzkfBWZT6u6B9XKocNoT4XLI66wz8gzJzXug2QchdUm5doHd3P0SyWmK/wAgQSvTLZFdeSG0rmxW7UeHMECawRbObO6ltVlJVe7czI9QyoFboPxUcbUXnJMeg7jkSldBSXCaq16H+w76lXyuBiRnXakN6QBc6upeCu9MckaNBih9HgQwoXZrbTUt/Kyql90HAXsd4xPgXGailrGpAK+ZpRNUJn8ywkNMu2ydPwjYn7y0TcOpA5ga3j/SK863FqqYSW4srQ2lmaKjg0+rjMJXkftFAI4QfQwC4UEVB8L+I9JaZm/GAi3VOzKeruVLu1uL9mYVauatH0MW0uBY/BZbickq/ZAD3MQ+7IQ8GRX/AAlrEgrkfiFGpbX7VIgZVUM18pTStAAPUSqZWKffUoSW1j8FmzRkt/rVStrlgT7Nygo4kP5Qus92CvoGY4vgWfDiVuO5Wdv1LyFMozb+Yu40tsvipekgmrushURPcRVDlJcWFZgpeog6ziqvLpqCtV7chJ+lYpW7zsNccEqJTGdLS+ubY4vKV2nXwQcGNjSnb4mWsRyDHqApUaF5LFRYC15IyLBsLsO0+OIsVNIDHS+C5QjUoWFzS8sZSGiynle5QYO7Yo2W9tfcUKItzD8zCAfJmV4geYn4gSp9bjHFtWQpqGHhbUqWlwjY2XCnFg3b6jmuzi1yxtZlRgy0/wAXDgnKtv8AYSj6al+YK09Rcb8YPuHhImr0K/srFEwsJTdLbUW9Rh2iJpEgtte2YtvETZqU4HRfwwRIVzD1ggOMZgxPzMbrVC/A4gZLl3wem8QX1qpX7qHAuMGaviFIPY/+kXSyGAQq1i8L+2CphvLKcWNoZg1dbRfruL5GrRobXmAMVxBw5SIEm3pUvhJ4tC1T8xG+Qg00c+yICgo0rifibCN5HDnqUqk1BJrw1MWmA6g3UpRVs9cStpEZAeNRFN0WpK19QpunFBZ18TmTDAeSruF1UvEOSdQtbsut3g5dJC4AS2Z4CHLy6GJog7cbhVU08kzgqdq2FVPmWmfUCFXolqpfJYp/NxwVO3h6jREHitTNhuaFJLeAeNn4lgR5IEvV6Y14RQi3rK/xMI/oqv4BDiAuwezMw+NtA9uZofJJ/LAtnchO0Ul0VMWQPi5VjHwRPzENu4AfbmPSg8WPfL4jFcC2t6RigOtmh4FErJMd78jUYYZpRlQ9b6Lb8uIwuhYI/LggkMe38rQGC22JH9RGdDCWd4MymnAdvldwSCgUp9FVLY0gch/nzBF0iFHLfm4iLhlBtwHTM7sMBRAaiGzhs+eIFVwUPmPyl6GnmPc68lBw9PxDYfw5zHIig7hQIgjVLkjlPcCVgZc6rs4vzCjFaG/BCwrs1OQo/MRkFAy2Npcs9jWAdmeINj9m28wr7L8TXgTUGErfEcLZO58geYJwOQ23UO5R7qNQ4btMcUG98VEEwToq/uY43CrfyXKVrBYFopUDUUvmfyR2f4JUiS+a4Iekpv6joK84RBpQuWj5gQGSlKp/TGE4AWjLW13hB/ksanq+zNJRdKR9moqUbqT4ZYUVuFf0EJDNJr0r/EpwgvyRYVK/nnMgHrAhQHhFTIB01P8AxK+2lpUs8hDrnKu33BBQ8B+IOEU9P4iLKflP6llgO1FQibpdFDKIkMZZ7R4ZnBRVnyIOCBCmhvkuEemi8nF/mApodx0VBfnzB0KiuIepbgwXkizxDpe+JU9CiodFL+JWmdauZ9GoTI2YWLce1ZuJQmyOnGFBnHZAsSdzNN1D6BUWW5cJaaXQS0FOo1PoWb91eNweDVm0ro6jz3ETV6t/Yu6fKs4/pD1QOWcys5AD0fmIVhdor8QfIXpD+5SEzyRAs8WYIBf4VhpA4z4/Uu7NA6GNlFD0wTKuJWzAB50iftB85PCkdkvIq38QGj2EhfB/mI11vQezRLbdq9b84lxR+gP7MsCzLSfNBLi2N4ye9YwGarfrSmgeKvT5szCvcwKvv/uYhfFme6/UTFXYV/ERV9xiPVf3GE4/mHvM2w2v9CFgM9AfRK5ZFpoEAHL3JfBVsYV1qwQfCPGsqsFxaBXzfsfHoiUoIZsHrT9xbgbUGHnMNjbI5pHuXhqsvQ4CWWwTpNw4jagsnk8zKI0rwa9O2N0WO7OhPctVqCDKGv8AvcVobDO1/ONxdAi5bPQU143KjQMtluEK+xqKG7sZlrh0+SVoatFs6juI3YDT1M3vSg+MowaXCy/gwTZWpu9MdGxcEfnUouRfRPwzTKeTAjYPwfmCMXXkVGiG/BBwpfl+YtDKeVRLOig/nEZh85n+TW4ywIy09PDEcAE24TJp8CqGoCtRV6lyYuZU93E0tza78QIvXKB/4cwMcKSM+KL+5T1ecb0y/qUQvYVfV6ZQgnSq/glvwQW3vEsNDNn8FRVrDbVecytCcyU9tQBg0wI/cVmel0/4Rgkjr/UgCaHOU+4LWhMN/a/z8xJbT5jo6mZNEOrqMCaXYBBNVcNKVujoenzKYEMg37HPxDMVclPwyxEqqt53j+QqdlyVt+CpU8A6cEJtgcuFdPmc2wDYnOZnIxZz4jtYIFDPg937w9y4iOaLZw/EUUStKm+Mc/MaSCrCxLVRmofG6DSVkO/fMRfYQdwvBFVqHRkhQur4MKXK+hBgppZpgRRw7uAuQR8wQERVXwknA51JNLqPE/MIIm+cfmopQ7YUgDqHb7jANJvh9VHAcdAv+Sw1e7j9VDrc3TQfmAQMdyCt2Mo+EuPSqtrCvxNINQo+qCYjwAqHwuY9NUyfyMuHbl278/5gamOjRBhB8q49RwbMiw+kmEZYA/JBsNVMh/MvsJlrb9bleKW3iPUQVjjU+2oQc4KH4lltDm0ntcy2XS134IaBc04q6ySxWq8vy3ztfqA+1omKfX+YyabQLPqJ7lNuSWSapQ+hpIM0IuYHddfMrRIAQv6d3nUfaIIY+UvgI1RM5bwqKOFHhIWNIaPi6ZUULFIUd8ykLZpP8/yV4FCwPaXprTwcq845+IGKeAunM2Ss7UwB1d3UE0VvY/iUHkrL6itv1ISxSJ2ZKQk9MH4IYKeCbu2a3fmXoDR7fcwoJvS/mKaJoBfqpsHb4fyxDgFsEI4LLOj/AOS2K+4wOqPFp/Bmb5M7fsQKVFYpUj5F0r8IOClVgfswYPm8b6JQ/Pf9IWo9xA+jOxaBApyT+mJ2VrBwP1AUnPhfmBtbXC/laA1vSmK6FwBulruIFD73cvi8ubjpavJglgh6s58wAXQFeFsEhLFhvvEOisBhnj7zNkyrrA/sJWjCz+oLyO1MPHMc0cnH78xWFtzgljc6tAXi3mNSeiq7fEAW1stXn3CDRMkf99TVbIas+CKILEcHEUJbhE9K1Eqa+6c7Z8wAGLQ7FcQipLB6qx8R1EFhIeWIp86rQW9ASNK89uvuBNA+6RJo1nN/kTZowC4UVEGLIvxKsn2hlFkBcK3/AIgWucCiv7Doi81T+xtSuKZxWV01n5gL0fAEP1Acr1H6hbFoTX5jNnvC5lUUvaEZJHmr+4/5n3fhRBsl0qR9iz2ZQJPxOi2BItrNpHg+ozPVY3fyaiwoNWCvyxEJlUE+6MAsWUOR67gg+AN/LMgUOFdEuQAy32dwVKdqdLESMrV75hKUTb76YmkVhfLo9xCiVFnm3Z6B+5SgACJaZy94hTBTTZC+Td3/AAguW2io8NhKveWm/mdhLfmbEs9FIfLH1LCNk5eiWhFJcECx6SquvOe8Rb7mwAh2u2D37gbGgf24nmS561EFlFuvxD4gz0IWTpIZ2EAi7WHuKDViuw1cegyzBfqtxTY28ZT9xwfO0qHuLiuuAZ+SJr485F61GrePaf5izWvKAsozx2MP5lrKu1sP5ljR8w3+IcqhoK3MDYOrrv8AMQy5qwPmBlVNYRpMA7RSAL3XmVmJwJKAKebSnit2Rlg3kpLw4Mnf3FyEydgQQTi4KnjKlSsGhVV/sHA1rMP25z6qGZHkAr0HXiUtAC+ZxrP5lKIb4OvUAFMVb+dQAsI5MX9ymNrw7YZiI4sx/wCRS9AqNNArxk/3Mzg5u3cfEQKFSNK8Ezkjk0Wz8P3AY1sbKFezMN4XS3NLRZ8fiFiJxrBEyBNIK/KsL1KwX7RHcltoEnX+4fYIX4bRnL+jqVFyVF3jvH6jzoRFZT0ce46bFmqWOaIW4LWD9wAoXy/6jFEu2nNW4xCY2KxYIoPsxCoIZJGCtW1rLjcRraLrdrmMYHIKo9bxPytVfyWIdwUqYQRVFhY1OI6EJMl7rFRk61jWjfCQC2fajF9l5fsjbr4CY+ICFVxQj1KCx6LgxLD0h+oFqv1T+THSh1V9JEkA9N1KreX2mGRTNWfCBrH+mpfcbaB+4kMYQU9gQA94zq5zBVa+oo8Yo+pZ7SdDY8ufqotoo0v8jolg5XoifArH5LzAUOnn0j3yqZiIKMNvniUJaA+XZUQgBPLb0+KmNpQOSvR/fGI4EVTSM+g7W6jjg2p5Do/uDaoS+AeQ7hLVGBXkHe4LXyTaDarzv/EvB+lFu/18y7othVvgwVEsK3H5O34lqt84A7q7eJhq47gPkIJOhYYsvgz9FROg3zCYtgBvQYt+ICVcyYp6gNRA1daeY8jpmMkCKPS5gDrehyNR/SI5RTCtGNrg2WtQKgnxv5YZAS5ozIVPYfVRK275Fcqh2BQH3BU5Qr/aNRY6/wBswwnlF/mKtn2B+SKv+N8EqhNZAjCvx5cMjAo3zwwmPMlSpLPm/MpWsC9xWBiqKHjnuAJsS8HH3BssFrqr2wr9mP4/ymMBBDBwA/uUfEuk5PPxE10voxj3EqYbvweYsg2B8HcooVbh1ywhbTQI5ZMxUKAFoaavk0D2xaqOa4TL8Gpm01KWjMnzDxQJGg2+8uPMtV0cAtGvUz4ApaEVf3zHmjoMDs8syAeuq4GUTswGh57vEPkLCmKN/wDEygBz/wAal1gOTD4i2Mwek3gdQLZwNtB148xKkV24nJzAJUaq0eeUu6zzmFWxlzg0aItbFWLdTMRDsy6llibt/wCJQbaqoQ4uYlCWDouzL8yjdYcUeC5Xe45Rb8txYgtCP1ACAuMv0RA9BL4xC0Y7KmC0eRWVssXI5gjU6UT9RMeVYtdeJcatNDVRIYmUDKnfiOaraWkLbIw25bKqy17qXVoqaeH4uYGSIJXWP3EFzdrtUaDhlik42tvLTpMfhhjC3MlRx/5BPB6MMWEij/gBp6lzckUo4Ql7AVhyixzi9oSqHU0kC6eRVEKOQhxSCH9BnS+B/Z0xl9VZ+AYewLBq0mK8xchWGKHb9yoVJFao2/P+okbibt9m/MCiEotdnExSpr5PA+d/mALBRJZVWleI+15XWhr0t6JSBsysFPLECATQOJlAFYF9B+b9QqZ0FUeMStQS6UROU1iAjBlQ9MPxBa4bQsctBqvMWrfFFeAc+GojjRd+B6cwEobwLv8A73KleA5S2YWuv58yhACqWJ2n4jggsExKspxr/cV0L3db41NrnIb36QhWDlRZfcwVfst/sFRCJJS0qsPp3FERtVRH5iRJOQYrcbJFKAB4Kj19hEvmu/EyAqFoeQ/LMZYCDRNNf7hoBcrSdNwEyJS4B1XJGrKNksXXryys9zKnlGJAgfDI/UYXksZyoiaA3RZ9uyURAch2SiGJNhbj2wKzHK0IVKYRg8M0e+5f6jdroz4CIVGxW1aIX6+yCwgADRC9k+zFR2GKmVEotO9U+4RBRULRsavqwgFGDVhbn4WGlTypU7fz9Rhg5MOjR+4JUgckOWvUsQFB9HuFYpbwo1fmNRgj7lkUi7oD15hLYgVWAx9xwlY0AcP55nD15LySwo07nxD6iNhZnYPP8mbGLQwOO31HEcg9B0ry5zBcokRsKwXLuIA2rIKOA/atQnBvf9C+YVuRsRX0RhgDq8wjcFPcXXai66jMp2wDl8Rq4NwR1Vx3kZ4SDnVU7ReWDgR6H4glDGsgmlNatRRGCqmv4bgS2NaGwHXcqARSyeb4PUsQiINCsg1+ZWR4A4a93xAwEs8g/fuZR23RAeFZuUQQGOhpjPMpmiuAno5ISMMoRrHGuItyQs2X2TGXMIz4wZo98xDoAcjBsCLnBaKDeDxWoTFDS7YS0DOKhO802X/1TYIbrPIeoEN87q8rDl8sEnt9A4cfsxrGoQoa7TtDvuL9pC0Ss+cw61ulA5ufRiWpyC1kyrx1HAo1q7VzcbEosF4tIpAhsubGX2F/cdUgAu19u+4VRoZ/RfLLdANtZb8RDZIPAFmiVBYutSqY7YLk3wNTxSXkbYK4vrqUiY4Lz4eG1YRW0LYNfEtyxLF0asPuOgIsUgl9f2JpY0ZVAePMUKbBvLdB6HN9yhzcCUxF0fWYndjSqvgDFvcQlWLm1ncaTI7Wj6J7U2z7hw8rhUvABp43Kg8KxHTERehQAD/Ua3ZtGKd+EDVAKCH5YdZV4o/0QJdpyifwQpkXqlml35mcpdyUZBhTGNtFjVNvmMrtkoM/+5zGpZBgW16cypMEYhc3ZqvEFsCMaPn1EbYFiAOuo7ArAKs3m9zOMvMDennEZ2wZa7jK1GgBMDSAKZM2+YhsYctSYXELVeLLWukgVYFqCu/OevEZKiApW3jfmOKjQa58wp8l9s9hop4ja6oh8hs89sEiFU5PA4qAzmdgAwIbsNu1Vn5JXltvsXXi6jeZZNJh1oiVEQE6xprq+YC8KrW8vY+4tTHAK113KyFE9V84eZZlA7Ltf8RBJZlALwMzMubity54gaktZs3ipmtAKTbrx8R1S0uC25zT1FUqHA+U+JdNiBosKybrXzMxixaLLLr4Li4mqzAO4ABqbtyf8wiFU5jQvNOt87bYMYUnOc/1iqiKqDQy9PaTHXuJJGjVkUbtOyiHFLd2xTfMpLeYuMtMDquRjWL3lGCFA6UVL81YA/uYUyUrri/UTEiSbvnEpcQKN1eFZdUZjwxuz34gjQldAeEHjpmByOFR2SxBFoEDFPi4KwSI1h4mFtolrhjqUJdURVe2Yq7GrbqDMi4VY8VMwpsHiJHsQu3RO5ahW8lv5RFhIBdPZ/2I3LVy0WbxzLGSlWrP+ZROjPhtPjddzIKsw1voFbZVLoG7uxXN6lQWgtOCkfOZfXxQ5Au/KERLlrosyfySkIi2i9j7GvcoehqDV011MBBrF8HzGorIDdfKZKemIfLDHEOiK5aE8f8AeIvLiUiPGt8woX3ZWjfzM4yxUR78wm3OFBPRKmmE2i6Xjo8S62rWx674DqMhRCyc8fdQeghS14/rcINVtC+tzcfyWg8q1zjzEOFAyL4HaimYiGC5UPcy4lpH/n4geSjyLjrZORiWmN1eomA1BaLg1/mG6fBmvJDwDVvRg947jrX7xaHQrL9zQZrsowfdmcDV9QntsmNeWeaj1aAs9FhTtlHkjEmXLrcHbTutnH0fiCkKW7y2P+0MIG1VeP8AMIKAK3njzLMwM7llLNxyZNWV7iwKVHZstPy/Ee01K3pe3ggTKKga9ymQOg4If3AUMZlIY+m4lB4vIOekJfQhe7BOOIXQtukERoIJoWZDw8EBPhVGAK92/E5XkG0Bp2tUdy8inZQeADRRuPkB0xTTfi+5kOjmzQ5Sv71FbdfFZwVxBo35mT0wqXWg4TgeSz5l0dfq1ChvszMpHzVN+yoEFkBFdA2Qou4Gq6d6lLZX6syGobNS9qy6HzHgRMbfxx1K9msWVvDz6hggWza+otglct+JatGANZoJgGz1ujT0Z34gcfsU/m4Koa7G08Xx+ox6z/8AA/kcTZeFB5O/cIsFsATKmHnCPKwuSRsV9KirBluMSxjF0cvqYwqIrLsP13MGIuVADtfECGW0c34i6CQI0rxEzQpFfCWu4KsFVZW3C9S+OCtSpa+PzDLQthQXhKU1bBRvPs6h4WG07PmGXE8hcRSljMb49XGZq1LEbL+oErh55WaPzULyxk/Y+IhDWDnYdS6PSji7BfqvmHLPGSOMnOOJSLAYcebJczsBWm+fi4A1K12E03+X3N3aAG4rP3GJBvQpvzLRRrtg0H5eJibOhOCbOB0eZVHzEUAW+zGJmcCSMlhB2sa6yKrLCUPBZjQGjezChR6ZSgdnbtlhGi+Bn7gTycygryACk/Id/EUGA3kEJ8hLp7SFCpqngbpx0ghVxJaAqz0/2MeEJkB+hXPmXbg5GmKoSGrLE8cUeiWQS5tJ/wCv5MiUgPVuocMowNQXy5xDoIBEBri659d1LBwauc74Xu/5AwN8DqFexEqHjpjbD7g11wAV+4qlAzaTZ8gxyS29r57lL1cfJ2Itm/qeEgJbruY48ULY8h2RWvADr25HzGSbi7B1C7UgGH4YvGFW8417gwzAc7LEz7IABpEMOYC54sZMHwhVbgcodxKQBCY+T/1QIlArwMmOoFBw4bKLsIJJ1ttW6CG1lDe4c34upRVAUpteyvqYyTIwlOXhihvr+EDwQdbxKjOnxNKPqlhv1DNAVoA6PcArVt04DR5qNCgJdDElDuhR+Fb5Yqi8xeWsWdvBxBQwAIYWq+DFSqpvRdisvFUlWCYErVVefJZDtSVXNhn8VCYQbSsEa1KtzErWJiQo9eYGFAbUGkYQQ5OITCXgHqXKilxyDqVyysqmD/qlWAclOIbWRMk6SIZA6GIBYpRHUcyA5V5jQLdWva4jkwy6dS3eTeYZL7X/AIj2uJuh7ajO4Xl6gX2DDbviCNQ+4ZQU1/JVxVGi7U2KJSOpYq6jhFYHBVd8R4RWAuP5GJDyX92kSve7WVl/kGcyKLm+E5OYO66qu9bP1E9gsYghKVGsLe4DaqEdR1fEEwjwF9LgKoqq033coKLkzanlgodmFklD9wyc4Q5OGN3LahUNjj6jPz7a1C9EqCpy4GxY6JRIuWZTd+HMYcSRvq5O/wDMAR/5HHszAghkFcpCqO9vOI5Q0gLAbF+JSAY0aX03iWGiBpKboeL/AHFcCCiqOA9xmWvS+U9RKKIVQ5LN/MEQ0WDjFwi0AP3DqxHxEoWIxjkAN9QEtIcDFVf3FFQQFMtxj1G2pJC6eC+9xzQK/MGIqI2HzNPZcPCOhei0zwca7hqLINi4Hsf1BmyCBiKG/wAwFYCgMW2niEabEKWWJ8NPzKe6slAOVctJ9y1kIFngv2S4NF5UnSLe1nQDcuhvCsKDz7iMjKNtyGwoicxqstVLBGSFM5UdkxYr6Fb6DAhhlCYT00up8uJYTvFQePMQ62COnFro9Ryi7VNHzfb4mJyQJtyeFxB2FVRA6NS12NeHPJFQg43QHb8oZCgNkOmdbMrc3GqDrSx9StgUfA4JNDDkIKu/ky9nZLcNDweURUCiiNVzfJKaotENbQZnhOCuizqI4FphdPflmopFBSrjdSnqBc1U4+K+bhVcaBg5fMbhFBNin5Iw45aMhrKd7lSgot+Bl7ZbFrle1Z5lwWCRy5qy+PU1VkS2Dmz3FS1bKGKjhBGPPD0ywXnIRJcuxm4g+ElVxVQvbXeIELQwK0GvFTK4tmCPaPEUoIcCYdhuYEV2afDBUgs4LHm4pe0KlTxTFkC+64IEVpaWX6lxpKzq0Ssdf6jQYPohxEeqkDnkF0KGCJgADRVcF/klR0o48vMYCQTdKAsFbLaYNVQcQlihY1beDeYFkIj2+NPzBO1Bi8t9/qaMitDLwPPqXqzKXCmn9whp8jIolowunLUuVyCcu1/MfkJKBh6rXqHa8XZbuWUBUvJ6e4oFOBYvqJGykOmzXPUzxqne6DAN6hs8fqVIW4FaXLjkhAd4CtWh9+IKRsGInbXWMRhV6OW/7iHTvcghDi1paXg4ggGDCCvjcqkkuTXg/r3BLCWUIt3o5iky2MGJVMlYc5PDq4RKVmrK4D0wdAP1AIcaDRxa8fUtAryIt5xfgTiUW61loW66ldqg2OaMv4imCXgCqrRAZg62PXklDW6NXzKw3Aj/ACSntReEeIALLmznGb5jGJsay8ZXXMWV1MAA0vdcxfkbVNvH1E4pwtQ8MsdqpUD03OzRKAas8yoEFjAvH/sG19WQDAnJBfEcsDyDHsyk6nOa9Mx7HNbz1/2Zckx0K+OzzN7NqBlyc1Ln8FiG83BK22z9V4iJOg/4hEx3QA1nzKXeij9d6JUjUdo25v4dTL2a+HRnSOLlbi6vtxFrAdrWFwwx1grnD8QSvqowv45hYQ1vaKdfcwCNZqiGa9y2BWjj4l68WiB0tGvUy3POac68U/cC4rPRVtviUR1Gm2+LPJKtpsYlXgHfbFYqVe7q7jrwoqbX8CBs40AezAVXuWTxrUCUyEWzvz6gA40U1847jtANFK3gGl4hij0DV/NQBiMLOpSHSEy8GUeA/bMZXXNLp8SpczgyU4uIiAgaYO09uvmWOU7wsU8PEYwSjUVWQc5gGw1bYQO5YbY2fB1h8zAGJk2H3FIGDYHzbKNo1Uqrun6gQwidA+TmJQACrsUmqWsWnhPG/wAQo0O4QxeYdQNgVuaL3BrgV60fL5xXqGetChBCqc7fUTAupcD754jCp9JHSfyNJTl+Eq69TIkFlQU4izCE5qVX1Ao5xdAF15uX+5WoA4LJ77iuFNIP1zcKGrC2lSrbKYrtNoQGc+D3GIsCgHOtceo98DyU+H5gcPItyeNm4UJZUCuF77YqpGSy/VbgSCFnwCDsribojNqubvxGHFQzvRcziWlFrweIblYqWDvysYCt6sAqyvcuzBUB1bf3FtZJCfj+yj2oG0e4XpagUbf7O1y0KObggIAU9jEKw4XeVPHzLJdQq2t/9uOhypVe7H9zMNLxxR8bxLMAgDhD0yBeFtgvV8RPasDzCz+4WAwVuqy8vmC4EpMjfZCLIMtsY3R+LjU8Bp204hQstYsH1HUFjBRgRzjkvxKGssBHtL6qspS/JO3gsB098/EcBnYWBVzIab0MC33pUOrWQ0vA85/suAqhoXgXkDqIWsg3RnnjMoQCMBPNTIHatyIBhPMIQAQCTo4tiGCgOw2dczHYS5tW1ZbuWcBpMzBzOi4BV0YeysTEJXo3b7+vuWRIOJegDHcSCYLcnXcrQp0wH9iAaXN0Kz9S7yi6KWKPgvVV1XMRiICrV/zUtyrVLlvDBvkjJpe00gUhtq+QxL1mMY2bRzMxDanzu5WFpW0VxEiX2gZxmWBTpSB+DfzKRiKZDUWtRyFEZoBSjmLz7t543xAugKpyX5iOwisKHGq1L4drWjdB8Ysp8MtmzOEv54hOy4Hxlzcr1kxu3J+EzYTkTT6l9hGWl8RuxTSEdHa+WEpcsbBoTdXAXPVsNnK/xHUnMrVviKUpEURdHfuLHwouOxeKgjOHRUcA77isWtFH6bJXPE+z4gUycj8V/ZnMZlCp9sYVLUap7gm1qSw7w8VK50a1xdn9phAzYA12E7vJ4j6UA1r3d3/1RyFAyUDznXmFy+0fxM3RDcK3MLkbB7E/MFiOUgZWDv32y5ZYQweLvg1KoIZszUq7rFx0RnNYPEtR3AsMt+JTyOBrRquZzzuc+Jz9jDTZjqOgBo9KwQSpgOKd3z46is4RpS/UxqvIKv8AoiiPAKRisr/IzMFVSgHmKzJabpXivFRN4Bhv35epWqxzOYsfklNltKvLvx6hKAdlNcwZZUzoFx1IGWSWQyrLeYYqLDs9+Z4GAqp8RoAHdGPw4bH5l/VrRhFgtsF9RLla5LfiD1eu2geR3ExTgzDj16g1Le8cqv2SrLdjOCIDK0Sl0hxFKbbRUg4vj0RLBaWFA8ErwTTfuHYU38HZiH6a7QXa+NfMvzhGlR8wFtQXQmpZVbl/0lyboLAcYi0hVZaO7ObmEQc5I9H/AGpYm83nBXMw/wCqSHZ7jwK6kUWwX1mOVhLYNLp2n9hirRjFh1Z3qU9jURgGkHu3cATzWfzgGstH5hEJLQ/I/PUTyxbqPQthvP7ZSpIMkHe3/YjiObVdo3k4IUFFYvN0evmA3b0P57l2UdvQOFcrDbAoqQ78nN+Yi6tDywzby8w9ZSR0qqPqZWKURnME9iv2Ho6lsMoqtyll2ILohpY63FCFdDBPcVHQxgDiWAlQVyuM8R32H+sDLEQBPoFqxdd4gzYVQGsi5eMRignQjRdU4uMRtqqIeRhJfLvhE1Y33NYwbK0tQuMNn4LtOosewEFdUcS0BawLV3FISoEU4p+5ZqINjwg6agphNJdXur1ECrteeje73G5SyiWHCcstYGwBebMccwsdRTL9FsZR0ChwAdwgRvBZ3q3X6mYLkUtW8/UFI3a8pVw4IFiFW24p8coV6YtgFNwUB+WAVXQg/lLIei7/ANZgxBrbquU82a4iDbMq2LRyH+5ibMOEGqf57lorE2MuM2dVv7h2hWWA1dXk99yl0Sa20c/n7iGGPLcCnG7yZj0Xzchbp23+YxLjCkqZS9tAYxD0pf6B0taM7h5Ku2LQPLY74JtnEFmtHiBQBFceSdy7RuRp549wi1vjQvdnolMD8BS3UzCJg4b9zTBhZXO9H9l290z1m15lEEgsaXoB5POZzc4yxVvD5j0EoG1NLWoN1TqncDjp5hiiZYK6s16grMwFY6U1qUO3Wwe74hzRlryReHqKjPU3DaDz8SzAI2uisK9TCupXChdcL5ighgvRa3X43HBEu6DyXwRojPhD2AnXrmyrS/c4/rq2qhphGz5gRXUCDsDp/ko1sQKPvkPxLGz0cS2gytC4gd2gJALv5V9JxAwzGTI7dH+ICWywt1bmneYb5ICNqGyuG47k1+icAeDL3AFd0Ja6rX8lQmWxXydy2O00A34e5vWtc10d1H4SBS/qFb0QpiIPsQ9Zl1D4Ag0u1oqC9wv5LJNfmEC4KAe5DbM3+tKydtyqWIwABd1zUw8rAiuKPGhx65hLU6x1jjzFiCWhnpXkupdBaoDj2+v5CZtHcCqQ0L8xrhJKIPDXYE074A61X5hgBAsyurijOocgp/x+Y2usUjfi74iLpgus5+pRm0XlgY0axzkf+Y3MU5BOxplMbBMmg9LbhSvGAR3fuJLBWh4hlClCX4XjcIYq3QNAMV6ggcOGh9AYruEN6NKauVaUzUKm2tCPbZ58xQS045cDBQ4WqyarVnMZcGpNJunk7gYpdFAFIPbuoxgOaGvgAjK7ApoZGOeFuJiilA5u6psgfK1RQDg/3AU8VgV7qxT3uLDV7gUZt35jgTDTQjteql7QIOW81W+oNbEvWpMb0U++41UfFYi206zmEu31NLlbFs19wjIEtADRfm/mLGVmCFX/AGZZ3ZQxXj3LoOSaA79S5IDwKlZYnfKbr44grLcUlqN0kYHI/cQz7Cp+YvScgRfBDY1PeCpUkBwqF8MHdJ2W/cKtBnE4mlRyqMeyYWrvQ/HEco0JQe/5HvhZ3DDkS5mwYybHPmqjQ6uhpOv+7lLRDBdeIb+YwrIKyQVb5hVcl+Q6/UKJfIVrwrz6gJWOmF/9WZa2MGmvA81LvIYbBXOY09t2ousP3LIgzK1+PcHAGNrTQDLG8eFQsatx63ExPFgghqvLzAhXDlri7/DUsnoaiAo18uo1Qs0gPPYMVyR3OmUwKsHRDlsr1fbnjPG5hwqKjdXboZWI0MpLA55ja8i+zNur47hJKzMRq00PXMoe1TbOPdEXLwRzJgMcvua6SZaHeeGWo5CCJXIeK18xZ8gianZTK5weY7K20xTgR0nUYZnQYH5hyhfUoMmzp5gm3eA5W8IbOrg4DjHUWN/5TOWaBJzlL3/IyANlQtYrFeJYflcg4od6pgVq1uqZju+kQclbE8SkEq27V8cx2Cgdhb17M1iotIqUOG6b/MypVbRj1HMGaEx+JVu4C8jcqVj3hfaChIZAr/USFqypfuGkSm2gwZx4S8CYIWyu1DeJfgRqnIDpmEbtki9VriPyzT8xe8LeaTv+RIOBpf65g2bu+72f8zAVZikZr6i1t9K7ANS6OdDADnwcfEZG55k5h3eN6jdWcQDz5zF1MMey8ZeIDvSPPZWvPmCFaucdLf8AIvoIKRvt3RNTLaUt/wB4l7YGmKNIPHUHEk0MXx4YlS/RZK5L898S+T5gVcDV6e4UrNb0Z5deJcEkKqozjj3GBh4MuWc8n4lhIQWEXfyxrpZSBd2PNsytBf8AR5jymoOzLbweCFF5TQGG74MQ96oAQwGedx3SLLkJk+fMekRGldJ+2V3yrdOCXEEelzEpV2mOe+rd52K9gQLEE0rFGHHklE/7CzJn+S6yjUFcYzi1qKZjgBEBy9cRv0rnkdzWVhxelH/aiamF2a/9idPA7btXlYRBdXgv8yhW9xCO+O0CGxA2tj5WWxEmHNTvHMVXlY2P+IkAA08v1GODI4V7t3L8nSlN/R1BgAeB76IacLThw5d/EwXAloxVbgwQfFCkKgtymanODeX4h47syF36H/EACpVUB5AzcqBywB8ANiwaBUQSAbc4Y4GsmK4qrRD9hJGBgs3XqIYpOWCikOD3DuGy7rzFbQBQnvnl3Lw7DrM76eoyiQKDiuUPjMFThYM8Uc1G0zPxAe8SoDASRRsx+JUsG4EX5c9wtGATiEow0dEpajp1qpa4zBsdY7Mxlvb1KxT7S7K2jykCthMoDmnLC1ErIwOSuPURQFC7oqxHnuXxURO6V3OIwppeV54ltiyzCuq73HXDRVtUHXsjCWoyKeWVM2BLYSwPKV9rkD0U4LgpTUwBDlv8Lh5RloO2B4uIG1lTlY0N8P5lpEtviNhnByY1KViypdK+DOZR2ZRVBwdc81LsSshTB8ytZssZj/3EBHc1C9n5gFbjGz+JUyqO2mPziBce7U+VzFCIrulPwQQOeBWe2X5aZWr9RSY0yDcueFCmfUFUWDwQYluwruAmcxUG6D2ED9LXgNq8dS6C2udnkgDBIqKNCVrn6m/FGks1rbYblIY6I7OXPOZRil5VmVOsSzUFCgMV7eJXMGdR7HTGGkGSuhROSy43/wAO4/jJ5Y5ovaZghwXAyc1u42RLWiMIjrN5gqam61hqjDHRH1S2kHUWcgI3hNoG6gKU0MuZZ2+oWtwK3nA6Yi3YKdq2rsQzVsLEzTuWtdLrjGQe4SWHqoR3AsFILh20dXMscRGVcoW3xFRWC8y9rypLrJph2Mn5SwjsEQQ4U0vzDVClhC3jywz/AGUC+p5Na4BV9bu3tjVD5R6hwS3IZuAW322EeItDbwU8G4Aoatzbya0QXSQ6Wl3S7L7jiHJFVqy/YGpfUqBVKwLu1r6g6C1hk8/diZdHZb4l+GsRw73ZsghUq9Bea7vkl4wVNWzT5hZGI4P5MsoqLsPqARjGC4YviLQbSfcEIyD0FhZpeNMSVUsaql4UJ0fatwGoSbH7Skm7ptduCNBTI5m5vlfqoNXwVhfQbHriKwqsKByJWC9EvQNiqhluy3F5L1EeqAqmaXkjV1HDhOpK8L0OeJWAViXv9IjBXKO3Hs3xL5GMn0fDRnMGdqCBG8vnbAaJJkNVRMfELtF21eqJawDOVQXfW/xHtgKGBunzuVNubCr/ADGpZWwFo3biq5lgprRljWTREOyDrLxo4eGD4AwxDoDInLqVsoL2EOXOIFyD2pmZfVefiLhQUtT3W/cpRwsjwU3TqEABKvJ/Iv4iCcwPEyvn1ECc0WV483FUUY8GwDe31G5a9DwaH37gn6OJIb5/8gPVWcL2c/lGlcAMlMgOjqOrkFKR4fD1AeiVG6qge738wZoFaB6APmyAAha5Nme811CKUiWw7q/iOmsPCTkxl+I8V4wCjdsUOtwa4GiwxxtzqC0FgmFsObx+pXA5MwbpO5ZZ2+R1KaXBcVeZcKAaXL0TCQ0GmOAlIGhVNUBy4Bb+qhniKuDJ4vMJ+kDCscm6M+5ggBQ8t316jB5QNh3nZ/ZStsiftFQaqLQjS1aCvjzNYpIB54u2E3sTnAx3UJAhBNOLvptOiFbmFSt4sCAIRSkKcjnx5lGVnaq2vA1xqXl8L01BU85T2wALC1n8g+IzI7ZSuMvv8RoBxzYWbAwjGuyxQDKKHsZ0L8ycimrK+ogHPVI8spitcRIr9gGa8HD5hyU7+DxW13AMILstVh1dkBtSQGgB/wApo1qZq1XfcL4+T6K4zLaQEAWxeHqKBnPMhlrV3eIgb6BIDYVx6jmoV7UbDiFzISqwdC8wlNBLzMNHUrcLU5WdnnXzKeTwNmABpvkiodd2p+aOIhEOsoTba7XxMx/W1WjKLQ/+RKKYyhlW4xfflAcxNkh1TgB2PMvOQGqE09mIlXDHTt8VHcKLNvUfxcYAoUvT34MZg9t7sOMOGM+9xVssopz1FwHWQVW6eMlepUJVDufEMKW5YGs45HcRLk0cFeyKhUnp+bqMNNGFHPiCmLCgsB+YiDEthqYOgIWvOiZsOd4pvv8AcYyxVrGih0GG9YjS1dLROQf4lBLCDWM8TOhiBKANxbyc14igL6ER2WfGIbENbDGKNjHjPZGRYaNXML80FKL1Wg9yyWixMgIC7xBIcg+K1u8PV1FVCRF6Xqzl1LZFtWCLLxzUB1/bR/xlICZs4xmxBxfzGEBauBsNwW2u1ho1ZXPkPLDUcDw/g4xZ7jFWG4fPSGtStPJaHhblaBgGULoaa43Fr4Ye7eMU81LmQBRgGw8VxAmC20v6P1L4i4RKXLVYrEMcCS0btq2vEAEIgUovnzBegXZdswpY0SC60PEL3htcqsp2OIOO8CzAHHVzU6JVX2F2uBdLgS8OvHuBi2r0Bj0rqWtaC3APtzLjYzU+N+JaUGmWNj3K8vFaIZOR/EqCKpqbcHiCLDrxvj8R61sHpkjKjFBAem5c3yUkaZMah+VFeUrwXd0m/UUDJpUKxvgq5QONJj5S8awA2JlXxMIMilBXxzDq3yqKx31GpbNYbPbUGXNVlPg3UYChkDTyBuT4mHtwTaveZgQNteVFtNBqCAITVVWWSu5Sb80qHt68uagnCwkxyCGX9RkYrm/hfDE9RQGnN1VfaSs8llJWBdaIPMLNQu2b8JmOVu64UoePcoGDstLH0eNeZTlGKfMPF98QTSYz3wp5zKfGvYD37eY2pBLcj+OO47soeB8nBLlqjeCNrbpMjtNyo6ibFZEYqj5l0UINguBoDCzgKEXnEJIA2AYXkWluIrWS4FGGsFxW90IVdfPK+YesQ5ODlexgDShUu8ZfqYa8ygJ7X7h1TEbBxxm/3M1IwNvIwx47g32G6ZM9HmWTNL7CvY/1EwGSgVdnkeIsrQ6OPyAck3rCotPX1AWu0td+PdQ44pTAb8rl2uOHK5WDRuADaYQFbUA/lA5s1Z+juWwP7AYx4zAeFkFM5XdGMeYEk4OA0DBkvZIsN48YuWNEpiX57jOzYlcHgrz/ACeBhmlddSssOwv4/koaUU4MU8QcOsHZDor+w9fsLG7KtjmlciYONPxMFE5N/L8RZHAKQvHlWbmHiaEHtY97lx1j05No5eswQaqLqBZXwcRgBgBUiaH+YGLBYCPZTkqU082tUR1pSMwO5LqUVR5/1C0nnADe11viVQWgFHZKvwlbamaDWMwmw1Jg1/uVQ3vvl8cygy0Lq6ox0+8QuwUsU8DGMY+oR6MKJYcWdagV7bZFdHSVpH4hhhWMbdXvRKKKqQ35VyQp2tiLXb659xonqGisDQfNwN3ZBR5M79zY+LoK6/kSKKVPgvNbfEAZ37mQM0O3zFoYRNLQedG5Zs60WdK7rmUiAuL3oviIBxAC7sL85hLMQSrroc3H0rC9l6EKSXDhptYuRiHFDyOPEKHOo0C3zDMgV1mi248QANAouOnlh2OzQq8Yae40lhmmvcyyo1HvwRaSdgvBoOu4jZtjcPL1HtMBiWM9amBxgLSmgq13uu5aUGyGk9PMzvvBvhX+5QfDFtG91qMGDUABxWOozVCg4/vqUaugE3ZdcwGoVohmljTUuiQV/DK7rgiYbC6xwL4S3qLtNbovXuZIEpkJ2HVy3Y1uadVx3uUyFVIqOl5eox7gMO8vxDlwu7B4Hk+IT5MHEFwHU1XSvVNbQ7MJetYA83rEpLlPhELXovdZ+IJGxsBGi7DFQpl4BcvN35ikWXRfxEKoCwbNOIvoTM3aLq7zUFOJVTAiPzogGGjVkCYL6v7g1ayWMLcBKTAVSrQ53ti40CrUoWc36lpyTMp22aM2QXDgG3RmIrAvm3BALTCgWpf7ljJ0U14vz5j4990HrhX5j3uM1rPO4gcYMC8+YCGw6cLs8FwUS1FXNPHudEhUvsefcAOpDA5UELHAspQXxeJUaVWi6YNMiLbXP4xO351LXd314l1R8hfBuPECMzLaEIebLeO5cqYcnJbAgn4CA5ejUJUA2q1bo68wa1gOD5YqMKDlGl/5uY2BaRVZydwe+4Yac6xGZBrBiCsAg8kx+oKnRqFVDjZIPPUySOsFYxTv1ccbWXniGd++JXFUOd9stGp6MjOQ6IALrI/KCuoDSTLF+HBvc5O6nnOONxmt1+YKS3zxGbCnQFbB1b6hflyMRzjn5lLsVbF10VjMViACaQ4XyEE52qK5YL8x09xNhT8nmYkugDJ7z/2oWoSykLxmO9Gru2l3v3ApSwBMDquYbYSBKGtXz1EbQP2uh+jERQAIdnaxoRVeL6I1EWjT79w62TQyDJ3mXFie6VlrAFw0YYrvKrCs5jUUF57f1icUI015L4qADJV20vnuWbTYQ0cFNmIDaklh6Hh/ExWeD0YCH5Nwmu84NRnHnt2evEfFuKDARkYbvjy9HsmRSR3OQt34lrBgsN1C0BIuWoYP4s4N464iKlWUAu6vUUohG+IuRyUEpvKpp35yMsGOwAuz9qhNmSmfulcOIiRAp2qXRiXGhLa2aT7qBWA7OpazDPU1h6ZhIGsDdpW5x1oK1nzG6V0AA14qZUs8whc3rjOgL5l1rU0L5fcdgktnmiWJjZTizSSm+4bqtRgXB96NvmUAjH6M1Z5zDoGWVaIvyme47fhiKo9RrRtFFDNV8ELMW8jKxeshMXVPKrQykdrZUuj4jElyHQ7mhrfkUL/cSs73M9keXLUC6lpW5hwgECndTc/7DvMcUAh1ACkB0EFsAJZYz5Z3LVmkZqk1KozRxCVdwGf0hyWmovtmEAFMvb5jMZBiBVhxM3AXOC01j4iNPHA/z8wYzA257lYBVNn9TQ5EMW4EupO4S7MxxBFSzRiAACFIvBQF8Ukh3rDxELAwniCtzVtO/EDN8UAvupR4bW3ef9wcKFVf94jqiqwCiIvTxApyZhrnSASxtUDjCwsq15Jkl4sJpvtc9p//2Q==",
  Milo: "data:image/jpeg;base64,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",
  Juniper: "data:image/jpeg;base64,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",
};

/* The owner's own dog — appears automatically on a profile named Bheema. */
const MY_DOG_PHOTOS = {
  Bheema: "data:image/jpeg;base64,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",
};

const buddyStamps = (name) =>
  (BUDDY_DATA[name]?.trails || []).map(([id, date]) => {
    const t = TRAILS.find((x) => x.id === id);
    return { id, name: t.name, area: t.area, miles: t.miles, date, who: name };
  });

const buddyPosts = (name) =>
  (BUDDY_DATA[name]?.posts || []).map((p) => ({ ...p, dog: name, breed: DEMO_DOGS.find((d) => d.name === name)?.breed }));

const GUEST_DOG = {
  name: "Guest",
  breed: "unspecified dog",
  age: "adult",
  size: "Medium (25–55 lb)",
  coat: "Average coat",
  heat: "Average",
  energy: "Medium energy",
  water: "Wades, won't swim",
  joints: "No issues",
  social: "Friendly, stays leashed",
  guest: true,
};

const dogLine = (d) =>
  d.pack
    ? `TWO DOGS FROM THE SAME HOUSEHOLD, hiking together. They go out as a pair, so the trail must work for BOTH — the more limited dog sets the ceiling.\n` +
      d.members.map((m, i) => `Dog ${i + 1} — ${dogLine(m)}`).join("\n")
    : d.guest
    ? "No profile on file — assume a healthy adult medium-sized dog with an average coat. Give general guidance, and where a dog's coat, age, or joints would change the answer, say so explicitly."
    : [
        `${d.name}, a ${d.breed}`,
        `Age: ${d.age}`,
        `Size: ${d.size}`,
        `Coat: ${d.coat}`,
        `Warm weather: ${d.heat}`,
        `Energy: ${d.energy}`,
        `Around water: ${d.water}`,
        `Mobility: ${d.joints}`,
        `Around other dogs: ${d.social}`,
      ].join(". ") + ".";

const makePack = (members) => ({
  pack: true,
  members,
  name: members.map((m) => m.name).join(" & "),
});

/* ------------------------------- components ------------------------------- */

function Avatar({ name, size = 44, src, breed }) {
  const c = inkFor(name);
  if (!src && breed && BREED_ART[breed]) {
    return (
      <div className="pp-avatar pp-avatar-art" style={{ width: size, height: size }}>
        <DogArt breed={breed} size={size} />
      </div>
    );
  }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="pp-avatar pp-avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="pp-avatar"
      style={{ width: size, height: size, background: c, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {(name || "?")[0]}
    </div>
  );
}

function Stamp({ stamp, index }) {
  const c = inkFor(stamp.name);
  const tilt = ((index * 37) % 13) - 6;
  return (
    <div className="pp-stamp-wrap">
      <div className="pp-stamp" style={{ borderColor: c, color: c, transform: `rotate(${tilt}deg)` }}>
        <div className="pp-stamp-inner" style={{ borderColor: c }}>
          <div className="pp-stamp-park">{stamp.area.split(",")[0]}</div>
          <div className="pp-stamp-name">{stamp.name}</div>
          <div className="pp-stamp-rule" style={{ background: c }} />
          <div className="pp-stamp-meta">
            {stamp.miles} MI · {stamp.date}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="pp-loading">
      <div className="pp-paw-loader">
        <span /> <span /> <span /> <span />
      </div>
      <p>{label}</p>
    </div>
  );
}

/* ---------------------------------- app ----------------------------------- */

export default function PawPrintsApp() {
  return (
    <AppErrorBoundary>
      <PawPrintsInner />
    </AppErrorBoundary>
  );
}

function PawPrintsInner() {
  const [mode, setMode] = useState(null); // null | "guest" | "member"
  const [dogs, setDogs] = useState([]);
  const [owner, setOwner] = useState(null); // { email }
  const [activeId, setActiveId] = useState(null); // dog name, or "__pack__"
  const [composing, setComposing] = useState(null); // null | {mode:"new"|"replace", name?}
  const [view, setView] = useState("pawprints");
  const [pawprintsTab, setPawprintsTab] = useState("feed");
  const [openTrail, setOpenTrail] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [pledged, setPledged] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [upgrade, setUpgrade] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [buddy, setBuddy] = useState(null);
  const [buddyLoading, setBuddyLoading] = useState(false);
  const [bios, setBios] = useState({});
  const [bioLoading, setBioLoading] = useState(false);
  const [photos, setPhotos] = useState({}); // postId -> dataURL
  const [composer, setComposer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [avatars, setAvatars] = useState({}); // dog name -> dataURL
  const [invitations, setInvitations] = useState(SEEDED_INVITATIONS);
  const [pawPrefs, setPawPrefs] = useState({});
  const [comments, setComments] = useState(SEEDED_BARKS);
  const [barkPost, setBarkPost] = useState(null);
  const [inviteComposer, setInviteComposer] = useState(null);

  const [matches, setMatches] = useState(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const days = useRef(dayOptions()).current;
  const [plan, setPlan] = useState({ iso: days[0].iso, label: days[0].label, slot: "Early morning" });
  const [weather, setWeather] = useState(null);
  const [weatherFailed, setWeatherFailed] = useState(false);

  const [briefs, setBriefs] = useState({});
  const [briefLoading, setBriefLoading] = useState(false);

  const [memory, setMemory] = useState(null);
  const [showPledge, setShowPledge] = useState(false);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      try {
        const r = await appStorage.get("pawpark:profile");
        if (r?.value) {
          const s = JSON.parse(r.value);
          const saved = s.dogs || (s.dog ? [s.dog] : []);
          if (saved.length) {
            setMode(s.loggedOut ? null : "member");
            setDogs(saved);
            setOwner(s.owner || null);
            setActiveId(s.activeId || saved[0].name);
            setStamps(s.stamps || []);
            setPledged(!!s.pledged);
            setPosts(s.posts || []);
            setBios(s.bios || {});
            setFriends(s.friends || []);
            setInvitations(s.invitations || SEEDED_INVITATIONS);
            setPawPrefs(s.pawPrefs || {});
            setComments(s.comments || SEEDED_BARKS);
          }
        }
      } catch {
        /* first run — nothing saved yet */
      }
      try {
        const av = await appStorage.list("pawpark:avatar:");
        const avKeys = av?.keys || [];
        const loadedAv = {};
        for (const k of avKeys) {
          try {
            const r = await appStorage.get(k);
            if (r?.value) loadedAv[k.replace("pawpark:avatar:", "")] = r.value;
          } catch { /* skip */ }
        }
        setAvatars(loadedAv);
      } catch {
        /* no avatars stored */
      }
      try {
        const listed = await appStorage.list("pawpark:photo:");
        const keys = listed?.keys || [];
        const loaded = {};
        for (const k of keys) {
          try {
            const r = await appStorage.get(k);
            if (r?.value) loaded[k.replace("pawpark:photo:", "")] = r.value;
          } catch { /* skip a missing photo */ }
        }
        setPhotos(loaded);
      } catch {
        /* no photos stored */
      }
      setLoaded(true);
    })();
  }, []);

  const persist = async (next) => {
    if (mode === "guest" && !next?.dogs) return; // guests leave no prints
    try {
      await appStorage.set(
        "pawpark:profile",
        JSON.stringify({ owner, dogs, activeId, stamps, pledged, posts, bios, friends, invitations, pawPrefs, comments, ...next })
      );
    } catch {
      /* storage unavailable — session still works */
    }
  };

  /* The active subject: one dog, or both siblings as a pack. */
  const realDogs = dogs.filter((d) => !d.guest);
  const dog =
    activeId === "__pack__" && realDogs.length > 1
      ? makePack(realDogs)
      : dogs.find((d) => d.name === activeId) || dogs[0] || null;

  const addDog = (d, replaceName, thenPrompt) => {
    const withId = { ...d, id: d.id || dogId(d.name) };
    const next = replaceName
      ? dogs.map((x) => (x.name === replaceName ? { ...withId, id: x.id || withId.id } : x))
      : [...dogs, withId];
    setDogs(next);
    setActiveId(withId.name);
    setComposing(thenPrompt ? { mode: "siblingPrompt" } : null);
    setMatches(null);
    setBriefs({});
    persist({ dogs: next, activeId: withId.name });
  };

  const markInMemory = (name) => {
    const target = dogs.find((d) => d.name === name);
    if (!target) return;

    const makeMemorial = !target.memorial;
    const defaultPrefs = { play: true, adventure: true, sleepover: false, host: false };
    const currentPrefs = pawPrefs[name] || defaultPrefs;

    const nextDogs = dogs.map((d) =>
      d.name === name
        ? makeMemorial
          ? {
              ...d,
              memorial: true,
              memorialAt: new Date().toISOString(),
              memorialPrefsBackup: currentPrefs,
            }
          : {
              ...d,
              memorial: false,
              memorialAt: undefined,
              memorialPrefsBackup: undefined,
            }
        : d
    );

    const nextPrefs = {
      ...pawPrefs,
      [name]: makeMemorial
        ? { play: false, adventure: false, sleepover: false, host: false }
        : (target.memorialPrefsBackup || defaultPrefs),
    };

    setDogs(nextDogs);
    setPawPrefs(nextPrefs);
    persist({ dogs: nextDogs, pawPrefs: nextPrefs });
    setComposing(null);
  };

  const removeDog = (name) => {
    if (!window.confirm(`Delete ${name}'s profile from this device? Use In Memory instead if you want to keep the profile as a memorial.`)) return;
    const next = dogs.filter((d) => d.name !== name);
    const nextActive = activeId === name ? (next[0]?.name || null) : activeId;
    setDogs(next);
    setActiveId(nextActive);
    setComposing(next.length ? null : { mode: "account" });
    persist({ dogs: next, activeId: nextActive });
  };

  /* ---- claude: match trails to this dog ---- */
  const runMatch = async () => {
    setMatching(true);
    setMatchError(null);
    setWeatherFailed(false);

    const slot = TIME_SLOTS.find((s) => s.key === plan.slot) || TIME_SLOTS[0];
    let wx = null;
    try {
      wx = await fetchForecast(plan.iso, slot.hour);
      setWeather(wx);
    } catch {
      setWeatherFailed(true);
      setWeather(null);
    }

    try {
      const catalog = TRAILS.map((t) => {
        const w = wx?.[t.id];
        return {
          id: t.id,
          name: t.name,
          miles: t.miles,
          difficulty: t.difficulty,
          leash: t.leash,
          surface: t.surface,
          shade: t.shade,
          water: t.water,
          elevation_ft: t.elevation,
          crowd: t.crowd,
          note: t.note,
          forecast: w
            ? `${w.temp}F (feels ${w.feels}F), UV ${w.uv}, wind ${w.wind} mph, ${w.rain}% chance of rain`
            : "forecast unavailable",
        };
      });

      const text = await askClaude(
        `You are a trail guide who matches hikes to one specific dog on one specific day.

Dog: ${dogLine(dog)}

Planned outing: ${plan.label}, ${slot.note}.

Trail catalog with the forecast for that exact time at each trailhead:
${JSON.stringify(catalog, null, 1)}

Score every trail 0-100 for THIS ${dog.pack ? "pair" : "dog"} on THIS outing. Weather is heavily weighted: an exposed trail at 88F is dangerous for a double-coated dog regardless of how scenic it is, and unshaded paved or rock surfaces get far hotter than air temperature. Also weigh joint load against elevation, off-leash rules against the dog's behavior around other dogs, water access against heat, and age against distance.${
          dog.pack
            ? `\n\nBoth dogs go on every outing together, so a trail only scores well if BOTH can do it comfortably. Score to the more limited dog, not the average. In "limiter", name the dog holding the score down, or "Both fine" when neither is constrained. If no trail in the catalog genuinely suits both, score honestly low rather than picking a least-bad option.`
            : ""
        }

Respond with JSON only. No preamble, no markdown fences:
[{"id":"trail-id","score":0-100,"why":"one sentence, max 16 words, referencing ${dog.pack ? "both dogs" : "this dog"} and today's conditions","watch":"one short caution, max 8 words"${dog.pack ? `,"limiter":"dog name or Both fine"` : ""}}]`,
        1800
      );
      const arr = parseJSON(text);
      const map = {};
      arr.forEach((m) => (map[m.id] = m));
      setMatches(map);
    } catch (e) {
      setMatches(fallbackTrailMatches(dog, wx));
      setMatchError(null);
    }
    setMatching(false);
  };

  /* ---- claude: safety brief for one trail ---- */
  const loadBrief = async (trail) => {
    if (briefs[trail.id]) return;
    setBriefLoading(true);
    const w = weather?.[trail.id];
    const slot = TIME_SLOTS.find((s) => s.key === plan.slot) || TIME_SLOTS[0];
    try {
      const text = await askClaude(
        `Write a pre-hike safety brief for one specific dog, on one specific trail, at one specific time.

Dog: ${dogLine(dog)}

Outing: ${plan.label}, ${slot.note}.${
          dog.pack
            ? "\n\nBoth dogs are going together. Write one brief that covers both, and where their needs differ, say which dog you mean by name."
            : ""
        }

Trail: ${trail.name}, ${trail.area}. ${trail.miles} miles, ${trail.difficulty}, ${trail.elevation} ft gain. Surface: ${trail.surface}. Shade: ${trail.shade}. Water: ${trail.water}. Leash: ${trail.leash}. Crowds: ${trail.crowd}. Best season: ${trail.season}. ${trail.note}

Forecast at the trailhead for that hour: ${
          w
            ? `${w.temp}F, feels like ${w.feels}F, UV index ${w.uv}, wind ${w.wind} mph, ${w.rain}% chance of rain.`
            : "unavailable — say so rather than guessing at numbers."
        }

Ground every point in the numbers above. Respond with JSON only. No preamble, no markdown fences:
{"verdict":"one sentence, max 20 words, clear go or don't-go for this dog at this hour","paws":"surface heat risk given the forecast, max 24 words","hydration":"water plan with a rough volume, max 24 words","rules":"leash and etiquette for this trail, max 20 words","wildlife":"realistic hazard, max 18 words","turnaround":"a concrete signal to end the hike early, max 18 words"}`,
        900
      );
      setBriefs((b) => ({ ...b, [trail.id]: parseJSON(text) }));
    } catch {
      setBriefs((b) => ({ ...b, [trail.id]: fallbackBriefFor(trail, dog, w) }));
    }
    setBriefLoading(false);
  };

  /* ---- stamp the passport ---- */
  const seedByName = {};
  dogs.forEach((d) => {
    const hit = Object.keys(MY_DOG_PHOTOS).find((k) => k.toLowerCase() === (d.name || "").toLowerCase());
    if (hit) seedByName[d.name] = MY_DOG_PHOTOS[hit];
  });
  const avatarMap = { ...seedByName, ...avatars };

  const setAvatar = (name, dataUrl) => {
    setAvatars((a) => ({ ...a, [name]: dataUrl }));
    appStorage.set(`pawpark:avatar:${name}`, dataUrl).catch(() => {});
  };

  const logOut = () => {
    setMenuOpen(false);
    setOpenTrail(null);
    setView("trails");
    setMatches(null);
    setBriefs({});
    if (mode === "guest") {
      setDogs([]);
      setActiveId(null);
      setComposing(null);
      setInviteComposer(null);
      setComposer(null);
      setUpgrade(null);
      setMemory(null);
      setMode(null);
      return;
    }
    setMode(null);
    persist({ loggedOut: true });
  };

  const resumeSession = () => {
    setMode("member");
    persist({ loggedOut: false });
  };

  const toggleFriend = (name) => {
    const next = friends.includes(name) ? friends.filter((f) => f !== name) : [...friends, name];
    setFriends(next);
    persist({ friends: next });
  };


  const saveBio = (subject, text) => {
    const next = { ...bios, [subject.name]: text.trim() };
    setBios(next);
    persist({ bios: next });
  };

  const togglePref = (name, key) => {
    const current = pawPrefs[name] || { play: true, adventure: true, sleepover: false, host: false };
    const next = { ...pawPrefs, [name]: { ...current, [key]: !current[key] } };
    setPawPrefs(next);
    persist({ pawPrefs: next });
  };

  const createInvitation = (payload) => {
    const id = `invite-${Date.now()}`;
    const firstFriend = friends[0] || "Cooper";
    const invite = {
      id,
      ...payload,
      dog: dog.name,
      breed: dog.pack ? dog.members.map((m) => m.breed).join(" & ") : dog.breed,
      mine: true,
      sniffs: [],
      interest: [{ dog: firstFriend, text: "We might be in — can you send a little more detail?", status: "pending", demo: true }],
    };
    const next = [invite, ...invitations];
    setInvitations(next);
    persist({ invitations: next });
    setInviteComposer(null);
    setView("together");
  };

  const toggleSniff = (id) => {
    const next = invitations.map((inv) => {
      if (inv.id !== id || inv.mine) return inv;
      const has = (inv.sniffs || []).includes(dog.name);
      return { ...inv, sniffs: has ? inv.sniffs.filter((n) => n !== dog.name) : [...(inv.sniffs || []), dog.name] };
    });
    setInvitations(next);
    persist({ invitations: next });
  };

  const respondToInterest = (id, friendName, status) => {
    const next = invitations.map((inv) =>
      inv.id === id
        ? { ...inv, interest: (inv.interest || []).map((x) => x.dog === friendName ? { ...x, status } : x) }
        : inv
    );
    setInvitations(next);
    persist({ invitations: next });
  };

  const addBark = (postId, text) => {
    const next = {
      ...comments,
      [postId]: [...(comments[postId] || []), { dog: dog.name, text: text.trim(), when: "now", added: true }],
    };
    setComments(next);
    persist({ comments: next });
  };

  const writeBio = async (subject) => {
    setBioLoading(true);
    const theirStamps = stamps.filter((s) => !s.who || s.who.includes(subject.name));
    try {
      const text = await askClaude(
        `Write a short profile bio for a dog, written by their owner, for a dog-hiking app.

Dog: ${dogLine(subject)}
Trails finished so far: ${theirStamps.length ? theirStamps.map((s) => `${s.name} (${s.miles} mi)`).join(", ") : "none yet"}

Two sentences maximum, under 30 words total. Warm and specific — pull from their actual traits and trails, not generic dog-lover phrasing. No hashtags. At most one emoji. Plain text only.`,
        250
      );
      const next = { ...bios, [subject.name]: text.trim() };
      setBios(next);
      persist({ bios: next });
    } catch {
      const fallback = `${subject.name} is a ${subject.breed} who loves good company, fresh air, and adventures at their own pace. 🐾`;
      const next = { ...bios, [subject.name]: fallback };
      setBios(next);
      persist({ bios: next });
    }
    setBioLoading(false);
  };

  const publishPost = (trail, caption, media, visibility = "friends") => {
    const id = `p-${Date.now()}`;
    const post = {
      id,
      dog: dog.name,
      breed: dog.pack ? dog.members.map((m) => m.breed).join(" & ") : dog.breed,
      trail: trail ? trail.name : null,
      miles: trail ? trail.miles : null,
      when: "Just now",
      caption,
      paws: 0,
      barks: 0,
      mine: true,
      media: media ? media.kind : null,
      visibility,
    };
    const next = [post, ...posts];
    setPosts(next);
    persist({ posts: next });

    if (media) {
      setPhotos((p) => ({ ...p, [id]: media.url }));
      if (media.persist) {
        appStorage.set(`pawpark:photo:${id}`, media.url).catch(() => {});
      }
    }
  };

  const react = (id, kind) =>
    setReactions((r) => ({ ...r, [`${id}:${kind}`]: !r[`${id}:${kind}`] }));

  /* ---- claude: would these two dogs actually get along? ---- */
  const checkBuddy = async (other) => {
    setBuddy({ other, verdict: null });
    setBuddyLoading(true);
    try {
      const text = await askClaude(
        `Two dog owners are considering a playdate. Judge whether these two dogs are a good match, honestly.

Dog A: ${dogLine(dog)}
Dog B: ${other.breed}. Age: ${other.age}. Size: ${other.size}. Energy: ${other.energy}. Around other dogs: ${other.social}. Around water: ${other.water}. Mobility: ${other.joints}.

Consider energy mismatch, size difference and injury risk, age gap, and especially whether either dog needs space from other dogs. Be willing to say it's a bad match — that is more useful than being agreeable.

Respond with JSON only. No preamble, no markdown fences:
{"match":"Great match" or "Worth a try" or "Probably not","why":"one sentence, max 22 words","setting":"the kind of meeting place that would work best, max 16 words"}`,
        500
      );
      setBuddy({ other, verdict: parseJSON(text) });
    } catch {
      setBuddy({ other, verdict: { error: true } });
    }
    setBuddyLoading(false);
  };

  const stampTrail = async (trail) => {
    if (dog.guest) {
      setUpgrade({ reason: "stamp", trail });
      return;
    }
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const next = [...stamps, { id: trail.id, name: trail.name, area: trail.area, miles: trail.miles, date, who: dog.name }];
    setStamps(next);
    persist({ stamps: next });

    setMemory({ trail, caption: null });
    try {
      const text = await askClaude(
        `Write a short caption for a dog's trail photo, in the voice of the dog's human.

Dog: ${dogLine(dog)}
Trail just finished: ${trail.name}, ${trail.area}, ${trail.miles} miles. ${trail.note}

Two sentences maximum. Warm, specific, no hashtags, no emoji spam (one emoji at most). Plain text only, no quotes around it.`,
        300
      );
      setMemory({ trail, caption: text.trim() });
    } catch {
      setMemory({ trail, caption: `${dog.name} finished ${trail.name}.` });
    }
  };

  const totalMiles = stamps.reduce((a, s) => a + s.miles, 0);
  const parks = new Set(stamps.map((s) => s.area)).size;

  /* ------------------------------ onboarding ------------------------------ */

  if (!loaded) return <Shell><Spinner label="Opening the trailhead…" /></Shell>;

  if (!mode)
    return (
      <Shell>
        <Gate
          savedOwner={owner}
          savedDogs={realDogs}
          savedAvatars={avatarMap}
          onResume={resumeSession}
          onGuest={() => {
            setComposing(null);
            setInviteComposer(null);
            setComposer(null);
            setUpgrade(null);
            setMemory(null);
            setMode("guest");
            setDogs([GUEST_DOG]);
            setActiveId(GUEST_DOG.name);
            setView("trails");
          }}
          onMember={() => { setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }}
        />
      </Shell>
    );

  if (composing || !dogs.length) {
    const step = composing?.mode || "account";
    return (
      <Shell>
        {step === "account" ? (
          <AccountStep
            onNext={(profile) => { setOwner(profile); persist({ owner: profile }); setComposing({ mode: "new", first: true }); }}
            onBack={() => { setMode(null); setDogs([]); setOwner(null); }}
          />
        ) : step === "siblingPrompt" ? (
          <SiblingPrompt
            dogs={realDogs}
            avatars={avatarMap}
            onAdd={() => setComposing({ mode: "choose" })}
            onSkip={() => setComposing(null)}
          />
        ) : step === "choose" ? (
          <SiblingChoice
            onExisting={() => setComposing({ mode: "link" })}
            onNew={() => setComposing({ mode: "new" })}
            onBack={() => setComposing(dogs.length ? null : { mode: "new", first: true })}
          />
        ) : step === "link" ? (
          <LinkExisting
            owner={owner}
            taken={dogs.map((d) => d.id)}
            onLink={(found) => addDog(found, null, true)}
            onBack={() => setComposing({ mode: "choose" })}
          />
        ) : (
          <Setup
            sibling={step === "new" && dogs.length > 0}
            editing={step === "replace"}
            initialDog={composing?.mode === "replace" ? dogs.find((x) => x.name === composing.name) : null}
            initialAvatar={composing?.mode === "replace" ? avatarMap[composing.name] : null}
            onPick={(d, avatarUrl) => {
              if (avatarUrl) setAvatar(d.name, avatarUrl);
              addDog(
                d,
                composing?.mode === "replace" ? composing.name : null,
                composing?.mode !== "replace"
              );
            }}
            onDelete={composing?.mode === "replace" ? () => removeDog(composing.name) : null}
            onMemorial={composing?.mode === "replace" ? () => markInMemory(composing.name) : null}
            onBackToGate={
              dogs.length
                ? () => setComposing(composing?.mode === "replace" ? null : (composing?.first ? null : { mode: "choose" }))
                : () => setComposing({ mode: "account" })
            }
          />
        )}
      </Shell>
    );
  }

  /* -------------------------------- routes -------------------------------- */

  const trail = openTrail ? TRAILS.find((t) => t.id === openTrail) : null;

  const inPawPark = !!trail || view === "trails" || view === "passport";
  const worldClass = inPawPark ? "pawpark-world" : "pawprints-world";

  return (
    <Shell>
      <div className={`pp-world ${worldClass}`}>
        <header className="pp-top">
          <div className="pp-brand">
            <PawMark color={inPawPark ? "#2F5D3A" : "#6D3DD1"} />
            <div>
              <h1>{inPawPark ? "PawPark" : "PawPrints"}</h1>
              <p>{inPawPark ? "Explore. Adventure. Together." : "Connect. Share. Trust."}</p>
            </div>
          </div>
          <button className="pp-dogchip" onClick={() => setMenuOpen(true)}>
            {dog.guest ? (
              <>
                <span className="pp-guestdot" aria-hidden="true" />
                <span>PawGuest</span>
              </>
            ) : (
              <>
                <Avatar name={dog.name} size={32} src={avatarMap[dog.pack ? dog.members[0].name : dog.name]} />
                <span>{dog.name}</span>
              </>
            )}
          </button>
        </header>

        {inPawPark && !trail && (
          <div className="pp-subnav">
            <button className={view === "trails" ? "on" : ""} onClick={() => setView("trails")}>Explore</button>
            <button className={view === "passport" ? "on" : ""} onClick={() => setView("passport")}>PawPassport</button>
          </div>
        )}

        <main className="pp-main">
          {trail ? (
            <TrailDetail
              trail={trail}
              dog={dog}
              plan={plan}
              weather={weather?.[trail.id]}
              risk={pawRisk(weather?.[trail.id], trail)}
              match={matches?.[trail.id]}
              brief={briefs[trail.id]}
              loading={briefLoading}
              stamped={stamps.some((s) => s.id === trail.id)}
              onLoadBrief={() => loadBrief(trail)}
              onStamp={() => stampTrail(trail)}
              onBack={() => setOpenTrail(null)}
            />
          ) : view === "trails" ? (
            <TrailList
              dog={dog}
              dogs={realDogs}
              activeId={activeId}
              onSwitch={(id) => { setActiveId(id); setMatches(null); setBriefs({}); persist({ activeId: id }); }}
              days={days}
              plan={plan}
              onPlan={(p) => { setPlan({ ...plan, ...p }); setMatches(null); setBriefs({}); }}
              weather={weather}
              weatherFailed={weatherFailed}
              matches={matches}
              matching={matching}
              error={matchError}
              stamps={stamps}
              onMatch={runMatch}
              onOpen={(id) => { setOpenTrail(id); }}
            />
          ) : view === "together" ? (
            <PawTogether
              dog={dog}
              invitations={invitations}
              avatars={avatarMap}
              onSniff={toggleSniff}
              onCreate={(type) => setInviteComposer({ type })}
              onRespond={respondToInterest}
              onJoin={() => { setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }}
            />
          ) : view === "pawprints" ? (
            <PawPrints
              dog={dog}
              houseDogs={realDogs}
              onSwitchDog={(id) => {
                setActiveId(id);
                setMatches(null);
                setBriefs({});
                persist({ activeId: id });
              }}
              onOpenHousehold={() => setView("profile")}
              onAddSibling={() => setComposing({ mode: "choose" })}
              posts={posts}
              photos={photos}
              friends={friends}
              avatars={avatarMap}
              onSetAvatar={setAvatar}
              onToggleFriend={toggleFriend}
              onCompose={() => setComposer({ media: null })}
              stamps={stamps}
              pledged={pledged}
              bios={bios}
              bioLoading={bioLoading}
              onWriteBio={writeBio}
              onSaveBio={saveBio}
              pawPrefs={pawPrefs}
              onTogglePref={togglePref}
              reactions={reactions}
              onReact={react}
              comments={comments}
              onOpenBarks={setBarkPost}
              tab={pawprintsTab}
              onTab={setPawprintsTab}
              onJoin={() => { setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }}
            />
          ) : view === "profile" ? (
            dog.guest ? (
              <GuestPanel kind="profile" onJoin={() => { setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }} />
            ) : (
              <ProfileScreen
                dogs={realDogs}
                owner={owner}
                avatars={avatarMap}
                onSetAvatar={setAvatar}
                stamps={stamps}
                onEdit={(name) => setComposing({ mode: "replace", name })}
                onAdd={() => setComposing({ mode: "choose" })}
              />
            )
          ) : dog.guest ? (
            <GuestPanel kind="passport" onJoin={() => { setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }} />
          ) : (
            <Passport
              dog={dog}
              avatars={avatarMap}
              stamps={stamps}
              miles={totalMiles}
              parks={parks}
              pledged={pledged}
              onPledge={() => setShowPledge(true)}
            />
          )}
        </main>

        {!trail && (
          <nav className="pp-tabs pp-main-tabs">
            <button className={view === "pawprints" && pawprintsTab === "feed" ? "on" : ""} onClick={() => { setView("pawprints"); setPawprintsTab("feed"); }}>
              <span>🐾</span>PawFeed
            </button>
            <button className={view === "together" ? "on" : ""} onClick={() => setView("together")}>
              <span>🤝</span>Together
            </button>
            <button className="pp-plus-tab" onClick={() => setComposer({ media: null })} aria-label="Create post">
              <b>+</b>
            </button>
            <button className={inPawPark ? "on" : ""} onClick={() => setView("trails")}>
              <span>🌲</span>PawPark
            </button>
            <button className={view === "pawprints" && pawprintsTab === "profile" ? "on" : ""} onClick={() => { setView("pawprints"); setPawprintsTab("profile"); }}>
              <span>🐕</span>Profile
            </button>
          </nav>
        )}

        {menuOpen && (
        <AccountMenu
          dogs={realDogs}
          owner={owner}
          avatars={avatarMap}
          activeId={activeId}
          isGuest={mode === "guest"}
          onSwitch={(id) => {
            setActiveId(id);
            setMatches(null);
            setBriefs({});
            persist({ activeId: id });
            setMenuOpen(false);
            setOpenTrail(null);
          }}
          onHousehold={() => { setMenuOpen(false); setOpenTrail(null); setView("profile"); }}
          onAddSibling={() => { setMenuOpen(false); setComposing({ mode: "choose" }); }}
          onLogOut={logOut}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {composer && (
          <Composer
            dog={dog}
            onPost={(caption, media, visibility) => { publishPost(null, caption, media, visibility); setComposer(null); setView("pawprints"); setPawprintsTab("feed"); }}
            onClose={() => setComposer(null)}
          />
        )}

        {memory && (
          <MemoryModal
            memory={memory}
            dog={dog}
            onShare={(caption, media, visibility) => publishPost(memory.trail, caption, media, visibility)}
            onClose={() => { setMemory(null); setOpenTrail(null); setView("passport"); }}
          />
        )}

        {inviteComposer && (
          <InvitationComposer
            dog={dog}
            initialType={inviteComposer.type}
            onCreate={createInvitation}
            onClose={() => setInviteComposer(null)}
          />
        )}

        {barkPost && (
          <BarkModal
            post={barkPost}
            dog={dog}
            comments={comments[barkPost.id] || []}
            onAdd={(text) => addBark(barkPost.id, text)}
            onClose={() => setBarkPost(null)}
          />
        )}

        {upgrade && (
          <UpgradeModal
            trail={upgrade.trail}
            onJoin={() => { setUpgrade(null); setOpenTrail(null); setMode("member"); setDogs([]); setActiveId(null); setComposing({ mode: "account" }); }}
            onClose={() => setUpgrade(null)}
          />
        )}

        {showPledge && (
          <PledgeModal
            dog={dog}
            onAccept={() => { setPledged(true); persist({ pledged: true }); setShowPledge(false); }}
            onClose={() => setShowPledge(false)}
          />
        )}
      </div>
    </Shell>
  );
}

/* -------------------------------- onboarding ------------------------------- */

function DogProfile({ subject, avatarSrc, avatarBreed, onSetAvatar, onOpenHousehold, onAddSibling, householdCount, stamps, posts, photos, onCompose, pledged, bio, bioLoading, onWriteBio, onSaveBio, prefs, onTogglePref, readOnly, connected, onToggleFriend, mutuals }) {
  const mine = stamps.filter((s) => !s.who || s.who.includes(subject.name));
  const miles = mine.reduce((a, s) => a + s.miles, 0);
  const myPosts = posts.filter((p) => p.dog.includes(subject.name));
  const ctx = { stamps: mine, miles, posts: myPosts, pledged };
  const paws = myPosts.reduce((a, p) => a + p.paws, 0);
  const areas = [...new Set(mine.map((s) => s.area.split(",")[0]))];
  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState(bio || "");

  useEffect(() => { setDraftBio(bio || ""); }, [bio]);

  const openPrefs = prefs || { play: true, adventure: true, sleepover: false, host: false };
  const visiblePosts = readOnly
    ? myPosts.filter((p) => !p.visibility || p.visibility === "everyone" || (connected && p.visibility === "friends"))
    : myPosts;

  return (
    <div className="pp-dogprofile">
      <div className="pp-dp-top">
        <div className="pp-dp-ring">
          {readOnly ? (
            <Avatar name={subject.name} size={86} src={avatarSrc} breed={avatarBreed} />
          ) : (
            <AvatarPicker name={subject.name} src={avatarSrc} size={86} onPick={(url) => onSetAvatar(subject.name, url)} label={`Add ${subject.name}'s photo`} />
          )}
        </div>
        <h2>{subject.name}</h2>
        <p className="pp-dp-meta">{subject.breed} · {subject.age}</p>
        {subject.memorial && <div className="pp-memorial-note">In Memory 🌈 · keeping {subject.name}'s adventures and memories close.</div>}
        {readOnly && mutuals?.length > 0 && <p className="pp-mutual">Paw friends with {mutuals.join(" & ")}</p>}
        {readOnly && (
          <button className={connected ? "pp-ghost pp-connected" : "pp-purple pp-connect"} onClick={() => onToggleFriend(subject.name)}>
            {connected ? "Paw Friends ✓" : `Add ${subject.name} as a Paw Friend`}
          </button>
        )}
      </div>

      <div className="pp-dp-stats">
        <div><strong>{connected ? "✓" : myPosts.length}</strong><span>{connected ? "Paw Friend" : "Posts"}</span></div>
        <div><strong>{mine.length}</strong><span>Adventures</span></div>
        <div><strong>{miles.toFixed(1)}</strong><span>Miles</span></div>
        <div><strong>{paws}</strong><span>Paws</span></div>
      </div>

      {!readOnly && (
        <button className="pp-household" onClick={onAddSibling || onOpenHousehold}>
          <span>
            <strong>{householdCount > 1 ? `${householdCount} dogs in this household` : "One dog on this account"}</strong>
            <em>{householdCount > 1 ? "Manage siblings, IDs and profiles" : "Add a sibling — link an existing ID or create a new profile"}</em>
          </span>
          <span className="pp-household-go">›</span>
        </button>
      )}

      <section className="pp-dp-about">
        <div className="pp-dp-gridhead">
          <h3>Bio</h3>
          {!readOnly && !editingBio && <button className="pp-editlink" onClick={() => setEditingBio(true)}>Edit bio</button>}
        </div>
        {readOnly ? (
          <p>{bio || "No bio yet."}</p>
        ) : editingBio || !bio ? (
          <>
            <textarea className="pp-bioedit" rows={3} maxLength={180} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} placeholder={`Tell Paw Friends what makes ${subject.name}... ${subject.name}.`} />
            <div className="pp-bio-actions">
              <button className="pp-purple pp-inlinebtn" disabled={!draftBio.trim()} onClick={() => { onSaveBio(subject, draftBio); setEditingBio(false); }}>Save bio</button>
              <button className="pp-ghost pp-inlinebtn" disabled={bioLoading} onClick={() => onWriteBio(subject)}>{bioLoading ? "Helping…" : "✨ Help me write it"}</button>
            </div>
          </>
        ) : (
          <p>{bio}</p>
        )}
      </section>

      <section className={`pp-open-to ${subject.memorial ? "memorial-disabled" : ""}`}>
        <div className="pp-dp-gridhead">
          <h3>Open to</h3>
          {!readOnly && (
            <span className="pp-mini-note">
              {subject.memorial ? "Paused for In Memory profiles" : "You control this"}
            </span>
          )}
        </div>

        {subject.memorial ? (
          <>
            <div className="pp-open-grid">
              {Object.entries(PAW_TOGETHER_TYPES).map(([key, meta]) => (
                <button
                  type="button"
                  key={key}
                  className="pp-open-chip pp-open-disabled"
                  disabled
                  aria-disabled="true"
                >
                  {meta.icon} {meta.short}
                </button>
              ))}
            </div>
            <p className="pp-open-memorial-note">
              🌈 In Memory profiles keep their friendships and memories, but they aren't open to new play, adventure, sleepover or hosting invitations.
            </p>
          </>
        ) : (
          <div className="pp-open-grid">
            {Object.entries(PAW_TOGETHER_TYPES).map(([key, meta]) => {
              const on = !!openPrefs[key];
              if (readOnly && !on) return null;
              return readOnly ? (
                <span key={key} className="pp-open-chip on">{meta.icon} {meta.short}</span>
              ) : (
                <button
                  type="button"
                  key={key}
                  className={on ? "pp-open-chip on" : "pp-open-chip"}
                  onClick={() => onTogglePref(subject.name, key)}
                >
                  {meta.icon} {meta.short} {on ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="pp-dp-gridhead"><h3 className="pp-dp-h">Paw Adventures</h3>{!readOnly && <button className="pp-editlink" onClick={onCompose}>+ New memory</button>}</div>
        {mine.length === 0 && visiblePosts.length === 0 ? (
          <div className="pp-empty"><p>Nothing here yet.</p><p className="pp-empty-sub">{readOnly ? `${subject.name} hasn't shared an adventure yet.` : `Finish a trail or save a memory and it lands here.`}</p></div>
        ) : (
          <>
            {areas.length > 0 && <div className="pp-albums">{areas.map((a) => <span key={a} className="pp-album">{a} · {mine.filter((x) => x.area.startsWith(a)).length}</span>)}</div>}
            <div className="pp-grid">
              {visiblePosts.filter((p) => photos?.[p.id] || p.media === "scene").map((p) => (
                <div key={p.id} className="pp-tile photo">
                  {photos?.[p.id] ? (p.media === "video" ? <video src={photos[p.id]} muted playsInline className="pp-tile-media" /> : <img src={photos[p.id]} alt="" className="pp-tile-media" />) : <SceneArt seed={p.id} />}
                  {p.trail && <strong className="pp-tile-cap">{p.trail}</strong>}
                  {p.mine && p.visibility && <span className="pp-privacy-dot">{p.visibility === "only-me" ? "🔒" : p.visibility === "friends" ? "💜" : "🌎"}</span>}
                </div>
              ))}
              {mine.map((stamp, i) => <div key={stamp.id + i} className="pp-tile" style={{ background: `linear-gradient(150deg, ${inkFor(stamp.name)}, #1D3B27)` }}><strong>{stamp.name}</strong><span>{stamp.miles} mi · {stamp.date}</span></div>)}
            </div>
          </>
        )}
      </section>

      <section>
        <div className="pp-dp-gridhead"><h3 className="pp-dp-h">PawPassport</h3><span className="pp-mini-note">{BADGES.filter((b) => b.earned(ctx)).length} badges</span></div>
        <div className="pp-badges compact">
          {BADGES.slice(0, 4).map((b) => { const got=b.earned(ctx); return <div key={b.key} className={got ? "pp-badge got" : "pp-badge"}><RangerBadge muted={!got}/><strong>{b.name}</strong></div>; })}
        </div>
      </section>
    </div>
  );
}

function PawPrints({ dog, houseDogs, onSwitchDog, onOpenHousehold, onAddSibling, posts, photos, friends, avatars, onSetAvatar, onToggleFriend, onCompose, stamps, pledged, bios, bioLoading, onWriteBio, onSaveBio, pawPrefs, onTogglePref, reactions, onReact, comments, onOpenBarks, tab, onTab, onJoin }) {
  const household = dog.pack ? dog.members.map((m) => m.name) : [dog.name];
  const others = DEMO_DOGS.filter((d) => !household.includes(d.name));
  const members = (houseDogs && houseDogs.length ? houseDogs : (dog.pack ? dog.members : [dog]));
  const [packView, setPackView] = useState(members[0]?.name);
  useEffect(() => {
    if (!members.some((m) => m.name === packView)) setPackView(members[0]?.name);
  }, [members.map((m) => m.name).join("|")]);
  const whose = dog.pack ? packView : dog.name;
  const selectDog = (name) => (dog.pack ? setPackView(name) : onSwitchDog(name));
  const [viewing, setViewing] = useState(null);
  const subject = members.find((m) => m.name === whose) || members[0];
  const avatarFor = (name) => avatars?.[name] || BUDDY_PHOTOS[name] || MY_DOG_PHOTOS[name];
  const breedOf = (name) => DEMO_DOGS.find((d) => d.name === name)?.breed;
  const buddyGridPosts = (name) => [
    ...(BUDDY_PHOTOS[name] ? [{ id: `${name}-portrait`, dog: name, media: "image", paws: 0, barks: 0 }] : []),
    ...(BUDDY_DATA[name]?.trails || []).map(([tid]) => ({ id: `${name}-scene-${tid}`, dog: name, media: "scene", paws: 0, barks: 0, trail: TRAILS.find((t) => t.id === tid)?.name })),
  ];
  const feed = [...posts.filter((p) => p.visibility !== "only-me"), ...friends.flatMap((f) => buddyPosts(f))];
  const seededMedia = {};
  Object.entries(BUDDY_PHOTOS).forEach(([name, url]) => {
    seededMedia[`${name}-portrait`] = url;
    const first = BUDDY_DATA[name]?.posts?.[0];
    if (first) seededMedia[first.id] = url;
  });
  const allPhotos = { ...seededMedia, ...photos };

  if (viewing) {
    const b = DEMO_DOGS.find((d) => d.name === viewing);
    const mutuals = (BUDDY_DATA[viewing]?.friends || []).filter((f) => friends.includes(f));
    return (
      <div className="pp-prints">
        <button className="pp-back" onClick={() => setViewing(null)}>‹ Paw Friends</button>
        <DogProfile subject={{ ...b, id: REGISTRY[Object.keys(REGISTRY).find((k) => REGISTRY[k].name === viewing)]?.id }} avatarSrc={avatarFor(viewing)} avatarBreed={b?.breed} stamps={buddyStamps(viewing)} posts={buddyGridPosts(viewing)} photos={allPhotos} pledged={BUDDY_DATA[viewing]?.pledged} bio={BUDDY_DATA[viewing]?.bio} prefs={SEEDED_PREFS[viewing]} readOnly connected={friends.includes(viewing)} onToggleFriend={onToggleFriend} mutuals={mutuals} />
      </div>
    );
  }

  return (
    <div className="pp-prints">
      <div className="pp-prints-head"><h2>PawPrints</h2><p>Your dog's world. Your trusted community. 💜</p></div>
      <div className="pp-seg">
        <button className={tab === "feed" ? "on" : ""} onClick={() => onTab("feed")}>PawFeed</button>
        <button className={tab === "friends" ? "on" : ""} onClick={() => onTab("friends")}>Paw Friends {friends.length > 0 && <em className="pp-segcount">{friends.length}</em>}</button>
        <button className={tab === "profile" ? "on" : ""} onClick={() => onTab("profile")}>{dog.guest ? "Profile" : subject.name}</button>
      </div>

      {tab === "friends" && (
        <section className="pp-friends">
          <p className="pp-together-sub">Build a circle slowly. Tap a Paw Friend to see the profile, memories and adventures they chose to share.</p>
          {others.map((o) => { const connected=friends.includes(o.name); return (
            <div key={o.name} className="pp-friendrow">
              <button className="pp-friendmain" onClick={() => setViewing(o.name)}><Avatar name={o.name} size={46} src={avatarFor(o.name)} breed={o.breed}/><div><strong>{o.name}</strong><span>{o.breed}</span><em>{(SEEDED_PREFS[o.name]?.play ? "Play Buddy · " : "") + (SEEDED_PREFS[o.name]?.adventure ? "Adventures" : "Quiet hangs")}</em></div></button>
              <button className={connected ? "pp-connbtn on" : "pp-connbtn"} onClick={() => onToggleFriend(o.name)}>{connected ? "Paw Friend" : "Add friend"}</button>
            </div>
          ); })}
        </section>
      )}

      {tab === "profile" && (dog.guest ? <GuestPanel kind="profile" onJoin={onJoin}/> : <>
        <div className="pp-siblingbar">
          <div className="pp-siblingbar-dogs">
            {members.map((m) => (
              <button
                key={m.name}
                className={members.length > 1 && whose === m.name ? "pp-chip on" : "pp-chip"}
                onClick={() => selectDog(m.name)}
              >
                {m.name}
              </button>
            ))}
            <button className="pp-chip pp-chip-add" onClick={onAddSibling}>+ Add sibling</button>
          </div>
          <button className="pp-siblingbar-link" onClick={onOpenHousehold}>
            {dog.pack
              ? `Planning for both — viewing ${whose}'s profile`
              : `Planning for ${dog.name} · Household & account ›`}
          </button>
        </div>
        <DogProfile subject={subject} avatarSrc={avatars?.[subject.name]} onSetAvatar={onSetAvatar} stamps={stamps} posts={posts} photos={allPhotos} onCompose={onCompose} pledged={pledged} bio={bios[subject.name]} bioLoading={bioLoading} onWriteBio={onWriteBio} onSaveBio={onSaveBio} prefs={pawPrefs[subject.name]} onTogglePref={onTogglePref} onOpenHousehold={onOpenHousehold} onAddSibling={onAddSibling} householdCount={members.length}/>
      </>)}

      {tab === "feed" && <>
        <section className="pp-feed-hero">
          <div><span className="pp-kicker">PawPrints</span><h3>What are the Paw Friends up to?</h3><p>Memories, invitations and adventures — not an endless popularity contest.</p></div>
          {!dog.guest && <button className="pp-purple pp-hero-post" onClick={onCompose}>Share a memory</button>}
        </section>
        <ul className="pp-feed">
          {feed.length === 0 && <li className="pp-empty"><p>Your PawFeed is quiet.</p><p className="pp-empty-sub">Add a few Paw Friends and their shared memories will appear here.</p></li>}
          {feed.map((p) => {
            const addedBarks=(comments[p.id] || []).filter((c) => c.added).length;
            return <li key={p.id} className={p.mine ? "pp-post mine" : "pp-post"}>
              <div className="pp-post-head"><Avatar name={p.dog} size={40} src={avatarFor(p.dog)} breed={breedOf(p.dog)}/><div><strong>{p.dog}</strong><span>{p.breed} · {p.when}</span></div>{p.mine && <span className="pp-mine-tag">{p.visibility === "only-me" ? "🔒 Only me" : p.visibility === "everyone" ? "🌎 Everyone" : "💜 Paw Friends"}</span>}</div>
              {allPhotos?.[p.id] ? (p.media === "video" ? <video src={allPhotos[p.id]} controls playsInline className="pp-post-media"/> : <img src={allPhotos[p.id]} alt="" className="pp-post-media"/>) : !p.mine ? <div className="pp-post-media pp-scenewrap"><SceneArt seed={p.id}/></div> : null}
              <p className="pp-post-body">{p.caption}</p>
              {p.trail && <div className="pp-post-trail"><PawMark color="#6D3DD1"/><div><strong>{p.trail}</strong><span>{p.miles} mi completed · via PawPark 🌲</span></div></div>}
              <div className="pp-post-acts">
                <button className={reactions[`${p.id}:paw`] ? "on" : ""} onClick={() => onReact(p.id, "paw")}>🐾 {p.paws + (reactions[`${p.id}:paw`] ? 1 : 0)} Paws</button>
                <button onClick={() => onOpenBarks(p)}>💬 {p.barks + addedBarks} Barks</button>
              </div>
            </li>;
          })}
        </ul>
      </>}
    </div>
  );
}

function AccountStep({ onNext, onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const ok = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;
  return (
    <div className="pp-setup pp-account-purple">
      <button className="pp-back" onClick={onBack}>‹ Back</button>
      <PawMark big color="#6D3DD1" />
      <h1 className="pp-setup-title">Create your Paw ID</h1>
      <p className="pp-setup-sub">Your account belongs to you. Each dog gets their own Paw profile underneath it.</p>
      <div className="pp-form">
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="What should PawPrints call you?" autoFocus /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
      </div>
      <button className="pp-purple" disabled={!ok} onClick={() => onNext({ name: name.trim(), email: email.trim() })}>Create account</button>
      <p className="pp-gate-foot">Prototype account — production authentication belongs in the backend.</p>
    </div>
  );
}

function SiblingPrompt({ dogs, avatars, onAdd, onSkip }) {
  const last = dogs[dogs.length - 1];
  return (
    <div className="pp-setup">
      <div className="pp-guest-emblem"><PawMark big /></div>
      <h1 className="pp-setup-title">{last?.name} is registered</h1>
      <p className="pp-setup-sub">
        {last?.id && <>Their ID is <strong className="pp-idinline">{last.id}</strong>. </>}
        Got another dog at home? Siblings live on the same account, each with their own profile — and you can plan for one or both.
      </p>

      <div className="pp-dogs">
        {dogs.map((d) => (
          <div key={d.name} className="pp-dogcard static">
            <Avatar name={d.name} size={46} src={avatars?.[d.name]} />
            <div>
              <strong>{d.name}</strong>
              <span>{d.breed}</span>
              <em className="pp-idinline">{d.id}</em>
            </div>
          </div>
        ))}
      </div>

      <button className="pp-primary" onClick={onAdd}>Add a sibling</button>
      <button className="pp-ghost" onClick={onSkip}>
        {dogs.length > 1 ? "Done — start planning" : "Not now"}
      </button>
    </div>
  );
}

function SiblingChoice({ onExisting, onNew, onBack }) {
  return (
    <div className="pp-setup">
      <button className="pp-back" onClick={onBack}>‹ Back</button>
      <h1 className="pp-setup-title">Add a sibling</h1>
      <p className="pp-setup-sub">Already registered somewhere, or brand new to PawPark?</p>

      <button className="pp-gatecard" onClick={onExisting}>
        <div className="pp-gate-mark"><PawMark /></div>
        <div>
          <strong>Existing profile</strong>
          <span>They already have a Paw ID — a partner, a co-owner, or a rescue registered them. Link it to your account.</span>
        </div>
      </button>

      <button className="pp-gatecard primary" onClick={onNew}>
        <div className="pp-gate-mark"><PawMark /></div>
        <div>
          <strong>New sibling</strong>
          <span>Build their profile now. Six questions, same as the first.</span>
        </div>
      </button>
    </div>
  );
}

function LinkExisting({ owner, taken, onLink, onBack }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [err, setErr] = useState("");

  const lookup = () => {
    const key = code.trim().toUpperCase();
    const hit = REGISTRY[key];
    if (!hit) return setErr("No dog found with that ID. Check the code and try again.");
    if (taken.includes(key)) return setErr("That dog is already on this account.");
    setErr("");
    setFound(hit);
  };

  return (
    <div className="pp-setup">
      <button className="pp-back" onClick={onBack}>‹ Back</button>
      <h1 className="pp-setup-title">Link an existing dog</h1>
      <p className="pp-setup-sub">
        Enter their Paw ID. Their profile comes across as-is — you don't rebuild it.
      </p>

      <div className="pp-form">
        <label>
          Paw ID
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setFound(null); setErr(""); }}
            placeholder="MIL-8T3R"
            autoFocus
          />
        </label>
      </div>

      {!found && (
        <button className="pp-primary" disabled={!code.trim()} onClick={lookup}>
          Find profile
        </button>
      )}
      {err && <p className="pp-error">{err}</p>}

      {found && (
        <div className="pp-found">
          <div className="pp-dogcard static">
            <Avatar name={found.name} size={48} />
            <div>
              <strong>{found.name}</strong>
              <span>{found.breed} · {found.age} · {found.energy}</span>
              <em className="pp-idinline">{found.id}</em>
            </div>
          </div>
          <p className="pp-foundnote">
            Registered by {found.registeredBy}. Linking sends them a confirmation — in a live build the other owner approves before the profile joins {owner?.email || "your account"}.
          </p>
          <button className="pp-primary" onClick={() => onLink(found)}>
            Link {found.name} as a sibling
          </button>
        </div>
      )}

      <p className="pp-gate-foot">Demo IDs: MIL-8T3R · COO-2X9F · JUN-6P1W</p>
    </div>
  );
}

function AccountMenu({ dogs, owner, avatars, activeId, isGuest, onSwitch, onHousehold, onAddSibling, onLogOut, onClose }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="pp-scrim pp-sheet-scrim" onClick={onClose}>
      <div className="pp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-sheet-grip" />

        {isGuest ? (
          <p className="pp-sheet-owner">Browsing as PawGuest — nothing is saved.</p>
        ) : (
          <p className="pp-sheet-owner">{owner?.email || "Your account"}</p>
        )}

        {!isGuest && dogs.length > 0 && (
          <>
            <p className="pp-grouplabel">Planning for</p>
            <div className="pp-sheet-dogs">
              {dogs.map((d) => (
                <button
                  key={d.name}
                  className={activeId === d.name ? "pp-sheet-dog on" : "pp-sheet-dog"}
                  onClick={() => onSwitch(d.name)}
                >
                  <Avatar name={d.name} size={38} src={avatars?.[d.name]} />
                  <span>
                    <strong>{d.name}</strong>
                    <em>{d.breed}</em>
                  </span>
                  {activeId === d.name && <span className="pp-sheet-tick">✓</span>}
                </button>
              ))}
              {dogs.length > 1 && (
                <button
                  className={activeId === "__pack__" ? "pp-sheet-dog on" : "pp-sheet-dog"}
                  onClick={() => onSwitch("__pack__")}
                >
                  <span className="pp-sheet-pack">🐾</span>
                  <span>
                    <strong>Both together</strong>
                    <em>Match trails that work for every dog</em>
                  </span>
                  {activeId === "__pack__" && <span className="pp-sheet-tick">✓</span>}
                </button>
              )}
            </div>
          </>
        )}

        <div className="pp-sheet-actions">
          {!isGuest && (
            <>
              <button onClick={onAddSibling}>Add a sibling</button>
              <button onClick={onHousehold}>Household &amp; account</button>
            </>
          )}
          {confirming ? (
            <div className="pp-sheet-confirm">
              <p>
                {isGuest
                  ? "Leaving guest mode clears this session."
                  : "Your dogs and adventures stay saved on this device."}
              </p>
              <button className="pp-danger" onClick={onLogOut}>
                {isGuest ? "Leave guest mode" : "Log out"}
              </button>
              <button className="pp-ghost" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          ) : (
            <button className="pp-sheet-logout" onClick={() => setConfirming(true)}>
              {isGuest ? "Leave guest mode" : "Log out"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Landing animation: a flat, chunky puppy ambles after a butterfly, leaving
   prints behind. Deliberately slow — an amble, not a run. */
function WalkingDog() {
  const prints = [26, 64, 102, 140, 178, 216, 254, 292];
  return (
    <svg className="pp-walk" viewBox="0 0 320 104" role="img" aria-label="A playful puppy bouncing under a butterfly and leaving paw prints">
      <line className="pp-walk-ground" x1="0" y1="92" x2="320" y2="92" />

      {prints.map((x, i) => (
        <g
          key={x}
          className="pp-walk-print"
          style={{ animationDelay: `${1.45 + i * 0.82}s` }}
          transform={`translate(${x} ${i % 2 ? 84 : 77}) scale(0.34)`}
        >
          <ellipse cx="16" cy="21" rx="7.5" ry="6.5" />
          <circle cx="7.5" cy="12.5" r="3.4" />
          <circle cx="13" cy="8" r="3.4" />
          <circle cx="19" cy="8" r="3.4" />
          <circle cx="24.5" cy="12.5" r="3.4" />
        </g>
      ))}

      <g className="pp-fly">
        <g className="pp-flutter">
          <g className="pp-wing left">
            <ellipse className="pp-wing-shape" cx="-4" cy="-3" rx="5" ry="6.5" />
            <ellipse className="pp-wing-shape" cx="-3.5" cy="3" rx="4" ry="4.5" />
          </g>
          <g className="pp-wing right">
            <ellipse className="pp-wing-shape" cx="4" cy="-3" rx="5" ry="6.5" />
            <ellipse className="pp-wing-shape" cx="3.5" cy="3" rx="4" ry="4.5" />
          </g>
          <ellipse className="pp-fly-body" cx="0" cy="0" rx="1.5" ry="6" />
        </g>
      </g>

      <g className="pp-walk-dog">
        <ellipse className="pp-shadow" cx="52" cy="90" rx="31" ry="5.5" />
        <g className="pp-pup-bounce">
          <g className="pp-pup-body">
            <g className="pp-tail-g"><path className="pp-tail-shape" d="M22 56 Q9 48 14 34" /></g>

            <g className="pp-leg-g pp-back-leg"><rect className="pp-leg-far" x="29" y="62" width="9" height="21" rx="4.5" /></g>
            <g className="pp-leg-g alt pp-back-leg"><rect className="pp-leg-far" x="59" y="62" width="9" height="21" rx="4.5" /></g>

            <ellipse className="pp-fill" cx="52" cy="56" rx="33" ry="18" />
            <ellipse className="pp-belly" cx="50" cy="61" rx="17" ry="10" />

            <g className="pp-leg-g pp-front-leg"><rect className="pp-fill" x="39" y="62" width="10" height="22" rx="5" /></g>
            <g className="pp-front-pawlift"><rect className="pp-fill" x="69" y="54" width="10" height="20" rx="5" /></g>

            <g className="pp-head">
              <rect className="pp-fill" x="60" y="32" width="16" height="20" rx="8" />
              <circle className="pp-fill" cx="78" cy="36" r="16" />
              <ellipse className="pp-fill" cx="92" cy="40" rx="8.5" ry="6.8" />
              <circle className="pp-nose-dot" cx="97" cy="37.5" r="2.4" />
              <circle className="pp-nose-dot" cx="81" cy="33" r="2.2" />
              <path className="pp-mouth" d="M88 45 Q92 48 95 45" />
              <path className="pp-ear-shape" d="M67 25 Q57 27 58 40 Q60 50 71 44 Z" />
              <circle className="pp-cheek" cx="86" cy="43" r="2.4" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function Gate({ onGuest, onMember, savedOwner, savedDogs, savedAvatars, onResume }) {
  return (
    <div className="pp-gate pp-gate-book">
      <PawMark big color="#6D3DD1" />
      <h1 className="pp-setup-title pp-prints-logo">PawPrints</h1>
      <WalkingDog />
      <p className="pp-setup-sub">Your dog's world. Paw Friends, memories, trusted help — and adventures through PawPark.</p>
      {savedDogs?.length > 0 && (
        <button className="pp-gatecard resume" onClick={onResume}>
          <div className="pp-stack">
            {savedDogs.slice(0, 3).map((d) => (
              <Avatar key={d.name} name={d.name} size={40} src={savedAvatars?.[d.name]} />
            ))}
          </div>
          <div>
            <strong>Welcome back</strong>
            <span>
              Continue as {savedDogs.map((d) => d.name).join(" & ")}
              {savedOwner?.email ? ` · ${savedOwner.email}` : ""}
            </span>
          </div>
        </button>
      )}

      <button className="pp-gatecard book-primary" onClick={onMember}>
        <div className="pp-gate-mark book"><PawMark color="#6D3DD1" /></div>
        <div><strong>Create a Paw ID</strong><span>Meet your best friend, build their profile and join the Paw community.</span></div>
      </button>
      <div className="pp-two-worlds"><span>💜 PawPrints · Connect</span><span>🌲 PawPark · Adventure</span></div>
      <button className="pp-gatecard" onClick={onGuest}>
        <div className="pp-gate-mark ghost"><PawMark /></div>
        <div><strong>Explore PawPark as a guest</strong><span>Browse dog-friendly trails and conditions without creating an account.</span></div>
      </button>
      <p className="pp-gate-foot">Two worlds. One Paw community.</p>
    </div>
  );
}

function GuestPanel({ kind, onJoin }) {
  const copy =
    kind === "passport"
      ? {
          title: "The passport needs prints",
          body: "Stamps are tied to a dog. Create a Paw ID and every trail you finish gets pressed in here.",
        }
      : {
          title: "You're browsing as a guest",
          body: "Matches right now assume an average adult dog. Add your dog's coat, age, joints and off-leash behavior and the rankings change — sometimes a lot.",
        };
  return (
    <div className="pp-guestpanel">
      <div className="pp-guest-emblem"><PawMark big /></div>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <button className="pp-primary" onClick={onJoin}>Create a Paw ID</button>
    </div>
  );
}

function UpgradeModal({ trail, onJoin, onClose }) {
  return (
    <div className="pp-scrim" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pp-guest-emblem"><PawMark big /></div>
        <h3>Keep this one</h3>
        <p className="pp-modal-sub">
          {trail ? `${trail.name} would be your first stamp.` : "This would be your first stamp."} Guests leave no prints — create a Paw ID and it stays.
        </p>
        <button className="pp-primary" onClick={onJoin}>Create a Paw ID</button>
        <button className="pp-ghost" onClick={onClose}>Keep browsing</button>
      </div>
    </div>
  );
}

function Setup({ onPick, onBackToGate, sibling, editing = false, initialDog = null, initialAvatar = null, onDelete = null, onMemorial = null }) {
  const [step, setStep] = useState(0);
  const [samples, setSamples] = useState(false);
  const [d, setD] = useState(
    initialDog || {
      name: "", breed: "", age: "", size: "", coat: "", heat: "",
      energy: "", water: "", joints: "", social: "",
    }
  );
  const [avatar, setAvatar] = useState(initialAvatar || null);

  useEffect(() => {
    if (initialDog) setD(initialDog);
    if (typeof initialAvatar !== "undefined") setAvatar(initialAvatar || null);
  }, [initialDog, initialAvatar]);

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  const finish = () =>
    onPick(
      { ...d, name: d.name.trim(), breed: d.breed.trim(), quirk: d.quirk || (editing ? "Updated profile" : "Freshly registered") },
      avatar
    );

  if (editing) {
    const detailGroups = STEPS.filter((x) => x.groups).flatMap((x) => x.groups);
    const ready = d.name.trim() && d.breed.trim() && detailGroups.every((g) => d[g.name]);

    return (
      <div className="pp-setup pp-edit-profile">
        <button className="pp-back" onClick={onBackToGate}>‹ Back to profiles</button>
        <h1 className="pp-setup-title">Edit {initialDog?.name || "profile"}</h1>
        <p className="pp-setup-sub">
          Change the details below and save once. PawPrints memories and PawPassport history stay linked.
        </p>

        <div className="pp-form">
          <div className="pp-setupav">
            <AvatarPicker
              name={d.name || "?"}
              src={avatar}
              size={78}
              onPick={setAvatar}
              label="Add a photo (optional)"
            />
          </div>

          <label>
            Name
            <input value={d.name} disabled />
            <small className="pp-fieldnote">Name is kept stable in this prototype so existing memories stay linked.</small>
          </label>

          <label>
            Breed or mix
            <input
              value={d.breed}
              onChange={(e) => set("breed", e.target.value)}
              placeholder="Golden Retriever, or Shepherd mix"
            />
          </label>
        </div>

        {detailGroups.map((g) => (
          <div key={g.name} className="pp-group">
            <p className="pp-grouplabel">{g.label}</p>
            <div className="pp-chips">
              {g.options.map((o) => (
                <button
                  type="button"
                  key={o}
                  className={d[g.name] === o ? "pp-chip on" : "pp-chip"}
                  onClick={() => set(g.name, o)}
                  aria-pressed={d[g.name] === o}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="pp-primary pp-next" disabled={!ready} onClick={finish}>
          Save changes
        </button>

        <div className="pp-edit-actions">
          <button type="button" className="pp-softbtn" onClick={onMemorial}>
            {d.memorial ? "Remove In Memory status" : "Mark In Memory 🌈"}
          </button>
          <button type="button" className="pp-dangerlink" onClick={onDelete}>
            Delete profile
          </button>
        </div>

        <p className="pp-memorial-help">
          In Memory keeps the profile, photos, posts and PawPassport as a remembrance. Delete is for accidental or duplicate profiles.
        </p>
      </div>
    );
  }

  if (samples) {
    return (
      <div className="pp-setup">
        <button className="pp-back" onClick={() => setSamples(false)}>‹ Back to profile</button>
        <h1 className="pp-setup-title">Borrow a dog</h1>
        <p className="pp-setup-sub">Four profiles that pull the matching in different directions.</p>
        <div className="pp-dogs">
          {DEMO_DOGS.map((sample) => (
            <button key={sample.name} className="pp-dogcard" onClick={() => onPick(sample)}>
              <Avatar name={sample.name} size={52} />
              <div>
                <strong>{sample.name}</strong>
                <span>{sample.breed} · {sample.age} · {sample.energy}</span>
                <em>{sample.quirk}</em>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const cur = STEPS[step];
  const last = step === STEPS.length - 1;
  const ready =
    cur.fields === "text"
      ? d.name.trim() && d.breed.trim()
      : cur.groups.every((g) => d[g.name]);

  return (
    <div className="pp-setup">
      <div className="pp-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((st, i) => (
          <span key={st.key} className={i <= step ? "on" : ""} />
        ))}
      </div>

      {step === 0 ? (
        onBackToGate ? (
          <button className="pp-back" onClick={onBackToGate}>‹ Back</button>
        ) : (
          <PawMark big />
        )
      ) : (
        <button className="pp-back" onClick={() => setStep(step - 1)}>‹ Back</button>
      )}

      <h1 className="pp-setup-title">{step === 0 && sibling ? "Who's the sibling?" : cur.title}</h1>
      {step === 0 && sibling ? (
        <p className="pp-setup-sub">
          Their own profile, separate from the first. You'll be able to plan for either one alone or both together.
        </p>
      ) : (
        cur.sub && <p className="pp-setup-sub">{cur.sub}</p>
      )}

      {cur.fields === "text" ? (
        <div className="pp-form">
          <div className="pp-setupav">
            <AvatarPicker
              name={d.name || "?"}
              src={avatar}
              size={78}
              onPick={setAvatar}
              label="Add a photo (optional)"
            />
          </div>
          <label>
            Name
            <input
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Bella"
              autoFocus
            />
          </label>
          <label>
            Breed or mix
            <input
              value={d.breed}
              onChange={(e) => set("breed", e.target.value)}
              placeholder="Golden Retriever, or Shepherd mix"
            />
          </label>
        </div>
      ) : (
        cur.groups.map((g) => (
          <div key={g.name} className="pp-group">
            <p className="pp-grouplabel">{g.label}</p>
            <div className="pp-chips">
              {g.options.map((o) => (
                <button
                  key={o}
                  className={d[g.name] === o ? "pp-chip on" : "pp-chip"}
                  onClick={() => set(g.name, o)}
                  aria-pressed={d[g.name] === o}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <button
        className="pp-primary pp-next"
        disabled={!ready}
        onClick={() => (last ? finish() : setStep(step + 1))}
      >
        {last ? `Build ${d.name || "the"} profile` : "Continue"}
      </button>

      {step === 0 && (
        <button className="pp-ghost" onClick={() => setSamples(true)}>
          Just show me a sample dog
        </button>
      )}
    </div>
  );
}

/* -------------------------------- trail list ------------------------------- */

function TrailList({ dog, dogs, activeId, onSwitch, days, plan, onPlan, weather, weatherFailed, matches, matching, error, stamps, onMatch, onOpen }) {
  const adventureDogs = (dogs || []).filter((d) => !d.memorial);

  if (dog?.memorial) {
    return (
      <div className="pp-memorial-panel">
        <div className="pp-memorial-rainbow">🌈</div>
        <h2>{dog.name} is In Memory</h2>
        <p>
          {dog.name}'s PawPassport and past adventures stay with you. New trail planning is paused for this profile.
        </p>
        {adventureDogs.length > 0 && (
          <>
            <p className="pp-grouplabel">Plan for another dog</p>
            <div className="pp-chips">
              {adventureDogs.map((d) => (
                <button key={d.name} className="pp-chip" onClick={() => onSwitch(d.name)}>
                  {d.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const list = matches
    ? [...TRAILS].sort((a, b) => (matches[b.id]?.score || 0) - (matches[a.id]?.score || 0))
    : TRAILS;

  return (
    <>
      {adventureDogs.length > 1 && (
        <section className="pp-who">
          <p className="pp-grouplabel">Who's coming?</p>
          <div className="pp-chips">
            {adventureDogs.map((d) => (
              <button
                key={d.name}
                className={activeId === d.name ? "pp-chip on" : "pp-chip"}
                onClick={() => onSwitch(d.name)}
              >
                {d.name}
              </button>
            ))}
            <button
              className={activeId === "__pack__" ? "pp-chip on pp-chip-pack" : "pp-chip pp-chip-pack"}
              onClick={() => onSwitch("__pack__")}
            >
              Both together
            </button>
          </div>
        </section>
      )}

      <section className="pp-planner">
        <h2 className="pp-plan-title">When are you two heading out?</h2>

        <p className="pp-grouplabel">Day</p>
        <div className="pp-chips">
          {days.map((d) => (
            <button
              key={d.iso}
              className={plan.iso === d.iso ? "pp-chip on" : "pp-chip"}
              onClick={() => onPlan({ iso: d.iso, label: d.label })}
            >
              {d.label} <em className="pp-chipsub">{d.short}</em>
            </button>
          ))}
        </div>

        <p className="pp-grouplabel">Time of day</p>
        <div className="pp-chips">
          {TIME_SLOTS.map((s) => (
            <button
              key={s.key}
              className={plan.slot === s.key ? "pp-chip on" : "pp-chip"}
              onClick={() => onPlan({ slot: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button className="pp-primary pp-next" onClick={onMatch} disabled={matching}>
          {matching ? "Checking the forecast…" : dog.guest ? "Find trails for this outing" : `Find trails for ${dog.name}`}
        </button>

        {weatherFailed && (
          <p className="pp-warn">
            The forecast didn't load, so these matches use trail conditions only. Treat the heat guidance as generic.
          </p>
        )}
        {error && <p className="pp-error">{error} <button onClick={onMatch}>Retry</button></p>}
      </section>

      {matching && <Spinner label={`Pulling ${plan.label.toLowerCase()}'s forecast for eight trailheads`} />}

      {matches && (
        <p className="pp-matchnote">
          {dog.guest ? "Ranked for an average adult dog" : `Ranked for ${dog.name}`}, {plan.label.toLowerCase()} {TIME_SLOTS.find((s) => s.key === plan.slot)?.note}.
          {dog.guest && <em className="pp-inline-cta"> Add your dog to change this.</em>}
        </p>
      )}

      <ul className="pp-trails">
        {list.map((t) => {
          const m = matches?.[t.id];
          const w = weather?.[t.id];
          const risk = pawRisk(w, t);
          const done = stamps.some((s) => s.id === t.id);
          return (
            <li key={t.id}>
              <button className="pp-trail" onClick={() => onOpen(t.id)}>
                <div className="pp-trail-head">
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.area}</span>
                  </div>
                  {m ? <Score value={m.score} /> : <span className="pp-chev">›</span>}
                </div>

                {w && (
                  <div className="pp-wx">
                    <span className="pp-wx-temp">{w.temp}°</span>
                    <span>feels {w.feels}°</span>
                    <span>UV {w.uv}</span>
                    {w.rain > 15 && <span>{w.rain}% rain</span>}
                    {risk && (
                      <span className="pp-wx-risk" style={{ color: risk.tone, borderColor: risk.tone }}>
                        {risk.band} paw risk
                      </span>
                    )}
                  </div>
                )}

                <div className="pp-facts">
                  <span>{t.miles} mi</span>
                  <span>{t.difficulty}</span>
                  <span>{t.leash}</span>
                  {done && <span className="pp-done">Stamped</span>}
                </div>

                {m && (
                  <p className="pp-why">
                    {m.why}
                    <em>
                      Watch: {m.watch}
                      {m.limiter && m.limiter !== "Both fine" && (
                        <span className="pp-limiter">Limited by {m.limiter}</span>
                      )}
                    </em>
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ProfileScreen({ dogs, owner, avatars, onSetAvatar, stamps, onEdit, onAdd }) {
  const rowsFor = (d) =>
    [
      ["Breed", d.breed], ["Age", d.age], ["Size", d.size], ["Coat", d.coat],
      ["Warm weather", d.heat], ["Energy", d.energy], ["Around water", d.water],
      ["Mobility", d.joints], ["Other dogs", d.social],
    ].filter(([, v]) => v);

  return (
    <div className="pp-profile">
      <div className="pp-pp-head">
        <div className="pp-stack">
          {dogs.map((d) => <Avatar key={d.name} name={d.name} size={46} src={avatars?.[d.name]} />)}
        </div>
        <div>
          <strong>{dogs.map((d) => d.name).join(" & ")}</strong>
          <span>
            {dogs.length > 1 ? "Siblings, same household · " : ""}
            {stamps.length} trail{stamps.length === 1 ? "" : "s"} logged
          </span>
        </div>
      </div>

      <p className="pp-matchnote">
        {owner?.email && <>Account: <strong>{owner.email}</strong>. </>}
        {dogs.length > 1
          ? "Each sibling has their own profile and ID under this account. Plan for either one alone, or both together — the matching changes."
          : "Every match and brief is built from these answers."}
      </p>

      {dogs.map((d) => (
        <section key={d.name} className="pp-dogsection">
          <div className="pp-dogsection-head">
            <AvatarPicker
              name={d.name}
              src={avatars?.[d.name]}
              size={40}
              onPick={(url) => onSetAvatar(d.name, url)}
            />
            <div>
              <strong>{d.name} {d.memorial && <span className="pp-memorial-badge">In Memory 🌈</span>}</strong>
              <em className="pp-idinline">{d.id}</em>
            </div>
            <button className="pp-editlink" onClick={() => onEdit(d.name)}>Edit</button>
          </div>
          <dl className="pp-briefrows">
            {rowsFor(d).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>
      ))}

      <button className="pp-primary pp-addsib" onClick={onAdd}>
        {dogs.length > 1 ? "Add another dog" : "Add a sibling"}
      </button>
    </div>
  );
}

function Score({ value }) {
  const tone = value >= 75 ? "#2F5D3A" : value >= 50 ? "#B4622C" : "#8A4A4A";
  return (
    <div className="pp-score" style={{ color: tone, borderColor: tone }}>
      <strong>{value}</strong>
      <span>fit</span>
    </div>
  );
}

/* ------------------------------- trail detail ------------------------------ */

function TrailDetail({ trail, dog, plan, weather, risk, match, brief, loading, stamped, onLoadBrief, onStamp, onBack }) {
  const asked = useRef(false);
  useEffect(() => {
    if (!asked.current) {
      asked.current = true;
      onLoadBrief();
    }
  }, [onLoadBrief]);

  const rows = brief && !brief.error
    ? [
        ["Paws and surface", brief.paws],
        ["Water plan", brief.hydration],
        ["Leash and etiquette", brief.rules],
        ["Wildlife", brief.wildlife],
        ["Turn around when", brief.turnaround],
      ]
    : [];

  return (
    <div className="pp-detail">
      <button className="pp-back" onClick={onBack}>‹ All trails</button>

      <div className="pp-hero" style={{ background: `linear-gradient(155deg, ${inkFor(trail.name)}, #1D3B27)` }}>
        <h2>{trail.name}</h2>
        <p>{trail.area}</p>
        {match && (
          <div className="pp-hero-score">
            {match.score} {dog.guest ? "general fit" : `fit for ${dog.name}`}
          </div>
        )}
      </div>

      {weather && (
        <div className="pp-wxbar">
          <div>
            <strong>{weather.temp}°</strong>
            <span>{plan.label}, {TIME_SLOTS.find((s) => s.key === plan.slot)?.note}</span>
          </div>
          <div className="pp-wxbar-meta">
            <span>Feels {weather.feels}°</span>
            <span>UV {weather.uv}</span>
            <span>Wind {weather.wind} mph</span>
            {risk && <span style={{ color: risk.tone, fontWeight: 700 }}>{risk.band} paw risk</span>}
          </div>
        </div>
      )}

      <dl className="pp-specs">
        <div><dt>Distance</dt><dd>{trail.miles} mi</dd></div>
        <div><dt>Difficulty</dt><dd>{trail.difficulty}</dd></div>
        <div><dt>Gain</dt><dd>{trail.elevation} ft</dd></div>
        <div><dt>Surface</dt><dd>{trail.surface}</dd></div>
        <div><dt>Shade</dt><dd>{trail.shade}</dd></div>
        <div><dt>Leash</dt><dd>{trail.leash}</dd></div>
      </dl>

      <section className="pp-brief">
        <h3>{dog.guest ? "Brief for this outing" : `Brief for ${dog.name}`}</h3>
        {loading && !brief && <Spinner label="Checking this trail against your dog" />}
        {brief?.error && <p className="pp-error">The brief didn't load. Go back and reopen the trail.</p>}
        {brief && !brief.error && (
          <>
            <p className="pp-verdict">{brief.verdict}</p>
            <dl className="pp-briefrows">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <button className="pp-primary pp-stampbtn" onClick={onStamp} disabled={stamped}>
        {stamped ? "Already stamped" : dog.guest ? "Stamp this trail" : "Stamp the PawPassport"}
      </button>
    </div>
  );
}

/* --------------------------------- passport -------------------------------- */

function Passport({ dog, avatars, stamps, miles, parks, pledged, onPledge }) {
  return (
    <div className="pp-passport">
      <div className="pp-pp-head">
        <Avatar name={dog.name} size={56} src={avatars?.[dog.pack ? dog.members[0].name : dog.name]} />
        <div>
          <strong>{dog.name}'s PawPassport</strong>
          <span>{dog.breed}</span>
        </div>
      </div>

      <div className="pp-stats">
        <div><strong>{parks}</strong><span>Areas</span></div>
        <div><strong>{stamps.length}</strong><span>Trails</span></div>
        <div><strong>{miles.toFixed(1)}</strong><span>Miles</span></div>
      </div>

      {pledged ? (
        <div className="pp-ranger on">
          <RangerBadge />
          <div>
            <strong>B.A.R.K. Ranger</strong>
            <span>{dog.name} took the pledge.</span>
          </div>
        </div>
      ) : (
        <button className="pp-ranger" onClick={onPledge}>
          <RangerBadge muted />
          <div>
            <strong>Become a B.A.R.K. Ranger</strong>
            <span>Four rules that keep these trails open to dogs.</span>
          </div>
        </button>
      )}

      {stamps.length === 0 ? (
        <div className="pp-empty">
          <p>No stamps yet.</p>
          <p className="pp-empty-sub">Finish a trail and it gets pressed in here.</p>
        </div>
      ) : (
        <div className="pp-stamps">
          {stamps.map((s, i) => <Stamp key={s.id + i} stamp={s} index={i} />)}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- modals ---------------------------------- */

function MemoryModal({ memory, dog, onShare, onClose }) {
  const [shared, setShared] = useState(false);
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState(null);
  const [rewriting, setRewriting] = useState(false);
  const [visibility, setVisibility] = useState("friends");
  const text = caption ?? memory.caption;

  const recaption = async (m) => {
    setMedia(m);
    if (m.kind !== "image") return;
    setRewriting(true);
    try { const c = await captionFromPhoto(m.url, dogLine(dog), `Just finished ${memory.trail.name}, ${memory.trail.miles} miles.`); if (c) setCaption(c); } catch {}
    setRewriting(false);
  };

  return (
    <div className="pp-scrim" onClick={onClose}><div className="pp-modal" onClick={(e) => e.stopPropagation()}>
      <div className="pp-stamped-in"><Stamp stamp={{ name: memory.trail.name, area: memory.trail.area, miles: memory.trail.miles, date: "TODAY" }} index={3}/></div>
      <h3>Adventure complete! 🎉</h3><p className="pp-modal-sub">Save this day to {dog.name}'s PawPrints.</p>
      {!shared && <MediaPicker media={media} onPick={recaption} onClear={() => { setMedia(null); setCaption(null); }} label="Add a favorite photo or video"/>}
      <div className="pp-memcard">{rewriting ? <p className="pp-dim">Looking at your photo…</p> : text ? <p>{text}</p> : <p className="pp-dim">Writing the caption…</p>}</div>
      <VisibilityPicker value={visibility} onChange={setVisibility}/>
      <button className="pp-purple" disabled={!text || shared || rewriting} onClick={() => { onShare(text, media, visibility); setShared(true); }}>{shared ? "Saved to PawPrints" : visibility === "only-me" ? "Save privately" : "Save to PawPrints"}</button>
      <button className="pp-ghost" onClick={onClose}>Back to PawPassport</button>
    </div></div>
  );
}

function Composer({ dog, onPost, onClose }) {
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [writing, setWriting] = useState(false);
  const [visibility, setVisibility] = useState("friends");
  const suggest = async () => { if (!media || media.kind !== "image") return; setWriting(true); try { const c=await captionFromPhoto(media.url, dogLine(dog), "An everyday PawPrints memory."); if(c) setCaption(c); } catch {} setWriting(false); };
  return (
    <div className="pp-scrim" onClick={onClose}><div className="pp-modal" onClick={(e) => e.stopPropagation()}>
      <h3>Share a PawPrints memory</h3><p className="pp-modal-sub">A photo, video or little moment from life with {dog.name}.</p>
      <MediaPicker media={media} onPick={setMedia} onClear={() => setMedia(null)}/>
      <div className="pp-form"><label>What happened?<textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Funny, memorable, ordinary — it is your PawPrints."/></label></div>
      {media?.kind === "image" && <button className="pp-ghost pp-suggest" onClick={suggest} disabled={writing}>{writing ? "Looking at the photo…" : "✨ Help me caption it"}</button>}
      <VisibilityPicker value={visibility} onChange={setVisibility}/>
      <button className="pp-purple" disabled={!caption.trim() || writing} onClick={() => onPost(caption.trim(), media, visibility)}>Save to PawPrints</button>
      <button className="pp-ghost" onClick={onClose}>Cancel</button>
    </div></div>
  );
}

function VisibilityPicker({ value, onChange }) {
  const opts = [
    ["only-me", "🔒", "Only Me", "Keep this memory private"],
    ["friends", "💜", "Paw Friends", "Share with your trusted Paw Friends"],
    ["everyone", "🌎", "Everyone", "Visible to the PawPrints community"],
  ];
  return <div className="pp-visibility"><p className="pp-grouplabel">Who can see this?</p>{opts.map(([key,icon,title,sub]) => <button key={key} className={value===key ? "on" : ""} onClick={() => onChange(key)}><span>{icon}</span><div><strong>{title}</strong><small>{sub}</small></div><b>{value===key ? "●" : "○"}</b></button>)}</div>;
}

function BarkModal({ post, dog, comments, onAdd, onClose }) {
  const [text, setText] = useState("");
  return <div className="pp-scrim" onClick={onClose}><div className="pp-modal pp-bark-modal" onClick={(e) => e.stopPropagation()}>
    <h3>Barks 💬</h3><p className="pp-modal-sub">What are the Paw Friends saying to {post.dog}?</p>
    <div className="pp-bark-list">{comments.length ? comments.map((c,i) => <div className="pp-bark-row" key={`${c.dog}-${i}`}><Avatar name={c.dog} size={34} breed={DEMO_DOGS.find((d)=>d.name===c.dog)?.breed}/><div><strong>{c.dog}</strong><p>{c.text}</p><span>{c.when}</span></div></div>) : <p className="pp-empty-sub">No Barks yet. Be the first Paw Friend to say woof.</p>}</div>
    <div className="pp-bark-compose"><Avatar name={dog.name} size={34}/><input value={text} onChange={(e)=>setText(e.target.value)} placeholder={`What does ${dog.name} want to bark?`}/><button disabled={!text.trim()} onClick={() => { onAdd(text); setText(""); }}>➤</button></div>
    <button className="pp-ghost" onClick={onClose}>Close</button>
  </div></div>;
}

function InvitationComposer({ dog, initialType, onCreate, onClose }) {
  const [type, setType] = useState(initialType || "play");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [audience, setAudience] = useState(type === "sleepover" || type === "host" ? "Paw Friends" : "Paw Friends");
  const meta = PAW_TOGETHER_TYPES[type];
  const ok = date && note.trim() && (type === "sleepover" || type === "host" || location.trim());
  return <div className="pp-scrim" onClick={onClose}><div className="pp-modal" onClick={(e)=>e.stopPropagation()}>
    <h3>{meta.icon} {meta.title}</h3><p className="pp-modal-sub">A friendly invitation, never a booking or transaction.</p>
    <div className="pp-chips pp-invite-types">{Object.entries(PAW_TOGETHER_TYPES).map(([k,m]) => <button key={k} className={type===k ? "pp-chip on purple" : "pp-chip"} onClick={()=>setType(k)}>{m.icon} {m.short}</button>)}</div>
    <div className="pp-form"><div className="pp-row"><label>Date<input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={(e)=>setTime(e.target.value)}/></label></div>
      {(type === "play" || type === "adventure") && <label>Where?<input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Park, trailhead or meetup spot"/></label>}
      <label>Your note<textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} placeholder={type === "sleepover" ? `${dog.name} is looking for a trusted Paw Friend home this weekend…` : `Tell Paw Friends what you have in mind…`}/></label>
      <label>Who can see it?<select value={audience} onChange={(e)=>setAudience(e.target.value)}><option>Paw Friends</option>{type !== "sleepover" && type !== "host" && <option>Everyone</option>}</select></label>
    </div>
    {(type === "sleepover" || type === "host") && <p className="pp-safety-note">🔒 Home and sleepover invitations stay inside your Paw Friends circle.</p>}
    <button className="pp-purple" disabled={!ok} onClick={()=>onCreate({ type, date, time, location: location || "Shared privately after acceptance", note: note.trim(), audience, when: `${date}${time ? ` · ${time}` : ""}` })}>Post invitation</button>
    <button className="pp-ghost" onClick={onClose}>Cancel</button>
  </div></div>;
}

function PawTogether({ dog, invitations, avatars, onSniff, onCreate, onRespond, onJoin }) {
  const [tab, setTab] = useState("community");
  if (dog.guest) return <GuestPanel kind="profile" onJoin={onJoin}/>;
  if (dog.memorial) {
    return (
      <div className="pp-memorial-panel">
        <div className="pp-memorial-rainbow">🌈</div>
        <h2>{dog.name} is In Memory</h2>
        <p>Past friendships and memories remain part of PawPrints. New play, adventure, sleepover and hosting invitations are paused for this profile.</p>
      </div>
    );
  }
  const community = invitations.filter((i)=>!i.mine);
  const mine = invitations.filter((i)=>i.mine);
  const cards = tab === "mine" ? mine : community;
  return <div className="pp-together-page">
    <div className="pp-prints-head"><h2>Paw Together</h2><p>Paw Friends do more than follow each other. They actually show up. 💜</p></div>
    <div className="pp-action-grid">{Object.entries(PAW_TOGETHER_TYPES).map(([key,m]) => <button key={key} onClick={()=>onCreate(key)}><span>{m.icon}</span><strong>{m.title}</strong><small>{key === "sleepover" ? "Ask trusted friends for a cozy stay" : key === "host" ? "Let Paw Friends know you can help" : key === "adventure" ? "Invite friends to explore together" : "Put out a friendly play invitation"}</small></button>)}</div>
    <div className="pp-sniff-explain">👃 <strong>Sniff = I'm interested.</strong> It starts a conversation — it never commits anyone.</div>
    <div className="pp-seg"><button className={tab==="community"?"on":""} onClick={()=>setTab("community")}>Community invitations</button><button className={tab==="mine"?"on":""} onClick={()=>setTab("mine")}>My invitations {mine.length ? <em className="pp-segcount">{mine.length}</em>:null}</button></div>
    <div className="pp-invite-list">
      {!cards.length && <div className="pp-empty"><p>No invitations yet.</p><p className="pp-empty-sub">Post one when {dog.name} wants company, an adventure or a trusted sleepover.</p></div>}
      {cards.map((inv)=>{ const meta=PAW_TOGETHER_TYPES[inv.type]; const sniffed=(inv.sniffs||[]).includes(dog.name); return <article key={inv.id} className="pp-invite-card">
        <div className="pp-invite-head"><Avatar name={inv.dog} size={44} src={avatars?.[inv.dog]} breed={inv.breed}/><div><span className="pp-invite-kind">{meta.icon} {meta.title}</span><strong>{inv.dog}</strong><small>{inv.breed}</small></div></div>
        <h3>{inv.location}</h3><p className="pp-invite-when">📅 {inv.when}</p><p>{inv.note}</p><div className="pp-invite-foot"><span>👥 {inv.audience}</span>{!inv.mine && <button className={sniffed?"pp-sniff on":"pp-sniff"} onClick={()=>onSniff(inv.id)}>👃 {sniffed ? "Sniffed" : "Sniff / I'm interested"}</button>}</div>
        {inv.mine && (inv.interest||[]).map((x)=><div key={x.dog} className="pp-interest"><div><strong>👃 {x.dog} sniffed this</strong><p>{x.text}</p>{x.demo && <small>Demo Paw Friend response</small>}</div>{x.status==="pending" ? <div className="pp-interest-actions"><button onClick={()=>onRespond(inv.id,x.dog,"accepted")}>Wag back</button><button onClick={()=>onRespond(inv.id,x.dog,"declined")}>Decline</button></div> : <span className={`pp-status ${x.status}`}>{x.status}</span>}</div>)}
      </article>;})}
    </div>
  </div>;
}

function PledgeModal({ dog, onAccept, onClose }) {
  const rules = [
    ["Bag waste", "Every time, including the parts nobody saw."],
    ["Leash where required", "The rule exists because of the wildlife, not the dog."],
    ["Respect wildlife", "No chasing. Keep a wide berth around nests and dens."],
    ["Know the rules", "Check the trail's pet policy before you drive out."],
  ];
  return (
    <div className="pp-scrim" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <RangerBadge large />
        <h3>The B.A.R.K. pledge</h3>
        <p className="pp-modal-sub">Trails close to dogs when these slip. That's the whole reason it exists.</p>
        <ul className="pp-pledge">
          {rules.map(([t, d]) => (
            <li key={t}><strong>{t}</strong><span>{d}</span></li>
          ))}
        </ul>
        <button className="pp-primary" onClick={onAccept}>{dog.name} takes the pledge</button>
        <button className="pp-ghost" onClick={onClose}>Not now</button>
      </div>
    </div>
  );
}

/* ---------------------------------- marks ---------------------------------- */

function PawMark({ big, color = "#2F5D3A" }) {
  const s = big ? 54 : 30;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="21" rx="7.5" ry="6.5" fill={color} />
      <circle cx="7.5" cy="12.5" r="3.4" fill={color} />
      <circle cx="13" cy="8" r="3.4" fill={color} />
      <circle cx="19" cy="8" r="3.4" fill={color} />
      <circle cx="24.5" cy="12.5" r="3.4" fill={color} />
    </svg>
  );
}

function RangerBadge({ muted, large }) {
  const s = large ? 68 : 44;
  const c = muted ? "#A9B3A8" : "#2F5D3A";
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3l18 7v14c0 11-7.6 18.6-18 21C13.6 42.6 6 35 6 24V10z" fill="none" stroke={c} strokeWidth="2.4" />
      <path d="M24 12l3.6 7.4 8.1 1.1-5.9 5.7 1.4 8L24 30.4 16.8 34.2l1.4-8-5.9-5.7 8.1-1.1z" fill={c} opacity="0.9" />
    </svg>
  );
}

/* ---------------------------------- shell ---------------------------------- */

/* In a production build a render error shows a blank page with nothing in the
   UI to explain it. This turns that into a readable message. */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("PawPrints crashed:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pp-crash">
        <h2>Something broke on this screen</h2>
        <p className="pp-crash-msg">{String(this.state.error?.message || this.state.error)}</p>
        <button className="pp-primary" onClick={() => this.setState({ error: null })}>Try again</button>
        <button
          className="pp-ghost"
          onClick={() => {
            try {
              Object.keys(localStorage)
                .filter((k) => k.startsWith("pawpark:"))
                .forEach((k) => localStorage.removeItem(k));
            } catch {}
            location.reload();
          }}
        >
          Reset saved data and reload
        </button>
      </div>
    );
  }
}

function Shell({ children }) {
  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Nunito:wght@400;600;700&family=Zilla+Slab:wght@600;700&display=swap');

:root{
  --moss:#2F5D3A; --moss-deep:#1D3B27; --sage:#EDF2EA; --paper:#FBFAF6;
  --violet:#6D3DD1; --violet-soft:#F2ECFD; --ink:#22261F; --dim:#6B7268; --line:#DFE4DA;
}
*{box-sizing:border-box}
.pp-root{
  font-family:'Nunito',system-ui,sans-serif; color:var(--ink);
  background:var(--paper); min-height:100vh; max-width:520px; margin:0 auto;
  padding-bottom:88px; position:relative;
}
.pp-root h1,.pp-root h2,.pp-root h3{font-family:'Bricolage Grotesque','Nunito',sans-serif;margin:0;letter-spacing:-0.02em}

/* top bar */
.pp-top{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 12px;position:sticky;top:0;background:var(--paper);z-index:5;border-bottom:1px solid var(--line)}
.pp-brand{display:flex;align-items:center;gap:10px}
.pp-brand h1{font-size:22px;color:var(--moss)}
.pp-brand p{margin:0;font-size:11px;color:var(--dim);letter-spacing:0.04em}
.pp-dogchip{display:flex;align-items:center;gap:8px;background:var(--sage);border:1px solid var(--line);border-radius:999px;padding:4px 12px 4px 4px;font:600 13px 'Nunito';color:var(--moss);cursor:pointer}

.pp-avatar{border-radius:50%;display:grid;place-items:center;color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;flex:none}

.pp-main{padding:16px 18px}

/* buttons */
.pp-primary{width:100%;background:var(--moss);color:#fff;border:0;border-radius:14px;padding:14px;font:700 15px 'Nunito';cursor:pointer;transition:transform .12s ease}
.pp-primary:active{transform:scale(.985)}
.pp-primary:disabled{background:#B9C4B6;cursor:default}
.pp-purple{width:100%;background:var(--violet);color:#fff;border:0;border-radius:14px;padding:14px;font:700 15px 'Nunito';cursor:pointer;margin-top:14px}
.pp-purple:disabled{background:#C9BCE6}
.pp-ghost{width:100%;background:none;border:0;color:var(--dim);font:600 14px 'Nunito';padding:12px;cursor:pointer;margin-top:4px}
button:focus-visible{outline:2.5px solid var(--violet);outline-offset:2px}

/* setup */
.pp-setup{padding:44px 22px}
.pp-setup-title{font-size:30px;line-height:1.1;margin:20px 0 8px}
.pp-setup-sub{color:var(--dim);font-size:15px;margin:0 0 22px;max-width:34ch}
.pp-dogs{display:flex;flex-direction:column;gap:10px}
.pp-dogcard{display:flex;gap:14px;align-items:center;text-align:left;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;cursor:pointer;transition:border-color .15s}
.pp-dogcard:hover{border-color:var(--moss)}
.pp-dogcard strong{display:block;font-size:16px}
.pp-dogcard span{display:block;font-size:13px;color:var(--dim)}
.pp-dogcard em{display:block;font-size:12px;color:var(--moss);font-style:italic;margin-top:3px}
.pp-progress{display:flex;gap:5px;margin-bottom:26px}
.pp-progress span{flex:1;height:3px;border-radius:2px;background:var(--line);transition:background .3s}
.pp-progress span.on{background:var(--moss)}
.pp-group{margin-bottom:20px}
.pp-grouplabel{font:700 11px 'Nunito';text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin:0 0 9px}
.pp-chips{display:flex;flex-wrap:wrap;gap:8px}
.pp-chip{background:#fff;border:1.5px solid var(--line);border-radius:999px;padding:10px 15px;font:600 13.5px 'Nunito';color:var(--ink);cursor:pointer;transition:border-color .15s,background .15s}
.pp-chip:hover{border-color:#B8C7B4}
.pp-chip.on{background:var(--moss);border-color:var(--moss);color:#fff}
.pp-next{margin-top:8px}
/* planner + weather */
.pp-planner{background:var(--sage);border-radius:18px;padding:16px;margin-bottom:16px}
.pp-plan-title{font-size:19px;margin-bottom:14px}
.pp-planner .pp-grouplabel{margin-top:14px}
.pp-planner .pp-chips .pp-chip{background:#fff}
.pp-planner .pp-chip.on{background:var(--moss);color:#fff}
.pp-chipsub{font-style:normal;opacity:.6;font-size:11px;margin-left:4px}
.pp-warn{font-size:13px;color:#8A5A2C;background:#FBF2E6;border-radius:10px;padding:10px;margin:12px 0 0}
.pp-wx{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:11px;font-size:12px;color:var(--dim)}
.pp-wx-temp{font:700 17px 'Bricolage Grotesque';color:var(--ink)}
.pp-wx-risk{border:1px solid;border-radius:999px;padding:2px 8px;font-weight:700;font-size:11px}
.pp-wxbar{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--sage);border-radius:14px;padding:13px 15px;margin:14px 0 0;flex-wrap:wrap}
.pp-wxbar strong{font:700 26px 'Bricolage Grotesque';color:var(--moss-deep);display:block;line-height:1}
.pp-wxbar span{font-size:11.5px;color:var(--dim)}
.pp-wxbar-meta{display:flex;flex-direction:column;gap:2px;text-align:right}
.pp-profile .pp-briefrows{margin-top:8px}
.pp-editbtn{border:1px solid var(--line);border-radius:12px;margin-top:18px}

/* gate + guest */
.pp-gate{padding:52px 22px}
.pp-gate .pp-setup-title{margin-top:18px;font-size:34px}
.pp-gatecard{width:100%;display:flex;gap:14px;align-items:flex-start;text-align:left;background:#fff;border:1.5px solid var(--line);border-radius:18px;padding:16px;cursor:pointer;margin-bottom:12px;transition:border-color .15s,transform .12s}
.pp-gatecard:hover{border-color:var(--moss)}
.pp-gatecard:active{transform:scale(.99)}
.pp-gatecard.primary{background:var(--sage);border-color:var(--moss)}
.pp-gatecard strong{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:17px;margin-bottom:4px}
.pp-gatecard span{display:block;font-size:13.5px;color:var(--dim);line-height:1.45}
.pp-gate-mark{flex:none;width:44px;height:44px;display:grid;place-items:center;background:#fff;border-radius:13px}
.pp-gate-mark.ghost{opacity:.4}
/* landing walk animation */
.pp-walk{width:100%;height:104px;display:block;margin:8px 0 18px;overflow:visible}
.pp-walk-ground{stroke:#E4DBF6;stroke-width:2;stroke-dasharray:3 7;stroke-linecap:round}
.pp-walk-print{fill:#6D3DD1;opacity:0;animation:printfade 8.4s linear infinite backwards}
@keyframes printfade{0%{opacity:0}4%{opacity:.55}72%{opacity:.28}100%{opacity:0}}
/* playful puppy landing art */
.pp-fill{fill:#7C4DDB}
.pp-leg-far{fill:#5B34A8}
.pp-ear-shape{fill:#5B34A8}
.pp-tail-shape{fill:none;stroke:#7C4DDB;stroke-width:8;stroke-linecap:round}
.pp-nose-dot{fill:#2B2140}
.pp-mouth{fill:none;stroke:#2B2140;stroke-width:1.8;stroke-linecap:round;opacity:.72}
.pp-wing-shape{fill:#F49CB6}
.pp-fly-body{fill:#5B34A8}
.pp-shadow{fill:#E8DCF9}
.pp-belly{fill:#9C78EA;opacity:.95}
.pp-cheek{fill:#F7B2C8;opacity:.85}

.pp-walk-dog{animation:puppycross 8.4s linear infinite}
.pp-pup-bounce{transform-box:fill-box;transform-origin:50% 80%;animation:puppybounce .95s ease-in-out infinite}
.pp-pup-body{transform-box:fill-box;transform-origin:50% 60%;animation:puppyrock .95s ease-in-out infinite}
.pp-leg-g{transform-box:fill-box;transform-origin:50% 5%;animation:legswing .95s ease-in-out infinite}
.pp-leg-g.alt{animation-delay:-.48s}
.pp-front-pawlift{transform-box:fill-box;transform-origin:45% 10%;animation:pawlift .95s ease-in-out infinite}
.pp-head{transform-box:fill-box;transform-origin:20% 85%;animation:headcurious 2.2s ease-in-out infinite}
.pp-tail-g{transform-box:fill-box;transform-origin:100% 100%;animation:tailhappy .34s ease-in-out infinite}
.pp-fly{animation:flycross 8.4s linear infinite}
.pp-flutter{animation:bobfly 1.25s ease-in-out infinite}
.pp-wing{transform-box:fill-box;transform-origin:100% 50%;animation:flap .18s ease-in-out infinite alternate}
.pp-wing.right{transform-origin:0% 50%;animation-name:flapr}

@keyframes puppycross{
  0%{transform:translateX(-102px)}
  100%{transform:translateX(332px)}
}
@keyframes puppybounce{
  0%,100%{transform:translateY(0)}
  20%{transform:translateY(-3px)}
  45%{transform:translateY(-9px)}
  68%{transform:translateY(-2px)}
}
@keyframes puppyrock{
  0%,100%{transform:rotate(0deg)}
  25%{transform:rotate(-1.2deg)}
  50%{transform:rotate(.8deg)}
  75%{transform:rotate(-.8deg)}
}
@keyframes legswing{
  0%{transform:rotate(-14deg) translateY(0)}
  50%{transform:rotate(13deg) translateY(.8px)}
  100%{transform:rotate(-14deg) translateY(0)}
}
@keyframes pawlift{
  0%,100%{transform:rotate(10deg) translate(0,0)}
  50%{transform:rotate(-22deg) translate(-2px,-7px)}
}
@keyframes headcurious{
  0%,100%{transform:translateY(0) rotate(0deg)}
  20%{transform:translateY(-1px) rotate(-4deg)}
  40%{transform:translateY(-.5px) rotate(-7deg)}
  58%{transform:translateY(.3px) rotate(1deg)}
  76%{transform:translateY(-1px) rotate(-3deg)}
}
@keyframes tailhappy{
  0%{transform:rotate(-18deg)}
  25%{transform:rotate(6deg)}
  50%{transform:rotate(22deg)}
  75%{transform:rotate(8deg)}
  100%{transform:rotate(-12deg)}
}
@keyframes flycross{
  0%{transform:translate(20px,25px)}
  14%{transform:translate(74px,17px)}
  30%{transform:translate(132px,26px)}
  50%{transform:translate(202px,14px)}
  72%{transform:translate(276px,20px)}
  100%{transform:translate(392px,24px)}
}
@keyframes bobfly{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes flap{from{transform:rotate(8deg) scaleX(1)}to{transform:rotate(-4deg) scaleX(.42)}}
@keyframes flapr{from{transform:rotate(-8deg) scaleX(1)}to{transform:rotate(4deg) scaleX(.42)}}

/* profile edit utilities */
.pp-memorial-badge{display:inline-flex;align-items:center;gap:4px;margin-left:8px;background:#F3ECFF;color:var(--violet);border:1px solid #D8C8F6;border-radius:999px;padding:2px 7px;font-size:10.5px;font-weight:800;vertical-align:middle}
.pp-memorial-note{margin-top:8px;background:#FBF7FF;color:#6B4CB2;border:1px solid #E3D7F5;border-radius:12px;padding:8px 10px;font-size:11.5px;font-weight:700}
.pp-edit-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:12px}
.pp-softbtn{flex:1;border:1px solid #D4C5F2;background:#fff;color:var(--violet);border-radius:12px;padding:11px 12px;font:700 13px 'Nunito';cursor:pointer}
.pp-dangerlink{border:0;background:none;color:#8A4A4A;font:800 12.5px 'Nunito';cursor:pointer;text-decoration:underline}


.pp-fieldnote{display:block;margin-top:5px;color:var(--dim);font-size:11px;line-height:1.35}
.pp-edit-profile .pp-group{margin-top:18px}
.pp-memorial-help{font-size:11.5px;color:var(--dim);line-height:1.45;margin-top:12px;text-align:left}
.pp-memorial-panel{text-align:center;background:#FBF8FF;border:1px solid #E1D5F6;border-radius:20px;padding:28px 20px;margin:12px 0}
.pp-memorial-panel h2{font-size:22px;color:var(--violet);margin:6px 0 8px}
.pp-memorial-panel p{font-size:13.5px;color:var(--dim);line-height:1.5;max-width:38ch;margin:0 auto 16px}
.pp-memorial-rainbow{font-size:34px}
@media (prefers-reduced-motion:reduce){.pp-walk-print{opacity:.4}.pp-walk-dog{transform:translateX(110px)}.pp-fly{transform:translate(232px,20px)}}
.pp-crash{max-width:420px;margin:60px auto;padding:26px;text-align:center;font-family:'Nunito',system-ui,sans-serif}
.pp-crash h2{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;margin-bottom:10px}
.pp-crash-msg{background:#FBF1F1;border-radius:12px;padding:12px;font-size:13px;color:#8A4A4A;word-break:break-word;margin-bottom:16px}
.pp-gate-foot{text-align:center;color:var(--dim);font-size:12.5px;letter-spacing:.03em;margin-top:20px}
.pp-guestdot{width:9px;height:9px;border-radius:50%;background:var(--dim);margin-left:7px;flex:none}
.pp-guestpanel{text-align:center;padding:34px 18px}
.pp-guestpanel h2{font-size:23px;margin-bottom:10px}
.pp-guestpanel p{color:var(--dim);font-size:14.5px;line-height:1.5;margin:0 auto 22px;max-width:36ch}
.pp-guest-emblem{display:grid;place-items:center;margin-bottom:6px;opacity:.9}
.pp-inline-cta{font-style:normal;color:var(--moss);font-weight:700}

/* pawprints — the purple world */
.pp-prints-head{margin-bottom:18px}
.pp-prints-head h2{font-size:27px;color:var(--violet)}
.pp-prints-head p{margin:3px 0 0;font-size:13px;color:var(--dim)}
.pp-together{background:var(--violet-soft);border-radius:18px;padding:16px;margin-bottom:24px}
.pp-together h3{font-size:17px;color:var(--violet)}
.pp-together-sub{font-size:13.5px;color:var(--dim);margin:6px 0 14px;line-height:1.45}
.pp-buddies{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.pp-buddy{background:#fff;border:1px solid #E3D8F7;border-radius:14px;padding:12px 7px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.pp-buddy strong{font-size:13.5px}
.pp-buddy span{font-size:10.5px;color:var(--dim);text-align:center;line-height:1.3}
.pp-buddy em{font-style:normal;font-size:11px;font-weight:700;color:var(--violet);margin-top:5px}
.pp-feed-title{font-size:19px;margin-bottom:0}
.pp-feed{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:12px}
.pp-post{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px}
.pp-post.mine{border-color:var(--violet);background:#FDFBFF}
.pp-post-head{display:flex;align-items:center;gap:11px;margin-bottom:11px}
.pp-post-head strong{display:block;font-size:14.5px}
.pp-post-head span{font-size:11.5px;color:var(--dim)}
.pp-mine-tag{margin-left:auto;background:var(--violet);color:#fff;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px}
.pp-post-body{font-size:14.5px;line-height:1.5;margin:0 0 12px}
.pp-post-trail{display:flex;align-items:center;gap:11px;background:var(--sage);border-radius:13px;padding:11px}
.pp-post-trail strong{display:block;font-size:13.5px;color:var(--moss-deep)}
.pp-post-trail span{font-size:11.5px;color:var(--dim)}
.pp-post-acts{display:flex;gap:8px;margin-top:12px}
.pp-post-acts button{background:none;border:1px solid var(--line);border-radius:999px;padding:6px 13px;font:700 12px 'Nunito';color:var(--dim);cursor:pointer}
.pp-post-acts button.on{background:var(--violet-soft);border-color:var(--violet);color:var(--violet)}
.pp-pair{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px}
.pp-pair-plus{font:700 20px 'Bricolage Grotesque';color:var(--dim)}
.pp-verdict-badge{display:inline-block;border:2px solid;border-radius:999px;padding:5px 16px;font:700 13px 'Nunito';margin:0 0 12px}
.pp-buddy-why{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;line-height:1.4;margin:0 0 14px}

/* household / siblings */
.pp-who{margin-bottom:14px}
.pp-household{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:20px;cursor:pointer;text-align:left}
.pp-household strong{display:block;font-size:14px}
.pp-household em{display:block;font-style:normal;font-size:12px;color:var(--dim);margin-top:2px}
.pp-household-go{font-size:20px;color:var(--dim)}
.pp-chip-pack{border-style:dashed}
.pp-chip-pack.on{border-style:solid}
.pp-limiter{display:block;color:#8A4A4A;font-weight:700;margin-top:3px}
.pp-stack{display:flex;flex:none}
.pp-stack>div:not(:first-child){margin-left:-14px;box-shadow:0 0 0 2.5px var(--paper)}
.pp-dogsection{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px}
.pp-dogsection-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.pp-dogsection-head strong{font-family:'Bricolage Grotesque',sans-serif;font-size:16px}
.pp-editlink{margin-left:auto;background:none;border:0;color:var(--moss);font:700 13px 'Nunito';cursor:pointer;text-decoration:underline}
.pp-dogsection .pp-briefrows>div:first-child{border-top:0}
.pp-addsib{margin-top:6px}
/* account sheet */
.pp-sheet-scrim{align-items:flex-end}
.pp-sheet{background:var(--paper);border-radius:22px 22px 0 0;padding:10px 18px 26px;width:100%;max-width:520px;max-height:86vh;overflow:auto;animation:sheetup .22s ease}
@keyframes sheetup{from{transform:translateY(18px);opacity:.6}to{transform:none;opacity:1}}
.pp-sheet-grip{width:38px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 14px}
.pp-sheet-owner{font-size:12.5px;color:var(--dim);margin:0 0 14px;text-align:center}
.pp-sheet-dogs{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.pp-sheet-dog{display:flex;align-items:center;gap:12px;width:100%;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:10px 12px;cursor:pointer;text-align:left}
.pp-sheet-dog.on{border-color:var(--moss);background:var(--sage)}
.pp-sheet-dog strong{display:block;font-size:14.5px}
.pp-sheet-dog em{display:block;font-style:normal;font-size:11.5px;color:var(--dim)}
.pp-sheet-dog>span:nth-child(2){flex:1;min-width:0}
.pp-sheet-tick{color:var(--moss);font-weight:800}
.pp-sheet-pack{width:38px;height:38px;display:grid;place-items:center;background:var(--sage);border-radius:50%;font-size:17px;flex:none}
.pp-sheet-actions{border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:2px}
.pp-sheet-actions>button{background:none;border:0;text-align:left;padding:13px 4px;font:600 14.5px 'Nunito';color:var(--ink);cursor:pointer;border-radius:10px}
.pp-sheet-actions>button:hover{background:var(--sage)}
.pp-sheet-logout{color:#8A4A4A !important;font-weight:700 !important}
.pp-sheet-confirm{background:#FBF1F1;border-radius:14px;padding:14px;margin-top:6px}
.pp-sheet-confirm p{font-size:13px;color:var(--dim);margin:0 0 12px;line-height:1.45}
.pp-danger{width:100%;background:#8A4A4A;color:#fff;border:0;border-radius:12px;padding:12px;font:700 14px 'Nunito';cursor:pointer}
.pp-gatecard.resume{background:var(--sage);border-color:var(--moss)}
.pp-siblingbar{background:var(--violet-soft);border-radius:16px;padding:12px;margin-bottom:18px}
.pp-siblingbar-dogs{display:flex;flex-wrap:wrap;gap:8px}
.pp-siblingbar .pp-chip{background:#fff}
.pp-siblingbar .pp-chip.on{background:var(--violet);border-color:var(--violet);color:#fff}
.pp-chip-add{border-style:dashed;color:var(--violet);border-color:#C6B2EC;font-weight:800}
.pp-siblingbar-link{display:block;margin-top:10px;background:none;border:0;padding:0;color:var(--violet);font:700 12.5px 'Nunito';cursor:pointer}
.pp-packnote{font-size:13.5px;color:var(--dim);line-height:1.5;background:#fff;border-radius:12px;padding:12px;margin:0}

/* account + dog IDs */
.pp-idinline{font-family:'Zilla Slab',serif;font-style:normal;font-size:12px;letter-spacing:.06em;color:var(--moss);font-weight:600}
.pp-dogcard.static{cursor:default;display:flex;gap:14px;align-items:center;text-align:left;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px}
.pp-dogcard.static strong{display:block;font-size:16px}
.pp-dogcard.static span{display:block;font-size:13px;color:var(--dim)}
.pp-found{margin-top:18px}
.pp-foundnote{font-size:12.5px;color:var(--dim);line-height:1.5;background:var(--sage);border-radius:12px;padding:11px;margin:0 0 14px}
.pp-dogsection-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.pp-dogsection-head strong{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:16px;line-height:1.2}

/* dog profile — the instagram surface */
.pp-seg{display:flex;background:var(--violet-soft);border-radius:12px;padding:4px;margin-bottom:18px}
.pp-seg button{flex:1;border:0;background:none;padding:9px;border-radius:9px;font:700 13px 'Nunito';color:var(--dim);cursor:pointer}
.pp-seg button.on{background:#fff;color:var(--violet);box-shadow:0 1px 3px rgba(0,0,0,.07)}
.pp-whose{margin-bottom:16px}
.pp-dp-top{text-align:center;margin-bottom:18px}
.pp-dp-ring{display:inline-grid;place-items:center;padding:4px;border-radius:50%;background:linear-gradient(135deg,var(--violet),#B79BEE);margin-bottom:10px}
.pp-dp-ring>div{box-shadow:0 0 0 3px var(--paper)}
.pp-dp-top h2{font-size:25px}
.pp-dp-meta{margin:4px 0 4px;font-size:13.5px;color:var(--dim)}
.pp-dp-stats{display:flex;background:var(--violet-soft);border-radius:16px;padding:14px 8px;margin-bottom:20px}
.pp-dp-stats>div{flex:1;text-align:center}
.pp-dp-stats strong{display:block;font:700 20px 'Bricolage Grotesque';color:var(--violet)}
.pp-dp-stats span{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em}
.pp-dp-about{background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-bottom:22px}
.pp-dp-about h3{font-size:16px;margin-bottom:8px}
.pp-dp-about p{margin:0;font-size:14.5px;line-height:1.5}
.pp-dp-h{font-size:17px;margin-bottom:12px}
.pp-badges{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
.pp-badge{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 8px;text-align:center}
.pp-badge.got{border-color:var(--moss);background:var(--sage)}
.pp-badge strong{display:block;font-size:12px;margin-top:5px;line-height:1.25}
.pp-badge span{display:block;font-size:10px;color:var(--dim);margin-top:3px;line-height:1.3}
.pp-badge.got span{color:var(--moss);font-weight:700}
.pp-albums{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
.pp-album{font-size:11.5px;background:var(--sage);color:var(--moss);padding:5px 11px;border-radius:999px;font-weight:700}
.pp-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.pp-tile{aspect-ratio:1;border-radius:14px;padding:12px;color:#fff;display:flex;flex-direction:column;justify-content:flex-end}
.pp-tile strong{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;line-height:1.2}
.pp-tile span{font-size:11px;opacity:.85;margin-top:4px}

/* media */
.pp-picker{margin:14px 0}
.pp-uploadbtn{width:100%;background:#fff;border:1.5px dashed var(--line);border-radius:14px;padding:16px;font:700 14px 'Nunito';color:var(--dim);cursor:pointer}
.pp-uploadbtn:hover{border-color:var(--violet);color:var(--violet)}
.pp-media{margin:14px 0}
.pp-media-el{width:100%;border-radius:14px;display:block;max-height:280px;object-fit:cover;background:#000}
.pp-medianote{font-size:11.5px;color:var(--dim);margin:8px 0 0;text-align:left}
.pp-post-media{width:100%;border-radius:13px;display:block;margin-bottom:11px;max-height:340px;object-fit:cover;background:#EFEFEA}
.pp-suggest{border:1px solid var(--line);border-radius:12px;margin-bottom:4px}
.pp-form textarea{border:1px solid var(--line);border-radius:11px;padding:11px;font:400 15px 'Nunito';background:#fff;color:var(--ink);resize:vertical}
.pp-dp-gridhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pp-dp-gridhead .pp-dp-h{margin-bottom:0}
.pp-tile.photo{padding:0;position:relative;overflow:hidden;background:#EFEFEA}
.pp-tile-media{width:100%;height:100%;object-fit:cover;display:block}
.pp-tile-cap{position:absolute;left:10px;bottom:10px;right:10px;font-size:12px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}

/* paw friends */
.pp-segcount{font-style:normal;background:var(--violet);color:#fff;border-radius:999px;padding:1px 6px;font-size:10.5px;margin-left:4px}
.pp-friendrow{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px;margin-bottom:10px}
.pp-friendmain{flex:1;display:flex;align-items:center;gap:12px;background:none;border:0;text-align:left;cursor:pointer;padding:0;min-width:0}
.pp-friendmain strong{display:block;font-size:15px}
.pp-friendmain span{display:block;font-size:12px;color:var(--dim)}
.pp-friendmain em{display:block;font-style:normal;font-size:11px;color:var(--violet);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-connbtn{flex:none;background:var(--violet);color:#fff;border:0;border-radius:999px;padding:8px 15px;font:700 12.5px 'Nunito';cursor:pointer}
.pp-connbtn.on{background:var(--violet-soft);color:var(--violet)}
.pp-mutual{font-size:12.5px;color:var(--violet);margin:8px 0 0;font-weight:700}
.pp-connect,.pp-connected{margin-top:12px;width:auto;padding-left:22px;padding-right:22px}
.pp-connected{border:1px solid var(--line);border-radius:12px}

.pp-avatar-img{object-fit:cover;display:block;background:var(--sage)}

/* avatar upload */
.pp-avpick{display:inline-flex;flex-direction:column;align-items:center;gap:6px}
.pp-avpick-btn{position:relative;background:none;border:0;padding:0;cursor:pointer;border-radius:50%;line-height:0}
.pp-avpick-badge{position:absolute;right:-2px;bottom:-2px;background:var(--violet);color:#fff;border:2.5px solid var(--paper);border-radius:999px;font:700 10px 'Nunito';padding:3px 8px;line-height:1.3}
.pp-avpick-label{font-size:11.5px;color:var(--dim);margin:0}
.pp-setupav{display:flex;justify-content:center;margin-bottom:6px}
.pp-dogsection-head .pp-avpick{flex:none}

/* drawn art */
.pp-avatar-art{border-radius:50%;overflow:hidden;display:grid;place-items:center;padding:0;background:none}
.pp-dogart{display:block;border-radius:50%}
.pp-scene{width:100%;height:100%;display:block;border-radius:13px}
.pp-scenewrap{padding:0;overflow:hidden;height:190px;background:#DDE8F0}
.pp-tile.photo .pp-scene{border-radius:0}

.pp-form{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
.pp-form label{display:flex;flex-direction:column;gap:5px;font:600 12px 'Nunito';color:var(--dim);flex:1}
.pp-form input,.pp-form select{border:1px solid var(--line);border-radius:11px;padding:11px;font:400 15px 'Nunito';background:#fff;color:var(--ink)}
.pp-row{display:flex;gap:12px}

/* trails */
.pp-matchnote{font-size:14px;color:var(--dim);margin:0 0 12px}
.pp-trails{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.pp-trail{width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;cursor:pointer}
.pp-trail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.pp-trail-head strong{font-size:16px;display:block}
.pp-trail-head span{font-size:12px;color:var(--dim)}
.pp-chev{font-size:22px;color:var(--line)}
.pp-facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pp-facts span{font-size:11px;background:var(--sage);color:var(--moss);padding:4px 9px;border-radius:999px;font-weight:600}
.pp-facts .pp-done{background:var(--violet-soft);color:var(--violet)}
.pp-why{font-size:13.5px;line-height:1.45;margin:10px 0 0;color:var(--ink)}
.pp-why em{display:block;color:var(--dim);font-size:12px;margin-top:3px;font-style:normal}
.pp-score{border:2px solid;border-radius:12px;padding:5px 9px;text-align:center;flex:none}
.pp-score strong{display:block;font:700 17px 'Bricolage Grotesque';line-height:1}
.pp-score span{font-size:9px;letter-spacing:.08em;text-transform:uppercase}

/* detail */
.pp-back{background:none;border:0;color:var(--dim);font:600 14px 'Nunito';padding:0 0 12px;cursor:pointer}
.pp-hero{border-radius:20px;padding:24px 20px;color:#fff}
.pp-hero h2{font-size:26px;line-height:1.15}
.pp-hero p{margin:6px 0 0;opacity:.85;font-size:13px}
.pp-hero-score{display:inline-block;margin-top:14px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700}
.pp-specs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:14px 0}
.pp-specs>div{background:#fff;padding:11px 12px}
.pp-specs dt{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--dim)}
.pp-specs dd{margin:3px 0 0;font-size:13px;font-weight:600}
.pp-brief h3{font-size:18px;margin-bottom:10px}
.pp-verdict{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;line-height:1.35;color:var(--moss-deep);margin:0 0 14px}
.pp-briefrows>div{border-top:1px solid var(--line);padding:11px 0}
.pp-briefrows dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
.pp-briefrows dd{margin:4px 0 0;font-size:14px;line-height:1.45}
.pp-stampbtn{margin-top:20px}

/* passport */
.pp-pp-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.pp-pp-head strong{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:19px}
.pp-pp-head span{font-size:13px;color:var(--dim)}
.pp-stats{display:flex;background:var(--sage);border-radius:16px;padding:14px;margin-bottom:14px}
.pp-stats>div{flex:1;text-align:center}
.pp-stats strong{display:block;font:700 22px 'Bricolage Grotesque';color:var(--moss)}
.pp-stats span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.pp-ranger{width:100%;display:flex;align-items:center;gap:14px;text-align:left;background:#fff;border:1px dashed var(--line);border-radius:16px;padding:14px;margin-bottom:20px;cursor:pointer}
.pp-ranger.on{border-style:solid;border-color:var(--moss);background:var(--sage);cursor:default}
.pp-ranger strong{display:block;font-size:15px}
.pp-ranger span{font-size:12.5px;color:var(--dim)}
.pp-empty{text-align:center;padding:44px 20px;border:1px dashed var(--line);border-radius:18px}
.pp-empty p{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:17px}
.pp-empty-sub{color:var(--dim);font-size:13.5px !important;font-family:'Nunito',sans-serif !important;margin-top:6px !important}

/* the stamp — signature element */
.pp-stamps{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pp-stamp-wrap{display:grid;place-items:center;padding:6px}
.pp-stamp{border:2.5px solid;border-radius:50%;width:140px;height:140px;display:grid;place-items:center;opacity:.86;padding:5px}
.pp-stamp-inner{border:1px dashed;border-radius:50%;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px;font-family:'Zilla Slab',serif}
.pp-stamp-park{font-size:9px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.pp-stamp-name{font-size:13px;font-weight:700;line-height:1.15;margin:5px 0}
.pp-stamp-rule{height:1px;width:34px;margin:3px 0 5px;opacity:.6}
.pp-stamp-meta{font-size:8.5px;letter-spacing:.1em;font-weight:600}
.pp-stamped-in{display:grid;place-items:center;animation:press .5s cubic-bezier(.2,1.3,.4,1)}
@keyframes press{0%{transform:scale(2.4) rotate(-14deg);opacity:0}60%{opacity:.95}100%{transform:scale(1) rotate(0);opacity:.86}}

/* modals */
.pp-scrim{position:fixed;inset:0;background:rgba(29,59,39,.45);display:grid;place-items:center;padding:20px;z-index:20}
.pp-modal{background:var(--paper);border-radius:22px;padding:24px;max-width:400px;width:100%;text-align:center;max-height:88vh;overflow:auto}
.pp-modal h3{font-size:23px;margin:14px 0 4px}
.pp-modal-sub{color:var(--dim);font-size:13.5px;margin:0 0 16px}
.pp-memcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:left;font-size:14.5px;line-height:1.5}
.pp-dim{color:var(--dim)}
.pp-pledge{list-style:none;padding:0;margin:0 0 18px;text-align:left}
.pp-pledge li{border-top:1px solid var(--line);padding:11px 0}
.pp-pledge strong{display:block;font-size:14.5px}
.pp-pledge span{font-size:13px;color:var(--dim)}

/* tabs */
.pp-tabs{position:fixed;bottom:0;left:0;right:0;max-width:520px;margin:0 auto;display:flex;background:#fff;border-top:1px solid var(--line);padding:10px 14px 22px}
.pp-tabs button{flex:1;background:none;border:0;font:700 13px 'Nunito';color:var(--dim);padding:9px;border-radius:11px;cursor:pointer}
.pp-tabs button.on{color:var(--moss);background:var(--sage)}
.pp-tabs em{font-style:normal;background:var(--moss);color:#fff;border-radius:999px;padding:1px 6px;font-size:11px;margin-left:4px}

/* loading */
.pp-loading{text-align:center;padding:30px 10px;color:var(--dim)}
.pp-loading p{font-size:13.5px;margin:14px 0 0}
.pp-paw-loader{display:flex;gap:7px;justify-content:center}
.pp-paw-loader span{width:9px;height:9px;border-radius:50%;background:var(--moss);opacity:.25;animation:trot 1.1s infinite}
.pp-paw-loader span:nth-child(2){animation-delay:.14s}
.pp-paw-loader span:nth-child(3){animation-delay:.28s}
.pp-paw-loader span:nth-child(4){animation-delay:.42s}
@keyframes trot{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-6px)}}
.pp-error{color:#8A4A4A;font-size:13.5px}
.pp-error button{background:none;border:0;color:var(--moss);font-weight:700;text-decoration:underline;cursor:pointer}



/* two-world product system */
.pp-world{min-height:100vh}
.pawprints-world .pp-top{background:#FCFAFF;border-bottom-color:#E8DFF8}.pawprints-world .pp-brand h1{color:var(--violet)}.pawprints-world .pp-dogchip{background:var(--violet-soft);color:var(--violet);border-color:#E1D4F5}.pawprints-world .pp-main{background:linear-gradient(#FCFAFF,#FBFAF6 320px)}
.pawpark-world .pp-top{background:var(--paper)}
.pp-subnav{display:flex;gap:8px;padding:8px 18px 0;background:var(--paper)}.pp-subnav button{flex:1;border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px;font:700 12px 'Nunito';color:var(--dim)}.pp-subnav button.on{background:var(--sage);color:var(--moss);border-color:#CAD8C7}
.pp-main-tabs button{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10.5px}.pp-main-tabs button span{font-size:16px;line-height:1}.pp-main-tabs .pp-plus-tab{flex:.72}.pp-main-tabs .pp-plus-tab b{display:grid;place-items:center;background:var(--violet);color:#fff;border-radius:50%;width:42px;height:42px;font:700 25px 'Bricolage Grotesque';margin-top:-19px;box-shadow:0 5px 18px rgba(109,61,209,.25)}.pawpark-world .pp-main-tabs .pp-plus-tab b{background:var(--moss)}
.pawprints-world .pp-tabs button.on{background:var(--violet-soft);color:var(--violet)}.pawprints-world .pp-tabs em{background:var(--violet)}

/* PawPrints profile */
.pp-prints-logo{color:var(--violet)}.pp-gate-book{background:linear-gradient(180deg,#FCFAFF 0,#FBFAF6 72%);min-height:100vh}.pp-gatecard.book-primary{border-color:#D9C8F2;background:var(--violet-soft)}.pp-gate-mark.book{background:#fff}.pp-two-worlds{display:flex;justify-content:space-between;gap:8px;margin:14px 0;font-size:11px;font-weight:700}.pp-two-worlds span{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 9px}
.pp-account-purple .pp-setup-title{color:var(--violet)}
.pp-bioedit{width:100%;border:1px solid var(--line);border-radius:12px;padding:11px;font:400 14px 'Nunito';resize:vertical;background:#fff}.pp-bio-actions{display:flex;gap:8px;align-items:center}.pp-inlinebtn{width:auto!important;flex:1;margin-top:8px!important}.pp-mini-note{font-size:11px;color:var(--dim);font-weight:700}.pp-open-grid{display:flex;flex-wrap:wrap;gap:8px}.pp-open-chip{border:1px solid #DCCFF2;background:#fff;color:var(--dim);border-radius:999px;padding:8px 11px;font:700 12px 'Nunito'}.pp-open-chip.on{background:var(--violet-soft);border-color:#CBB6EF;color:var(--violet)}
.pp-open-chip.pp-open-disabled{opacity:.48;cursor:not-allowed;background:#F5F2F8;border-color:#DDD6E6;color:#8B8395}
.pp-open-to.memorial-disabled{background:#FCFAFF;border:1px solid #E8DFF6;border-radius:16px;padding:14px}
.pp-open-memorial-note{font-size:11.5px!important;color:var(--dim);line-height:1.45;margin:10px 0 0!important}.pp-open-to{margin:16px 0 22px}.pp-privacy-dot{position:absolute;right:7px;top:7px;background:rgba(255,255,255,.92);border-radius:999px;padding:3px 6px;font-size:10px}.pp-badges.compact{grid-template-columns:repeat(4,1fr)}.pp-badges.compact .pp-badge{padding:8px 3px}.pp-badges.compact .pp-badge span{display:none}
.pp-feed-hero{background:linear-gradient(135deg,#F0E8FF,#FBF8FF);border:1px solid #E3D7F5;border-radius:20px;padding:18px;margin-bottom:18px}.pp-feed-hero h3{font-size:23px;margin:4px 0 4px}.pp-feed-hero p{margin:0;color:var(--dim);font-size:13.5px}.pp-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--violet);font-weight:800}.pp-hero-post{margin-top:14px}
.pp-mine-tag{font-size:10.5px!important;padding:4px 7px!important;max-width:none!important}

/* privacy */
.pp-visibility{margin:16px 0;text-align:left}.pp-visibility>button{width:100%;display:flex;align-items:center;gap:10px;border:1px solid var(--line);background:#fff;border-radius:13px;padding:11px;margin:7px 0;text-align:left}.pp-visibility>button.on{border-color:#BFA9EA;background:var(--violet-soft)}.pp-visibility>button>span{font-size:20px}.pp-visibility>button>div{flex:1}.pp-visibility strong{display:block;font-size:13.5px}.pp-visibility small{display:block;color:var(--dim);font-size:11.5px;margin-top:2px}.pp-visibility b{color:var(--violet)}

/* Barks */
.pp-bark-modal{text-align:left}.pp-bark-list{max-height:330px;overflow:auto;margin:8px 0 14px}.pp-bark-row{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}.pp-bark-row strong{font-size:13px}.pp-bark-row p{margin:2px 0;font-size:13.5px;line-height:1.35}.pp-bark-row span{font-size:10px;color:var(--dim)}.pp-bark-compose{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);padding-top:12px}.pp-bark-compose input{flex:1;border:1px solid var(--line);border-radius:999px;padding:10px 12px;font:400 13px 'Nunito'}.pp-bark-compose button{border:0;background:var(--violet);color:#fff;width:36px;height:36px;border-radius:50%;font-size:15px}.pp-bark-compose button:disabled{opacity:.35}

/* Paw Together */
.pp-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.pp-action-grid button{background:#fff;border:1px solid #E2D8F4;border-radius:17px;padding:14px;text-align:left;min-height:126px}.pp-action-grid span{font-size:26px}.pp-action-grid strong{display:block;font-size:14px;margin:7px 0 3px}.pp-action-grid small{display:block;font-size:11.5px;line-height:1.3;color:var(--dim)}.pp-sniff-explain{background:var(--violet-soft);color:#5730AD;border-radius:14px;padding:11px 12px;font-size:12.5px;margin-bottom:15px}.pp-invite-list{display:flex;flex-direction:column;gap:12px;margin-top:14px}.pp-invite-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px}.pp-invite-head{display:flex;gap:10px;align-items:center}.pp-invite-head>div{display:flex;flex-direction:column}.pp-invite-head strong{font-size:14px}.pp-invite-head small{font-size:11px;color:var(--dim)}.pp-invite-kind{font-size:10px;color:var(--violet);text-transform:uppercase;letter-spacing:.05em;font-weight:800}.pp-invite-card h3{font-size:17px;margin:13px 0 3px}.pp-invite-card>p{font-size:13.5px;line-height:1.42}.pp-invite-when{font-size:12px!important;color:var(--dim)}.pp-invite-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:10px;margin-top:10px}.pp-invite-foot>span{font-size:11px;color:var(--dim)}.pp-sniff{border:1px solid #CCB9EF;background:#fff;color:var(--violet);border-radius:999px;padding:8px 10px;font:700 11.5px 'Nunito'}.pp-sniff.on{background:var(--violet);color:#fff}.pp-interest{margin-top:12px;border-radius:13px;background:#FAF7FF;border:1px solid #E7DCF7;padding:10px;display:flex;gap:10px;align-items:center;justify-content:space-between}.pp-interest p{font-size:11.5px;margin:3px 0;color:var(--dim)}.pp-interest small{font-size:9.5px;color:#9A86BA}.pp-interest-actions{display:flex;gap:5px}.pp-interest-actions button{border:1px solid #CDBCEC;background:#fff;color:var(--violet);border-radius:999px;padding:5px 8px;font:700 10px 'Nunito'}.pp-status{font-size:10px;text-transform:capitalize;font-weight:800;padding:5px 8px;border-radius:999px}.pp-status.accepted{background:#E7F2E8;color:var(--moss)}.pp-status.accepted::after{content:" 🐕"}.pp-status.declined{background:#F4E9E9;color:#8A4A4A}.pp-invite-types{margin-bottom:14px}.pp-chip.purple.on{background:var(--violet);border-color:var(--violet)}.pp-safety-note{background:#F3F0F8;border-radius:11px;padding:10px;font-size:11.5px;color:var(--dim);text-align:left}

@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
      `}</style>
      <div className="pp-root">{children}</div>
    </>
  );
}
