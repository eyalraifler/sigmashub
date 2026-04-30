from fastapi import APIRouter, HTTPException

from database import db
from db.queries.search import search_users, search_posts_by_caption, search_posts_by_tag, merge_post_results
from db.queries.posts import enrich_posts
from db.queries.users import get_followed_user_ids

router = APIRouter(prefix="/api")


@router.get("/search")
def search(q: str, user_id: int = None, limit: int = 20):
    """Search for users and posts matching the query string.

    Searches users by username and bio. Searches posts by caption and by
    hashtag. Merges post results and removes duplicates.

    Args:
        q: The search query. A leading '#' is stripped for tag search.
        user_id: Optional ID of the requesting user, used to set
                 is_following on each returned user.
        limit: Maximum number of results per category (default 20).

    Returns:
        JSON with ok=True, a 'users' list, and a 'posts' list.

    Raises:
        HTTPException(500): On unexpected server error.
    """
    q = q.strip()
    if not q:
        return {"ok": True, "users": [], "posts": []}

    tag_q = q.lstrip("#").lower()

    try:
        with db() as client:
            users = search_users(client, q, limit)

            if user_id and users:
                uids = [u["id"] for u in users]
                following = get_followed_user_ids(client, user_id, uids)
                for u in users:
                    u["is_following"] = u["id"] in following
            else:
                for u in users:
                    u["is_following"] = False

            by_caption = search_posts_by_caption(client, q, limit)
            by_tag = search_posts_by_tag(client, tag_q, limit)
            posts = merge_post_results(by_caption, by_tag, limit)

            enrich_posts(client, posts, viewer_id=user_id)

        return {"ok": True, "users": users, "posts": posts}

    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
