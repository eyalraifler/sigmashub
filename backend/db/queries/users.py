from .sql import placeholders, _one


def get_user_by_id(client, user_id: int):
    return _one(client.execute(
        "SELECT id, username, profile_image_url, tour_completed FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_by_username(client, username: str):
    return _one(client.execute(
        "SELECT id, username FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def get_user_auth_row(client, username: str):
    """Returns id, username, email, password_hash — used during login."""
    return _one(client.execute(
        "SELECT id, username, email, password_hash FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def get_user_full(client, user_id: int):
    """Returns id, username, bio, profile_image_url — used for profile display."""
    return _one(client.execute(
        "SELECT id, username, bio, profile_image_url FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_for_update(client, user_id: int):
    """Returns id, username, email — used before applying profile updates."""
    return _one(client.execute(
        "SELECT id, username, email FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_counts(client, user_id: int) -> dict:
    posts_count = client.execute(
        "SELECT COUNT(*) AS cnt FROM posts WHERE user_id=%s", (user_id,)
    )['data'][0]['cnt']
    followers_count = client.execute(
        "SELECT COUNT(*) AS cnt FROM follows WHERE following_id=%s", (user_id,)
    )['data'][0]['cnt']
    following_count = client.execute(
        "SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=%s", (user_id,)
    )['data'][0]['cnt']
    return {
        "posts_count": posts_count,
        "followers_count": followers_count,
        "following_count": following_count,
    }


def check_username_taken(client, username: str, exclude_id: int = None) -> bool:
    if exclude_id:
        return bool(client.execute(
            "SELECT id FROM users WHERE username=%s AND id != %s LIMIT 1",
            (username, exclude_id),
        )['data'])
    return bool(client.execute(
        "SELECT id FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def create_user(tx, email: str, username: str, pw_hash: str, bio: str = None, avatar_path: str = None) -> int:
    result = tx.execute(
        "INSERT INTO users (email, username, password_hash, bio, profile_image_url) VALUES (%s, %s, %s, %s, %s)",
        (email, username, pw_hash, bio, avatar_path),
    )
    return result['lastrowid']


def update_user_fields(tx, user_id: int, updates: dict):
    set_clause = ", ".join([f"{k}=%s" for k in updates.keys()])
    tx.execute(
        f"UPDATE users SET {set_clause} WHERE id=%s",
        list(updates.values()) + [user_id],
    )


def get_user_followers(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT u.id AS user_id, u.username, u.profile_image_url
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = %s
        ORDER BY f.created_at DESC
        """,
        (user_id,),
    )['data']


def get_user_following(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT u.id AS user_id, u.username, u.profile_image_url
        FROM follows f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = %s
        ORDER BY f.created_at DESC
        """,
        (user_id,),
    )['data']


def get_follower_ids(client, user_id: int) -> list:
    return [
        r['follower_id']
        for r in client.execute(
            "SELECT follower_id FROM follows WHERE following_id=%s", (user_id,)
        )['data']
    ]


def get_followed_user_ids(client, viewer_id: int, user_ids: list) -> set:
    if not user_ids:
        return set()
    ph = placeholders(user_ids)
    return {
        row["following_id"]
        for row in client.execute(
            f"SELECT following_id FROM follows WHERE follower_id=%s AND following_id IN ({ph})",
            [viewer_id] + user_ids,
        )['data']
    }


def attach_is_following(client, users: list, viewer_id: int):
    """Mutates each user dict to add an is_following field."""
    if viewer_id and users:
        uids = [u["user_id"] for u in users]
        following = get_followed_user_ids(client, viewer_id, uids)
        for u in users:
            u["is_following"] = u["user_id"] in following
    else:
        for u in users:
            u["is_following"] = False


def is_following_user(client, follower_id: int, following_id: int) -> bool:
    return bool(client.execute(
        "SELECT 1 FROM follows WHERE follower_id=%s AND following_id=%s LIMIT 1",
        (follower_id, following_id),
    )['data'])


def toggle_follow(tx, follower_id: int, following_id: int) -> bool:
    """Returns True if now following, False if unfollowed."""
    existing = _one(tx.execute(
        "SELECT id FROM follows WHERE follower_id=%s AND following_id=%s LIMIT 1",
        (follower_id, following_id),
    )['data'])
    if existing:
        tx.execute(
            "DELETE FROM follows WHERE follower_id=%s AND following_id=%s",
            (follower_id, following_id),
        )
        return False
    else:
        tx.execute(
            "INSERT INTO follows (follower_id, following_id) VALUES (%s, %s)",
            (follower_id, following_id),
        )
        return True


def get_user_aura_components(client, user_id: int) -> dict:
    components = client.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM posts WHERE user_id=%s) AS posts_count,
            (SELECT COUNT(*) FROM follows WHERE following_id=%s) AS followers_count,
            (SELECT COALESCE(SUM(likes_count), 0) FROM posts WHERE user_id=%s) AS total_likes,
            (SELECT COALESCE(SUM(comments_count), 0) FROM posts WHERE user_id=%s) AS total_comments
        """,
        (user_id, user_id, user_id, user_id),
    )['data'][0]
    return {k: int(v) for k, v in components.items()}


def mark_tour_complete(client, user_id: int):
    client.execute("UPDATE users SET tour_completed=1 WHERE id=%s", (user_id,))
