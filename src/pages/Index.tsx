import { useState, useEffect } from "react";
import { demos, years } from "@/data/demos";
import YearSection from "@/components/YearSection";

const Index = () => {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const handler = () => setFocused(true);
    window.addEventListener("mousemove", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    // Fallback: auto-focus after 2.5s
    const timer = setTimeout(() => setFocused(true), 2500);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("touchstart", handler);
      clearTimeout(timer);
    };
  }, []);

  const demosByYear = years.map((year) => ({
    year,
    demos: demos.filter((d) => d.year === year),
  }));

  return (
    <div
      className={`min-h-screen bg-background transition-all duration-[1800ms] ease-out ${
        focused ? "blur-0 opacity-100" : "blur-lg opacity-60"
      }`}
    >
      {/* Header */}
      <header className="pt-12 sm:pt-20 pb-8 sm:pb-16 px-6 sm:px-12">
        <h1 className="font-display text-4xl sm:text-6xl text-foreground tracking-tight leading-tight">
          Eric the Kid
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          demos, sketches, and unfinished things.
          <br />
          the work, not the polish.
        </p>
      </header>

      {/* Timeline */}
      <main className="pb-20">
        {demosByYear.map(({ year, demos: yearDemos }) => (
          <YearSection key={year} year={year} demos={yearDemos} />
        ))}
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-12 pb-12 text-xs text-faded-ink">
        showing the work, not hiding it.
      </footer>
    </div>
  );
};

export default Index;
