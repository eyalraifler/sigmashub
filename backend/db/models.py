from datetime import datetime


class User:
    def __init__(self, id: int, email: str, username: str, password_hash: str, created_at: datetime, is_private: int, bio: str = None, profile_image_url: str = None, onboarding_completed: int = 0, is_email_verified: int = 0):
        self.id = id
        self.email = email
        self.username = username
        self.password_hash = password_hash
        self.created_at = created_at
        self.is_private = is_private
        self.bio = bio
        self.onboarding_completed = onboarding_completed
        self.profile_image_url = profile_image_url
        self.is_email_verified = is_email_verified
        
    def __repr__(self):
        return f"User(id: {self.id}, email: {self.email}, username: {self.username}, password_hash: {self.password_hash}, created_at: {self.created_at}, is_private: {self.is_private}, bio: {self.bio}, profile_image: {self.profile_image_url})"


class Post:
    def __init__(self, id: int, user_id: int, media_url: str, media_type: str, created_at: datetime, caption: str = None, likes_count: int = 0, comments_count: int = 0):
        self.id = id
        self.user_id = user_id
        self.caption = caption
        self.media_url = media_url
        self.media_type = media_type
        self.likes_count = likes_count
        self.comments_count = comments_count
        self.created_at = created_at

    def __repr__(self):
        return f"Post(id: {self.id}, user_id: {self.user_id}, media_type: {self.media_type}, likes_count: {self.likes_count}, comments_count: {self.comments_count}, created_at: {self.created_at})"


class Like:
    def __init__(self, id: int, post_id: int, user_id: int, created_at: datetime):
        self.id = id
        self.post_id = post_id
        self.user_id = user_id
        self.created_at = created_at

    def __repr__(self):
        return f"Like(id: {self.id}, post_id: {self.post_id}, user_id: {self.user_id}, created_at: {self.created_at})"


class Comment:
    def __init__(self, id: int, post_id: int, user_id: int, comment_text: str, created_at: datetime):
        self.id = id
        self.post_id = post_id
        self.user_id = user_id
        self.comment_text = comment_text
        self.created_at = created_at

    def __repr__(self):
        return f"Comment(id: {self.id}, post_id: {self.post_id}, user_id: {self.user_id}, created_at: {self.created_at})"
