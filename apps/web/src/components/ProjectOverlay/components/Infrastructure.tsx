import { Shield, GitBranch, Container, TestTube, CheckCircle2, XCircle } from "lucide-react";

type InfrastructureProps = {
    hasCI: boolean;
    hasDocker: boolean;
    hasLint: boolean;
    hasTests: boolean;
};

export const Infrastructure = ({ hasCI, hasDocker, hasLint, hasTests }: InfrastructureProps) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#047857]" />
            <h3 className="text-lg font-semibold text-gray-900 m-0">Infrastructure</h3>
        </div>
        <div className="space-y-3">
            <InfraRow icon={GitBranch} label="CI/CD Pipeline" has={hasCI} />
            <InfraRow icon={Container} label="Docker Support" has={hasDocker} />
            <InfraRow icon={Shield} label="Code Linting" has={hasLint} />
            <InfraRow icon={TestTube} label="Test Suite" has={hasTests} />
        </div>
    </div>
);

const InfraRow = ({ icon: Icon, label, has }: { icon: any; label: string; has: boolean }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-600 flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4" />
            {label}
        </span>
        {has ? (
            <CheckCircle2 className="w-5 h-5 text-[#047857]" />
        ) : (
            <XCircle className="w-5 h-5 text-gray-300" />
        )}
    </div>
);
