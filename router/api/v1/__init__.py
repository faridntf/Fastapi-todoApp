from fastapi import APIRouter

from .users import router as user_router
from .profiles import router as profile_router
from .tasks import router as task_router
from .categories import router as category_router

router = APIRouter()

router.include_router(user_router)
router.include_router(profile_router)
router.include_router(task_router)
router.include_router(category_router)