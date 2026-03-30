def get_user_chats(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT c.id AS chat_id, c.is_group, c.name AS chat_name, c.created_at,
               u.id AS other_user_id, u.username AS other_username,
               u.profile_image_url AS other_profile_image_url,
               (SELECT m.message_text FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
               (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time
        FROM chats c
        JOIN chat_members cm ON c.id = cm.chat_id AND cm.user_id = %s
        JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != %s AND c.is_group = 0
        JOIN users u ON cm2.user_id = u.id
        GROUP BY c.id
        ORDER BY last_message_time DESC
        """,
        (user_id, user_id),
    )['data']
