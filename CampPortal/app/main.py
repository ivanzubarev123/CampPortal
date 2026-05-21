from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.database import engine, Base
from app.routes import (
    auth, children, groups, activities,
    attendance, reports, dashboard, shifts
)

# 1. создаём app СРАЗУ
app = FastAPI(title="Camp Management API")

# 2. templates и static
templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# 3. база
Base.metadata.create_all(bind=engine)

# 4. роуты
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(children.router, prefix="/api/children", tags=["children"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(shifts.router, prefix="/api/shifts", tags=["shifts"])

# 5. страницы
@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
