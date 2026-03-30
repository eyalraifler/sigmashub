from fastapi import APIRouter, HTTPException

from database import db
from db.queries.chats import get_user_chats

router = APIRouter(prefix="/api")


@router.get("/{user_id}/chats")
def get_chats(user_id: int):
    try:
        with db() as client:
            chats = get_user_chats(client, user_id)
        return {"ok": True, "chats": chats}
    except Exception as e:
        print(f"Get user chats error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
