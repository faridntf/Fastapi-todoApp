from fastapi import(
    HTTPException,
    status,
    Depends
)
from fastapi.security import APIKeyCookie
from jwt.exceptions import(
    ExpiredSignatureError,
    InvalidTokenError,
)
from sqlalchemy.orm import Session
from core import get_db
from models import UserModel
from services import decode_token

cookie_api = APIKeyCookie(
    name="access_token"
)
def get_current_user(
    token = Depends(cookie_api),
    db: Session = Depends(get_db),
):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login to your account",
        )
    try:
        user_id = decode_token(token_type="access", token=token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is expired",
        ) from None
    except (InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        ) from None
    user = (
        db.query(
            UserModel.id,
            UserModel.username,
            UserModel.role
        ).where(
            UserModel.id == user_id,
            UserModel.is_delete == False,
            UserModel.is_active == True
        ).one_or_none()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )
    return user