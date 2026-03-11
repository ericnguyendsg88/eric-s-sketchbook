import { useState, useEffect, useCallback } from "react";
import { years as defaultYears, yearColors } from "@/data/demos";
import type { Demo } from "@/data/demos";
import FolderGrid from "@/components/FolderGrid";
import TrackThumbnail from "@/components/TrackThumbnail";
import ListeningScreen from "@/components/ListeningScreen";
import UploadModal, { type UploadPayload } from "@/components/UploadModal";
import {
  putBlob,
  getBlobURL,
  saveDemos,
  loadDemos,
  saveLikes,
  loadLikes,
  type StoredDemo,
  type LikesData,
} from "@/lib/storage";

type View = "home" | "folder" | "player";
export type UserRole = "artist" | "listener";

// Build a full Demo from stored metadata + resolved blob URLs
async function hydrateDemo(meta: StoredDemo): Promise<Demo> {
  const audioUrl = meta.hasAudio ? await getBlobURL(`audio-${meta.id}`) ?? undefined : undefined;
  const coverUrl = meta.hasCover ? await getBlobURL(`cover-${meta.id}`) ?? undefined : undefined;
  return { ...meta, audioUrl, coverUrl };
}

const Index = () => {
  const [view, setView]           = useState<View>("home");
  const [role, setRole]           = useState<UserRole>("listener");
  const [focused, setFocused]     = useState(false);
  const [editingDemo, setEditingDemo] = useState<Demo | undefined>();
  const [openYear, setOpenYear]   = useState<number | null>(null);
  const [activeDemo, setActiveDemo] = useState<Demo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [demos, setDemos]         = useState<Demo[]>([]);
  const [ready, setReady]         = useState(false);   // hydration done?

  // ── Likes ──
  const [likesData, setLikesData] = useState<LikesData>({ counts: {}, liked: [] });
  const likedIds   = new Set(likesData.liked);
  const likeCounts = likesData.counts;

  // ── Restore persisted demos from IndexedDB + sessionStorage on mount ──
  useEffect(() => {
    (async () => {
      const metas = loadDemos();
      const hydrated = await Promise.all(metas.map(hydrateDemo));
      setDemos(hydrated);
      setLikesData(loadLikes());
      setReady(true);
    })();
  }, []);

  // ── "Focus" blur-in on first interaction ──
  useEffect(() => {
    const on = () => setFocused(true);
    window.addEventListener("mousemove", on, { once: true });
    window.addEventListener("touchstart", on, { once: true });
    const t = setTimeout(() => setFocused(true), 2500);
    return () => {
      window.removeEventListener("mousemove", on);
      window.removeEventListener("touchstart", on);
      clearTimeout(t);
    };
  }, []);

  // ── Persist demos metadata whenever demos change ──
  useEffect(() => {
    if (!ready) return;
    const metas: StoredDemo[] = demos.map((d) => ({
      id: d.id,
      title: d.title,
      year: d.year,
      vibeNote: d.vibeNote,
      processNote: d.processNote,
      lyrics: d.lyrics,
      reactions: d.reactions,
      duration: d.duration,
      trimStart: d.trimStart,
      trimEnd: d.trimEnd,
      hasAudio: !!d.audioUrl,
      hasCover: !!d.coverUrl,
    }));
    saveDemos(metas);
  }, [demos, ready]);

  // ── Persist likes whenever they change ──
  useEffect(() => {
    if (!ready) return;
    saveLikes(likesData);
  }, [likesData, ready]);

  // ── Like handler ──
  const handleLike = useCallback((id: string) => {
    setLikesData((prev) => {
      const isLiked = prev.liked.includes(id);
      return {
        counts: {
          ...prev.counts,
          [id]: Math.max(0, (prev.counts[id] ?? 0) + (isLiked ? -1 : 1)),
        },
        liked: isLiked ? prev.liked.filter((x) => x !== id) : [...prev.liked, id],
      };
    });
  }, []);

  // ── Upload handler ──
  const handleUpload = useCallback(async (payload: UploadPayload) => {
    const id = `track-${Date.now()}`;

    // Write blobs to IndexedDB
    await putBlob(`audio-${id}`, payload.audioFile);
    if (payload.coverFile) await putBlob(`cover-${id}`, payload.coverFile);

    // Build live blob URLs for this session
    const audioUrl = URL.createObjectURL(payload.audioFile);
    const coverUrl = payload.coverFile ? URL.createObjectURL(payload.coverFile) : undefined;

    const newDemo: Demo = {
      id,
      title: payload.title,
      year: payload.year,
      vibeNote: payload.vibeNote,
      processNote: payload.processNote,
      lyrics: payload.lyrics,
      reactions: 0,
      duration: payload.duration,
      audioUrl,
      coverUrl,
    };

    if (editingDemo) {
      setDemos((prev) => prev.map(d => d.id === editingDemo.id ? newDemo : d));
    } else {
      setDemos((prev) => [...prev, newDemo]);
    }
    setShowUpload(false);
    setEditingDemo(undefined);
    setOpenYear(payload.year);
    setView("folder");
  }, [editingDemo]);

  const handleDeleteDemo = useCallback((demo: Demo) => {
    if (confirm(`Are you sure you want to delete "${demo.title}"?`)) {
      setDemos((prev) => prev.filter(d => d.id !== demo.id));
    }
  }, []);

  const handleEditDemo = useCallback((demo: Demo) => {
    setEditingDemo(demo);
    setShowUpload(true);
  }, []);

  const handleTrimDemo = useCallback((demoId: string, trimStart: number, trimEnd: number) => {
    setDemos((prev) => {
      const next = prev.map((d) => {
        if (d.id === demoId) return { ...d, trimStart, trimEnd };
        return d;
      });
      return next;
    });
    if (activeDemo && activeDemo.id === demoId) {
      setActiveDemo((d) => d ? { ...d, trimStart, trimEnd } : d);
    }
  }, [activeDemo]);

  // ── Derived data ──
  const allYears = Array.from(
    new Set([...defaultYears, ...demos.map((d) => d.year)])
  ).sort((a, b) => b - a);

  const demosByYear = allYears.map((y) => ({
    year: y,
    demos: demos.filter((d) => d.year === y),
  }));

  const openFolderDemos = openYear ? demos.filter((d) => d.year === openYear) : [];
  const openYearPalette = openYear
    ? (yearColors[openYear] ?? { accent: "#57534e", bg: "from-stone-100 to-slate-200", text: "#292524", shadow: "#57534e22" })
    : null;

  // ── Navigation ──
  const handleOpenFolder = (year: number) => { setOpenYear(year); setView("folder"); };
  const handleOpenDemo   = (demo: Demo)   => { setActiveDemo(demo); setView("player"); };
  const handleBackToFolder = ()           => setView("folder");
  const handleBackToHome   = ()           => { setView("home"); setOpenYear(null); };

  // ── Player view ──
  if (view === "player" && activeDemo) {
    const playerDemos = openFolderDemos.length > 0
      ? openFolderDemos
      : demos.filter((d) => d.year === activeDemo.year);

    return (
      <ListeningScreen
        demo={activeDemo}
        allDemos={playerDemos}
        role={role}
        onBack={handleBackToFolder}
        onSelectDemo={(d) => setActiveDemo(d)}
        liked={likedIds.has(activeDemo.id)}
        likeCount={likeCounts[activeDemo.id] ?? 0}
        onLike={() => handleLike(activeDemo.id)}
        onTrim={(start, end) => handleTrimDemo(activeDemo.id, start, end)}
      />
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-[1800ms] ease-out ${focused ? "opacity-100" : "opacity-60"}`}
      style={{ background: "#f2f2f2" }}
    >
      {showUpload && (
        <UploadModal 
          onClose={() => { setShowUpload(false); setEditingDemo(undefined); }} 
          onUpload={handleUpload} 
          editDemo={editingDemo}
        />
      )}

      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "#f2f2f2cc", backdropFilter: "blur(20px)", borderColor: "#00000010" }}
      >
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider">
          <button
            onClick={handleBackToHome}
            className="transition-colors duration-200"
            style={{ color: view === "home" ? "#1a1a1a" : "#888888" }}
          >
            eric the kid
          </button>
          {view === "folder" && openYear && (
            <>
              <span style={{ color: "#bbbbbb" }}>›</span>
              <span style={{ color: openYearPalette?.accent ?? "#1a1a1a" }}>{openYear}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {demos.length > 0 && (
            <p className="font-mono text-[10px] tracking-widest opacity-30" style={{ color: "#1a1a1a" }}>
              {demos.length} track{demos.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* User Mode Toggle */}
          <div 
            className="flex rounded-full p-1 shadow-sm backdrop-blur-md" 
            style={{ 
              background: "rgba(255,255,255,0.4)", 
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}
          >
            <button
              onClick={() => setRole("artist")}
              className="px-4 py-1.5 font-display text-sm md:text-base font-medium rounded-full transition-all duration-300"
              style={{
                background: role === "artist" ? "rgba(255,255,255,0.8)" : "transparent",
                color: role === "artist" ? "#000" : "rgba(0,0,0,0.5)",
                boxShadow: role === "artist" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
              }}
            >
              Artist
            </button>
            <button
              onClick={() => setRole("listener")}
              className="px-4 py-1.5 font-display text-sm md:text-base font-medium rounded-full transition-all duration-300"
              style={{
                background: role === "listener" ? "rgba(255,255,255,0.8)" : "transparent",
                color: role === "listener" ? "#000" : "rgba(0,0,0,0.5)",
                boxShadow: role === "listener" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
              }}
            >
              Listener
            </button>
          </div>

          {role === "artist" && (
            <button
              onClick={() => setShowUpload(true)}
              className="font-display font-medium text-sm md:text-base px-6 py-2 rounded-full transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-95 flex items-center gap-2"
              style={{ 
                background: "rgba(255,255,255,0.6)", 
                backdropFilter: "blur(10px)",
                color: "#000", 
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)" 
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5V19M5 12H19" />
              </svg>
              Upload
            </button>
          )}
        </div>
      </header>

      {/* ── HOME ── */}
      {view === "home" && (
        <main className="flex flex-col items-center">
          <div className="pt-16 pb-14 text-center px-8">
            <h1
              className="font-display leading-none tracking-tight"
              style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", color: "#111111" }}
            >
              Eric the Kid
            </h1>
            <p className="font-mono text-sm mt-3 opacity-35" style={{ color: "#1a1a1a" }}>
              (glimpse into my process)
            </p>
          </div>

          <div className="w-full max-w-5xl px-8 pb-28">
            <div className="flex flex-wrap justify-center gap-10">
              {demosByYear.map(({ year, demos: yd }) => (
                <FolderGrid
                  key={year}
                  year={year}
                  demos={yd.map((d) => ({ id: d.id }))}
                  onOpen={handleOpenFolder}
                />
              ))}
            </div>
          </div>

          <footer className="w-full text-center pb-10 font-mono text-[11px] opacity-20" style={{ color: "#1a1a1a" }}>
            showing the work, not hiding it.
          </footer>
        </main>
      )}

      {/* ── FOLDER ── */}
      {view === "folder" && openYear && (
        <main className="px-8 pt-8 pb-24 max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div className="flex items-end gap-5">
              <button
                onClick={handleBackToHome}
                className="font-display font-medium text-lg lg:text-xl transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-95 flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(10px)",
                  color: "#000",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "8px 16px",
                  borderRadius: "9999px",
                }}
              >
                ← All Years
              </button>
              <h2
                className="font-display leading-none"
                style={{ fontSize: "clamp(4rem, 10vw, 7rem)", color: openYearPalette?.accent ?? "#111111" }}
              >
                {openYear}
              </h2>
            </div>
            <span className="font-mono text-sm mb-2 opacity-30" style={{ color: "#1a1a1a" }}>
              {openFolderDemos.length} track{openFolderDemos.length !== 1 ? "s" : ""}
            </span>
          </div>

          {openFolderDemos.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-24 gap-5 ${role === "artist" ? "cursor-pointer" : ""}`}
              onClick={() => { if (role === "artist") setShowUpload(true); }}
            >
              <span style={{ fontSize: "4rem", color: "#bbbbbb" }}>♪</span>
              <p className="font-mono text-sm opacity-30" style={{ color: "#1a1a1a" }}>
                {role === "artist" ? "no tracks yet" : "no tracks released here yet"}
              </p>
              {role === "artist" && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="font-display font-medium text-base md:text-lg px-8 py-2.5 rounded-full transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-95 flex items-center gap-2"
                  style={{ 
                    background: "rgba(255,255,255,0.6)", 
                    backdropFilter: "blur(10px)",
                    color: "#000", 
                    border: "1px solid rgba(255,255,255,0.8)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)" 
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5V19M5 12H19" />
                  </svg>
                  Upload a Track
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {openFolderDemos.map((demo) => (
                <TrackThumbnail
                  key={demo.id}
                  demo={demo}
                  role={role}
                  onClick={handleOpenDemo}
                  liked={likedIds.has(demo.id)}
                  likeCount={likeCounts[demo.id] ?? 0}
                  onLike={(e) => { e.stopPropagation(); handleLike(demo.id); }}
                  onEdit={handleEditDemo}
                  onDelete={handleDeleteDemo}
                />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
};

export default Index;
