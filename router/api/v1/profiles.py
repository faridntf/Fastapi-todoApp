from fastapi import(
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    status
)
from sqlalchemy.exc import(
    IntegrityError,
    SQLAlchemyError
)
from sqlalchemy.orm import Session
from models import(
    UserModel,
    ProfileModel,
    EnUserRole
)
from schema import(
    ProfileCreateSc,
    ProfileResponseSc,
    ProfileUpdateSc
)
from core import get_db
from dependency.auth import get_current_user
from services import ProfileServices



router = APIRouter(
    prefix="/profiles",
    tags=["profiles"],
)

@router.post("/create",)
def new_profile(
    data: ProfileCreateSc,
    db: Session = Depends(get_db),
    service : ProfileServices = Depends(ProfileServices),
    login_user : UserModel = Depends(get_current_user)
):
    check_user_id = service.check_userID(data=login_user.id)
    if check_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="you can not create the new user profile"
        )
    new_data = data.model_dump()
    check_national = service.check_nationalID(data=new_data.get("national_id"))
    if check_national:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="national Id already in use"
        )
    create_profile = ProfileModel(**new_data)
    create_profile.user_id_fk = login_user.id
    try:
        db.flush()
        db.add(create_profile)
        service.change_profile_status(user_id=login_user.id,is_completed=True)
        db.commit()
        raise HTTPException(status_code=status.HTTP_200_OK,detail="create profile successfully")
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{e}"
        )

@router.post("/upload-avatar")
def avatar_upload(
    avatar: UploadFile,
    service : ProfileServices = Depends(ProfileServices),
    db: Session = Depends(get_db),
    login_user: UserModel =Depends(get_current_user),
):
    find_profile = service.get_profile_db(user_id=login_user.id)
    if find_profile.profile_url is None:
        new_path = service.upload_avatar(data=avatar,current_user_id=login_user.id)
        try:
            find_profile.profile_url = new_path
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            service.delete_old_profile_avatar(new_path)
    else:
        old_avatar = find_profile.profile_url
        new_avatar = service.upload_avatar(data=avatar,current_user_id=login_user.id)
        try:
            find_profile.profile_url = new_avatar
            db.commit()
            service.delete_old_profile_avatar(old_avatar)
        except:
            db.rollback()
            raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Could not save avatar",
                    )


@router.patch("/change-profile-information")
def change_info(
    data: ProfileUpdateSc,
    service : ProfileServices = Depends(ProfileServices),
    db: Session = Depends(get_db),
    login_user: UserModel =Depends(get_current_user),
):
    profile = service.get_profile_db(user_id=login_user.id)
    update_data = data.model_dump(exclude_unset=True)
    check_national = service.check_nationalID(data=update_data.get("national_id"))
    if check_national:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="the nationalId already in use, please try again.")
    for field,value in update_data.items():
        setattr(profile,field,value)
    db.commit()
    raise HTTPException(status_code=status.HTTP_200_OK,detail="change information successfully")
    

@router.delete("/profile-information",status_code=status.HTTP_204_NO_CONTENT,)
def delete_profile(
    db: Session = Depends(get_db),
    service : ProfileServices = Depends(ProfileServices),
    login_user: UserModel =Depends(get_current_user)
):
    if login_user.role not in(EnUserRole.GUEST,EnUserRole.USER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="admin users can not deleted the profile information")
    profile = service.get_profile_db(user_id=login_user.id)
    old_avatar = profile.profile_url
    try:
        db.delete(profile)
        service.change_profile_status(
            user_id=login_user.id,
            is_completed=False,
            )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete profile",
        )

    service.delete_old_profile_avatar(old_data=old_avatar)

    raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/profile-avatar",status_code=status.HTTP_204_NO_CONTENT,)
def delete_profile_avatar(
    db: Session = Depends(get_db),
    service : ProfileServices = Depends(ProfileServices),
    login_user=Depends(get_current_user),
):
    if login_user.role not in(EnUserRole.GUEST,EnUserRole.USER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="admin users can not deleted the profile information")
    profile = service.get_profile_db(user_id=login_user.id)
    if not profile.profile_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )
    old_avatar = profile.profile_url
    try:
        profile.profile_url = None
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete avatar",
        )
    service.delete_old_profile_avatar(old_data=old_avatar)
    raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/profile-detail",response_model=ProfileResponseSc,)
def get_profile_detail(
    service : ProfileServices = Depends(ProfileServices),
    login_user=Depends(get_current_user),
):
    return service.get_profile_db(user_id=login_user.id)


@router.get("/profile-details",response_model=ProfileResponseSc,)
def get_user_profile(
    user_id: int,
    service : ProfileServices = Depends(ProfileServices),
    login_user: UserModel =Depends(get_current_user),
):
    if login_user.role not in(EnUserRole.SUPER_ADMIN,EnUserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="just admin users access the endpoint"
        )
    profile = service.get_profile_db(user_id=user_id)
    return profile