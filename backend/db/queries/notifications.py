def get_user_notifications(client, user_id: int) -> list:
    return client.execute(
        """
        SELECT id, actor_user_id, actor_username, actor_profile_image_url,
               post_id, post_media_url, is_read, created_at
        FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (user_id,),
    )['data']


def mark_notifications_read(tx, user_id: int):
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
                    "  actor_profile_image_url, post_id, post_media_url)"
                    " VALUES (%s, %s, %s, %s, %s, %s)",
                    (fid, actor['id'], actor['username'],
                     actor['profile_image_url'], post_id, media_url),
                )
    except Exception as e:
        print(f"Notification insert error (non-fatal): {e}")
