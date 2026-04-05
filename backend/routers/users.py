from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database import db
from utils.auth import get_current_user
from utils.media import save_base64_image
from db.queries.users import (
    get_user_by_id, get_user_by_username, get_user_full, get_user_for_update,
    get_user_counts, check_username_taken, update_user_fields,
    get_user_followers, get_user_following, attach_is_following,
    is_following_user, toggle_follow, get_user_aura_components, mark_tour_complete,
)
from db.queries.posts import get_posts_by_user, get_liked_posts_by_user, enrich_posts

router = APIRouter(prefix="/api")


class UpdateProfileRequest(BaseModel):
    user_id: int
    username: str = None
    email: str = None
    bio: str = None
    profile_image: str = None


class FollowRequest(BaseModel):
    follower_id: int
    following_id: int


def get_tier(aura: int) -> dict:
    if aura >= 300:
        return {"name": "Gigachad"}
    elif aura >= 200:
        return {"name": "Certified Sigma"}
    elif aura >= 100:
        return {"name": "Rising Sigma"}
    elif aura >= 20:
        return {"name": "Sigma Wannabe"}
    else:
        return {"name": "Normie"}


@router.get("/users/{user_id}")
def get_user_profile(user_id: int):
    with db() as client:
        row = get_user_by_id(client, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": row}


@router.get("/users/by-username/{username}")
def get_user_by_username_route(username: str):
    with db() as client:
        user = get_user_by_username(client, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": user}


@router.get("/users/{user_id}/profile")
def get_full_profile(user_id: int, viewer_id: int = None):
    with db() as client:
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        counts = get_user_counts(client, user_id)

        is_followed_by_viewer = False
        if viewer_id and viewer_id != user_id:
            is_followed_by_viewer = is_following_user(client, viewer_id, user_id)

    return {"ok": True, "profile": {**user, **counts, "is_followed_by_viewer": is_followed_by_viewer}}


@router.put("/users/{user_id}/update")
def update_profile(user_id: int, payload: UpdateProfileRequest, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        with db() as client:
            user = get_user_for_update(client, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            updates = {}

            if payload.username is not None:
                username = payload.username.strip()
                if not username:
                    raise HTTPException(status_code=400, detail="Username cannot be empty")
                if len(username) > 32:
                    raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
                if username != user["username"] and check_username_taken(client, username, exclude_id=user_id):
                    raise HTTPException(status_code=409, detail="Username already taken")
                updates["username"] = username

            if payload.email is not None:
                email = payload.email.strip().lower()
                if "@" not in email:
                    raise HTTPException(status_code=400, detail="Invalid email")
                updates["email"] = email

            if payload.bio is not None:
                bio = payload.bio.strip()
                if len(bio) > 200:
                    raise HTTPException(status_code=400, detail="Bio must be less than 200 chars")
                updates["bio"] = bio

            if payload.profile_image is not None:
                if payload.profile_image.startswith("data:image"):
                    avatar_path = save_base64_image(payload.profile_image)
                    if avatar_path:
                        updates["profile_image_url"] = avatar_path
                elif payload.profile_image:
                    updates["profile_image_url"] = payload.profile_image

            if updates:
                with client.transaction() as tx:
                    update_user_fields(tx, user_id, updates)

            updated_user = client.execute(
                "SELECT id, username, email, bio, profile_image_url FROM users WHERE id=%s LIMIT 1",
                (user_id,),
            )['data']
            updated_user = updated_user[0] if updated_user else None

        return {"ok": True, "user": updated_user}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/users/{user_id}/posts")
def get_user_posts(user_id: int, viewer_id: int = None):
    with db() as client:
        posts = get_posts_by_user(client, user_id)
        if not posts:
            return {"ok": True, "posts": []}
        enrich_posts(client, posts, viewer_id=viewer_id)
    return {"ok": True, "posts": posts}


@router.get("/users/{user_id}/liked_posts")
def get_user_liked_posts(user_id: int):
    with db() as client:
        posts = get_liked_posts_by_user(client, user_id)
        if not posts:
            return {"ok": True, "posts": []}
        enrich_posts(client, posts, viewer_id=None)
        for post in posts:
            post["is_liked_by_user"] = True  # always true for liked posts
    return {"ok": True, "posts": posts}


@router.get("/users/{user_id}/followers")
def get_followers(user_id: int, viewer_id: int = None):
    with db() as client:
        followers = get_user_followers(client, user_id)
        attach_is_following(client, followers, viewer_id)
    return {"ok": True, "followers": followers}


@router.get("/users/{user_id}/following")
def get_following(user_id: int, viewer_id: int = None):
    with db() as client:
        following = get_user_following(client, user_id)
        attach_is_following(client, following, viewer_id)
    return {"ok": True, "following": following}


@router.get("/users/{user_id}/aura")
def get_user_aura(user_id: int):
    try:
        with db() as client:
            components = get_user_aura_components(client, user_id)
        aura = (
            components["posts_count"] * 2
            + components["followers_count"] * 10
            + components["total_likes"] * 3
            + components["total_comments"] * 5
        )
        return {"ok": True, "aura": aura, "tier": get_tier(aura), "breakdown": components}
    except Exception as e:
        print(f"Get user aura error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/users/follow")
def toggle_follow_route(payload: FollowRequest, current_user_id: int = Depends(get_current_user)):
    follower_id = current_user_id
    following_id = payload.following_id

    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute("SELECT id FROM users WHERE id=%s LIMIT 1", (following_id,))['data']:
                    raise HTTPException(status_code=404, detail="User not found")
                following = toggle_follow(tx, follower_id, following_id)
        return {"ok": True, "following": following}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Follow toggle error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


class PrivacyRequest(BaseModel):
    is_private: bool = None
    messages_privacy: str = None  # "everyone" | "followers"


@router.get("/users/{user_id}/privacy")
def get_privacy(user_id: int, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    with db() as client:
        row = client.execute(
            "SELECT is_private, messages_privacy FROM users WHERE id=%s LIMIT 1",
            (user_id,),
        )['data']
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, **row[0]}


@router.put("/users/{user_id}/privacy")
def update_privacy(user_id: int, payload: PrivacyRequest, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    updates = {}
    if payload.is_private is not None:
        updates["is_private"] = 1 if payload.is_private else 0
    if payload.messages_privacy is not None:
        if payload.messages_privacy not in ("everyone", "followers"):
            raise HTTPException(status_code=400, detail="Invalid messages_privacy value")
        updates["messages_privacy"] = payload.messages_privacy
    if not updates:
        return {"ok": True}
    set_clause = ", ".join(f"{k}=%s" for k in updates)
    try:
        with db() as client:
            with client.transaction() as tx:
                tx.execute(
                    f"UPDATE users SET {set_clause} WHERE id=%s",
                    (*updates.values(), user_id),
                )
    except Exception as e:
        print(f"Update privacy error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    return {"ok": True}


@router.post("/users/complete_tour")
async def complete_tour(current_user_id: int = Depends(get_current_user)):
    with db() as client:
        mark_tour_complete(client, current_user_id)
    return {"ok": True, "message": "Tour marked as completed"}
