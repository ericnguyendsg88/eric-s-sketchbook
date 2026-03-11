import { useState, useRef, useCallback } from "react";
import type { Demo } from "@/data/demos";

const DemoCard = ({ demo }: { demo: Demo }) => {
  const [reactions, setReactions] = useState(demo.reactions);
  const [reacted, setReacted] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleReaction = useCallback(() => {
    if (!reacted) {
      setReactions((r) => r + 1);
      setReacted(true);
    } else {
      setReactions((r) => r - 1);
      setReacted(false);
    }
    setPulsing(true);
    setTimeout(() => setPulsing(false), 400);
  }, [reacted]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return p + 0.5;
        });
      }, 100);
    }
  }, [isPlaying]);

  return (
    <div className="min-w-[85vw] sm:min-w-[400px] max-w-[420px] bg-card rounded-lg p-6 flex flex-col gap-4 flex-shrink-0 border border-border/50">
      {/* Title & vibe */}
      <div>
        <h3 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground leading-tight">
          {demo.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{demo.vibeNote}</p>
      </div>

      {/* Audio player */}
      <div className="flex flex-col gap-2">
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-tungsten rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={togglePlay}
          className="self-start text-xs tracking-widest text-muted-foreground tungsten-glow hover:text-tungsten transition-colors"
        >
          {isPlaying ? "[PAUSE]" : "[PLAY]"}
        </button>
      </div>

      {/* Lyrics */}
      <div className="flex flex-col gap-1 min-h-[120px]">
        {demo.lyrics.map((line, i) => (
          <p
            key={i}
            className={
              line.finished
                ? "text-sm text-foreground/90 leading-relaxed"
                : "text-sm lyrics-placeholder leading-relaxed select-none"
            }
          >
            {line.text}
          </p>
        ))}
      </div>

      {/* Process note */}
      {demo.processNote && (
        <p className="text-xs text-faded-ink italic border-t border-border/30 pt-3">
          {demo.processNote}
        </p>
      )}

      {/* Reaction */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={handleReaction}
          className={`text-lg transition-all ${pulsing ? "reaction-pulse" : ""} ${
            reacted ? "text-tungsten" : "text-muted-foreground"
          }`}
        >
          🔥
        </button>
        <span className="text-xs text-muted-foreground">{reactions}</span>
      </div>
    </div>
  );
};

export default DemoCard;
