import { FeedProjectPanel } from "@/src/components/ProjectPanel/FeedProjectPanel";
import { ProjectForOverlay } from "@/src/components/ProjectPanel/types";
import { FiX } from "react-icons/fi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectForOverlay | null;
};

export default function ProjectDetailsModal({ isOpen, onClose, project }: Props) {
  if (!isOpen || !project) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl animate-in zoom-in-95 duration-200 custom-scrollbar shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] p-2 bg-white/80 hover:bg-white text-gray-500 hover:text-red-500 rounded-full transition-all shadow-sm backdrop-blur-sm"
        >
          <FiX size={20} />
        </button>
        <FeedProjectPanel project={project} onClose={onClose} />
      </div>
    </div>
  );
}
