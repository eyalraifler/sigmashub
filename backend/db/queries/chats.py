"""Chat and message query helpers for the chats/messages tables."""
from .sql import _one


def get_user_chats(client, user_id: int) -> list:
    """Fetch all chats for a user, enriched with member info and last message.

    For each chat the user belongs to, attaches the full member list, derives
    a display_name and display_image from the other participant, and orders
    chats by the most recent message (or creation time if no messages yet).

    Args:
        client: An open RemoteDBClient (or transaction) instance.
        user_id: The ID of the user whose chats to fetch.

    Returns:
        A list of chat dicts, each containing id, created_at, last_message,
        last_message_at, members, display_name, and display_image.
    """
    chats = client.execute(
        """
        SELECT c.id, c.created_at,
               m.message_text AS last_message,
               m.created_at AS last_message_at
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
        LEFT JOIN messages m ON m.id = (
            SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
        )
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
        """,
        (user_id,),
    )['data']

    for chat in chats:
        members = get_chat_members(client, chat['id'])
        chat['members'] = members
        other = next((m for m in members if m['user_id'] != user_id), None)
        chat['display_name'] = other['username'] if other else "Unknown"
        chat['display_image'] = other['profile_image_url'] if other else None

    return chats


def get_chat_by_id(client, chat_id: int):
    """Fetch a single chat row by its ID.

    Args:
        client: An open RemoteDBClient instance.
        chat_id: The chat's primary key.

    Returns:
        A dict with id and created_at, or None if not found.
    """
    return _one(client.execute(
        "SELECT id, created_at FROM chats WHERE id=%s LIMIT 1",
        (chat_id,),
    )['data'])


def get_chat_members(client, chat_id: int) -> list:
    """Fetch all members of a chat with their user profile info.

    Args:
        client: An open RemoteDBClient instance.
        chat_id: The chat's primary key.

    Returns:
        A list of member dicts: user_id, username, profile_image_url, joined_at.
        Ordered by join time (oldest first).
    """
    return client.execute(
        """
        SELECT u.id AS user_id, u.username, u.profile_image_url, cm.joined_at
        FROM chat_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.chat_id = %s
        ORDER BY cm.joined_at ASC
        """,
        (chat_id,),
    )['data']


def is_chat_member(client, chat_id: int, user_id: int) -> bool:
    """Check whether a user belongs to a specific chat.

    Args:
        client: An open RemoteDBClient instance.
        chat_id: The chat's primary key.
        user_id: The user's primary key.

    Returns:
        True if the user is a member of the chat, False otherwise.
    """
    result = _one(client.execute(
        "SELECT 1 AS found FROM chat_members WHERE chat_id=%s AND user_id=%s LIMIT 1",
        (chat_id, user_id),
    )['data'])
    return result is not None


def get_chat_messages(client, chat_id: int, limit: int = 50, offset: int = 0) -> list:
    """Fetch a paginated list of messages for a chat, ordered oldest first.

    Args:
        client: An open RemoteDBClient instance.
        chat_id: The chat's primary key.
        limit: Maximum number of messages to return (default 50).
        offset: Number of messages to skip for pagination (default 0).

    Returns:
        A list of message dicts: id, chat_id, sender_id, message_text,
        message_type, created_at, sender_username, sender_image.
    """
    return client.execute(
        """
        SELECT m.id, m.chat_id, m.sender_id, m.message_text, m.message_type, m.created_at,
               u.username AS sender_username, u.profile_image_url AS sender_image
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = %s
        ORDER BY m.created_at ASC
        LIMIT %s OFFSET %s
        """,
        (chat_id, limit, offset),
    )['data']


