import { useState, useRef, useEffect, useCallback } from "react";
import type { Demo, LyricLine } from "@/data/demos";
import { yearColors } from "@/data/demos";
import { supabase } from "@/lib/supabase";

export type UserRole = "artist" | "listener";

interface ListeningScreenProps {
  demo: Demo;
  allDemos: Demo[];
  role: UserRole;
  onBack: () => void;
  onSelectDemo?: (demo: Demo) => void;
  liked?: boolean;
  likeCount?: number;
  onLike?: () => void;
  onTrim?: (start: number, end: number) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const ListeningScreen = ({ demo, allDemos, role, onBack, onSelectDemo, liked = false, likeCount = 0, onLike, onTrim }: ListeningScreenProps) => {
  const palette = yearColors[demo.year] ?? {
    bg: "from-stone-100 to-slate-200",
    accent: "#57534e",
    text: "#292524",
    shadow: "#57534e22",
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(demo.duration ?? 0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  const [swipeFlash, setSwipeFlash] = useState<"left" | "right" | null>(null);
  const [heartBurst, setHeartBurst] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const currentIndex = allDemos.findIndex((d) => d.id === demo.id);
  const prevDemo = currentIndex > 0 ? allDemos[currentIndex - 1] : null;
  const nextDemo = currentIndex < allDemos.length - 1 ? allDemos[currentIndex + 1] : null;

  // Lyric Comments State
  const [commentOpen, setCommentOpen] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [lyricComments, setLyricComments] = useState<Record<number, string[]>>({});

  const [isTrimming, setIsTrimming] = useState(false);
  const [pageScroll, setPageScroll] = useState(0);
  const [staticCoverUrl, setStaticCoverUrl] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(demo.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(demo.trimEnd ?? 0);

  // Sync Studio State
  const [syncMode, setSyncMode] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>(demo.lyrics);
  const [syncIndex, setSyncIndex] = useState(0);

  useEffect(() => {
    setStaticCoverUrl(null); // Instantly clear previous static cover
    if (!demo.coverUrl) return;

    const img = new Image();
    // Allow local blobs to pass through by omitting crossOrigin entirely
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 120;
        let w = img.width || 100;
        let h = img.height || 100;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = w * ratio;
          h = h * ratio;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setStaticCoverUrl(canvas.toDataURL("image/jpeg", 0.8)); // Use JPEG for smaller memory footprint
        }
      } catch (err) {
        setStaticCoverUrl(demo.coverUrl); // fallback to original animation if blocked
      }
    };
    img.onerror = () => {
      setStaticCoverUrl(demo.coverUrl); // fallback to original animation if failed loading for canvas draw
    };
    img.src = demo.coverUrl;
  }, [demo.coverUrl]);

  // Audio Visualizer Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(demo.duration ?? 0);
    setTrimStart(demo.trimStart ?? 0);
    setTrimEnd(demo.trimEnd ?? demo.duration ?? 0);
    setIsTrimming(false);
  }, [demo.id, demo.duration, demo.trimStart, demo.trimEnd]);

  // Enforce trim logic
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      if (currentTime >= trimEnd && trimEnd > 0) {
        audioRef.current.pause();
        audioRef.current.currentTime = trimStart;
        setCurrentTime(trimStart);
        setIsPlaying(false);
      }
    }
  }, [currentTime, trimEnd, trimStart, isPlaying]);

  // Audio visualization animation loop
  const animateWaveform = useCallback(() => {
    if (!demo.coverUrl && analyserRef.current && dataArrayRef.current && isPlaying) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
      for (let i = 0; i < 26; i++) {
        const el = document.getElementById(`waveform-bar-${i}`);
        if (el) {
          // Take frequency bins across the spectrum (skip the very low muddy ones)
          const dataIndex = Math.floor(i * (dataArrayRef.current.length / 32)) + 2; 
          const val = dataArrayRef.current[dataIndex] / 255;
          const targetHeight = Math.max(6, val * 64);
          el.style.height = `${targetHeight}px`;
        }
      }
    }
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animateWaveform);
    }
  }, [isPlaying, demo.coverUrl]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animateWaveform);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, animateWaveform]);

  // Navigate with slide animation
  const navigateTo = useCallback(
    (target: Demo, dir: "left" | "right") => {
      setSlideDir(dir);
      setSwipeFlash(dir);
      setTimeout(() => {
        onSelectDemo?.(target);
        setSlideDir(null);
        setSwipeFlash(null);
      }, 260);
    },
    [onSelectDemo]
  );

  const goNext = useCallback(() => { if (nextDemo) navigateTo(nextDemo, "left"); }, [nextDemo, navigateTo]);
  const goPrev = useCallback(() => { if (prevDemo) navigateTo(prevDemo, "right"); }, [prevDemo, navigateTo]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Intercept for Tap-To-Sync
      if (syncMode) {
        if (e.key === " ") {
          e.preventDefault();
          if (syncIndex < syncedLyrics.length) {
            setSyncedLyrics(prev => {
              const copy = [...prev];
              copy[syncIndex] = { ...copy[syncIndex], timestamp: currentTime };
              return copy;
            });
            setSyncIndex(i => i + 1);
          }
        }
        return;
      }

      // Normal map
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, syncMode, syncIndex, syncedLyrics, currentTime]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !demo.audioUrl) return;
    
    // Connect audio visualizer context once on first play
    if (!audioCtxRef.current && !demo.coverUrl) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128; // 64 frequency bins
        source.connect(analyser);
        analyser.connect(ctx.destination);
        
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Re-initialize AudioContext if it suspended
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }

      if (currentTime >= trimEnd && trimEnd > 0) {
        audio.currentTime = trimStart;
      } else if (currentTime < trimStart) {
        audio.currentTime = trimStart;
      }
      
      // Browser might suspend play() if not explicitly loaded in some instances
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Playback failed:", err);
        // Fallback: sometimes browsers fail the first play on a blob URL without user interaction sequence aligned
      });
    }
  };

  const handleLike = () => {
    onLike?.();
    if (!liked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 500);
    }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  // Center slide style + Scroll parallax for mobile
  const scrollScale = Math.max(0.7, 1 - (pageScroll / 600));
  const scrollTranslateY = Math.min(0, pageScroll / -4);
  const scrollOpacity = Math.max(0, 1 - (pageScroll / 400));

  const centerStyle = slideDir
    ? {
        transform: `${slideDir === "left" ? "translateX(-50px)" : "translateX(50px)"} scale(${scrollScale}) translateY(${scrollTranslateY}px)`,
        opacity: 0,
        transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.26s ease",
        transformOrigin: "top center",
      }
    : {
        transform: `translateX(0) scale(${scrollScale}) translateY(${scrollTranslateY}px)`,
        opacity: scrollOpacity,
        transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.26s ease",
        transformOrigin: "top center",
      };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#f6f6f6]" />
      
      {/* ── Apple Music Glassmorphism Background (Static) ── */}
      {demo.coverUrl && (
        <>
          {/* Base image severely blurred */}
          <div 
            className="fixed inset-0 z-40"
            style={{
              backgroundImage: `url(${staticCoverUrl || demo.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(200%) brightness(0.9)',
              transform: 'scale(1.2)', 
              opacity: 0.6
            }}
          />
          {/* Glass overlay */}
          <div className="fixed inset-0 z-40" style={{ background: "rgba(246, 246, 246, 0.4)", backdropFilter: "blur(40px)" }} />
        </>
      )}
      
      {/* Ambient tint fallback */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${palette.accent}15 0%, transparent 80%)` }}
      />

    <div
      className="fixed inset-0 z-50 flex flex-col p-4 md:p-8 overflow-y-auto overflow-x-hidden selection:bg-black selection:text-white transition-opacity duration-300 scroll-smooth isolate"
      style={{ opacity: 1 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onScroll={(e) => setPageScroll(e.currentTarget.scrollTop)}
    >
      <audio
        ref={audioRef}
        src={demo.audioUrl}
        preload="auto"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(trimStart);
        }}
        onError={(e) => console.warn("Audio source error:", e.currentTarget.error)}
      />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 mb-4 md:mb-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs tracking-widest opacity-35 hover:opacity-70 transition-opacity"
          style={{ color: "#1a1a1a" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-display font-medium text-base">Back</span>
        </button>

        {/* Dot pagination */}
        <div className="flex items-center gap-1.5">
          {allDemos.map((d, i) => (
            <button
              key={d.id}
              onClick={() => navigateTo(d, i > currentIndex ? "left" : "right")}
              className="transition-all duration-200 rounded-full"
              style={{
                width: d.id === demo.id ? "20px" : "6px",
                height: "6px",
                background: d.id === demo.id ? palette.accent : "#00000020",
              }}
            />
          ))}
        </div>

        <span className="font-mono text-[10px] tracking-widest opacity-25" style={{ color: "#1a1a1a" }}>
          {currentIndex + 1} / {allDemos.length}
        </span>
      </div>

      {/* ── Main layout: [PREV] [art + controls] [lyrics] [NEXT] ── */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-4 md:gap-0 mt-6 md:mt-0">

        {/* PREV zone (hidden on mobile) */}
        <button
          onClick={goPrev}
          disabled={!prevDemo}
          onMouseEnter={() => setHoverPrev(true)}
          onMouseLeave={() => setHoverPrev(false)}
          className="hidden md:flex flex-shrink-0 items-center justify-center disabled:cursor-default"
          style={{
            width: "13%",
            background: hoverPrev && prevDemo ? `${palette.accent}07` : "transparent",
            transition: "background 0.2s ease",
          }}
          aria-label="Previous track"
        >
          {prevDemo && (
            <div
              className="flex flex-col items-center gap-3 transition-all duration-200"
              style={{
                opacity: hoverPrev ? 1 : 0.2,
                transform: hoverPrev ? "scale(1.1)" : "scale(1) translateX(6px)",
              }}
            >
              {/* Circle arrow */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  border: `2px solid ${palette.accent}`,
                  background: hoverPrev ? palette.accent : "transparent",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path
                    d="M16 5L9 13l7 8"
                    stroke={hoverPrev ? "#fff" : palette.accent}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-center max-w-[88px]">
                <p className="font-mono text-[9px] tracking-widest mb-0.5 opacity-50" style={{ color: "#1a1a1a" }}>PREV</p>
                <p className="font-display text-xs leading-tight truncate" style={{ color: palette.accent }}>{prevDemo.title}</p>
              </div>
            </div>
          )}
        </button>

        {/* CENTER — album art + controls */}
        <div
          className="flex-1 flex flex-col items-center justify-start md:justify-center gap-6 px-4 py-8 md:py-0 sticky md:static top-0"
          style={{ ...centerStyle, zIndex: 20 }}
        >
          {/* Big album art */}
          <div
            className="relative rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300"
            style={{
              width: "min(340px, 70vw)",
              height: "min(340px, 70vw)",
              transform: `scale(${isPlaying ? 1.02 : 0.98})`,
              transformOrigin: "center center",
              boxShadow: `0 24px 64px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.1)`,
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${palette.bg}`} />
            {demo.coverUrl ? (
              <img src={demo.coverUrl} alt={demo.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-20">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <div
                      key={i}
                      id={`waveform-bar-${i}`}
                      className="rounded-full transition-all duration-[50ms]"
                      style={{
                        width: "5px",
                        height: "6px",
                        background: palette.accent,
                        opacity: 0.65,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#ffffff40 0%,#ffffff00 50%)", pointerEvents: "none" }} />
          </div>

          {/* Track info */}
          <div className="text-center">
            <h1 className="font-display text-4xl tracking-tight leading-tight" style={{ color: "#111111" }}>
              {demo.title}
            </h1>
            <p className="font-mono text-xs mt-1 opacity-35" style={{ color: "#1a1a1a" }}>{demo.vibeNote}</p>
          </div>

          {/* Progress bar / Trim UI */}
          <div className="w-full max-w-sm flex flex-col gap-1.5">
            {isTrimming ? (
              <div className="flex flex-col gap-2 p-3 bg-white/40 backdrop-blur rounded-xl border border-black/5">
                <div className="flex justify-between font-mono text-[10px] text-black/50">
                  <span>Start: {formatTime(trimStart)}</span>
                  <span>End: {formatTime(trimEnd)}</span>
                </div>
                <input
                  type="range" min={0} max={duration} step={0.1} value={trimStart}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v < trimEnd) setTrimStart(v);
                  }}
                  className="w-full accent-black"
                />
                <input
                  type="range" min={0} max={duration} step={0.1} value={trimEnd}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > trimStart) setTrimEnd(v);
                  }}
                  className="w-full accent-black"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTrimming(false)}
                    className="flex-1 py-1 text-xs font-mono font-bold bg-black/10 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onTrim?.(trimStart, trimEnd);
                      setIsTrimming(false);
                    }}
                    className="flex-1 py-1 text-xs font-mono bg-black text-white rounded-md"
                  >
                    Apply Cut
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="w-full h-3 md:h-4 rounded-full cursor-pointer relative shadow-inner group transition-all duration-300 hover:scale-y-110"
                  style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(8px)" }}
                  onClick={seekTo}
                >
                  {/* Trim bounds indicators */}
                  {trimStart > 0 && <div className="absolute top-0 bottom-0 bg-black/30" style={{ left: 0, width: `${(trimStart / Math.max(1, duration)) * 100}%` }} />}
                  {trimEnd < duration && <div className="absolute top-0 bottom-0 bg-black/30" style={{ left: `${(trimEnd / Math.max(1, duration)) * 100}%`, right: 0 }} />}
                  <div
                    className="h-full rounded-full absolute left-0 top-0 bottom-0 shadow-[0_0_10px_rgba(255,255,255,0.5)] flex items-center justify-end"
                    style={{ width: `${progress * 100}%`, background: "rgba(255,255,255,0.95)", transition: "width 0.1s linear", minWidth: "4px" }}
                  >
                    {/* Tiny drag handle for mobile explicitly visible */}
                    <div className="w-2 h-full bg-white rounded-full shadow-md transform scale-y-[1.5] shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[10px] opacity-30" style={{ color: "#1a1a1a" }}>
                  <span>{formatTime(Math.max(0, currentTime - trimStart))}</span>
                  <span>{formatTime(Math.max(0, trimEnd - trimStart))}</span>
                </div>
              </>
            )}
          </div>

          {/* Controls row: play + heart + edit */}
          <div className="flex items-center gap-6 relative">
            <button
              onClick={togglePlay}
              disabled={!demo.audioUrl}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-30"
              style={{ background: palette.accent, boxShadow: `0 6px 24px ${palette.accent}55` }}
            >
              {isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="#fff">
                  <rect x="5" y="3" width="4" height="16" rx="2" />
                  <rect x="13" y="3" width="4" height="16" rx="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="#fff">
                  <polygon points="5,3 19,11 5,19" />
                </svg>
              )}
            </button>

            {/* Heart like */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-0.5 focus:outline-none"
              aria-label={liked ? "Unlike" : "Like"}
            >
              <svg
                width="28" height="28" viewBox="0 0 24 24"
                fill={liked ? "#e11d48" : "none"}
                stroke={liked ? "#e11d48" : "#bbbbbb"}
                strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), fill 0.15s",
                  transform: heartBurst ? "scale(1.5)" : "scale(1)",
                  filter: heartBurst ? "drop-shadow(0 0 8px #e11d4866)" : "none",
                }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 && (
                <span className="font-mono text-[11px]" style={{ color: liked ? "#e11d48" : "#999999" }}>
                  {likeCount}
                </span>
              )}
            </button>

            {/* Cutter Toggle - Artist Only */}
            {role === "artist" && (
              <button
                onClick={() => setIsTrimming(!isTrimming)}
                className="absolute -right-12 focus:outline-none transition-transform hover:scale-110 p-2"
                style={{ color: isTrimming ? "#000" : "#888", opacity: isTrimming ? 1 : 0.6 }}
                aria-label="Trim Audio"
                title="Cut Track"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L6 22"></path>
                  <path d="M18 2L18 22"></path>
                  <path d="M9 12H15"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* LYRICS panel (Apple Music style glass) */}
        <div
          className="relative z-30 flex-shrink-0 flex flex-col gap-4 py-8 px-6 md:px-8 overflow-visible md:overflow-y-auto bg-black/10 md:bg-black/5 rounded-[2rem] md:rounded-3xl backdrop-blur-[32px] border border-white/20 shadow-xl"
          style={{ 
            width: "100%", 
            scrollbarWidth: "none", 
            minHeight: "85vh",
            marginTop: "10vh", // Provides space for natural scrolling past the sticky header
            maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)"
          }}
        >
          <style>{`
            @media (min-width: 768px) {
              div.flex-shrink-0.flex-col > .font-display { font-size: 1.5rem; }
              div.flex-shrink-0.flex-col { width: 35% !important; margin-left: 1rem; }
            }
          `}</style>
          
          <div className="flex items-center justify-between mb-4 mt-8">
            <p className="font-display text-2xl font-bold tracking-tight text-black/80">Lyrics</p>
            {role === "artist" && demo.lyrics.length > 0 && !syncMode && (
              <button 
                onClick={() => {
                   setSyncMode(true);
                   setSyncIndex(0);
                   setSyncedLyrics(demo.lyrics.map(l => ({...l, timestamp: undefined})));
                   if (audioRef.current) {
                     audioRef.current.currentTime = 0;
                     audioRef.current.play();
                     setIsPlaying(true);
                   }
                }}
                className="text-xs font-mono px-4 py-2 rounded-full bg-black/5 text-black hover:bg-black hover:text-white transition-all duration-300"
              >
                Tap-to-Sync Setup
              </button>
            )}
            {syncMode && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-black/50 animate-pulse mr-2 md:inline hidden">
                  {syncIndex < syncedLyrics.length ? "Press SPACEBAR on each line..." : "All done!"}
                </span>
                <button 
                  onClick={async () => {
                     setSyncMode(false);
                     demo.lyrics = syncedLyrics; // Mutate local object for instant feedback
                     await supabase.from("demos").update({ lyrics: syncedLyrics }).eq("id", demo.id);
                     if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
                  }}
                  className="text-[11px] font-mono font-bold tracking-widest px-4 py-2 rounded-full bg-[#111] text-white hover:bg-black transition-all duration-300 shadow-lg"
                >
                  SAVE SYNC
                </button>
              </div>
            )}
          </div>

          {demo.lyrics.length > 0 ? (
            <div className="flex flex-col gap-8 pb-32">
              {(syncMode ? syncedLyrics : demo.lyrics).map((line, i) => {
                const isFinished = line.finished;
                const comments = lyricComments[i] || [];
                const isCommentOpen = commentOpen === i;

                // Sync Highlight Logic
                const lyricsArray = syncMode ? syncedLyrics : demo.lyrics;
                const activeLyricIndex = lyricsArray.findIndex((l, index, arr) => {
                  if (l.timestamp === undefined) return false;
                  const nextL = arr[index + 1];
                  if (!nextL || nextL.timestamp === undefined) return currentTime >= l.timestamp;
                  return currentTime >= l.timestamp && currentTime < nextL.timestamp;
                });
                
                const isActive = activeLyricIndex === i;
                const isPendingSync = syncMode && i === syncIndex;

                let textColor = isFinished ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)";
                let scale = "scale(1)";
                const textStyle: React.CSSProperties = { transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" };

                if (isActive && !syncMode) {
                   textColor = palette.accent;
                   scale = "scale(1.05)";
                   textStyle.textShadow = `0 4px 12px ${palette.accent}66`;
                } else if (isPendingSync) {
                   textColor = palette.accent;
                   scale = "scale(1.05)";
                   textStyle.textShadow = `0 4px 12px ${palette.accent}66`;
                } else if (syncMode && line.timestamp !== undefined) {
                   textColor = "rgba(0,0,0,0.2)"; // already synced lines fade out
                } else if (!isFinished) {
                   textStyle.textDecoration = "underline wavy";
                   textStyle.textDecorationColor = "rgba(0,0,0,0.2)";
                   textStyle.textUnderlineOffset = "6px";
                }

                return (
                  <div key={i} className="group relative transition-all duration-300" style={{ transform: scale, transformOrigin: 'left' }}>
                    
                    {/* Visual sync pulse guide while syncing */}
                    {isPendingSync && (
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-ping" style={{ background: palette.accent }} />
                    )}

                    <p
                      onClick={() => {
                        if (syncMode) {
                          // Allow tapping directly on the lyric to sync it on mobile
                          if (syncIndex === i) {
                            setSyncedLyrics(prev => {
                              const copy = [...prev];
                              copy[i] = { ...copy[i], timestamp: currentTime };
                              return copy;
                            });
                            setSyncIndex(idx => idx + 1);
                          }
                          return;
                        }
                        if (role === "listener") setCommentOpen(isCommentOpen ? null : i);
                        else if (line.timestamp !== undefined && audioRef.current) {
                           audioRef.current.currentTime = line.timestamp;
                           if (!isPlaying) togglePlay();
                        }
                      }}
                      className={`font-display text-2xl md:text-3xl font-medium leading-tight relative transition-all duration-300 ${!syncMode && role === "listener" ? "cursor-pointer hover:text-black hover:scale-[1.02] origin-left" : (!syncMode && line.timestamp !== undefined ? "cursor-pointer hover:opacity-100" : (isPendingSync ? "cursor-pointer" : ""))}`}
                      style={{ color: textColor, ...textStyle }}
                    >
                      {line.text}
                      
                      {/* Little comment indicator */}
                      {!syncMode && (comments.length > 0 || (role === "listener" && commentOpen === i)) && (
                        <span 
                          className="inline-block ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ background: `${palette.accent}15`, color: palette.accent }}
                        >
                          {comments.length}
                        </span>
                      )}
                    </p>

                    {/* Inline Commenting UI */}
                    {isCommentOpen && (
                      <div className="mt-2 p-3 bg-white border rounded-xl shadow-sm" style={{ borderColor: "#00000010" }}>
                        {comments.length > 0 ? (
                          <div className="flex flex-col gap-2 mb-3 max-h-32 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
                            {comments.map((c, idx) => (
                              <div key={idx} className="bg-gray-50 p-2 rounded-lg text-xs font-mono text-gray-700">
                                <span className="font-bold text-gray-400 mr-2">A fan:</span>{c}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] font-mono text-gray-400 mb-2">No comments yet. Be the first!</p>
                        )}
                        
                        {role === "listener" && (
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              placeholder="add a thought..."
                              className="flex-1 bg-gray-50 border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                              style={{ borderColor: "#00000015" }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && commentText.trim()) {
                                  setLyricComments(prev => ({
                                    ...prev,
                                    [i]: [...(prev[i] || []), commentText.trim()]
                                  }));
                                  setCommentText("");
                                }
                              }}
                            />
                            <button
                              disabled={!commentText.trim()}
                              className="bg-black text-white text-[10px] font-mono px-2 py-1 rounded-lg disabled:opacity-30"
                              onClick={() => {
                                if (commentText.trim()) {
                                  setLyricComments(prev => ({
                                    ...prev,
                                    [i]: [...(prev[i] || []), commentText.trim()]
                                  }));
                                  setCommentText("");
                                }
                              }}
                            >
                              POST
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          ) : (
            <p className="font-mono text-xs italic opacity-25" style={{ color: "#1a1a1a" }}>
              no lyrics yet
            </p>
          )}
        </div>

        {/* NEXT zone (hidden on mobile) */}
        <button
          onClick={goNext}
          disabled={!nextDemo}
          onMouseEnter={() => setHoverNext(true)}
          onMouseLeave={() => setHoverNext(false)}
          className="hidden md:flex flex-shrink-0 items-center justify-center disabled:cursor-default"
          style={{
            width: "13%",
            background: hoverNext && nextDemo ? `${palette.accent}07` : "transparent",
            transition: "background 0.2s ease",
          }}
          aria-label="Next track"
        >
          {nextDemo && (
            <div
              className="flex flex-col items-center gap-3 transition-all duration-200"
              style={{
                opacity: hoverNext ? 1 : 0.2,
                transform: hoverNext ? "scale(1.1)" : "scale(1) translateX(-6px)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  border: `2px solid ${palette.accent}`,
                  background: hoverNext ? palette.accent : "transparent",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path
                    d="M10 5l7 8-7 8"
                    stroke={hoverNext ? "#fff" : palette.accent}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-center max-w-[88px]">
                <p className="font-mono text-[9px] tracking-widest mb-0.5 opacity-50" style={{ color: "#1a1a1a" }}>NEXT</p>
                <p className="font-display text-xs leading-tight truncate" style={{ color: palette.accent }}>{nextDemo.title}</p>
              </div>
            </div>
          )}
        </button>

        {/* Swipe flash */}
        {swipeFlash && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: swipeFlash === "left"
                ? `linear-gradient(to left, ${palette.accent}14, transparent)`
                : `linear-gradient(to right, ${palette.accent}14, transparent)`,
              animation: "swipeFade 0.4s ease forwards",
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes barBeat {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.2); }
        }
        @keyframes swipeFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default ListeningScreen;
