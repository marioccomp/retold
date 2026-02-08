"use client";

import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectForOverlay | null;
};

export default function ProjectDetailsModal({ isOpen, onClose, project }: Props) {
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

  if (!isOpen || !project) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 md:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-7xl h-[96vh] md:h-auto md:max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col overflow-hidden">
        {/* Scrollable Content Area - Mobile: Full height bottom sheet style */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="min-h-full">
            <FeedProjectPanel project={project} onClose={onClose} isModal />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
