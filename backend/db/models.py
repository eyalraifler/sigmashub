from datetime import datetime


class User:
    def __init__(self, id: int, email: str, username: str, password_hash: str, created_at: datetime, is_private: int, bio: str = None, profile_image_url: str = None, is_email_verified: int = 0):
        self.id = id
        self.email = email
        self.username = username
        self.password_hash = password_hash
        self.created_at = created_at
        self.is_private = is_private
        self.bio = bio
        self.profile_image_url = profile_image_url
        self.is_email_verified = is_email_verified
        
    def __repr__(self):
        return f"User(id: {self.id}, email: {self.email}, username: {self.username}, password_hash: {self.password_hash}, created_at: {self.created_at}, is_private: {self.is_private}, bio: {self.bio}, profile_image: {self.profile_image})"


