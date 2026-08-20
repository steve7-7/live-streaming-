export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  color: string;
  status: "online" | "away" | "offline";
  followers: number;
}

export interface Stream {
  id: string;
  title: string;
  host: User;
  category: string;
  thumbnail: string;
  viewers: number;
  live: boolean;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  user: User;
  text: string;
  time: string;
  system?: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  time: string;
  unread: number;
  typing?: boolean;
}

export interface DirectMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

export interface FeedComment {
  id: string;
  user: User;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
}

export interface FeedPost {
  id: string;
  user: User;
  caption: string;
  media: string;
  isVideo: boolean;
  likes: number;
  liked: boolean;
  comments: FeedComment[];
  time: string;
}
