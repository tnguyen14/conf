// Hand-written parts of the planner's data. The schedule itself (talks,
// keynotes, descriptions) is pulled from Sessionize into schedule.json by
// scripts/pull-sessionize.js.

// Banners shown between time slots: [start, end, html]. "kn" marks the keynote block.
export const NOTES_TUE = [
  ["09:00", "10:45", "kn"],
  [
    "10:45",
    "11:30",
    "<b>Coffee break</b> · Salt Palace L1, Halls A-C + 1-5 · Poster Showcase; Solutions Showcase opens",
  ],
  [
    "12:50",
    "14:50",
    "<b>Lunch</b> · Halls A-C + 1-5 · no breakouts until 2:50",
  ],
  ["16:10", "16:40", "<b>Coffee break</b> · Halls A-C + 1-5"],
  [
    "18:00",
    "19:30",
    "<b>#KubeCrawl + #CloudNativeFest</b> · Solutions Showcase, Halls A-C + 1-5",
  ],
];
// ---------- Wednesday Nov 11 ----------

export const NOTES_WED = [
  ["09:00", "10:48", "kn"],
  [
    "10:48",
    "11:00",
    "<b>Coffee break</b> (from 10:30) · Salt Palace L1, Halls A-C + 1-5",
  ],
  ["12:20", "14:20", "<b>Lunch</b> · Halls A-C + 1-5"],
  ["15:40", "16:10", "<b>Coffee break</b> · Halls A-C + 1-5"],
];

export const NOTES_THU = [
  ["09:00", "10:30", "kn"],
  [
    "10:30",
    "11:00",
    "<b>Coffee break</b> · Halls A-C + 1-5 · Solutions Showcase open until 2:00 PM (last day)",
  ],
  ["12:20", "13:50", "<b>Lunch</b> · Halls A-C + 1-5"],
  [
    "16:00",
    "16:00",
    "<b>Conference ends</b> · last sessions finish at 4:00 PM",
  ],
];

export const TRACKS = {
  A: "AI Inference + Agentic",
  B: "Observability",
  O: "Operations + Performance",
  P: "Platform Engineering",
  C: "Connectivity",
  S: "Security",
  D: "Data Processing + Storage",
  V: "App Development + Delivery",
  E: "Emerging + Advanced",
  N: "Cloud Native Novice",
  X: "Cloud Native Experience",
  M: "Maintainer Track",
  Z: "Experiences + Inclusion",
};

export const ORDER = [
  "A",
  "B",
  "O",
  "P",
  "C",
  "S",
  "D",
  "V",
  "E",
  "N",
  "X",
  "M",
  "Z",
];
