from datetime import datetime, timedelta,timezone
from fastapi import Depends
from sqlalchemy import and_,exists
from sqlalchemy.orm import Session
from core import get_db,setting
from models import RefreshTokenModel
from .jwt_auth import decode_token,get_token_id


class RefreshTokenService:
    def __init__(self, db:Session = Depends(get_db)):
        self.db = db
    
    def add_token_db(self,my_token: str,user_agent,user_id: int,jti: str)-> None:
        isuTime = datetime.now(timezone.utc)
        expTime = datetime.now(timezone.utc) + timedelta(
            minutes=setting.ACCESS_TOKEN_EXPIRE_MINUTES)
        data = {
            "id" : jti,
            "user_id_fk" : user_id,
            "token" : my_token,
            "user_agent": user_agent,
            "created_at" : isuTime,
            "expired_at" : expTime
        }
        new_ref = RefreshTokenModel(**data)
        self.db.add(new_ref)
        self.db.commit()
    
    def verify_token(self,data,user_agent) -> str :
        if data:
            time_now = datetime.now(timezone.utc)
            jti = get_token_id(token_type="refresh",token=data)
            find_token = self.db.query(RefreshTokenModel).where(
                RefreshTokenModel.id == jti,
                RefreshTokenModel.token == data,
                RefreshTokenModel.user_agent == user_agent,
            ).one_or_none()
            expired_at = find_token.expired_at.replace(tzinfo=timezone.utc)
            if expired_at >= time_now:
                return find_token
        else:
            return False
    