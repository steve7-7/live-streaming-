import type { User, Stream, Conversation, DirectMessage, FeedPost, ChatMessage } from "./types";

const g = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;
const av = (seed: string) => `https://i.pravatar.cc/150?u=${seed}`;

export const me: User = {
  id: "me",
  name: "You",
  handle: "@you",
  avatar: av("me-streamly"),
  color: "#8b5cf6",
  status: "online",
  followers: 1284,
};

export const users: User[] = [
  { id: "u1", name: "Aria Nova", handle: "@arianova", avatar: av("aria"), color: "#ec4899", status: "online", followers: 45200 },
  { id: "u2", name: "Kai Rivers", handle: "@kairivers", avatar: av("kai"), color: "#06b6d4", status: "online", followers: 12800 },
  { id: "u3", name: "Luna Park", handle: "@lunapark", avatar: av("luna"), color: "#f59e0b", status: "away", followers: 8900 },
  { id: "u4", name: "Milo Chen", handle: "@milochen", avatar: av("milo"), color: "#10b981", status: "online", followers: 33400 },
  { id: "u5", name: "Zoe Blake", handle: "@zoeblake", avatar: av("zoe"), color: "#6366f1", status: "offline", followers: 5600 },
  { id: "u6", name: "Theo Vance", handle: "@theovance", avatar: av("theo"), color: "#ef4444", status: "online", followers: 21100 },
  { id: "u7", name: "Nia Frost", handle: "@niafrost", avatar: av("nia"), color: "#14b8a6", status: "away", followers: 9200 },
  { id: "u8", name: "Rex Dunn", handle: "@rexdunn", avatar: av("rex"), color: "#a855f7", status: "online", followers: 67800 },
];

export const streams: Stream[] = [
  { id: "s1", title: "Late Night Lofi & Chill Beats 🎧", host: users[0], category: "Music", thumbnail: g("lofi"), viewers: 3421, live: true, tags: ["music", "chill", "lofi"] },
  { id: "s2", title: "Speedrunning Retro Classics", host: users[3], category: "Gaming", thumbnail: g("retro"), viewers: 8934, live: true, tags: ["gaming", "speedrun"] },
  { id: "s3", title: "Cooking Ramen From Scratch 🍜", host: users[2], category: "Food", thumbnail: g("ramen"), viewers: 1205, live: true, tags: ["food", "cooking"] },
  { id: "s4", title: "Morning Yoga Flow 🧘", host: users[6], category: "Fitness", thumbnail: g("yoga"), viewers: 892, live: true, tags: ["fitness", "wellness"] },
  { id: "s5", title: "Building an App Live 💻", host: users[1], category: "Tech", thumbnail: g("code"), viewers: 4567, live: true, tags: ["tech", "coding"] },
  { id: "s6", title: "Street Photography Walk 📷", host: users[5], category: "Art", thumbnail: g("street"), viewers: 2103, live: true, tags: ["art", "photo"] },
  { id: "s7", title: "Q&A: Ask Me Anything!", host: users[7], category: "Talk", thumbnail: g("talk"), viewers: 15600, live: true, tags: ["talk", "ama"] },
  { id: "s8", title: "Painting Galaxies 🌌", host: users[4], category: "Art", thumbnail: g("galaxy"), viewers: 640, live: false, tags: ["art", "paint"] },
];

export const conversations: Conversation[] = [
  { id: "c1", user: users[0], lastMessage: "See you on the stream tonight! 🎉", time: "2m", unread: 2 },
  { id: "c2", user: users[3], lastMessage: "GG that was insane", time: "18m", unread: 0, typing: true },
  { id: "c4", user: users[1], lastMessage: "Sent you the invite link", time: "1h", unread: 1 },
  { id: "c3", user: users[5], lastMessage: "Loved your last broadcast", time: "3h", unread: 0 },
  { id: "c5", user: users[7], lastMessage: "Let's collab on a group call", time: "5h", unread: 0 },
];

export const dmThreads: Record<string, DirectMessage[]> = {
  c1: [
    { id: "d1", fromMe: false, text: "Hey! Are you joining the group broadcast?", time: "10:02" },
    { id: "d2", fromMe: true, text: "Absolutely, wouldn't miss it 🙌", time: "10:03" },
    { id: "d3", fromMe: false, text: "See you on the stream tonight! 🎉", time: "10:05" },
  ],
  c2: [
    { id: "d4", fromMe: true, text: "That final boss run was clean", time: "09:40" },
    { id: "d5", fromMe: false, text: "GG that was insane", time: "09:42" },
  ],
  c4: [
    { id: "d6", fromMe: false, text: "Sent you the invite link", time: "08:30" },
  ],
  c3: [
    { id: "d7", fromMe: false, text: "Loved your last broadcast", time: "07:00" },
    { id: "d8", fromMe: true, text: "Thank you so much! 💜", time: "07:05" },
  ],
  c5: [
    { id: "d9", fromMe: false, text: "Let's collab on a group call", time: "05:12" },
  ],
};

export const feedPosts: FeedPost[] = [
  {
    id: "p1", user: users[0], caption: "Behind the scenes of tonight's set 🎶 who's tuning in?", media: g("bts1"), isVideo: false, likes: 2341, liked: false, time: "1h",
    comments: [
      { id: "cm1", user: users[3], text: "Can't wait!! 🔥", time: "45m", likes: 12, liked: false },
      { id: "cm2", user: users[6], text: "The vibes are immaculate", time: "30m", likes: 8, liked: false },
    ],
  },
  {
    id: "p2", user: users[3], caption: "New world record attempt today at 8pm. Come watch me suffer 😅", media: g("bts2"), isVideo: true, likes: 5678, liked: true, time: "3h",
    comments: [
      { id: "cm3", user: users[7], text: "You got this champ", time: "2h", likes: 34, liked: false },
    ],
  },
  {
    id: "p3", user: users[5], caption: "Golden hour never disappoints ✨📷", media: g("bts3"), isVideo: false, likes: 1890, liked: false, time: "6h",
    comments: [],
  },
];

export const initialChat: ChatMessage[] = [
  { id: "ch1", user: users[1], text: "This stream is fire 🔥", time: "now" },
  { id: "ch2", user: users[3], text: "hello from Tokyo!", time: "now" },
  { id: "ch3", user: users[6], text: "the audio quality is so crisp", time: "now" },
  { id: "ch4", user: me, text: "welcome everyone!", time: "now", system: false },
];

export const chatBots = [
  "this is amazing 😍", "first time here, loving it", "can you play my request?",
  "greetings from Berlin 🇩🇪", "your setup is insane", "LMAO 😂", "🔥🔥🔥",
  "how long have you been streaming?", "new follower here!", "the transition was smooth",
  "hi mom", "clip that!", "poggers", "W stream", "audio is perfect",
];

export const emojis = ["❤️", "😂", "🔥", "👏", "😮", "🎉", "💜", "⭐", "🙌", "🚀"];
