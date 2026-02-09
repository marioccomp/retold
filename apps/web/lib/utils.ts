import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeSkill(skill: string) {
  const lowercaseWords = ["on", "in", "of", "and"];
  return skill
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowercaseWords.includes(lower)) {
        return lower;
      }
      // If it has other uppercase letters (like React.js, AWS), preserve them
      const hasOtherCaps = /[A-Z]/.test(word.slice(1));
      if (hasOtherCaps) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
