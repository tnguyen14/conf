// Rules for scripts/pull-sessionize.js. Category and track names are as they
// appear in the Sessionize feed.
export default {
  apiCode: "svi82w6c",
  days: {
    "2026-11-10": "tue",
    "2026-11-11": "wed",
    "2026-11-12": "thu",
  },
  venues: { "Hyatt Regency": "Hyatt" },

  trackCategory: "All Sessions",
  levelCategory: "Audience Level",
  subTopicCategory: "SubTopic",
  projectCategory: "CNCF Projects",
  endUserCategory: "End User Programming",
  sponsoredCategory: "Is Sponsored Keynote",

  keynoteCategory: "Keynote Sessions",
  skipKeynoteTitles: ["Closing Remarks"],

  // Sessions in these tracks are included, under the planner's track letter.
  // Tutorials, Contribfests, lightning talks, posters, theaters, the Solutions
  // Showcase and the Project Pavilion are left out.
  tracks: {
    "AI Inference + Agentic": "A",
    Observability: "B",
    "Operations + Performance": "O",
    "Platform Engineering": "P",
    Connectivity: "C",
    Security: "S",
    "Data Processing + Storage": "D",
    "Application Development + Delivery": "V",
    "Emerging + Advanced": "E",
    "Cloud Native Novice": "N",
    "Cloud Native Experience": "X",
    "Maintainer Track": "M",
    Experiences: "Z",
    "Inclusion + Accessibility": "Z",
  },
  formatLabels: {
    Experiences: "Experience",
    "Inclusion + Accessibility": "Inclusion + Accessibility",
  },
  skipSubTopics: ["BoF", "Network Nook"],

  // Sessions to leave out even though their track is included (id: title).
  skip: {
    1368973: "Group Fun Run/Walk",
    1368998: "Puppy Yoga",
    1368996: "Pet-a-Pup",
  },

  // Sessions to include even though their track is left out.
  include: {
    1372858: { track: "Z", fmt: "Fireside chat" },
  },
};
