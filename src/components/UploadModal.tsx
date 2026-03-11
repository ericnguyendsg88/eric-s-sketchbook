import { useState, useRef, useCallback, useEffect } from "react";
import { years, yearColors, Demo } from "@/data/demos";

export interface UploadPayload {
  title: string;
  year: number;
  vibeNote: string;
  processNote?: string;
  lyrics: { text: string; finished: boolean }[];
  audioFile?: File;
  coverFile?: File;
  duration?: number;
}

interface UploadModalProps {
  onClose: () => void;
  onUpload: (payload: UploadPayload, editId?: string) => Promise<void>;
  editDemo?: Demo;
}

// ─── Upload progress overlay ────────────────────────────────────────────────────
type Stage = "reading" | "audio" | "cover" | "done";

const STAGE_LABELS: Record<Stage, string> = {
  reading: "Reading file…",
  audio:   "Saving audio…",
  cover:   "Saving artwork…",
  done:    "Saved!",
};

const ProgressOverlay = ({
  stage,
  hasCover,
  accentColor,
}: {
  stage: Stage;
  hasCover: boolean;
  accentColor: string;
}) => {
  const stages: Stage[] = hasCover
    ? ["reading", "audio", "cover", "done"]
    : ["reading", "audio", "done"];
  const currentIdx = stages.indexOf(stage);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-8 rounded-2xl z-10"
      style={{ background: "#f8f8f8f5", backdropFilter: "blur(6px)" }}
    >
      {stage === "done" ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `${accentColor}16`,
              border: `2px solid ${accentColor}`,
              animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path
                d="M8 18l7 7 13-13"
                stroke={accentColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: "drawCheck 0.4s ease 0.15s forwards",
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                }}
              />
            </svg>
          </div>
          <p className="font-display text-2xl" style={{ color: "#111" }}>
            Track saved!
          </p>
        </div>
      ) : (
        <>
          {/* Animated waveform */}
          <div className="flex items-end gap-1 h-16">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: "5px",
                  background: accentColor,
                  opacity: 0.7,
                  animation: `barBeat 0.${5 + (i % 5)}s ease-in-out ${(i * 0.06).toFixed(2)}s infinite alternate`,
                  height: `${20 + Math.sin(i * 0.8) * 18}px`,
                }}
              />
            ))}
          </div>

          <div className="text-center flex flex-col gap-3">
            <p className="font-display text-xl" style={{ color: "#111" }}>
              {STAGE_LABELS[stage]}
            </p>
            <div className="flex items-center gap-2 justify-center">
              {stages.map((s, i) => (
                <div
                  key={s}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentIdx ? "24px" : "7px",
                    height: "7px",
                    background: i <= currentIdx ? accentColor : "#0000001a",
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes barBeat {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.3); }
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── Main modal ─────────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUpload, editDemo }: UploadModalProps) => {
  const [title, setTitle]               = useState(editDemo?.title || "");
  const [year, setYear]                 = useState<number>(editDemo?.year || new Date().getFullYear());
  const [vibeNote, setVibeNote]         = useState(editDemo?.vibeNote || "");
  const [processNote, setProcessNote]   = useState(editDemo?.processNote || "");
  const [lyricsText, setLyricsText]     = useState(editDemo?.lyrics?.map(l => l.text).join("\\n") || "");
  const [audioFile, setAudioFile]       = useState<File | null>(null);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(editDemo?.coverUrl || null);
  const [duration, setDuration]         = useState<number | undefined>(editDemo?.duration);
  const [step, setStep]                 = useState<1 | 2>(1);
  const [uploadStage, setUploadStage]   = useState<Stage | null>(null);

  const [audioError, setAudioError]     = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const palette = yearColors[year] ?? {
    bg: "from-stone-100 to-slate-200", accent: "#444444", text: "#111", shadow: "#44444422",
  };

  const handleAudioLoad = (file: File) => {
    setAudioFile(file);
    setDuration(undefined);
    setAudioError(null);
    if (audioInputRef.current && file) {
      const url = URL.createObjectURL(file);
      const tempAudio = document.createElement("audio");
      tempAudio.onloadedmetadata = () => {
        setDuration(Math.round(tempAudio.duration));
        setAudioError(null);
        URL.revokeObjectURL(url);
      };
      tempAudio.onerror = () => {
        setAudioError("Your browser doesn't support this audio format (try .wav or .mp3)");
        setDuration(undefined);
        URL.revokeObjectURL(url);
      };
      tempAudio.src = url;
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAudioLoad(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("audio/")) {
      handleAudioLoad(file);
    }
  }, []);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleSubmit = async () => {
    if (!title.trim() || !audioFile) return;

    const parsedLyrics = lyricsText
      .split("\n")
      .map((line) => ({
        text: line.trim() || "~~~ ~~~~ ~~~~",
        finished: !line.trim().startsWith("~"),
      }));

    const payload: UploadPayload = {
      title: title.trim(),
      year,
      vibeNote: vibeNote.trim() || "uploaded track",
      processNote: processNote.trim() || undefined,
      lyrics: parsedLyrics.length > 0 ? parsedLyrics : [{ text: "~~~ ~~~~ ~~~~", finished: false }],
      audioFile, // Will be null if editing and no new file selected
      coverFile: coverFile ?? undefined,
      duration,
    };

    setUploadStage("reading");
    await wait(500);

    setUploadStage("audio");
    // Pass editDemo.id if it's an edit operation
    const uploadPromise = onUpload(payload, editDemo?.id);
    await wait(700);

    if (coverFile || (editDemo && editDemo.coverUrl && !coverFile)) { // If there's a new cover, or an existing one being kept
      setUploadStage("cover");
      await wait(500);
    }

    await uploadPromise;

    setUploadStage("done");
    await wait(900);
    onClose();
  };

  // Smoke-white colour tokens
  const bg      = "#f8f8f8";
  const surface = "#f0f0f0";
  const border  = "#00000010";
  const ink     = "#111111";
  const muted   = "#888888";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "#00000030", backdropFilter: "blur(12px)" }}
    >
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: "0 32px 72px #00000022, 0 0 0 1px #ffffff80",
        }}
      >
        {uploadStage && (
          <ProgressOverlay
            stage={uploadStage}
            hasCover={!!coverFile || (!!editDemo && !!editDemo.coverUrl)}
            accentColor={palette.accent}
          />
        )}

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b" style={{ borderColor: border }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-2xl" style={{ color: ink }}>{editDemo ? "Edit Track" : "Upload Track"}</h2>
            <button
              onClick={onClose}
              disabled={!!uploadStage}
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-30 hover:opacity-60 transition-opacity disabled:opacity-10"
              style={{ background: "#0000000a", color: ink, fontSize: "14px" }}
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-xs mb-4 opacity-30" style={{ color: ink }}>step {step} of 2</p>
          <div className="flex gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className="h-0.5 flex-1 rounded-full transition-all duration-300"
                style={{ background: step >= s ? palette.accent : "#0000001a" }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 flex flex-col gap-5 max-h-[62vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {step === 1 ? (
            <>
              {/* Audio drop zone */}
              <div
                onDrop={handleAudioDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => audioInputRef.current?.click()}
                className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed border-2 transition-all duration-200 hover:opacity-80"
                style={{
                  borderColor: audioFile || editDemo?.audioUrl ? palette.accent : "#00000018",
                  background: audioFile || editDemo?.audioUrl ? `${palette.accent}0c` : surface,
                }}
              >
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                {audioFile || editDemo?.audioUrl ? (
                  <>
                    <span className="text-2xl">🎵</span>
                    <p className="font-mono text-sm font-medium" style={{ color: audioError ? "#e11d48" : palette.accent }}>
                      {audioFile?.name || editDemo?.audioUrl.split('/').pop()}
                    </p>
                    {audioError ? (
                      <p className="font-mono text-[10px]" style={{ color: "#e11d48" }}>{audioError}</p>
                    ) : (
                      <p className="font-mono text-xs opacity-40" style={{ color: ink }}>
                        {duration !== undefined
                          ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
                          : "reading format…"}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ color: "#aaa", fontSize: "2rem" }}>♪</span>
                    <p className="font-mono text-xs opacity-40" style={{ color: ink }}>drop audio or click to browse</p>
                    <p className="font-mono text-[10px] opacity-25" style={{ color: ink }}>best: mp3 · wav · m4a</p>
                  </>
                )}
              </div>

              {/* Cover art */}
              <div className="flex gap-4 items-center">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl flex items-center justify-center cursor-pointer border-dashed border-2 flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                  style={{ borderColor: "#00000015", background: surface }}
                >
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  {coverPreview
                    ? <img src={coverPreview} className="w-full h-full object-cover" alt="cover" />
                    : <span style={{ color: "#aaa", fontSize: "1.5rem" }}>🖼</span>}
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-wider opacity-30 mb-1" style={{ color: ink }}>COVER ART</p>
                  <p className="font-mono text-xs opacity-30" style={{ color: ink }}>optional — click to upload</p>
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-wider opacity-30" style={{ color: ink }}>TITLE *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="track title"
                  className="w-full rounded-lg px-4 py-2.5 font-display text-lg focus:outline-none"
                  style={{
                    background: surface,
                    border: `1px solid ${title ? palette.accent + "55" : "#00000015"}`,
                    color: ink,
                  }}
                />
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-wider opacity-30" style={{ color: ink }}>YEAR</label>
                <div className="flex flex-wrap gap-2">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className="px-3 py-1 rounded-lg font-mono text-xs transition-all duration-150"
                      style={{
                        background: year === y ? palette.accent : surface,
                        color: year === y ? "#fff" : muted,
                        border: `1px solid ${year === y ? palette.accent : "#00000012"}`,
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vibe note */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-wider opacity-30" style={{ color: ink }}>VIBE NOTE</label>
                <input
                  type="text"
                  value={vibeNote}
                  onChange={(e) => setVibeNote(e.target.value)}
                  placeholder="e.g. bedroom recording, 3am"
                  className="w-full rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                  style={{ background: surface, border: "1px solid #00000012", color: ink }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Lyrics */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] tracking-wider opacity-30" style={{ color: ink }}>LYRICS</label>
                  <p className="font-mono text-[10px] opacity-25" style={{ color: ink }}>one line per lyric · ~ = unfinished</p>
                </div>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder={`you left the kitchen light on again\n~~~ ~~~~ ~~~~ ~~~~\nlike a lighthouse for the lost`}
                  rows={10}
                  className="w-full rounded-xl px-4 py-3 font-display text-base leading-relaxed resize-none focus:outline-none"
                  style={{ background: surface, border: "1px solid #00000012", color: ink, scrollbarWidth: "none" }}
                />
              </div>

              {/* Process note */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-wider opacity-30" style={{ color: ink }}>PROCESS NOTE</label>
                <input
                  type="text"
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  placeholder="e.g. first time using the loop pedal"
                  className="w-full rounded-lg px-4 py-2 font-mono text-sm focus:outline-none"
                  style={{ background: surface, border: "1px solid #00000012", color: ink }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center justify-between border-t" style={{ borderColor: border }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} disabled={!!uploadStage} className="font-display text-lg opacity-40 hover:opacity-80 transition-opacity disabled:opacity-10" style={{ color: ink }}>
              ← Back
            </button>
          ) : (
            <button onClick={onClose} className="font-display text-lg opacity-40 hover:opacity-80 transition-opacity" style={{ color: ink }}>
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!title.trim() || (!audioFile && !editDemo) || !!audioError}
              className="font-display text-lg px-8 py-2 rounded-full transition-all duration-200 hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: palette.accent, color: "#fff" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!!uploadStage || !!audioError}
              className="font-display text-lg px-8 py-2 rounded-full transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: palette.accent, color: "#fff", boxShadow: `0 4px 16px ${palette.shadow}` }}
            >
              {editDemo ? "Save Changes →" : "Upload Track →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
