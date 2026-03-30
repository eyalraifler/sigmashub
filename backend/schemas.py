from datetime import datetime
from pydantic import BaseModel
from typing import List


class MediaItemRequest(BaseModel):
    media_base64: str
    media_type: str  # "image" or "video"


class MediaItemResponse(BaseModel):
    media_url: str
    media_type: str
    position: int


class PostResponse(BaseModel):
    id: int
    user_id: int
    username: str
    profile_image_url: str | None
    caption: str
    media_url: str
    media_type: str
    likes_count: int
    comments_count: int
    created_at: datetime
    is_liked_by_user: bool = False
    is_following: bool = False
    tags: List[str] = []
    media_items: List[MediaItemResponse] = []


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    profile_image_url: str | None
    content: str
    created_at: datetime