def get_new_messages(client, chat_id: int, after_id: int) -> list:
    """Fetch all messages in a chat that are newer than a given message ID.

    Used for polling — the client passes the ID of the last message it saw,
    and only new ones are returned.

    Args:
        client: An open RemoteDBClient instance.
        chat_id: The chat's primary key.
        after_id: Only messages with id > after_id are returned.

    Returns:
        A list of message dicts ordered oldest first (same shape as get_chat_messages).
    """
    return client.execute(
        """
        SELECT m.id, m.chat_id, m.sender_id, m.message_text, m.message_type, m.created_at,
               u.username AS sender_username, u.profile_image_url AS sender_image
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = %s AND m.id > %s
        ORDER BY m.created_at ASC
        """,
        (chat_id, after_id),
    )['data']


def get_unread_chat_count(client, user_id: int) -> int:
    """Count how many chats have unread messages for the user.

    A chat is considered unread if it contains at least one message sent by
    someone else that the user has not read yet (i.e. message id >
    last_read_message_id, or last_read_message_id is NULL).

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user to check.

    Returns:
        The number of chats with unread messages.
    """
    result = client.execute(
        """
        SELECT COUNT(*) AS cnt FROM chat_members cm
        WHERE cm.user_id = %s
          AND EXISTS (
              SELECT 1 FROM messages m
              WHERE m.chat_id = cm.chat_id
                AND m.sender_id != %s
                AND (cm.last_read_message_id IS NULL OR m.id > cm.last_read_message_id)
          )
        """,
        (user_id, user_id),
    )['data'][0]['cnt']
    return result


def mark_chat_read(tx, chat_id: int, user_id: int, last_message_id: int):
    """Update last_read_message_id for a user in a chat (only moves forward).

    The update is guarded by a condition so it only applies if the new value
    is greater than the current one, preventing accidental regressions.

    Args:
        tx: An active transaction (_Transaction instance).
        chat_id: The chat's primary key.
        user_id: The user marking the chat as read.
        last_message_id: The ID of the most recent message the user has seen.
    """
    tx.execute(
        """
        UPDATE chat_members SET last_read_message_id = %s
        WHERE chat_id = %s AND user_id = %s
          AND (last_read_message_id IS NULL OR last_read_message_id < %s)
        """,
        (last_message_id, chat_id, user_id, last_message_id),
    )


def create_chat(tx) -> int:
    """Insert a new chat row and return its ID.

    Args:
        tx: An active transaction (_Transaction instance).

    Returns:
        The auto-generated primary key of the new chat.
    """
    result = tx.execute("INSERT INTO chats () VALUES ()")
    return result['lastrowid']


def add_chat_member(tx, chat_id: int, user_id: int):
    """Add a user to a chat. Silently ignores duplicate inserts.

    Args:
        tx: An active transaction (_Transaction instance).
        chat_id: The chat's primary key.
        user_id: The user to add.
    """
    tx.execute(
        "INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
        (chat_id, user_id),
    )


def send_message(tx, chat_id: int, sender_id: int, text: str) -> int:
    """Insert a new message into a chat and return its ID.

    Args:
        tx: An active transaction (_Transaction instance).
        chat_id: The chat's primary key.
        sender_id: The ID of the user sending the message.
        text: The message content.

    Returns:
        The auto-generated primary key of the new message.
    """
    result = tx.execute(
        "INSERT INTO messages (chat_id, sender_id, message_text) VALUES (%s, %s, %s)",
        (chat_id, sender_id, text),
    )
    return result['lastrowid']


def find_direct_chat(client, user_id1: int, user_id2: int):
    """Find an existing direct (2-person) chat between two users.

    Args:
        client: An open RemoteDBClient instance.
        user_id1: ID of the first user.
        user_id2: ID of the second user.

    Returns:
        A dict with the chat id, or None if no direct chat exists yet.
    """
    return _one(client.execute(
        """
        SELECT c.id FROM chats c
        WHERE EXISTS (SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=%s)
          AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=%s)
          AND (SELECT COUNT(*) FROM chat_members WHERE chat_id=c.id) = 2
        LIMIT 1
        """,
        (user_id1, user_id2),
    )['data'])
