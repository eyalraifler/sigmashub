import math
import random
from datetime import datetime, timezone

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


def get_saved_post_ids(client, user_id: int, post_ids: list) -> set:
    """Returns set of post IDs that the user has saved."""
    if not user_id or not post_ids:
        return set()
    ph = placeholders(post_ids)
    return {
        row["post_id"]
        for row in client.execute(
            f"SELECT post_id FROM saved_posts WHERE user_id=%s AND post_id IN ({ph})",
            [user_id] + post_ids,
        )['data']
    }


def toggle_save_post(tx, user_id: int, post_id: int) -> bool:
    """Toggle save on a post. Returns True if now saved, False if unsaved."""
    existing = tx.execute(
        "SELECT id FROM saved_posts WHERE user_id=%s AND post_id=%s LIMIT 1",
        (user_id, post_id),
    )['data']
    if existing:
        tx.execute("DELETE FROM saved_posts WHERE user_id=%s AND post_id=%s", (user_id, post_id))
        return False
    else:
        tx.execute("INSERT INTO saved_posts (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
        return True


def get_saved_posts_by_user(client, user_id: int) -> list:
    """Fetch all posts saved by a user, ordered by save time (newest first).

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose saved posts to fetch.

    Returns:
        A list of post dicts including author info, ordered by saved_at DESC.
    """
    return client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM saved_posts sp
        JOIN posts p ON sp.post_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE sp.user_id = %s
        ORDER BY sp.created_at DESC
        """,
        (user_id,),
    )['data']


def enrich_posts(client, posts: list, viewer_id: int = None) -> list:
    """Attaches tags, media_items, is_liked_by_user, is_saved, and is_following to each post dict in-place."""
    if not posts:
        return posts

    post_ids = [p["id"] for p in posts]
    tags_map = get_tags_for_posts(client, post_ids)
    media_map = get_media_for_posts(client, post_ids)
    liked_ids = get_liked_post_ids(client, viewer_id, post_ids) if viewer_id else set()
    saved_ids = get_saved_post_ids(client, viewer_id, post_ids) if viewer_id else set()

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
        post["is_saved"] = pid in saved_ids
        post["is_following"] = post["user_id"] in followed_ids

    return posts


# ---------------------------------------------------------------------------
# Fetching posts
# ---------------------------------------------------------------------------

def get_post_by_id(client, post_id: int):
    """Fetch a single post by its ID, joined with the author's user info.

    Args:
        client: An open RemoteDBClient instance.
        post_id: The post's primary key.

    Returns:
        A post dict (id, user_id, caption, media_url, media_type, likes_count,
        comments_count, created_at, username, profile_image_url), or None.
    """
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


def get_feed_posts(client, limit: int, offset: int, viewer_id: int = None) -> list:
    """Fetch a paginated list of recent posts visible to the viewer.

    Includes posts from public accounts, the viewer's own posts, and posts
    from accounts the viewer follows. Ordered newest first.

    Args:
        client: An open RemoteDBClient instance.
        limit: Maximum number of posts to return.
        offset: Number of posts to skip for pagination.
        viewer_id: Optional ID of the requesting user (controls visibility).

    Returns:
        A list of post dicts joined with author info.
    """
    return client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.is_private = 0
           OR p.user_id = %s
           OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = %s AND f.following_id = p.user_id)
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """,
        (viewer_id, viewer_id, limit, offset),
    )['data']


def get_posts_by_user(client, user_id: int) -> list:
    """Fetch all posts created by a specific user, newest first.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the author whose posts to fetch.

    Returns:
        A list of post dicts joined with author info.
    """
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
    """Fetch all posts liked by a specific user, ordered by like time (newest first).

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose liked posts to fetch.

    Returns:
        A list of post dicts joined with author info.
    """
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
    """Insert a new post row and return its ID.

    Args:
        tx: An active transaction (_Transaction instance).
        user_id: ID of the user creating the post.
        caption: Text caption for the post.
        media_url: URL path to the primary media file.
        media_type: "image" or "video".

    Returns:
        The auto-generated primary key of the new post.
    """
    return tx.execute(
        "INSERT INTO posts (user_id, caption, media_url, media_type) VALUES (%s, %s, %s, %s)",
        (user_id, caption, media_url, media_type),
    )['lastrowid']


