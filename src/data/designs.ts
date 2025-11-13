export type DesignArtwork = {
  spine: string | null;
  front: string | null;
  back: string | null;
  collectionBooks: {
    id: string;
    title: string | null;
    front: string | null;
    back: string | null;
  }[];
};

export type Design = {
  id: number;
  name: string;
  orders: number;
  addedAt: string;
  previewUrl: string | null;
  previewBackground: string;
  tags: string[];
  designType: "Continuous" | "Spine and Cover";
  isCollection: boolean;
  artwork: DesignArtwork;
};

export const initialDesigns: Design[] = [
  {
    id: 1,
    name: "Aurora Fade",
    orders: 128,
    addedAt: "2024-02-12",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #2dd4bf 0%, #38bdf8 45%, #6366f1 100%)",
    tags: ["Gradient", "Sci-Fi"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 2,
    name: "Gilded Atlas",
    orders: 86,
    addedAt: "2024-03-04",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #fde68a 0%, #fbbf24 45%, #f97316 100%)",
    tags: ["Historical", "Luxury"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 3,
    name: "Nocturne Bloom",
    orders: 64,
    addedAt: "2024-04-21",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #f472b6 0%, #c084fc 45%, #60a5fa 100%)",
    tags: ["Romance", "Floral"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 4,
    name: "Ink & Ember",
    orders: 52,
    addedAt: "2024-05-02",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #f97316 100%)",
    tags: ["Fantasy", "Epic"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 5,
    name: "Solar Script",
    orders: 41,
    addedAt: "2024-05-27",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #facc15 0%, #fb7185 50%, #f97316 100%)",
    tags: ["Adventure", "Limited"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 6,
    name: "Verdant Archive",
    orders: 37,
    addedAt: "2024-06-11",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #0d9488 100%)",
    tags: ["Nature", "Non-fiction"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 7,
    name: "Gossamer Night",
    orders: 29,
    addedAt: "2024-07-03",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    tags: ["Mystery", "Limited"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
  {
    id: 8,
    name: "Celestial Ledger",
    orders: 24,
    addedAt: "2024-07-24",
    previewUrl: null,
    previewBackground: "linear-gradient(135deg, #1d4ed8 0%, #22d3ee 50%, #0f172a 100%)",
    tags: ["Sci-Fi", "Collector"],
    designType: "Continuous",
    isCollection: false,
    artwork: {
      spine: null,
      front: null,
      back: null,
      collectionBooks: [],
    },
  },
];
