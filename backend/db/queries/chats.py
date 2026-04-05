from .sql import _one


def get_user_chats(client, user_id: int) -> list:
    chats = client.execute(
        """
        SELECT c.id, c.name, c.is_group, c.created_at,
               m.message_text AS last_message,
               m.created_at AS last_message_at,
               u.username AS last_sender_username
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
        LEFT JOIN messages m ON m.id = (
            SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
        )
        LEFT JOIN users u ON u.id = m.sender_id
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
        """,
        (user_id,),
    )['data']

    for chat in chats:
        members = get_chat_members(client, chat['id'])
        chat['members'] = members
        if not chat['is_group']:
            other = next((m for m in members if m['user_id'] != user_id), None)
            chat['display_name'] = other['username'] if other else "Unknown"
            chat['display_image'] = other['profile_image_url'] if other else None
        else:
            chat['display_name'] = chat['name']
            chat['display_image'] = None

    return chats


def get_chat_by_id(client, chat_id: int):
    return _one(client.execute(
        "SELECT id, name, is_group, created_at FROM chats WHERE id=%s LIMIT 1",
        (chat_id,),
    )['data'])


def get_chat_members(client, chat_id: int) -> list:
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
    result = _one(client.execute(
        "SELECT 1 AS found FROM chat_members WHERE chat_id=%s AND user_id=%s LIMIT 1",
        (chat_id, user_id),
    )['data'])
    return result is not None


def get_chat_messages(client, chat_id: int, limit: int = 50, offset: int = 0) -> list:
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
    tx.execute(
        """
        UPDATE chat_members SET last_read_message_id = %s
        WHERE chat_id = %s AND user_id = %s
          AND (last_read_message_id IS NULL OR last_read_message_id < %s)
        """,
        (last_message_id, chat_id, user_id, last_message_id),
    )


def create_chat(tx, name, is_group: bool) -> int:
    result = tx.execute(
        "INSERT INTO chats (name, is_group) VALUES (%s, %s)",
        (name, 1 if is_group else 0),
    )
    return result['lastrowid']


def add_chat_member(tx, chat_id: int, user_id: int):
    tx.execute(
        "INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
        (chat_id, user_id),
    )


def remove_chat_member(tx, chat_id: int, user_id: int):
    tx.execute(
        "DELETE FROM chat_members WHERE chat_id=%s AND user_id=%s",
        (chat_id, user_id),
    )


def send_message(tx, chat_id: int, sender_id: int, text: str) -> int:
    result = tx.execute(
        "INSERT INTO messages (chat_id, sender_id, message_text) VALUES (%s, %s, %s)",
        (chat_id, sender_id, text),
    )
    return result['lastrowid']


def find_direct_chat(client, user_id1: int, user_id2: int):
    return _one(client.execute(
        """
        SELECT c.id FROM chats c
        WHERE c.is_group = 0
          AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=%s)
          AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=%s)
          AND (SELECT COUNT(*) FROM chat_members WHERE chat_id=c.id) = 2
        LIMIT 1
        """,
        (user_id1, user_id2),
    )['data'])
