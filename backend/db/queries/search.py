def search_users(client, query: str, limit: int) -> list:
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


def search_posts_by_caption(client, query: str, limit: int) -> list:
    return client.execute(
        """
        SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.caption LIKE %s
        ORDER BY p.created_at DESC
        LIMIT %s
        """,
        (f"%{query}%", limit),
    )['data']


def search_posts_by_tag(client, query: str, limit: int) -> list:
    return client.execute(
        """
        SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
               p.likes_count, p.comments_count, p.created_at,
               u.username, u.profile_image_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN post_tags pt ON pt.post_id = p.id
        WHERE pt.tag LIKE %s
        ORDER BY p.created_at DESC
        LIMIT %s
        """,
        (f"%{query}%", limit),
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
