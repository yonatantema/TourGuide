import artExpert from "./art-expert.png";
import braveDreamer from "./brave-dreamer.png";
import youngExplorer from "./young-explorer.png";

export const GUIDE_ICONS: Record<string, { src: string; label: string }> = {
  "art-expert": { src: artExpert, label: "The Art Expert" },
  "brave-dreamer": { src: braveDreamer, label: "The Brave Dreamer" },
  "young-explorer": { src: youngExplorer, label: "The Young Explorer" },
};

export const DEFAULT_ICON = "art-expert";
