"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { FiX, FiSearch } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFollowersAction, getFollowingAction } from "@/src/domains/user/actions/get-network-info.action";
import { FollowButton } from "./FollowButton";
import Link from "next/link";
import { useTranslation } from "@/src/i18n/client";

interface NetworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    type: "followers" | "following" | null;
}

export function NetworkModal({ isOpen, onClose, userId, type }: NetworkModalProps) {
    const { dict } = useTranslation();
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen && type && userId) {
            startTransition(async () => {
                const data = type === "followers"
                    ? await getFollowersAction(userId)
                    : await getFollowingAction(userId);
                setUsers(data);
            });
        }
    }, [isOpen, type, userId]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen || !type) return null;

    const filteredUsers = users.filter((user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-[#152e2b] capitalize">
                        {type === "followers" ? dict.profile.network.followers : dict.profile.network.following}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={dict.profile.network.search_placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05dc7f]/20 focus:border-[#05dc7f] transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {isPending ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-4 border-[#05dc7f]/20 border-t-[#05dc7f] rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">{dict.profile.network.loading}</p>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all group">
                                    <Link
                                        href={`/${user.username}`}
                                        onClick={onClose}
                                        className="flex-1 flex items-center gap-3"
                                    >
                                        <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                                            <AvatarImage src={user.image || ""} />
                                            <AvatarFallback className="bg-gradient-to-br from-[#05dc7f] to-[#00b368] text-white font-bold">
                                                {user.name?.charAt(0) || user.username?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#152e2b] text-[15px] group-hover:text-[#05dc7f] transition-colors">
                                                {user.name}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                @{user.username}
                                            </span>
                                        </div>
                                    </Link>

                                    <FollowButton
                                        targetUserId={user.id}
                                        initialIsFollowing={user.isFollowing}
                                        size="sm"
                                        className="h-8 px-4 text-xs font-bold rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <FiSearch size={24} className="text-gray-300" />
                            </div>
                            <p className="text-[#152e2b] font-bold">{dict.profile.network.no_results}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {dict.profile.network.no_results_desc}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
