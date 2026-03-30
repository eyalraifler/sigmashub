from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from database import db
from schemas import MediaItemRequest, MediaItemResponse, PostResponse, CommentResponse
from utils.auth import get_current_user
from utils.media import save_post_media, normalize_tags
from db.queries.sql import _one
from db.queries.posts import (
    get_post_by_id, get_feed_posts,
    enrich_posts, get_tags_for_posts, get_media_for_posts,
    insert_post, insert_post_media, insert_post_tags, delete_post,
    get_post_likes, toggle_like,
    get_post_comments, get_comment_by_id, insert_comment, delete_comment,
    get_tag_suggestions,
)
from db.queries.users import get_user_by_id, get_follower_ids
from db.queries.notifications import notify_followers_of_post

router = APIRouter(prefix="/api")


class CreatePostRequest(BaseModel):
    user_id: int
    caption: str = ""
    tags: List[str] = []
    media_items: List[MediaItemRequest]


class LikeRequest(BaseModel):
    user_id: int
    post_id: int


class CreateCommentRequest(BaseModel):
    user_id: int
    post_id: int
    content: str


@router.post("/posts/create")
def create_post(payload: CreatePostRequest, current_user_id: int = Depends(get_current_user)):
    user_id = current_user_id
    caption = payload.caption.strip() if payload.caption else ""
    tags = normalize_tags(payload.tags)
    media_items = payload.media_items

    if not media_items or len(media_items) > 10:
        raise HTTPException(status_code=400, detail="Provide between 1 and 10 media items")

    saved_media = []
    for item in media_items:
        mt = item.media_type.lower()
        if mt not in ["image", "video"]:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {mt}")
        url = save_post_media(item.media_base64)
        if not url:
            raise HTTPException(status_code=400, detail="Invalid media data")
        saved_media.append({"url": url, "type": mt})

    first = saved_media[0]

    try:
        with db() as client:
            with client.transaction() as tx:
                actor = get_user_by_id(tx, user_id)
                if not actor:
                    raise HTTPException(status_code=404, detail="User not found")

                post_id = insert_post(tx, user_id, caption, first["url"], first["type"])
                insert_post_media(tx, post_id, saved_media)
                insert_post_tags(tx, post_id, tags)

            follower_ids = get_follower_ids(client, user_id)
            notify_followers_of_post(client, follower_ids, actor, post_id, first["url"])

        return {"ok": True, "post_id": post_id, "media_url": first["url"]}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Create post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/posts/feed")
def get_posts_feed(user_id: int, limit: int = 20, offset: int = 0):
    try:
        with db() as client:
            posts = get_feed_posts(client, limit, offset)
            posts = posts[:5]  # demo limit
            enrich_posts(client, posts, viewer_id=user_id)

        results = []
        for post in posts:
            items = [MediaItemResponse(**m) for m in post["media_items"]]
            results.append(PostResponse(
                **{k: post[k] for k in ("id", "user_id", "username", "profile_image_url",
                                        "caption", "media_url", "media_type", "likes_count",
                                        "comments_count", "created_at", "tags",
                                        "is_liked_by_user", "is_following")},
                media_items=items,
            ))
        return {"ok": True, "posts": results}

    except Exception as e:
        print(f"Get posts feed error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/posts/{post_id}")
