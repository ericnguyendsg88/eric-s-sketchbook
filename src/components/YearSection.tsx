import { useRef } from "react";
import type { Demo } from "@/data/demos";
import DemoCard from "./DemoCard";

const YearSection = ({ year, demos }: { year: number; demos: Demo[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-16 sm:mb-24">
      {/* Year heading */}
      <div className="flex items-end gap-4 mb-6 px-6 sm:px-12">
        <h2 className="font-display text-5xl sm:text-7xl text-tungsten leading-none tracking-tight">
          {year}
        </h2>
        <span className="text-xs text-muted-foreground mb-2">
          {demos.length} demo{demos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Navigation arrows */}
      {demos.length > 1 && (
        <div className="flex gap-3 px-6 sm:px-12 mb-3">
          <button
            onClick={() => scroll("left")}
            className="text-xs text-muted-foreground tungsten-glow hover:text-tungsten transition-colors"
          >
            [←]
          </button>
          <button
            onClick={() => scroll("right")}
            className="text-xs text-muted-foreground tungsten-glow hover:text-tungsten transition-colors"
          >
            [→]
          </button>
        </div>
      )}

      {/* Cards row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar pl-6 sm:pl-12 pr-6"
      >
        {demos.map((demo) => (
          <DemoCard key={demo.id} demo={demo} />
        ))}
      </div>
    </section>
  );
};

export default YearSection;
