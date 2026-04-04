"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import gsap from "gsap";

import OnboardingNav from "./OnboardingNav";
import WelcomeSlide from "./slides/WelcomeSlide";
import FeedSlide from "./slides/FeedSlide";
import ProjectSlide from "./slides/ProjectSlide";
import ProfileSlide from "./slides/ProfileSlide";
import CreateSlide from "./slides/CreateSlide";
import FinalSlide from "./slides/FinalSlide";
import { completeOnboarding } from "@/src/actions/complete-onboarding.action";
import { createLogger } from "@repo/observability";

import "./Onboarding.css";

const logger = createLogger("web.ui.onboarding-flow");

const SLIDES = [
  WelcomeSlide,
  FeedSlide,
  ProjectSlide,
  ProfileSlide,
  CreateSlide,
  FinalSlide,
];

interface OnboardingFlowProps {
  isLoggedIn: boolean;
}

export default function OnboardingFlow({ isLoggedIn }: OnboardingFlowProps) {
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimating = useRef(false);
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Touch handling for swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const animateToSlide = useCallback((from: number, to: number) => {
    if (isAnimating.current || to < 0 || to >= SLIDES.length) return;
    isAnimating.current = true;

    const direction = to > from ? 1 : -1;
    const currentEl = slideRefs.current[from];
    const nextEl = slideRefs.current[to];

    if (!currentEl || !nextEl) {
      isAnimating.current = false;
      return;
    }

    const isMobile = window.innerWidth < 768;

    // Reset will-change for others
    slideRefs.current.forEach(ref => {
      if (ref) ref.style.willChange = "auto";
    });

    // Prepare active slides
    currentEl.style.willChange = "transform, opacity";
    nextEl.style.willChange = "transform, opacity";

    // Position next slide off-screen
    gsap.set(nextEl, {
      xPercent: direction * 100,
      opacity: 0,
      display: "flex",
      force3D: true,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
        setCurrentSlide(to);
        
        // Hide only after transition
        slideRefs.current.forEach((ref, i) => {
          if (ref) {
             if (i !== to) {
               gsap.set(ref, { display: "none", willChange: "auto" });
             } else {
               gsap.set(ref, { willChange: "auto" });
             }
          }
        });
      },
    });

    tl.to(currentEl, {
      xPercent: -direction * 30,
      opacity: 0,
      duration: isMobile ? 0.45 : 0.5,
      ease: "power2.inOut",
      force3D: true,
    }, 0);

    tl.to(nextEl, {
      xPercent: 0,
      opacity: 1,
      duration: isMobile ? 0.45 : 0.5,
      ease: "power2.inOut",
      force3D: true,
    }, isMobile ? 0.05 : 0.1);

    // Stagger children of next slide for entrance
    const children = nextEl.querySelectorAll("[data-animate]");
    if (children.length > 0) {
      tl.from(children, {
        y: isMobile ? 15 : 25,
        opacity: 0,
        duration: isMobile ? 0.35 : 0.4,
        stagger: isMobile ? 0.05 : 0.08,
        ease: "power2.out",
        force3D: true,
        clearProps: "all"
      }, isMobile ? 0.3 : 0.3);
    }
  }, []);

  const goNext = useCallback(() => {
    if (currentSlide >= SLIDES.length - 1) {
      // Complete onboarding
      handleComplete();
      return;
    }
    animateToSlide(currentSlide, currentSlide + 1);
  }, [currentSlide, animateToSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide <= 0) return;
    animateToSlide(currentSlide, currentSlide - 1);
  }, [currentSlide, animateToSlide]);

  const handleComplete = useCallback(async () => {
    try {
      if (isLoggedIn) {
        await completeOnboarding();
        await update({
          user: {
            hasCompletedOnboarding: true,
          },
        });
      }
    } catch (err) {
      logger.error("onboarding.complete_failed", err, {
        isLoggedIn,
      });
    } finally {
      router.push("/");
    }
  }, [isLoggedIn, router, update]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, handleSkip]);

  // Touch/swipe handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX < 0) goNext();
        else goPrev();
      }
      touchStart.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goNext, goPrev]);

  // Initialize: show first slide, hide others
  useEffect(() => {
    slideRefs.current.forEach((ref, i) => {
      if (ref) {
        gsap.set(ref, {
          xPercent: i === 0 ? 0 : 100,
          opacity: i === 0 ? 1 : 0,
          display: i === 0 ? "flex" : "none",
        });
      }
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`onboarding-container bg-background transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      {/* Background */}
      <div className="onboarding-bg onboarding-dots" />

      {/* Slides */}
      {SLIDES.map((SlideComponent, i) => (
        <div
          key={i}
          ref={(el) => { slideRefs.current[i] = el; }}
          className="onboarding-slide-container absolute inset-0"
        >
          <SlideComponent />
        </div>
      ))}

      {/* Navigation */}
      <OnboardingNav
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        onNext={goNext}
        onPrev={goPrev}
        onSkip={handleSkip}
        isLastSlide={currentSlide === SLIDES.length - 1}
      />
    </div>
  );
}
