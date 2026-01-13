import { Package } from "lucide-react";

type TechStackProps = {
    frameworks: string[];
    tools: string[];
    languages: string[];
};

export const TechStack = ({ frameworks, tools, languages }: TechStackProps) => {
    if (frameworks.length === 0 && tools.length === 0 && languages.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-[#047857]" />
                <h3 className="text-lg font-semibold text-gray-900 m-0">Tech Stack</h3>
            </div>

            <div className="space-y-4">
                {frameworks.length > 0 && (
                    <StackSection title="Frameworks">
                        {frameworks.map((fw, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 bg-[#05dc7f]/10 text-[#047857] rounded-lg text-sm font-medium"
                            >
                                {fw}
                            </span>
                        ))}
                    </StackSection>
                )}

                {tools.length > 0 && (
                    <StackSection title="Tools">
                        {tools.map((tool, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                            >
                                {tool}
                            </span>
                        ))}
                    </StackSection>
                )}

                {languages.length > 0 && (
                    <StackSection title="Languages">
                        {languages.map((lang, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                            >
                                {lang}
                            </span>
                        ))}
                    </StackSection>
                )}
            </div>
        </div>
    );
};

const StackSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
        <div className="text-sm font-medium text-gray-700 mb-2">{title}</div>
        <div className="flex flex-wrap gap-2">
            {children}
        </div>
    </div>
);
