from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi_swagger import patch_fastapi
from fastapi.middleware.gzip import GZipMiddleware
from router.api import api_router

@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Application started .....")
    yield
    print("Application Ended .....")
    

metadata_tags = [
    {
        "name": "tasks",
        "description" : "Operation in task managemrnt",
        "externalDocs" :{
            "description" : "More about this tasks informatioon",
            "url" : "https://faridnajafi.ir"
        }
    },
    {
            "name": "users",
            "description" : "users management",
            "externalDocs" :{
                "description" : "More about this tasks informatioon",
                "url" : "https://faridnajafi.ir"
            }
        }
]

app = FastAPI(lifespan=lifespan,
              openapi_tags=metadata_tags,
              title="todoApp",
              description="this project in sample and created for test",
              summary="simple project in fastapi",
              version="0.0.1",
              terms_of_service="https://faridnajafi.ir/",
              contact={
                  "name" : "farid najafi",
                  "url" : "https://faridnajafi.ir",
                  "email" : "faridnajafi.0037@gmail.com"
              },
              docs_url=None,
              swagger_ui_oauth2_redirect_url=None
              )



# Enable Gzip to compress responses larger than 1000 bytes
app.add_middleware(GZipMiddleware,minimum_size=1024)


#included routs app
app.include_router(api_router,prefix="/api",)


#serv frontend pages
app.frontend("/",directory="templates/",fallback="404.html")
# patch_fastapi(app,docs_url="/swagger")