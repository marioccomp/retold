type KeyMetricsProps = {
    primaryLanguage?: string;
    appType?: string;
    totalFiles?: number;
    maxDepth?: number;
};

export const KeyMetrics = ({ primaryLanguage, appType, totalFiles, maxDepth }: KeyMetricsProps) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {primaryLanguage && (
            <MetricCard label="Primary Language" value={primaryLanguage} />
        )}
        {appType && (
            <MetricCard label="App Type" value={appType} />
        )}
        {totalFiles && (
            <MetricCard label="Total Files" value={totalFiles} />
        )}
        {maxDepth && (
            <MetricCard label="Max Depth" value={maxDepth} />
        )}
    </div>
);

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-gray-600 text-xs md:text-sm mb-1">{label}</div>
        <div className="text-lg md:text-xl font-bold text-gray-900 truncate" title={String(value)}>
            {value}
        </div>
    </div>
);
