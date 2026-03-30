"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

import OnboardingNav from "./OnboardingNav";
import WelcomeSlide from "./slides/WelcomeSlide";
import FeedSlide from "./slides/FeedSlide";
import ProjectSlide from "./slides/ProjectSlide";
import ProfileSlide from "./slides/ProfileSlide";
import CreateSlide from "./slides/CreateSlide";
import FinalSlide from "./slides/FinalSlide";
import { completeOnboarding } from "@/src/actions/complete-onboarding.action";

import "./Onboarding.css";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimating = useRef(false);
  const router = useRouter();

  // Touch handling for swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Hide header/footer for full-screen experience
  useEffect(() => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const main = document.querySelector("main");
    
    if (header) header.style.display = "none";
    if (footer) footer.style.display = "none";
    if (main) main.style.padding = "0";

    return () => {
      if (header) header.style.display = "";
      if (footer) footer.style.display = "";
      if (main) main.style.padding = "";
    };
  }, []);

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

    // Position next slide off-screen
    gsap.set(nextEl, {
      xPercent: direction * 100,
      opacity: 0,
      display: "flex",
    });

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
        setCurrentSlide(to);
      },
    });

    tl.to(currentEl, {
      xPercent: -direction * 30,
      opacity: 0,
      duration: 0.5,
      ease: "power3.inOut",
    }, 0);

    tl.to(nextEl, {
      xPercent: 0,
      opacity: 1,
      duration: 0.5,
      ease: "power3.inOut",
    }, 0.1);

    // Stagger children of next slide for entrance
    const children = nextEl.querySelectorAll("[data-animate]");
    if (children.length > 0) {
      tl.from(children, {
        y: 25,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: "power2.out",
      }, 0.3);
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
    if (isLoggedIn) {
      await completeOnboarding();
    }
    router.push("/");
  }, [isLoggedIn, router]);

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
      className="onboarding-container bg-background"
    >
      {/* Background */}
      <div className="onboarding-bg onboarding-dots" />

      {/* Slides */}
      {SLIDES.map((SlideComponent, i) => (
        <div
          key={i}
          ref={(el) => { slideRefs.current[i] = el; }}
          className="absolute inset-0"
          style={{ willChange: "transform, opacity" }}
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
