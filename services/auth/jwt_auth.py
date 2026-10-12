from datetime import(
    datetime,
    timedelta,
    timezone,
)
from uuid import uuid4
from fastapi import Response
import jwt
from core import setting


def set_cookie_time(minutes):
    isuTime = datetime.now(timezone.utc)
    expire = isuTime + timedelta(minutes=minutes)
    return {
        "isuTime": isuTime,
        "expire": expire
    }

def create_access_token(user_id: int) -> str:
    set_ = set_cookie_time(setting.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "token type" : "access",
        "jid" : str(uuid4()),
        "sub" : str(user_id),
        "iat" : set_.get("isuTime"),
        "exp" : set_.get("expire")
    }
    token = jwt.encode(
        payload,
        setting.ACCESS_TOKEN_SECRET_KEY,
        algorithm=setting.ALGORITHM,
    )
    return token

def create_refresh_token(user_id: int, jti:str ) -> str:
    set_ = set_cookie_time(setting.REFRESH_TOKEN_EXPIRE_MINUTES)
    payload = {
        "token type" : "refresh",
        "jti" : jti,
        "sub" : str(user_id),
        "iat" : set_.get("isuTime"),
        "exp" : set_.get("expire")
    }
    token = jwt.encode(
        payload,
        setting.REFRESH_TOKEN_SECRET_KEY,
        algorithm=setting.ALGORITHM,
    )
    return token

def decode_token(token_type,token: str) -> int:
    if token_type == "access":
        payload = jwt.decode(
            token,
            setting.ACCESS_TOKEN_SECRET_KEY,
            algorithms=[setting.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Token subject missing")
        return int(user_id)
    if token_type == "refresh":
            payload = jwt.decode(
                token,
                setting.REFRESH_TOKEN_SECRET_KEY,
                algorithms=[setting.ALGORITHM],
            )
            user_id = payload.get("sub")
            if user_id is None:
                raise ValueError("Token subject missing")
            return int(user_id)

def get_token_id(token_type,token: str) -> str:
    if token_type == "access":
        payload = jwt.decode(
            token,
            setting.ACCESS_TOKEN_SECRET_KEY,
            algorithms = setting.ALGORITHM,
        )
        token_id = payload.get("jti")
        if token_id is None:
            raise ValueError("Token subject missing")
        return token_id
    if token_type == "refresh":
            payload = jwt.decode(
                token,
                setting.REFRESH_TOKEN_SECRET_KEY,
                algorithms = setting.ALGORITHM,
            )
            token_id = payload.get("jti")
            if token_id is None:
                raise ValueError("Token subject missing")
            return token_id

def set_coookie(token_type:str, my_token: str, response: Response):
    if token_type == "access_token":
        response.set_cookie(
            key=token_type,
            value=my_token,
            httponly=True,
            secure=False, 
            samesite="lax",
            max_age= setting.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        return "generate successfully"
    if token_type == "refresh_token":
        response.set_cookie(
            key=token_type,
            value=my_token,
            httponly=True,
            secure=setting.SECURE_SETTING,
            samesite=setting.SAMESITE_SETTING,
            max_age= setting.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        return "generate successfully"