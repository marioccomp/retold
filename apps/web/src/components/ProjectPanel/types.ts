export type ProjectForOverlay = {
    id: number;
    userId?: number;
    title: string;
    description: string | null;
    status?: string;
    owner?: {
        name: string;
        image: string | null;
        username: string;
    };
    repository?: {
        id: number;
        name: string;
        fullName: string;
        url: string;
        isActive: boolean;
    } | null;
};
