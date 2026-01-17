import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const AIOverview = ({ overview }: { overview: string }) => (
    <div className="bg-gradient-to-br from-[#05dc7f]/[0.02] to-white border border-[#05dc7f]/10 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-[#05dc7f]/10 pb-4">
            <Sparkles className="w-5 h-5 text-[#047857]" />
            <h3 className="text-lg font-semibold text-gray-900 m-0">AI Executive Summary</h3>
        </div>

        <div className="text-gray-600">
            <ReactMarkdown
                components={{
                    // H1 is usually the title which we already have in the card header, so we hide it or make it very subtle
                    h1: () => null,
                    // The prompt uses H3 (###) for main sections like "Overview", "Architecture", etc.
                    h3: ({ children }) => (
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mt-6 mb-3 flex items-center gap-2">
                            {children}
                        </h3>
                    ),
                    // Fallback for H2 if ever used
                    h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-gray-800 mt-5 mb-2">
                            {children}
                        </h2>
                    ),
                    p: ({ children }) => (
                        <p className="leading-relaxed text-[15px] mb-4 text-gray-600 font-normal">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => <ul className="space-y-2 mb-4 ml-1">{children}</ul>,
                    li: ({ children }) => (
                        <li className="flex items-start gap-2.5 text-[14px]">
                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#05dc7f] shrink-0 opacity-60" />
                            <span className="flex-1 text-gray-700 leading-6">{children}</span>
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    hr: () => <hr className="border-t border-dashed border-gray-200 my-6" />,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[#05dc7f]/40 pl-4 my-4 italic text-gray-500 text-sm">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {overview}
            </ReactMarkdown>
        </div>
    </div>
);
