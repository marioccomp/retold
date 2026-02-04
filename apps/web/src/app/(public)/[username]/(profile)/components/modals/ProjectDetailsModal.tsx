import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { useEffect } from "react";
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
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !project) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4 md:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Floating Close Button - Outside on desktop, inside on mobile if needed, or stick to top-right corner of modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[110] p-2.5 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm backdrop-blur-sm border border-gray-100 cursor-pointer group"
          aria-label="Close modal"
        >
          <FiX size={18} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="min-h-full py-12">
            {/* Added min-h-full to ensure content stretches if needed, though FeedProjectPanel likely handles its own layout */}
            <FeedProjectPanel project={project} onClose={onClose} isModal />
          </div>
        </div>
      </div>
    </div>
  );
}
