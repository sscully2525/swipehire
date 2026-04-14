export interface ChatMessage {
    id: string;
    match_id: string;
    sender_id: string;
    sender_type: 'candidate' | 'company';
    content: string;
    message_type: 'text' | 'image' | 'file' | 'system';
    file_url?: string;
    read_at?: Date;
    created_at: Date;
}
export declare const createMessage: (matchId: string, senderId: string, senderType: "candidate" | "company", content: string, messageType?: "text" | "image" | "file" | "system", fileUrl?: string) => Promise<ChatMessage>;
export declare const getMessagesByMatch: (matchId: string, limit?: number, offset?: number) => Promise<ChatMessage[]>;
export declare const markMessagesAsRead: (matchId: string, senderType: "candidate" | "company") => Promise<void>;
export declare const getUnreadCount: (userId: string) => Promise<number>;
export declare const createSystemMessage: (matchId: string, content: string) => Promise<ChatMessage>;
//# sourceMappingURL=chat.d.ts.map