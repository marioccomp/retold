"use client";

import { ReactNode } from "react";

interface OnboardingSlideProps {
  children: ReactNode;
  className?: string;
}

export default function OnboardingSlide({
  children,
  className = "",
}: OnboardingSlideProps) {
  return (
    <div
      className={`absolute inset-0 flex items-start md:items-center justify-center px-6 md:px-12 py-8 md:py-20 overflow-y-auto custom-scrollbar ${className}`}
    >
      <div className="w-full max-w-[1200px] mx-auto">
        {children}
      </div>
    </div>
  );
}
