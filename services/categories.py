from sqlalchemy import exists
from models import CategoriesModel
from sqlalchemy.orm import Session
from fastapi import Depends
from core import get_db

class CategoryServices:
    def __init__(self,db:Session = Depends(get_db)):
        self.db = db
    
    def get_all(self):
        return self.db.query(CategoriesModel).order_by(CategoriesModel.id).all()

    def category_exists_id(self, category_id: int) -> bool:
        return self.db.query(
            exists().where(CategoriesModel.id == category_id)
        ).scalar()

    def category_exists_name(self, category_name: str) -> bool:
        return self.db.query(
            exists().where(CategoriesModel.name == category_name)
        ).scalar()

    def find_category_by_id(self,cat_id):
        return self.db.query(CategoriesModel).filter(CategoriesModel.id == cat_id).one_or_none()


    def find_category_by_name(self,cat_name):
        return self.db.query(CategoriesModel).filter(CategoriesModel.name == cat_name).one_or_none()