def get_post(post_id: int, user_id: int = None):
    with db() as client:
        post = get_post_by_id(client, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        is_liked = False
        if user_id:
            is_liked = bool(client.execute(
                "SELECT 1 FROM likes WHERE post_id=%s AND user_id=%s LIMIT 1",
                (post_id, user_id),
            )['data'])

        tags_map = get_tags_for_posts(client, [post_id])
        media_map = get_media_for_posts(client, [post_id])

    media_rows = media_map.get(post_id) or [{"media_url": post["media_url"], "media_type": post["media_type"], "position": 0}]
    media_items = [MediaItemResponse(**m) for m in media_rows]

    return {
        "ok": True,
        "post": PostResponse(
            id=post["id"],
            user_id=post["user_id"],
            username=post["username"],
            profile_image_url=post["profile_image_url"],
            caption=post["caption"],
            media_url=post["media_url"],
            media_type=post["media_type"],
            likes_count=post["likes_count"],
            comments_count=post["comments_count"],
            created_at=post["created_at"],
            is_liked_by_user=is_liked,
            tags=tags_map.get(post_id, []),
            media_items=media_items,
        ),
    }


@router.delete("/posts/{post_id}")
def delete_post_route(post_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            with client.transaction() as tx:
                post = _one(tx.execute(
                    "SELECT id, user_id FROM posts WHERE id=%s LIMIT 1", (post_id,)
                )['data'])
                if not post:
                    raise HTTPException(status_code=404, detail="Post not found")
                if post["user_id"] != current_user_id:
                    raise HTTPException(status_code=403, detail="Not authorized to delete this post")
                delete_post(tx, post_id)
        return {"ok": True}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Delete post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/posts/like")
def like_post(payload: LikeRequest, current_user_id: int = Depends(get_current_user)):
    post_id = payload.post_id
    user_id = current_user_id

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
                    raise HTTPException(status_code=404, detail="Post not found")
                liked = toggle_like(tx, post_id, user_id)
        return {"ok": True, "liked": liked, "message": "Post liked" if liked else "Post unliked"}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Like post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/posts/{post_id}/likes")
def get_post_likes_route(post_id: int, limit: int = 50, offset: int = 0):
    with db() as client:
        if not client.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
            raise HTTPException(status_code=404, detail="Post not found")
        likes = get_post_likes(client, post_id, limit, offset)

    return {"ok": True, "likes": [
        {"user_id": l["id"], "username": l["username"],
         "profile_image_url": l["profile_image_url"], "liked_at": l.get("created_at")}
        for l in likes
    ]}


@router.post("/posts/comment")
def create_comment(payload: CreateCommentRequest, current_user_id: int = Depends(get_current_user)):
    post_id = payload.post_id
    user_id = current_user_id
    content = payload.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
    if len(content) > 500:
        raise HTTPException(status_code=400, detail="Comment content must be less than 500 chars")

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
                    raise HTTPException(status_code=404, detail="Post not found")
                if not tx.execute("SELECT id FROM users WHERE id=%s LIMIT 1", (user_id,))['data']:
                    raise HTTPException(status_code=404, detail="User not found")
                comment_id = insert_comment(tx, post_id, user_id, content)
        return {"ok": True, "comment_id": comment_id, "message": "Comment created"}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Create comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/posts/{post_id}/comments")
def get_post_comments_route(post_id: int, limit: int = 50, offset: int = 0):
    with db() as client:
        comments = get_post_comments(client, post_id, limit, offset)
    return {"ok": True, "comments": [
        CommentResponse(
            id=c["id"], post_id=c["post_id"], user_id=c["user_id"],
            username=c["username"], profile_image_url=c["profile_image_url"],
            content=c["comment_text"], created_at=c["created_at"],
        )
        for c in comments
    ]}


@router.get("/comments/{comment_id}")
def delete_comment_route(comment_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            with client.transaction() as tx:
                comment = get_comment_by_id(tx, comment_id)
                if not comment:
                    raise HTTPException(status_code=404, detail="Comment not found")
                if comment["user_id"] != current_user_id:
                    raise HTTPException(status_code=403, detail="You can only delete your own comments")
                delete_comment(tx, comment_id, comment["post_id"])
        return {"ok": True, "message": "Comment deleted"}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Delete comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/tags/suggestions")
def tag_suggestions(q: str, limit: int = 8):
    q = q.strip().lstrip("#").lower()
    if not q:
        return {"ok": True, "tags": []}
    try:
        with db() as client:
            tags = get_tag_suggestions(client, q, limit)
        return {"ok": True, "tags": tags}
    except Exception as e:
        print(f"Tag suggestions error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
