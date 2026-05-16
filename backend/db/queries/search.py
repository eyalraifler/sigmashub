"""Search query helpers for users and posts."""


def search_users(client, query: str, limit: int) -> list:
    """Search users whose username or bio contains the query string.

    Args:
        client: An open RemoteDBClient instance.
        query: The search string (matched with LIKE %query%).
        limit: Maximum number of results to return.

    Returns:
        A list of user dicts: id, username, bio, profile_image_url.
        Ordered alphabetically by username.
    """
    like_q = f"%{query}%"
    return client.execute(
        """
        SELECT id, username, bio, profile_image_url
        FROM users
        WHERE username LIKE %s OR bio LIKE %s
        ORDER BY username
        LIMIT %s
        """,
        (like_q, like_q, limit),
    )['data']


def search_posts_by_caption(client, query: str, limit: int, viewer_id: int = None) -> list:
    """Search posts whose caption contains the query string.

    Only returns posts visible to the viewer (public accounts, own posts, or
    posts from followed accounts).

    Args:
        client: An open RemoteDBClient instance.
        query: The search string (matched with LIKE %query%).
        limit: Maximum number of posts to return.
        viewer_id: Optional ID of the requesting user for visibility filtering.

    Returns:
        A list of post dicts joined with author info, ordered newest first.
    """
    return client.execute(
        """
        SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.caption LIKE %s
          AND (
            u.is_private = 0
            OR p.user_id = %s
            OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = %s AND f.following_id = p.user_id)
          )
        ORDER BY p.created_at DESC
        LIMIT %s
        """,
        (f"%{query}%", viewer_id, viewer_id, limit),
    )['data']


def search_posts_by_tag(client, query: str, limit: int, viewer_id: int = None) -> list:
    """Search posts whose tags contain the query string.

    Only returns posts visible to the viewer (public accounts, own posts, or
    posts from followed accounts).

    Args:
        client: An open RemoteDBClient instance.
        query: The tag search string (matched with LIKE %query%).
        limit: Maximum number of posts to return.
        viewer_id: Optional ID of the requesting user for visibility filtering.

    Returns:
        A list of post dicts joined with author info, ordered newest first.
    """
    return client.execute(
        """
        SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN post_tags pt ON pt.post_id = p.id
        WHERE pt.tag LIKE %s
          AND (
            u.is_private = 0
            OR p.user_id = %s
            OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = %s AND f.following_id = p.user_id)
          )
        ORDER BY p.created_at DESC
        LIMIT %s
        """,
        (f"%{query}%", viewer_id, viewer_id, limit),
    )['data']


def merge_post_results(by_caption: list, by_tag: list, limit: int) -> list:
    """Deduplicates and merges two post result lists, capped at limit."""
    seen_ids = set()
    posts = []
    for post in by_caption + by_tag:
        if post["id"] not in seen_ids:
            seen_ids.add(post["id"])
            posts.append(post)
    return posts[:limit]
