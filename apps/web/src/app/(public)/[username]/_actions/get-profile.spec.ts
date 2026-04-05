import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfile } from "./get-profile";
import { userRepository } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";

// 1. Mock the dependencies
vi.mock("@repo/database", () => ({
    userRepository: {
        findPublicProfileByUsername: vi.fn(),
    },
}));

vi.mock("@/src/domains/auth/auth", () => ({
    auth: vi.fn(),
}));

const createMockUser = () => ({
    id: 1,
    name: "Mario",
    username: "mario",
    image: "avatar.jpg",
    contactEmail: "mario@example.com",
    phone: null,
    title: "Dev",
    bio: "Hello",
    longBio: "Long Hello",
    skills: [],
    githubUrl: null,
    linkedinUrl: null,
    websiteUrl: null,
    createdAt: new Date(),
    cover: null,
    educations: [],
    projects: [
        {
            id: 10,
            title: "Retold",
            description: "Project description",
            status: "DONE",
            visibility: "public",
            images: [],
            featuredTagIds: [],
            createdAt: new Date(),
            views: 0,
            repository: null,
            tags: [],
            likes: [],
            _count: {
                likes: 0,
                comments: 0,
            },
            isPinned: false,
        },
    ],
    certifications: [],
    participations: [],
    followers: [],
    userStats: [],
    githubStats: null,
    _count: {
        followers: 0,
        following: 0,
        projects: 1,
    },
});

describe("getProfile Action", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return null if user is not found", async () => {
        // Setup Mocks
        (auth as any).mockResolvedValue(null); // No session
        (userRepository.findPublicProfileByUsername as any).mockResolvedValue(null);

        // Run Action
        const result = await getProfile("nonexistent");

        // Verify
        expect(userRepository.findPublicProfileByUsername).toHaveBeenCalledWith(
            "nonexistent",
            undefined,
            1,
            12,
            "",
            "newest"
        );
        expect(result).toBeNull();
    });

    it("should return public profile when user is found (Logged Out)", async () => {
        // Setup Mocks
        (auth as any).mockResolvedValue(null);

        const mockUser = createMockUser();
        (userRepository.findPublicProfileByUsername as any).mockResolvedValue(mockUser);

        // Run Action
        const result = await getProfile("mario");

        // Verify
        expect(userRepository.findPublicProfileByUsername).toHaveBeenCalledWith(
            "mario",
            undefined,
            1,
            12,
            "",
            "newest"
        );

        // We expect the result to be mapping correctly
        expect(result).toEqual(expect.objectContaining({
            name: "Mario",
            username: "mario",
            followersCount: 0,
            projectsMetadata: expect.objectContaining({
                total: 1,
                page: 1,
                limit: 12,
            }),
        }));
    });

    it("should pass currentUserId to repository when User is Logged In", async () => {
        // Setup Mocks
        (auth as any).mockResolvedValue({
            user: { id: "99" }
        });

        const mockUser = createMockUser();
        (userRepository.findPublicProfileByUsername as any).mockResolvedValue(mockUser);

        // Run Action
        await getProfile("mario");

        // Verify: The Key part here is that '99' was passed as the second arg
        expect(userRepository.findPublicProfileByUsername).toHaveBeenCalledWith(
            "mario",
            99,
            1,
            12,
            "",
            "newest"
        );
    });
});
