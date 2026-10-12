from uuid import uuid4
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import(
    ForeignKey,
    Integer,
    String,
    DateTime
)
from sqlalchemy.orm import(
    Mapped,
    mapped_column,
    relationship
)
from core import Base
if TYPE_CHECKING:
    from models.users import UserModel



class RefreshTokenModel(Base):
    
    __tablename__ = "tblRefreshTokens"
    
    id : Mapped[str] = mapped_column(
        String(250),
        default=uuid4(),
        unique=True,
        primary_key=True,
        nullable=False
    )
    user_id_fk : Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tblUsers.id"),
        nullable=False
    ) 
    
    token : Mapped[str] = mapped_column(
        String(250),
        nullable=False,
        unique=True,
        index=True
    )
    
    user_agent : Mapped[str] = mapped_column(
        String(250),
        nullable=False
    )
    
    created_at : Mapped[datetime] = mapped_column(
        DateTime,
        nullable=True
    )
    
    expired_at : Mapped[datetime] = mapped_column(
        DateTime,
        nullable= True
    )
    
    user_tokens : Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="refresh_tokens",
    )
    