def insert_post_media(tx, post_id: int, saved_media: list):
    """Insert all media items for a post into the post_media table.

    Each item gets an auto-assigned position (0-based index) matching the
    order in saved_media.

    Args:
        tx: An active transaction (_Transaction instance).
        post_id: The ID of the post these media items belong to.
        saved_media: A list of dicts with 'url' and 'type' keys.
    """
    for i, m in enumerate(saved_media):
        tx.execute(
            "INSERT INTO post_media (post_id, media_url, media_type, position) VALUES (%s, %s, %s, %s)",
            (post_id, m["url"], m["type"], i),
        )


def insert_post_tags(tx, post_id: int, tags: list):
    """Insert hashtag associations for a post into the post_tags table.

    Args:
        tx: An active transaction (_Transaction instance).
        post_id: The ID of the post to tag.
        tags: A list of cleaned lowercase tag strings (no '#' prefix).
    """
    for t in tags:
        tx.execute(
            "INSERT INTO post_tags (post_id, tag) VALUES (%s, %s)",
            (post_id, t),
        )


def delete_post(tx, post_id: int):
    """Delete a post row by ID (cascades to related rows via DB constraints).

    Args:
        tx: An active transaction (_Transaction instance).
        post_id: The ID of the post to delete.
    """
    tx.execute("DELETE FROM posts WHERE id=%s", (post_id,))


# ---------------------------------------------------------------------------
# Likes
# ---------------------------------------------------------------------------

def get_post_likes(client, post_id: int, limit: int, offset: int) -> list:
    """Fetch a paginated list of users who liked a post.

    Args:
        client: An open RemoteDBClient instance.
        post_id: The post's primary key.
        limit: Maximum number of results to return.
        offset: Number of results to skip for pagination.

    Returns:
        A list of dicts with id, username, profile_image_url, and created_at.
        Ordered by like time, newest first.
    """
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
    """Fetch a paginated list of comments on a post, ordered oldest first.

    Args:
        client: An open RemoteDBClient instance.
        post_id: The post's primary key.
        limit: Maximum number of comments to return.
        offset: Number of comments to skip for pagination.

    Returns:
        A list of comment dicts including user info (username, profile_image_url).
    """
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
    """Fetch a comment's core fields by its ID.

    Args:
        client: An open RemoteDBClient instance.
        comment_id: The comment's primary key.

    Returns:
        A dict with id, post_id, and user_id, or None if not found.
    """
    return _one(client.execute(
        "SELECT id, post_id, user_id FROM comments WHERE id=%s LIMIT 1",
        (comment_id,),
    )['data'])


def insert_comment(tx, post_id: int, user_id: int, content: str) -> int:
    """Insert a new comment and increment the post's comments_count.

    Args:
        tx: An active transaction (_Transaction instance).
        post_id: The ID of the post being commented on.
        user_id: The ID of the user writing the comment.
        content: The text content of the comment.

    Returns:
        The auto-generated primary key of the new comment.
    """
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
    """Delete a comment and decrement the post's comments_count (floor 0).

    Args:
        tx: An active transaction (_Transaction instance).
        comment_id: The ID of the comment to delete.
        post_id: The ID of the post the comment belongs to (for count update).
    """
    tx.execute("DELETE FROM comments WHERE id=%s", (comment_id,))
    tx.execute(
        "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id=%s",
        (post_id,),
    )


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

def get_tag_suggestions(client, q: str, limit: int) -> list:
    """Return the most-used tags that start with a given prefix.

    Args:
        client: An open RemoteDBClient instance.
        q: The search prefix (no '#'). Matched with LIKE '{q}%'.
        limit: Maximum number of tag suggestions to return.

    Returns:
        A list of dicts with 'tag' and 'post_count', ordered by post_count DESC.
    """
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


