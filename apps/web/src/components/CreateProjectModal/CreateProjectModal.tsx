"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import CreateProjectPanel from "./CreateProjectPanel";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 md:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-4xl h-[96dvh] md:h-auto md:max-h-[90dvh] bg-background rounded-t-[2.5rem] md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col overflow-hidden dark:border-t-2 dark:border-t-primary dark:md:border-t-0 dark:md:border dark:md:border-border"
        style={{ isolation: 'isolate', transform: 'translateZ(0)' }}
      >
        <CreateProjectPanel 
            onClose={onClose} 
            onSuccess={onSuccess} 
            isModal 
        />
      </div>
    </div>,
    document.body
  );
}
