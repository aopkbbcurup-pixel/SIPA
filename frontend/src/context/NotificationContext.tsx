/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth";
import { getApiBaseUrl } from "../lib/api";

interface Notification {
    status?: string;
    [key: string]: unknown;
}

interface NotificationContextType {
    socket: Socket | null;
    notifications: Notification[];
    addNotification: (notification: Notification) => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { token } = useAuthStore();

    useEffect(() => {
        if (!token) {
            return;
        }

        const apiBase = getApiBaseUrl();
        // Remove /api suffix if present to get the root URL
        const socketUrl = apiBase.replace(/\/api\/?$/, "");

        const newSocket = io(socketUrl, {
            auth: { token },
        });

        newSocket.on("connect", () => {
            console.log("Socket connected");
        });

        newSocket.on("notification", (notification: Notification) => {
            console.log("Notification received:", notification);
            setNotifications((prev) => [notification, ...prev]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    const addNotification = (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ socket, notifications, addNotification, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
};
