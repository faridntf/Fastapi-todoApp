from sqlalchemy.orm import Session
from sqlalchemy import exists,or_,and_,update,func
from models import UserModel
from pydantic import EmailStr
from core import get_db
from fastapi import Depends
class UserServices:
    def __init__(self,db:Session = Depends(get_db)):
        self.db = db
    
    def check_duplicate_account(
        self,
        username: str | None,
        email: EmailStr | None,
        phone_number: str | None,
        exclude_user_id: int | None = None,
    ) -> bool:
        duplicate_conditions = []

        if username is not None:
            duplicate_conditions.append(UserModel.username == username)

        if email is not None:
            duplicate_conditions.append(UserModel.email == email)

        if phone_number is not None:
            duplicate_conditions.append(UserModel.phone_number == phone_number)

        if not duplicate_conditions:
            return False

        conditions = [
            or_(*duplicate_conditions),
            UserModel.is_delete == False,
        ]

        if exclude_user_id is not None:
            conditions.append(UserModel.id != exclude_user_id)

        return bool(
            self.db.query(
                exists().where(and_(*conditions))
            ).scalar()
        )

    def find_user(self,data):
        result = self.db.query(UserModel).where(
            and_(
                or_(
                    UserModel.username == data,
                    UserModel.email == data,
                    UserModel.phone_number == data
                    ),
                UserModel.is_delete == False
            )
        ).one_or_none()
        return result


    def find_user_by_id(self, data : int) -> str:
        result = self.db.query(UserModel).where(
            UserModel.id == data
        ).one_or_none()
        return result

    def set_lastlogin_time(self,username):
        self.db.execute(
            update(
                UserModel
            ).where(
                UserModel.username == username
            ).values(
                last_login = func.now()
            )
        )
        self.db.commit()