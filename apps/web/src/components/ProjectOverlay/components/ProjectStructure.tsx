import { FolderTree } from "lucide-react";

type ProjectStructureProps = {
    hasSrcFolder: boolean;
    hasTestsFolder: boolean;
    maxDepth: number;
};

export const ProjectStructure = ({ hasSrcFolder, hasTestsFolder, maxDepth }: ProjectStructureProps) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
            <FolderTree className="w-5 h-5 text-[#047857]" />
            <h3 className="text-lg font-semibold text-gray-900 m-0">Project Structure</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
            <StructureItem label="/src Folder" value={hasSrcFolder ? "Yes" : "No"} />
            <StructureItem label="Tests Folder" value={hasTestsFolder ? "Yes" : "No"} />
            <StructureItem label="Max Depth" value={maxDepth} />
        </div>
    </div>
);

const StructureItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
    </div>
);
