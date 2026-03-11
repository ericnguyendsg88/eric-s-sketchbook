import { useState } from "react";
import type { Demo } from "@/data/demos";
import { yearColors } from "@/data/demos";

interface TrackThumbnailProps {
  demo: Demo;
  role: "artist" | "listener";
  onClick: (demo: Demo) => void;
  onDelete?: (demo: Demo) => void;
  onEdit?: (demo: Demo) => void;
  liked: boolean;
  likeCount: number;
  onLike: (e: React.MouseEvent) => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TrackThumbnail = ({ demo, role, onClick, onDelete, onEdit, liked, likeCount, onLike }: TrackThumbnailProps) => {
  const [hovered, setHovered] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const palette = yearColors[demo.year] ?? { bg: "from-stone-100 to-slate-200", accent: "#57534e", text: "#292524", shadow: "#57534e22" };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(e);
    if (!liked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 500);
    }
  };

  return (
    <div
      className="flex flex-col gap-2.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Album art — clickable to open */}
      <div
        onClick={() => onClick(demo)}
        className="relative w-full aspect-square rounded-2xl overflow-hidden border transition-all duration-300"
        style={{
          borderColor: hovered ? `${palette.accent}44` : "#00000012",
          transform: hovered ? "scale(1.03) translateY(-3px)" : "scale(1)",
          boxShadow: hovered
            ? `0 16px 40px ${palette.shadow}, 0 4px 12px #00000018`
            : "0 2px 8px #0000000e",
          background: "#e8e8e8",
          cursor: "pointer",
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${palette.bg}`} />

        {demo.coverUrl ? (
          <img src={demo.coverUrl} alt={demo.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-12">
              {Array.from({ length: 18 }).map((_, i) => {
                const h = 20 + Math.sin(i * 0.8 + parseInt(demo.id.replace(/\D/g, "") || "1") * 1.3) * 15 + Math.cos(i * 0.4) * 10;
                return (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-700"
                    style={{
                      width: "3px",
                      height: `${Math.max(6, h)}px`,
                      background: palette.accent,
                      opacity: hovered ? 0.7 : 0.3,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Glass sheen */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#ffffff55 0%,#ffffff00 50%)", pointerEvents: "none" }} />

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-200"
          style={{ opacity: hovered ? 1 : 0, background: "#00000018" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: palette.accent }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#fff">
              <polygon points="6,3 17,10 6,17" />
            </svg>
          </div>
        </div>

        {/* Duration pill */}
        <div
          className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded-md"
          style={{ background: "#ffffffcc", color: palette.text }}
        >
          {formatDuration(demo.duration)}
        </div>

        {/* Artist controls: Edit & Delete */}
        {role === "artist" && (
          <div
            className="absolute top-2 right-2 flex flex-col gap-1 transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(-10px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit?.(demo)}
              className="w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
              title="Edit track"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button
              onClick={() => onDelete?.(demo)}
              className="w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-110 hover:bg-red-50 transition-all"
              title="Delete track"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Title + heart row */}
      <div className="flex items-start justify-between gap-1 px-0.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3
            className="font-display text-base leading-tight tracking-tight truncate transition-colors duration-200"
            style={{ color: hovered ? palette.accent : "#1a1a1a" }}
          >
            {demo.title}
          </h3>
          <p className="text-[11px] font-mono truncate" style={{ color: "#888888" }}>
            {demo.vibeNote}
          </p>
        </div>

        {/* Heart button */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5 focus:outline-none"
          aria-label={liked ? "Unlike" : "Like"}
          style={{ lineHeight: 1 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={liked ? "#e11d48" : "none"}
            stroke={liked ? "#e11d48" : "#bbbbbb"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), fill 0.15s ease",
              transform: heartBurst ? "scale(1.45)" : "scale(1)",
              filter: heartBurst ? "drop-shadow(0 0 6px #e11d4877)" : "none",
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount > 0 && (
            <span
              className="font-mono text-[10px] transition-colors duration-150"
              style={{ color: liked ? "#e11d48" : "#999999" }}
            >
              {likeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default TrackThumbnail;
