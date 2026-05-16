"""Notification query helpers — fetching, marking read, and inserting notifications."""


def get_user_notifications(client, user_id: int) -> list:
    """Fetch the 50 most recent notifications for a user.

    Args:
        client: An open RemoteDBClient instance.
        user_id: The ID of the user whose notifications to fetch.

    Returns:
        A list of notification dicts ordered newest first, each containing id,
        actor_user_id, actor_username, actor_profile_image_url,
        notification_type, post_id, post_media_url, chat_id, is_read, created_at.
    """
    return client.execute(
        """
        SELECT id, actor_user_id, actor_username, actor_profile_image_url,
               notification_type, post_id, post_media_url, chat_id, is_read, created_at
        FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (user_id,),
    )['data']


def mark_notifications_read(tx, user_id: int):
    """Mark all unread notifications as read for a user.

    Args:
        tx: An active transaction (_Transaction instance).
        user_id: The ID of the user whose notifications to mark as read.
    """
    tx.execute(
        "UPDATE notifications SET is_read=1 WHERE user_id=%s AND is_read=0",
        (user_id,),
    )


def notify_followers_of_post(client, follower_ids: list, actor: dict, post_id: int, media_url: str):
    """Insert post notifications for all followers. Non-fatal — errors are logged, not raised."""
    if not follower_ids:
        return
    try:
        with client.transaction() as tx:
            for fid in follower_ids:
                tx.execute(
                    "INSERT INTO notifications"
                    " (user_id, actor_user_id, actor_username,"
                    "  actor_profile_image_url, notification_type, post_id, post_media_url)"
                    " VALUES (%s, %s, %s, %s, 'post', %s, %s)",
                    (fid, actor['id'], actor['username'],
                     actor['profile_image_url'], post_id, media_url),
                )
    except Exception as e:
        print(f"Notification insert error (non-fatal): {e}")


def notify_message_sent(client, recipient_id: int, sender: dict, chat_id: int):
    """Insert a message notification for the recipient. Non-fatal."""
    try:
        with client.transaction() as tx:
            tx.execute(
                "INSERT INTO notifications"
                " (user_id, actor_user_id, actor_username,"
                "  actor_profile_image_url, notification_type, chat_id)"
                " VALUES (%s, %s, %s, %s, 'message', %s)",
                (recipient_id, sender['id'], sender['username'],
                 sender.get('profile_image_url'), chat_id),
            )
    except Exception as e:
        print(f"Message notification insert error (non-fatal): {e}")
