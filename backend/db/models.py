from datetime import datetime


class User:
    def __init__(self, id: int, email: str, username: str, password_hash: str,
                 created_at: datetime, is_private: int, bio: str = None,
                 profile_image_url: str = None, onboarding_completed: int = 0,
                 is_email_verified: int = 0):
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

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            id=data["id"], email=data["email"], username=data["username"],
            password_hash=data.get("password_hash", ""),
            created_at=data.get("created_at"), is_private=data.get("is_private", 0),
            bio=data.get("bio"), profile_image_url=data.get("profile_image_url"),
            onboarding_completed=data.get("onboarding_completed", 0),
            is_email_verified=data.get("is_email_verified", 0),
        )

    def __repr__(self):
        return (f"User(id: {self.id}, email: {self.email}, username: {self.username}, "
                f"is_private: {self.is_private}, bio: {self.bio}, "
                f"profile_image: {self.profile_image_url})")


class Post:
    def __init__(self, id: int, user_id: int, media_url: str, media_type: str,
                 created_at: datetime, caption: str = None,
                 likes_count: int = 0, comments_count: int = 0):
        self.id = id
        self.user_id = user_id
        self.caption = caption
        self.media_url = media_url
        self.media_type = media_type
        self.likes_count = likes_count
        self.comments_count = comments_count
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data: dict) -> "Post":
        return cls(
            id=data["id"], user_id=data["user_id"],
            media_url=data["media_url"], media_type=data["media_type"],
            created_at=data.get("created_at"), caption=data.get("caption"),
            likes_count=data.get("likes_count", 0),
            comments_count=data.get("comments_count", 0),
        )

    def __repr__(self):
        return (f"Post(id: {self.id}, user_id: {self.user_id}, media_type: {self.media_type}, "
                f"likes_count: {self.likes_count}, comments_count: {self.comments_count}, "
                f"created_at: {self.created_at})")


class Like:
    def __init__(self, id: int, post_id: int, user_id: int, created_at: datetime):
        self.id = id
        self.post_id = post_id
        self.user_id = user_id
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data: dict) -> "Like":
        return cls(
            id=data["id"], post_id=data["post_id"],
            user_id=data["user_id"], created_at=data.get("created_at"),
        )

    def __repr__(self):
        return f"Like(id: {self.id}, post_id: {self.post_id}, user_id: {self.user_id}, created_at: {self.created_at})"


class Comment:
    def __init__(self, id: int, post_id: int, user_id: int, comment_text: str, created_at: datetime):
        self.id = id
        self.post_id = post_id
        self.user_id = user_id
        self.comment_text = comment_text
        self.created_at = created_at

    @classmethod
    def from_dict(cls, data: dict) -> "Comment":
        return cls(
            id=data["id"], post_id=data["post_id"], user_id=data["user_id"],
            comment_text=data["comment_text"], created_at=data.get("created_at"),
        )

    def __repr__(self):
        return (f"Comment(id: {self.id}, post_id: {self.post_id}, "
                f"user_id: {self.user_id}, created_at: {self.created_at})")
