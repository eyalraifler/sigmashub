from .sql import placeholders, _one
from .users import get_followed_user_ids


# ---------------------------------------------------------------------------
# Post enrichment helpers (the repeated 3-4x patterns)
# ---------------------------------------------------------------------------

def get_tags_for_posts(client, post_ids: list) -> dict:
    """Returns dict[post_id -> list of tag strings]."""
    if not post_ids:
        return {}
    ph = placeholders(post_ids)
    tags_map = {}
    for row in client.execute(
        f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({ph})", post_ids
    )['data']:
        tags_map.setdefault(row["post_id"], []).append(row["tag"])
    return tags_map


def get_media_for_posts(client, post_ids: list) -> dict:
    """Returns dict[post_id -> list of media dicts]."""
    if not post_ids:
        return {}
    ph = placeholders(post_ids)
    media_map = {}
    for row in client.execute(
        f"SELECT post_id, media_url, media_type, position"
        f" FROM post_media WHERE post_id IN ({ph}) ORDER BY post_id, position",
        post_ids,
    )['data']:
        media_map.setdefault(row["post_id"], []).append({
            "media_url": row["media_url"],
            "media_type": row["media_type"],
            "position": row["position"],
        })
    return media_map


def get_liked_post_ids(client, user_id: int, post_ids: list) -> set:
    """Returns set of post IDs that the user has liked."""
    if not user_id or not post_ids:
        return set()
    ph = placeholders(post_ids)
    return {
        row["post_id"]
        for row in client.execute(
            f"SELECT post_id FROM likes WHERE user_id=%s AND post_id IN ({ph})",
            [user_id] + post_ids,
        )['data']
    }


def enrich_posts(client, posts: list, viewer_id: int = None) -> list:
    """Attaches tags, media_items, is_liked_by_user, and is_following to each post dict in-place."""
    if not posts:
        return posts

    post_ids = [p["id"] for p in posts]
    tags_map = get_tags_for_posts(client, post_ids)
    media_map = get_media_for_posts(client, post_ids)
    liked_ids = get_liked_post_ids(client, viewer_id, post_ids) if viewer_id else set()

    followed_ids = set()
    if viewer_id:
        author_ids = list({p["user_id"] for p in posts})
        followed_ids = get_followed_user_ids(client, viewer_id, author_ids)

    for post in posts:
        pid = post["id"]
        post["tags"] = tags_map.get(pid, [])
        post["media_items"] = media_map.get(pid) or [
            {"media_url": post["media_url"], "media_type": post["media_type"], "position": 0}
        ]
        post["is_liked_by_user"] = pid in liked_ids
        post["is_following"] = post["user_id"] in followed_ids

    return posts


# ---------------------------------------------------------------------------
# Fetching posts
# ---------------------------------------------------------------------------

def get_post_by_id(client, post_id: int):
    return _one(client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = %s
        LIMIT 1
        """,
        (post_id,),
    )['data'])


def get_feed_posts(client, limit: int, offset: int) -> list:
    return client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )['data']


def get_posts_by_user(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = %s
        ORDER BY p.created_at DESC
        """,
        (user_id,),
    )['data']


def get_liked_posts_by_user(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM likes l
        JOIN posts p ON l.post_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE l.user_id = %s
        ORDER BY l.created_at DESC
        """,
        (user_id,),
    )['data']


# ---------------------------------------------------------------------------
# Creating / deleting posts
# ---------------------------------------------------------------------------

def insert_post(tx, user_id: int, caption: str, media_url: str, media_type: str) -> int:
    return tx.execute(
        "INSERT INTO posts (user_id, caption, media_url, media_type) VALUES (%s, %s, %s, %s)",
        (user_id, caption, media_url, media_type),
    )['lastrowid']


def insert_post_media(tx, post_id: int, saved_media: list):
    for i, m in enumerate(saved_media):
        tx.execute(
            "INSERT INTO post_media (post_id, media_url, media_type, position) VALUES (%s, %s, %s, %s)",
            (post_id, m["url"], m["type"], i),
        )


def insert_post_tags(tx, post_id: int, tags: list):
    for t in tags:
        tx.execute(
            "INSERT INTO post_tags (post_id, tag) VALUES (%s, %s)",
            (post_id, t),
        )


def delete_post(tx, post_id: int):
    tx.execute("DELETE FROM posts WHERE id=%s", (post_id,))


# ---------------------------------------------------------------------------
# Likes
# ---------------------------------------------------------------------------

def get_post_likes(client, post_id: int, limit: int, offset: int) -> list:
    return client.execute(
        """
        SELECT u.id, u.username, u.profile_image_url, l.created_at
        FROM likes l
        JOIN users u ON l.user_id = u.id
        WHERE l.post_id = %s
        ORDER BY l.created_at DESC
        LIMIT %s OFFSET %s
        """,
        (post_id, limit, offset),
    )['data']


def toggle_like(tx, post_id: int, user_id: int) -> bool:
    """Returns True if now liked, False if unliked."""
    existing = _one(tx.execute(
        "SELECT id FROM likes WHERE user_id=%s AND post_id=%s LIMIT 1",
        (user_id, post_id),
    )['data'])
    if existing:
        tx.execute("DELETE FROM likes WHERE post_id=%s AND user_id=%s", (post_id, user_id))
        tx.execute(
            "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=%s",
            (post_id,),
        )
        return False
    else:
        tx.execute("INSERT INTO likes (post_id, user_id) VALUES (%s, %s)", (post_id, user_id))
        tx.execute(
            "UPDATE posts SET likes_count = likes_count + 1 WHERE id=%s", (post_id,)
        )
        return True


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def get_post_comments(client, post_id: int, limit: int, offset: int) -> list:
    return client.execute(
        """
        SELECT c.id, c.post_id, c.user_id, c.comment_text, c.created_at,
               u.username, u.profile_image_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
        LIMIT %s OFFSET %s
        """,
        (post_id, limit, offset),
    )['data']


def get_comment_by_id(client, comment_id: int):
    return _one(client.execute(
        "SELECT id, post_id, user_id FROM comments WHERE id=%s LIMIT 1",
        (comment_id,),
    )['data'])


def insert_comment(tx, post_id: int, user_id: int, content: str) -> int:
    comment_id = tx.execute(
        "INSERT INTO comments (post_id, user_id, comment_text) VALUES (%s, %s, %s)",
        (post_id, user_id, content),
    )['lastrowid']
    tx.execute(
        "UPDATE posts SET comments_count = comments_count + 1 WHERE id=%s",
        (post_id,),
    )
    return comment_id


def delete_comment(tx, comment_id: int, post_id: int):
    tx.execute("DELETE FROM comments WHERE id=%s", (comment_id,))
    tx.execute(
        "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id=%s",
        (post_id,),
    )


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

def get_tag_suggestions(client, q: str, limit: int) -> list:
    return client.execute(
        """
        SELECT tag, COUNT(*) AS post_count
        FROM post_tags
        WHERE tag LIKE %s
        GROUP BY tag
        ORDER BY post_count DESC, tag
        LIMIT %s
        """,
        (f"{q}%", limit),
    )['data']
