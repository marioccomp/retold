import {
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
    Sparkles,
    Zap
} from "lucide-react";

type StatusViewProps = {
    onAnalyze: () => void;
};

export const PendingView = ({ onAnalyze }: StatusViewProps) => (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
        <p className="text-gray-600 mb-6 text-center max-w-md">
            Start the analysis to get insights about your project's structure, tech stack, and
            code quality.
        </p>
        <button
            onClick={onAnalyze}
            className="px-6 py-3 bg-[#05dc7f] hover:bg-[#04c370] text-white font-medium rounded-lg transition-colors"
        >
            Start Analysis
        </button>
    </div>
);

export const AnalyzingView = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <Loader2 className="w-12 h-12 text-[#05dc7f] animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Repository</h3>
        <p className="text-gray-600">Please wait while we analyze your project...</p>
    </div>
);

export const ErrorView = ({ onRetry }: { onRetry: () => void }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h3>
        <p className="text-gray-600 mb-6 font-medium">
            There was an error analyzing your project. Please try again.
        </p>
        <button
            onClick={onRetry}
            className="px-6 py-3 bg-[#05dc7f] hover:bg-[#04c370] text-white font-medium rounded-lg transition-colors"
        >
            Retry Analysis
        </button>
    </div>
);
