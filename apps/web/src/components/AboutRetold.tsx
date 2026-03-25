"use client";

import { useTranslation } from "@/src/i18n/client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function AboutRetold() {
  const { dict } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from([titleRef.current, subtitleRef.current, contentRef.current], {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-12 md:py-20 flex flex-col items-center text-center max-w-4xl mx-auto px-6">
      <h1 
        ref={titleRef}
        className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-primary via-primary/80 to-foreground bg-clip-text text-transparent"
      >
        {dict.about.title}
      </h1>
      <p 
        ref={subtitleRef}
        className="text-xl md:text-2xl font-medium text-muted-foreground mb-8"
      >
        {dict.about.subtitle}
      </p>
      <div className="w-24 h-1 bg-primary/20 rounded-full mb-8" />
      <p 
        ref={contentRef}
        className="text-lg md:text-xl leading-relaxed text-foreground/80 max-w-3xl"
      >
        {dict.about.description}
      </p>
    </section>
  );
}
