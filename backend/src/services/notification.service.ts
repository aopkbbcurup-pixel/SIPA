import { Server } from "socket.io";

class NotificationService {
    private io: Server | null = null;

    init(io: Server) {
        this.io = io;
        this.io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });
    }

    notify(event: string, data: unknown) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    notifyUser(userId: string, event: string, data: unknown) {
        // In a real app, we would map userIds to socketIds
        // For now, we'll just broadcast or use a room if we implemented auth on socket
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

export const notificationService = new NotificationService();
