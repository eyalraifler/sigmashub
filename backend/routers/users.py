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
    create_follow_request, delete_follow_request, has_follow_request,
    get_pending_follow_requests, approve_follow_request,
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
    """Map an aura score to a named rank tier.

    Args:
        aura: The user's calculated aura score.

    Returns:
        A dict with a 'name' key: one of 'Normie', 'Sigma Wannabe',
        'Rising Sigma', 'Certified Sigma', or 'Gigachad'.
    """
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
    """Fetch basic profile data for a user by ID.

    Args:
        user_id: The ID of the user to look up.

    Returns:
        JSON with ok=True and the user object.

    Raises:
        HTTPException(404): If no user exists with that ID.
    """
    with db() as client:
        row = get_user_by_id(client, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": row}


@router.get("/users/by-username/{username}")
def get_user_by_username_route(username: str):
    """Fetch a user by their username.

    Args:
        username: The username to look up.

    Returns:
        JSON with ok=True and the user object.

    Raises:
        HTTPException(404): If no user exists with that username.
    """
    with db() as client:
        user = get_user_by_username(client, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": user}


@router.get("/users/{user_id}/profile")
def get_full_profile(user_id: int, viewer_id: int = None):
    """Fetch a user's full profile including counts and follow status.

    Args:
        user_id: The ID of the user whose profile to fetch.
        viewer_id: Optional ID of the user viewing the profile, used to
                   determine whether the viewer is following this user.

    Returns:
        JSON with ok=True and the profile dict including followers_count,
        following_count, posts_count, and is_followed_by_viewer.

    Raises:
        HTTPException(404): If the user does not exist.
    """
    with db() as client:
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        counts = get_user_counts(client, user_id)

        is_own_profile = viewer_id == user_id
        is_followed_by_viewer = False
        is_follow_requested = False

        if viewer_id and not is_own_profile:
            is_followed_by_viewer = is_following_user(client, viewer_id, user_id)
            if user["is_private"] and not is_followed_by_viewer:
                is_follow_requested = has_follow_request(client, viewer_id, user_id)

        is_locked = bool(user["is_private"]) and not is_followed_by_viewer and not is_own_profile

    return {"ok": True, "profile": {
        **user,
        **counts,
        "is_followed_by_viewer": is_followed_by_viewer,
        "is_follow_requested": is_follow_requested,
        "is_locked": is_locked,
    }}


@router.put("/users/{user_id}/update")
def update_profile(user_id: int, payload: UpdateProfileRequest, current_user_id: int = Depends(get_current_user)):
    """Update a user's profile fields.

    Only the authenticated user may update their own profile. Only fields
    that are present in the payload are updated.

    Args:
        user_id: The ID of the user to update.
        payload: Optional fields to update: username, email, bio, profile_image.
        current_user_id: Injected from JWT — must match user_id.

    Returns:
        JSON with ok=True and the updated user data.

    Raises:
        HTTPException(400): If any field fails validation.
        HTTPException(403): If the authenticated user is not the owner.
        HTTPException(404): If the user does not exist.
        HTTPException(409): If the new username is already taken.
        HTTPException(500): On unexpected server error.
    """
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
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_private"] and viewer_id != user_id:
            if not viewer_id or not is_following_user(client, viewer_id, user_id):
                return {"ok": True, "posts": []}
        posts = get_posts_by_user(client, user_id)
        if not posts:
            return {"ok": True, "posts": []}
        enrich_posts(client, posts, viewer_id=viewer_id)
    return {"ok": True, "posts": posts}


@router.get("/users/{user_id}/liked_posts")
def get_user_liked_posts(user_id: int, viewer_id: int = None):
    with db() as client:
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_private"] and viewer_id != user_id:
            if not viewer_id or not is_following_user(client, viewer_id, user_id):
                return {"ok": True, "posts": []}
        posts = get_liked_posts_by_user(client, user_id)
        if not posts:
            return {"ok": True, "posts": []}
        enrich_posts(client, posts, viewer_id=None)
        for post in posts:
            post["is_liked_by_user"] = True
    return {"ok": True, "posts": posts}


@router.get("/users/{user_id}/followers")
def get_followers(user_id: int, viewer_id: int = None):
    with db() as client:
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_private"] and viewer_id != user_id:
            if not viewer_id or not is_following_user(client, viewer_id, user_id):
                return {"ok": True, "followers": []}
        followers = get_user_followers(client, user_id)
        attach_is_following(client, followers, viewer_id)
    return {"ok": True, "followers": followers}


@router.get("/users/{user_id}/following")
def get_following(user_id: int, viewer_id: int = None):
    with db() as client:
        user = get_user_full(client, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_private"] and viewer_id != user_id:
            if not viewer_id or not is_following_user(client, viewer_id, user_id):
                return {"ok": True, "following": []}
        following = get_user_following(client, user_id)
        attach_is_following(client, following, viewer_id)
    return {"ok": True, "following": following}


@router.get("/users/{user_id}/aura")
def get_user_aura(user_id: int):
    """Calculate and return a user's aura score and rank tier.

    Aura is calculated as:
        posts * 2 + followers * 10 + total_likes * 3 + total_comments * 5

    Args:
        user_id: The ID of the user to calculate aura for.

    Returns:
        JSON with ok=True, the numeric 'aura' score, the 'tier' dict,
        and a 'breakdown' of each component.

    Raises:
        HTTPException(500): On unexpected server error.
    """
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
    """Toggle following a user — follow if not following, unfollow if already following.

    Args:
        payload: Contains 'following_id' (the user to follow/unfollow).
        current_user_id: Injected from JWT — the user performing the action.

    Returns:
        JSON with ok=True and 'following' bool indicating the new state.

    Raises:
        HTTPException(400): If the user tries to follow themselves.
        HTTPException(404): If the target user does not exist.
        HTTPException(500): On unexpected server error.
    """
    follower_id = current_user_id
    following_id = payload.following_id

    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    try:
        with db() as client:
            target = client.execute(
                "SELECT id, is_private FROM users WHERE id=%s LIMIT 1", (following_id,)
            )['data']
            if not target:
                raise HTTPException(status_code=404, detail="User not found")
            is_private = bool(target[0]["is_private"])

            # If already following → unfollow (same for public and private)
            if is_following_user(client, follower_id, following_id):
                with client.transaction() as tx:
                    toggle_follow(tx, follower_id, following_id)
                return {"ok": True, "following": False, "requested": False}

            # Public account → follow directly
            if not is_private:
                with client.transaction() as tx:
                    toggle_follow(tx, follower_id, following_id)
                return {"ok": True, "following": True, "requested": False}

            # Private account → toggle follow request
            if has_follow_request(client, follower_id, following_id):
                with client.transaction() as tx:
                    delete_follow_request(tx, follower_id, following_id)
                return {"ok": True, "following": False, "requested": False}
            else:
                with client.transaction() as tx:
                    create_follow_request(tx, follower_id, following_id)
                return {"ok": True, "following": False, "requested": True}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Follow toggle error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


class FollowRequestResponse(BaseModel):
    requester_id: int
    action: str  # "approve" | "reject"


@router.get("/users/{user_id}/follow-requests")
def get_follow_requests(user_id: int, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    with db() as client:
        requests = get_pending_follow_requests(client, user_id)
    return {"ok": True, "requests": requests}


@router.post("/users/{user_id}/follow-requests/respond")
def respond_follow_request(user_id: int, payload: FollowRequestResponse, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Invalid action")
    try:
        with db() as client:
            with client.transaction() as tx:
                if payload.action == "approve":
                    approve_follow_request(tx, payload.requester_id, user_id)
                else:
                    delete_follow_request(tx, payload.requester_id, user_id)
        return {"ok": True}
    except Exception as e:
        print(f"Respond follow request error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


class PrivacyRequest(BaseModel):
    is_private: bool = None
    messages_privacy: str = None  # "everyone" | "followers"


@router.get("/users/{user_id}/privacy")
def get_privacy(user_id: int, current_user_id: int = Depends(get_current_user)):
    """Get the privacy settings for the authenticated user.

    Args:
        user_id: The ID of the user whose settings to fetch.
        current_user_id: Injected from JWT — must match user_id.

    Returns:
        JSON with ok=True, 'is_private' bool, and 'messages_privacy' string.

    Raises:
        HTTPException(403): If the authenticated user is not the owner.
        HTTPException(404): If the user does not exist.
    """
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
    """Update the privacy settings for the authenticated user.

    Only fields included in the payload are updated.

    Args:
        user_id: The ID of the user to update.
        payload: Optional fields: 'is_private' (bool) and/or
                 'messages_privacy' ("everyone" or "followers").
        current_user_id: Injected from JWT — must match user_id.

    Returns:
        JSON with ok=True.

    Raises:
        HTTPException(400): If messages_privacy has an invalid value.
        HTTPException(403): If the authenticated user is not the owner.
        HTTPException(500): On unexpected server error.
    """
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
    """Mark the onboarding tour as completed for the authenticated user.

    Args:
        current_user_id: Injected from JWT.

    Returns:
        JSON with ok=True and a confirmation message.
    """
    with db() as client:
        mark_tour_complete(client, current_user_id)
    return {"ok": True, "message": "Tour marked as completed"}
