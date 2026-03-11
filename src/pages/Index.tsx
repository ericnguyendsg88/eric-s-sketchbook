import { useState, useEffect, useCallback } from "react";
import { years as defaultYears, yearColors } from "@/data/demos";
import type { Demo } from "@/data/demos";
import FolderGrid from "@/components/FolderGrid";
import TrackThumbnail from "@/components/TrackThumbnail";
import ListeningScreen from "@/components/ListeningScreen";
import UploadModal, { type UploadPayload } from "@/components/UploadModal";
import {
  saveLikes,
  loadLikes,
  type LikesData,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";

type View = "home" | "folder" | "player";
export type UserRole = "artist" | "listener";

// (Hydration comes from Supabase now)

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

  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // ── Restore persisted demos from Supabase on mount ──
  useEffect(() => {
    (async () => {
      // Check for invite or recovery links in the URL
      if (window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")) {
        setShowSetPassword(true);
      }

      // Check auth Session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setRole("artist");

      supabase.auth.onAuthStateChange((_event, curSession) => {
        if (curSession) {
          setRole("artist");
          setShowLogin(false);
        } else {
          setRole("listener");
        }
      });

      // Fetch Demos
      const { data, error } = await supabase.from("demos").select("*").order("created_at", { ascending: true });
      if (!error && data) {
        setDemos(data as Demo[]);
      }
      
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

  // ── Sync Demos to Supabase implicitly handled via actions ──

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
    // 1. Storage Upload logic for Supabase
    let audioUrl = editingDemo?.audioUrl;
    let coverUrl = editingDemo?.coverUrl;

    if (payload.audioFile) {
      const ext = payload.audioFile.name.split('.').pop();
      const fileName = `audio-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(fileName, payload.audioFile);
      if (error) {
        alert(`Audio upload failed: ${error.message}. Please check your Supabase Storage policies!`);
        return;
      }
      audioUrl = supabase.storage.from("media").getPublicUrl(fileName).data.publicUrl;
    }

    if (payload.coverFile) {
      const ext = payload.coverFile.name.split('.').pop();
      const fileName = `cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(fileName, payload.coverFile);
      if (error) {
        alert(`Cover upload failed: ${error.message}. Please check your Supabase Storage policies!`);
        return;
      }
      coverUrl = supabase.storage.from("media").getPublicUrl(fileName).data.publicUrl;
    }

    const payloadData = {
      title: payload.title,
      year: payload.year,
      "vibeNote": payload.vibeNote,
      "processNote": payload.processNote || "",
      lyrics: payload.lyrics,
      "audioUrl": audioUrl,
      "coverUrl": coverUrl,
      duration: payload.duration,
      "trimStart": editingDemo?.trimStart || 0,
      "trimEnd": editingDemo?.trimEnd || payload.duration || 0,
    };

    if (editingDemo) {
      const { data } = await supabase.from("demos").update(payloadData).eq("id", editingDemo.id).select().single();
      if (data) setDemos((prev) => prev.map(d => d.id === editingDemo.id ? (data as Demo) : d));
    } else {
      const { data } = await supabase.from("demos").insert([payloadData]).select().single();
      if (data) setDemos((prev) => [...prev, data as Demo]);
    }
    
    setShowUpload(false);
    setEditingDemo(undefined);
    setOpenYear(payload.year);
    setView("folder");
  }, [editingDemo]);

  const handleDeleteDemo = useCallback(async (demo: Demo) => {
    if (confirm(`Are you sure you want to delete "${demo.title}"?`)) {
      await supabase.from("demos").delete().eq("id", demo.id);
      setDemos((prev) => prev.filter(d => d.id !== demo.id));
    }
  }, []);

  const handleEditDemo = useCallback((demo: Demo) => {
    setEditingDemo(demo);
    setShowUpload(true);
  }, []);

  const handleTrimDemo = useCallback(async (demoId: string, trimStart: number, trimEnd: number) => {
    await supabase.from("demos").update({ trimStart, trimEnd }).eq("id", demoId);
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

  return (
    <div
      className={`min-h-screen transition-all duration-[1800ms] ease-out bg-sketchy ${focused ? "opacity-100" : "opacity-60"}`}
    >
      {/* ── Player view ── */}
      {view === "player" && activeDemo && (
        <ListeningScreen
          demo={activeDemo}
          allDemos={openFolderDemos.length > 0 ? openFolderDemos : demos.filter((d) => d.year === activeDemo.year)}
          role={role}
          onBack={handleBackToFolder}
          onSelectDemo={(d) => setActiveDemo(d)}
          liked={likedIds.has(activeDemo.id)}
          likeCount={likeCounts[activeDemo.id] ?? 0}
          onLike={() => handleLike(activeDemo.id)}
          onTrim={(start, end) => handleTrimDemo(activeDemo.id, start, end)}
        />
      )}

      {/* Render the rest of the application behind the player */}
      <div 
        className="min-h-screen transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ 
          opacity: view === "player" ? 0.3 : 1,
          pointerEvents: view === "player" ? "none" : "auto",
          filter: view === "player" ? "blur(8px)" : "blur(0px)" 
        }}
      >
      {showUpload && (
        <UploadModal 
          onClose={() => { setShowUpload(false); setEditingDemo(undefined); }} 
          onUpload={handleUpload} 
          editDemo={editingDemo}
        />
      )}

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#f0f0f0] border border-black/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 flex flex-col gap-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Artist Login</h2>
                <p className="font-mono text-xs opacity-50 mt-1">Authenticate to upload and modify tracks</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError("");
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) setLoginError(error.message);
                }} 
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] tracking-widest opacity-60">EMAIL</label>
                  <input
                    type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 font-display outline-none focus:bg-white focus:border-black/20 transition-all font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] tracking-widest opacity-60">PASSWORD</label>
                  <input
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 font-sans text-sm tracking-widest outline-none focus:bg-white focus:border-black/20 transition-all font-medium"
                  />
                </div>
                {loginError && <p className="text-red-600 font-mono text-xs text-center">{loginError}</p>}
                
                <div className="flex gap-3 justify-end mt-2">
                  <button type="button" onClick={() => setShowLogin(false)} className="px-6 py-2.5 rounded-full font-mono text-xs opacity-60 hover:opacity-100 transition-opacity">
                    CANCEL
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-full font-mono text-xs text-white" style={{ background: "#222" }}>
                    LOGIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Password Modal (for Invites) ── */}
      {showSetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#f0f0f0] border border-black/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 flex flex-col gap-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome, Artist!</h2>
                <p className="font-mono text-xs opacity-50 mt-1">Please set a password for your new account so you can log in later.</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError("");
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) {
                    setLoginError(error.message);
                  } else {
                    setShowSetPassword(false);
                    // Clear the hash from the URL so it doesn't trigger again on refresh
                    window.location.hash = "";
                  }
                }} 
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] tracking-widest opacity-60">NEW PASSWORD</label>
                  <input
                    type="password" required minLength={6}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 font-sans text-sm tracking-widest outline-none focus:bg-white focus:border-black/20 transition-all font-medium"
                    placeholder="Min 6 characters"
                  />
                </div>
                {loginError && <p className="text-red-600 font-mono text-xs text-center">{loginError}</p>}
                
                <div className="flex gap-3 justify-end mt-2">
                  <button type="submit" className="px-6 py-2.5 rounded-full font-mono text-xs text-white w-full" style={{ background: "#222" }}>
                    SAVE PASSWORD & ENTER
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b"
        style={{ 
          background: "rgba(35, 35, 35, 0.55)", 
          backdropFilter: "blur(24px) contrast(1.1)", 
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1) inset, 0 4px 16px rgba(0,0,0,0.05)"
        }}
      >
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider">
          <button
            onClick={handleBackToHome}
            className="transition-colors duration-200"
            style={{ color: view === "home" ? "#f2f2f2" : "#a0a0a0" }}
          >
            eric the kid
          </button>
          {view === "folder" && openYear && (
            <>
              <span style={{ color: "#777777" }}>›</span>
              <span style={{ color: openYearPalette?.accent ? openYearPalette.accent : "#e2e2e2", filter: "brightness(1.5)" }}>{openYear}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {demos.length > 0 && (
            <p className="font-mono text-[10px] tracking-widest opacity-60" style={{ color: "#e2e2e2" }}>
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
              onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) setRole("artist");
                else setShowLogin(true);
              }}
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
              onClick={async () => {
                setRole("listener");
                await supabase.auth.signOut();
              }}
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
      {/* ── Footer to close the page context ── */}
      </div>
    </div>
  );
};

export default Index;
