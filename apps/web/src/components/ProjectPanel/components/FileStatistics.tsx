import { FileCode, Code2, TestTube, Settings, FileText } from "lucide-react";

type FileStatisticsProps = {
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    docsFiles: number;
};

export const FileStatistics = ({ sourceFiles, testFiles, configFiles, docsFiles }: FileStatisticsProps) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
            <FileCode className="w-5 h-5 text-[#047857]" />
            <h3 className="text-lg font-semibold text-gray-900 m-0">File Statistics</h3>
        </div>
        <div className="space-y-3">
            <StatRow icon={Code2} label="Source Files" value={sourceFiles} />
            <StatRow icon={TestTube} label="Test Files" value={testFiles} />
            <StatRow icon={Settings} label="Config Files" value={configFiles} />
            <StatRow icon={FileText} label="Docs Files" value={docsFiles} />
        </div>
    </div>
);

const StatRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-600 flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4" />
            {label}
        </span>
        <span className="font-semibold text-gray-900">{value}</span>
    </div>
);
