"use client";

import { useTranslation } from "@/src/i18n/client";

interface OnboardingNavProps {
  currentSlide: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastSlide: boolean;
}

export default function OnboardingNav({
  currentSlide,
  totalSlides,
  onNext,
  onPrev,
  onSkip,
  isLastSlide,
}: OnboardingNavProps) {
  const { dict } = useTranslation();
  const progress = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <>
      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/50">
        <div
          className="h-full bg-primary onboarding-progress rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Navigation controls at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex items-center gap-4">
          {currentSlide > 0 && (
            <button
              onClick={onPrev}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← {dict.onboarding.nav.prev}
            </button>
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? "w-6 bg-primary"
                  : i < currentSlide
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isLastSlide && (
            <button
              onClick={onSkip}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {dict.onboarding.nav.skip}
            </button>
          )}
          <button
            onClick={onNext}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer active:scale-95 ${
              isLastSlide
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 onboarding-cta-glow hover:bg-primary/90"
                : "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
            }`}
          >
            {isLastSlide ? dict.onboarding.nav.start : dict.onboarding.nav.next}
            {!isLastSlide && <span className="ml-1">→</span>}
          </button>
        </div>
      </div>
    </>
  );
}
