export type ProjectForOverlay = {
    id: number;
    userId?: number;
    title: string;
    description: string | null;
    status?: string;
    repository?: {
        id: number;
        name: string;
        fullName: string;
        url: string;
        isActive: boolean;
    } | null;
};
