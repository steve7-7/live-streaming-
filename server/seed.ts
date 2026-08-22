import { hash } from "bcryptjs";
import { db, row } from "./db";
import { conversations, dmThreads, feedPosts, me, streams, users } from "../src/data";

export async function seedDatabase() {
  if (row("SELECT id FROM users LIMIT 1")) return false;

  const passwordHash = await hash("streamly-demo", 12);
  const insertUser = db.prepare(`INSERT INTO users
    (id, email, password_hash, name, handle, avatar, color, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  db.exec("BEGIN");
  try {
    insertUser.run(
      me.id,
      "demo@streamly.local",
      passwordHash,
      me.name,
      me.handle,
      me.avatar,
      me.color,
      me.status
    );
    users.forEach((user) =>
      insertUser.run(
        user.id,
        `${user.id}@streamly.local`,
        passwordHash,
        user.name,
        user.handle,
        user.avatar,
        user.color,
        user.status
      )
    );

    const insertFollow = db.prepare("INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)");
    users.slice(0, 4).forEach((user) => insertFollow.run(user.id, me.id));
    users.slice(0, 3).forEach((user) => insertFollow.run(me.id, user.id));

    const insertStream = db.prepare(`INSERT INTO streams
      (id, title, category, thumbnail, viewers, status, tags, host_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    streams.forEach((stream) =>
      insertStream.run(
        stream.id,
        stream.title,
        stream.category,
        stream.thumbnail,
        stream.viewers,
        stream.live ? "live" : "vod",
        JSON.stringify(stream.tags),
        stream.host.id
      )
    );

    const insertPost = db.prepare(
      "INSERT INTO feed_posts (id, user_id, caption, media, is_video, like_count) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const insertComment = db.prepare(
      "INSERT INTO feed_comments (id, post_id, user_id, text, like_count) VALUES (?, ?, ?, ?, ?)"
    );
    feedPosts.forEach((post) => {
      insertPost.run(
        post.id,
        post.user.id,
        post.caption,
        post.media,
        post.isVideo ? 1 : 0,
        post.likes
      );
      post.comments.forEach((comment) =>
        insertComment.run(comment.id, post.id, comment.user.id, comment.text, comment.likes)
      );
      if (post.liked) {
        db.prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)").run(post.id, me.id);
      }
    });

    const insertConversation = db.prepare("INSERT INTO conversations (id) VALUES (?)");
    const insertMember = db.prepare(
      "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)"
    );
    const insertMessage = db.prepare(`INSERT INTO direct_messages
      (id, conversation_id, sender_id, text) VALUES (?, ?, ?, ?)`);
    conversations.forEach((conversation) => {
      insertConversation.run(conversation.id);
      insertMember.run(conversation.id, me.id);
      insertMember.run(conversation.id, conversation.user.id);
      (dmThreads[conversation.id] ?? []).forEach((message) =>
        insertMessage.run(
          message.id,
          conversation.id,
          message.fromMe ? me.id : conversation.user.id,
          message.text
        )
      );
    });
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then((created) =>
      console.log(created ? "Seeded demo data." : "Database already contains data.")
    )
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
