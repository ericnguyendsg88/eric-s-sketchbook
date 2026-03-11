export interface LyricLine {
  text: string;
  finished: boolean;
  timestamp?: number;
}

export interface Demo {
  id: string;
  title: string;
  year: number;
  vibeNote: string;
  processNote?: string;
  lyrics: LyricLine[];
  reactions: number;
  audioUrl?: string;
  coverUrl?: string;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
}

// No dummy data — user uploads everything
export const demos: Demo[] = [];

export const years = [2026, 2025, 2024, 2023, 2022, 2021];

// Cool smoke-white/grey color palettes per year
export const yearColors: Record<number, { bg: string; accent: string; text: string; shadow: string }> = {
  2021: { bg: "from-gray-300 to-gray-200",     accent: "#4b5563", text: "#1f2937", shadow: "#4b556322" },
  2022: { bg: "from-slate-300 to-slate-200",   accent: "#475569", text: "#0f172a", shadow: "#47556922" },
  2023: { bg: "from-zinc-300 to-zinc-200",     accent: "#52525b", text: "#18181b", shadow: "#52525b22" },
  2024: { bg: "from-neutral-300 to-neutral-200", accent: "#525252", text: "#171717", shadow: "#52525222" },
  2025: { bg: "from-stone-300 to-stone-200",   accent: "#57534e", text: "#1c1917", shadow: "#57534e22" },
  2026: { bg: "from-gray-200 to-slate-200",    accent: "#374151", text: "#111827", shadow: "#37415122" },
};
