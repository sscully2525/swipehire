export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    read_at?: Date;
    created_at: Date;
}
export declare const createNotification: (userId: string, type: string, title: string, message: string, data?: any) => Promise<Notification>;
export declare const getUserNotifications: (userId: string, limit?: number) => Promise<Notification[]>;
export declare const markNotificationAsRead: (notificationId: string) => Promise<void>;
export declare const markAllNotificationsAsRead: (userId: string) => Promise<void>;
export declare const getUnreadNotificationCount: (userId: string) => Promise<number>;
export declare const deleteNotification: (notificationId: string, userId: string) => Promise<void>;
//# sourceMappingURL=notification.d.ts.map