# ---------------------------------------------------------------------------
# For You feed
# ---------------------------------------------------------------------------

def _score_post(post: dict, followed_ids: set, liked_tags: set,
                liked_post_ids: set, tags_by_post: dict) -> float:
    """
    Score a post for the For You feed.

    Points breakdown (max ~115):
      - Recency     0–50  half-life 24 h
      - Follow      35    post is from someone the viewer follows
      - Tag match   0–30  10 pts per tag overlap with user's liked tags (capped)
      - Popularity  ~log  likes × 5 + comments × 3 (log scale)
      - Seen        -10   post already liked by viewer (they've seen it)
    """
    # Recency: halves every 24 h
    # created_at arrives as an ISO string over the TCP JSON layer, so parse it.
    created = post["created_at"]
    if isinstance(created, str):
        created = datetime.fromisoformat(created).replace(tzinfo=timezone.utc)
    elif created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_h = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    recency = 50.0 * math.exp(-age_h * math.log(2) / 24)

    follow_bonus = 35.0 if post["user_id"] in followed_ids else 0.0

    post_tags = tags_by_post.get(post["id"], set())
    tag_bonus = min(len(post_tags & liked_tags) * 4, 12.0)

    popularity = (
        math.log1p(post["likes_count"]) * 5
        + math.log1p(post["comments_count"]) * 3
    )

    seen_penalty = -10.0 if post["id"] in liked_post_ids else 0.0

    # Small jitter so posts with identical scores appear in a different order
    # each refresh. ±5 pts is intentionally smaller than the tag_bonus (10 pts
    # per liked tag) so liked topics still win reliably.
    jitter = random.uniform(-8.0, 8.0)

    return recency + follow_bonus + tag_bonus + popularity + seen_penalty + jitter


def get_for_you_posts(client, user_id: int, limit: int, offset: int) -> list:
    """
    Return a personalised feed sorted by relevance score.

    Pulls up to 300 posts from the last 14 days, scores each one
    using recency, follow graph, tag affinity, and popularity, then
    returns the slice [offset : offset+limit].
    """
    # 1. Candidate posts — recent window
    posts = client.execute(
        """
        SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          AND (
            u.is_private = 0
            OR p.user_id = %s
            OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = %s AND f.following_id = p.user_id)
          )
        ORDER BY p.created_at DESC
        LIMIT 300
        """,
        (user_id, user_id),
    )['data']

    if not posts:
        return []

    # 2. Follow graph
    followed_ids = {
        r["following_id"]
        for r in client.execute(
            "SELECT following_id FROM follows WHERE follower_id=%s",
            (user_id,),
        )['data']
    }

    # 3. Tags the viewer has engaged with via likes
    liked_tags = {
        r["tag"]
        for r in client.execute(
            """
            SELECT DISTINCT pt.tag
            FROM likes l
            JOIN post_tags pt ON pt.post_id = l.post_id
            WHERE l.user_id = %s
            """,
            (user_id,),
        )['data']
    }

    # 4. Posts the viewer already liked
    liked_post_ids = {
        r["post_id"]
        for r in client.execute(
            "SELECT post_id FROM likes WHERE user_id=%s",
            (user_id,),
        )['data']
    }

    # 5. Tags per post (batch)
    post_ids = [p["id"] for p in posts]
    ph = placeholders(post_ids)
    tags_by_post: dict = {}
    for r in client.execute(
        f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({ph})",
        post_ids,
    )['data']:
        tags_by_post.setdefault(r["post_id"], set()).add(r["tag"])

    # 6. Score, sort, paginate
    scored = sorted(
        posts,
        key=lambda p: _score_post(p, followed_ids, liked_tags,
                                   liked_post_ids, tags_by_post),
        reverse=True,
    )
    return scored[offset: offset + limit]
