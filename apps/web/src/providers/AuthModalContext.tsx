"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AuthModalContextType = {
    isOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openLoginModal = () => setIsOpen(true);
    const closeLoginModal = () => setIsOpen(false);

    return (
        <AuthModalContext.Provider value={{ isOpen, openLoginModal, closeLoginModal }}>
            {children}
        </AuthModalContext.Provider>
    );
}

export function useAuthModal() {
    const context = useContext(AuthModalContext);
    if (context === undefined) {
        throw new Error("useAuthModal must be used within an AuthModalProvider");
    }
    return context;
}
