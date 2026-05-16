"""User, follow, and follow-request query helpers."""
from .sql import placeholders, _one


def get_user_by_id(client, user_id: int):
    """Fetch a user's basic public fields by ID.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The user's primary key.

    Returns:
        A dict with id, username, profile_image_url, tour_completed, is_admin,
        or None if not found.
    """
    return _one(client.execute(
        "SELECT id, username, profile_image_url, tour_completed, is_admin FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_by_username(client, username: str):
    """Fetch a user's id and username by their username.

    Args:
        client: An open RemoteDBClient instance.
        username: The username to look up (case-sensitive).

    Returns:
        A dict with id and username, or None if not found.
    """
    return _one(client.execute(
        "SELECT id, username FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def get_user_auth_row(client, username: str):
    """Returns id, username, email, password_hash, is_admin — used during login."""
    return _one(client.execute(
        "SELECT id, username, email, password_hash, is_admin FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def get_user_full(client, user_id: int):
    """Returns id, username, bio, profile_image_url, is_private — used for profile display."""
    return _one(client.execute(
        "SELECT id, username, bio, profile_image_url, is_private FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_for_update(client, user_id: int):
    """Returns id, username, email — used before applying profile updates."""
    return _one(client.execute(
        "SELECT id, username, email FROM users WHERE id=%s LIMIT 1",
        (user_id,),
    )['data'])


def get_user_counts(client, user_id: int) -> dict:
    """Return post, follower, and following counts for a user.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The user's primary key.

    Returns:
        A dict with keys posts_count, followers_count, and following_count.
    """
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
    """Check whether a username is already in use.

    Args:
        client: An open RemoteDBClient (or transaction) instance.
        username: The username to check.
        exclude_id: Optional user ID to exclude from the check (used when
                    updating an existing user's own username).

    Returns:
        True if the username is taken, False if it is available.
    """
    if exclude_id:
        return bool(client.execute(
            "SELECT id FROM users WHERE username=%s AND id != %s LIMIT 1",
            (username, exclude_id),
        )['data'])
    return bool(client.execute(
        "SELECT id FROM users WHERE username=%s LIMIT 1",
        (username,),
    )['data'])


def create_user(
    tx, email: str, username: str, pw_hash: str,
    bio: str = None, avatar_path: str = None,
) -> int:
    """Insert a new user row and return the new user's ID.

    Args:
        tx: An active transaction (_Transaction instance).
        email: The user's email address.
        username: The user's chosen username.
        pw_hash: Bcrypt hash of the user's password.
        bio: Optional profile bio text.
        avatar_path: Optional URL path to the profile avatar.

    Returns:
        The auto-generated primary key of the new user.
    """
    result = tx.execute(
        "INSERT INTO users (email, username, password_hash, bio, profile_image_url) VALUES (%s, %s, %s, %s, %s)",
        (email, username, pw_hash, bio, avatar_path),
    )
    return result['lastrowid']


def update_user_fields(tx, user_id: int, updates: dict):
    """Apply a dict of column→value updates to a user row.

    Builds a SET clause dynamically from the updates dict, so only
    the provided fields are modified.

    Args:
        tx: An active transaction (_Transaction instance).
        user_id: The ID of the user to update.
        updates: A dict mapping column names to their new values.
    """
    set_clause = ", ".join([f"{k}=%s" for k in updates.keys()])
    tx.execute(
        f"UPDATE users SET {set_clause} WHERE id=%s",
        list(updates.values()) + [user_id],
    )


def get_user_followers(client, user_id: int) -> list:
    """Fetch all users who follow a given user, newest first.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose followers to fetch.

    Returns:
        A list of dicts: user_id, username, profile_image_url.
    """
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
    """Fetch all users that a given user follows, newest first.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose following list to fetch.

    Returns:
        A list of dicts: user_id, username, profile_image_url.
    """
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
    """Return a plain list of user IDs who follow a given user.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose follower IDs to fetch.

    Returns:
        A list of integer follower user IDs.
    """
    return [
        r['follower_id']
        for r in client.execute(
            "SELECT follower_id FROM follows WHERE following_id=%s", (user_id,)
        )['data']
    ]


def get_followed_user_ids(client, viewer_id: int, user_ids: list) -> set:
    """Return the subset of user_ids that the viewer is following.

    Args:
        client: An open RemoteDBClient instance.
        viewer_id: The ID of the user doing the following.
        user_ids: A list of candidate user IDs to check.

    Returns:
        A set of IDs from user_ids that the viewer follows.
        Returns an empty set if user_ids is empty.
    """
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
    """Check whether one user is following another.

    Args:
        client: An open RemoteDBClient instance.
        follower_id: The ID of the potential follower.
        following_id: The ID of the user being followed.

    Returns:
        True if follower_id follows following_id, False otherwise.
    """
    return bool(client.execute(
        "SELECT 1 FROM follows WHERE follower_id=%s AND following_id=%s LIMIT 1",
        (follower_id, following_id),
    )['data'])


def remove_follower(tx, follower_id: int, following_id: int):
    """Delete a follow relationship (used when a user removes one of their followers).

    Args:
        tx: An active transaction (_Transaction instance).
        follower_id: The ID of the user to remove as a follower.
        following_id: The ID of the user whose follower list is being modified.
    """
    tx.execute(
        "DELETE FROM follows WHERE follower_id=%s AND following_id=%s",
        (follower_id, following_id),
    )


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


def create_follow_request(tx, requester_id: int, target_id: int):
    """Create a pending follow request from requester to target. Silently ignores duplicates.

    Args:
        tx: An active transaction (_Transaction instance).
        requester_id: The ID of the user sending the request.
        target_id: The ID of the private-account user being requested.
    """
    tx.execute(
        "INSERT IGNORE INTO follow_requests (requester_id, target_id) VALUES (%s, %s)",
        (requester_id, target_id),
    )


def delete_follow_request(tx, requester_id: int, target_id: int):
    """Delete a pending follow request (used on rejection or cancellation).

    Args:
        tx: An active transaction (_Transaction instance).
        requester_id: The ID of the user who sent the request.
        target_id: The ID of the user who received the request.
    """
    tx.execute(
        "DELETE FROM follow_requests WHERE requester_id=%s AND target_id=%s",
        (requester_id, target_id),
    )


def has_follow_request(client, requester_id: int, target_id: int) -> bool:
    """Check whether a pending follow request exists between two users.

    Args:
        client: An open RemoteDBClient instance.
        requester_id: The ID of the user who sent the request.
        target_id: The ID of the user who received the request.

    Returns:
        True if a pending request exists, False otherwise.
    """
    return bool(client.execute(
        "SELECT 1 FROM follow_requests WHERE requester_id=%s AND target_id=%s LIMIT 1",
        (requester_id, target_id),
    )['data'])


def get_pending_follow_requests(client, user_id: int) -> list:
    """Fetch all pending follow requests directed at a user, newest first.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user who received the requests.

    Returns:
        A list of dicts: user_id, username, profile_image_url, created_at
        (one entry per requester).
    """
    return client.execute(
        """
        SELECT u.id AS user_id, u.username, u.profile_image_url, fr.created_at
        FROM follow_requests fr
        JOIN users u ON fr.requester_id = u.id
        WHERE fr.target_id = %s
        ORDER BY fr.created_at DESC
        """,
        (user_id,),
    )['data']


def approve_follow_request(tx, requester_id: int, target_id: int):
    """Approve a follow request: delete it and insert the follow relationship.

    Args:
        tx: An active transaction (_Transaction instance).
        requester_id: The ID of the user who sent the request.
        target_id: The ID of the user approving the request.
    """
    tx.execute(
        "DELETE FROM follow_requests WHERE requester_id=%s AND target_id=%s",
        (requester_id, target_id),
    )
    tx.execute(
        "INSERT IGNORE INTO follows (follower_id, following_id) VALUES (%s, %s)",
        (requester_id, target_id),
    )


def get_user_aura_components(client, user_id: int) -> dict:
    """Fetch the raw components used to calculate a user's aura score.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The user's primary key.

    Returns:
        A dict with integer keys: posts_count, followers_count,
        total_likes, and total_comments.
    """
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
    """Set tour_completed=1 for a user, marking the onboarding tour as done.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user who completed the tour.
    """
    client.execute("UPDATE users SET tour_completed=1 WHERE id=%s", (user_id,))
