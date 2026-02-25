/**
 * pedals.js — Loads pedal data with a three-tier fallback:
 *   1. /data/pedals.json  (local static file, refreshed by deploy workflow)
 *   2. raw.githubusercontent.com  (live, in case local is stale/missing)
 *   3. Hardcoded starter list  (guarantees the app never completely breaks)
 */

const LOCAL_URL  = `${import.meta.env.BASE_URL}data/pedals.json`;
const REMOTE_URL =
  "https://raw.githubusercontent.com/PedalPlayground/pedalplayground/master/public/data/pedals.json";
const IMG_BASE = "https://raw.githubusercontent.com/PedalPlayground/pedalplayground/master/public/images/pedals/";

function imgUrl(filename) {
  return filename ? `${IMG_BASE}${filename}.png` : null;
}

function normalisePedal(raw, index) {
  const filename =
    raw.filename ||
    `${(raw.brand || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${(raw.name || "pedal").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  // Make ID stable even if index changes by anchoring it to brand+name
  const id = `${(raw.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}__${(raw.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}__${filename}`;

  return {
    id,
    name:     raw.name         || filename,
    brand:    raw.brand        || raw.manufacturer || "Unknown",
    filename,
    image:    imgUrl(filename),
    width:    raw.width,
    height:   raw.height,
  };
}

async function tryFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const raw = await res.json();
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  const pedals = arr
    .filter((p) => p && (p.name || p.filename))
    .map(normalisePedal)
    // Deduplicate by id
    .filter((p, i, self) => self.findIndex((q) => q.id === p.id) === i);
  if (pedals.length === 0) throw new Error("Empty list");
  return pedals;
}

const FALLBACK = [
  // Boss
  { name: "DS-1 Distortion",        brand: "Boss",                filename: "boss-ds-1"                    },
  { name: "Blues Driver BD-2",       brand: "Boss",                filename: "boss-bd-2"                    },
  { name: "CE-2 Chorus",             brand: "Boss",                filename: "boss-ce-2"                    },
  { name: "DD-3 Digital Delay",      brand: "Boss",                filename: "boss-dd-3"                    },
  { name: "RV-6 Reverb",             brand: "Boss",                filename: "boss-rv-6"                    },
  { name: "OD-1X Overdrive",         brand: "Boss",                filename: "boss-od-1x"                   },
  { name: "MT-2 Metal Zone",         brand: "Boss",                filename: "boss-mt-2"                    },
  // Ibanez
  { name: "Tube Screamer TS9",       brand: "Ibanez",              filename: "ibanez-ts9"                   },
  { name: "Tube Screamer TS808",     brand: "Ibanez",              filename: "ibanez-ts808"                 },
  { name: "TS Mini",                 brand: "Ibanez",              filename: "ibanez-ts-mini"               },
  // Electro-Harmonix
  { name: "Big Muff Pi",             brand: "Electro-Harmonix",    filename: "ehx-big-muff-pi"              },
  { name: "Small Clone Chorus",      brand: "Electro-Harmonix",    filename: "ehx-small-clone"              },
  { name: "Holy Grail Reverb",       brand: "Electro-Harmonix",    filename: "ehx-holy-grail"               },
  { name: "Micro POG",               brand: "Electro-Harmonix",    filename: "ehx-micro-pog"                },
  { name: "Memory Man",              brand: "Electro-Harmonix",    filename: "ehx-memory-man"               },
  // MXR
  { name: "Phase 90",                brand: "MXR",                 filename: "mxr-phase-90"                 },
  { name: "Carbon Copy Delay",       brand: "MXR",                 filename: "mxr-carbon-copy"              },
  { name: "Dyna Comp",               brand: "MXR",                 filename: "mxr-dyna-comp"                },
  { name: "Script Phase",            brand: "MXR",                 filename: "mxr-script-phase"             },
  // Fulltone
  { name: "OCD Overdrive",           brand: "Fulltone",            filename: "fulltone-ocd"                 },
  { name: "Full-Drive 2",            brand: "Fulltone",            filename: "fulltone-fulldrive-2"         },
  // Wampler
  { name: "Tumnus",                  brand: "Wampler",             filename: "wampler-tumnus"               },
  { name: "Plexi-Drive",             brand: "Wampler",             filename: "wampler-plexi-drive"          },
  { name: "Ego Compressor",          brand: "Wampler",             filename: "wampler-ego"                  },
  { name: "Pantheon",                brand: "Wampler",             filename: "wampler-pantheon"             },
  // EarthQuaker Devices
  { name: "Afterneath",              brand: "EarthQuaker Devices", filename: "earthquaker-afterneath"       },
  { name: "Avalanche Run",           brand: "EarthQuaker Devices", filename: "earthquaker-avalanche-run"    },
  { name: "Dispatch Master",         brand: "EarthQuaker Devices", filename: "earthquaker-dispatch-master"  },
  { name: "Hoof Fuzz",               brand: "EarthQuaker Devices", filename: "earthquaker-hoof"             },
  // TC Electronic
  { name: "Flashback 2 Delay",       brand: "TC Electronic",       filename: "tc-flashback-2"               },
  { name: "Hall of Fame 2 Reverb",   brand: "TC Electronic",       filename: "tc-hall-of-fame-2"            },
  { name: "Corona Chorus",           brand: "TC Electronic",       filename: "tc-corona-chorus"             },
  { name: "Polytune 3",              brand: "TC Electronic",       filename: "tc-polytune-3"                },
  // Strymon
  { name: "Timeline",                brand: "Strymon",             filename: "strymon-timeline"             },
  { name: "BigSky",                  brand: "Strymon",             filename: "strymon-bigsky"               },
  { name: "Möbius",                  brand: "Strymon",             filename: "strymon-mobius"               },
  { name: "El Capistan",             brand: "Strymon",             filename: "strymon-el-capistan"          },
  { name: "Sunset",                  brand: "Strymon",             filename: "strymon-sunset"               },
  // JHS
  { name: "Morning Glory",           brand: "JHS",                 filename: "jhs-morning-glory"            },
  { name: "Bonsai",                  brand: "JHS",                 filename: "jhs-bonsai"                   },
  { name: "Muffuletta",              brand: "JHS",                 filename: "jhs-muffuletta"               },
  // Keeley
  { name: "Compressor Pro",          brand: "Keeley Electronics",  filename: "keeley-compressor-pro"        },
  { name: "Caverns Reverb",          brand: "Keeley Electronics",  filename: "keeley-caverns"               },
  // Way Huge
  { name: "Swollen Pickle",          brand: "Way Huge",            filename: "way-huge-swollen-pickle"      },
  { name: "Green Rhino",             brand: "Way Huge",            filename: "way-huge-green-rhino"         },
  // Walrus Audio
  { name: "Fathom Reverb",           brand: "Walrus Audio",        filename: "walrus-fathom"                },
  { name: "Monument Tremolo",        brand: "Walrus Audio",        filename: "walrus-monument"              },
  { name: "Julia Chorus",            brand: "Walrus Audio",        filename: "walrus-julia"                 },
  // Chase Bliss
  { name: "Mood",                    brand: "Chase Bliss Audio",   filename: "chase-bliss-mood"             },
  { name: "Blooper",                 brand: "Chase Bliss Audio",   filename: "chase-bliss-blooper"          },
  // Eventide
  { name: "H9 Max",                  brand: "Eventide",            filename: "eventide-h9-max"              },
  { name: "Rose Modulated Delay",    brand: "Eventide",            filename: "eventide-rose"                },
].map(normalisePedal);

export async function fetchPedals() {
  for (const url of [LOCAL_URL, REMOTE_URL]) {
    try {
      const pedals = await tryFetch(url);
      console.info(`[pedals] Loaded ${pedals.length} pedals from ${url}`);
      return pedals;
    } catch (err) {
      console.warn(`[pedals] ${url} failed: ${err.message}`);
    }
  }
  console.warn("[pedals] Using built-in fallback list");
  return FALLBACK;
}
