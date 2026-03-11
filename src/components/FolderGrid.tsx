import { useState } from "react";

interface FolderGridProps {
  year: number;
  demos: { id: string }[];
  onOpen: (year: number) => void;
}

const FolderGrid = ({ year, onOpen }: FolderGridProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className="group flex flex-col items-center gap-6 focus:outline-none relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(year)}
      aria-label={`Open ${year} folder`}
      style={{
        animation: `float ${2.5 + (year % 3) * 0.5}s ease-in-out infinite alternate`,
        animationDelay: `${(year % 4) * 0.3}s`,
      }}
    >
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(-1deg); }
        }
      `}</style>
      {/* Enlarged Mac-style folder SVG with floating/drop shadow */}
      <div
        className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative"
        style={{
          transform: hovered ? "scale(1.15) translateY(-8px)" : "scale(1)",
          filter: hovered
            ? "drop-shadow(0 20px 30px #3b82f666) drop-shadow(0 8px 12px #00000022)"
            : "drop-shadow(0 8px 16px #00000018) drop-shadow(0 4px 6px #3b82f633)",
        }}
      >
        <svg
          width="200"
          height="160"
          viewBox="0 0 120 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Back folder body */}
          <rect
            x="0" y="14" width="120" height="79"
            rx="8"
            fill={hovered ? "#2563eb" : "#3b82f6"}
          />
          {/* Top-left tab */}
          <path
            d="M0 14 Q0 6 8 6 H42 Q50 6 54 14 H0Z"
            fill={hovered ? "#1d4ed8" : "#2563eb"}
          />
          {/* Add a fun "sheen" across the folder body */}
          <rect
            x="6" y="24" width="108" height="20"
            rx="6"
            fill="white"
            opacity={hovered ? "0.15" : "0.08"}
            style={{ transition: "opacity 0.3s" }}
          />

          {/* If the year divides by 2, add a cute lil document peeking out when hovered */}
          <g
            style={{
              transform: hovered ? "translateY(-12px)" : "translateY(0px)",
              transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              opacity: 0.9
            }}
          >
            <rect x="20" y="16" width="40" height="40" rx="3" fill="#f8f8f8" />
            <rect x="25" y="22" width="20" height="3" rx="1.5" fill="#d1d5db" />
            <rect x="25" y="28" width="30" height="3" rx="1.5" fill="#d1d5db" />
            <rect x="25" y="34" width="25" height="3" rx="1.5" fill="#d1d5db" />
          </g>
          
          {/* Front folder half (overlapping the document) */}
          <path
             d="M0 32 Q0 24 8 24 H112 Q120 24 120 32 V85 Q120 93 112 93 H8 Q0 93 0 85 Z"
             fill={hovered ? "#2563eb" : "#3b82f6"}
          />
          {/* Highlight line on the lip of the front folder */}
           <rect
            x="2" y="26" width="116" height="2"
            rx="1"
            fill="white"
            opacity="0.2"
          />
        </svg>

        {/* Small floating particles when hovered */}
        {hovered && (
          <>
            <div className="absolute top-0 right-4 w-3 h-3 rounded-full bg-blue-300 opacity-60 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute bottom-4 left-[-10px] w-4 h-4 rounded-full bg-blue-400 opacity-40 animate-pulse" />
          </>
        )}
      </div>

      <span
        className="font-display tracking-tight transition-colors duration-200 mt-2"
        style={{ 
          fontSize: "2.5rem", 
          color: hovered ? "#2563eb" : "#111111",
          textShadow: hovered ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "none"
        }}
      >
        {year}
      </span>
    </button>
  );
};

export default FolderGrid;
