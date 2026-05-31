import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

# Single-company credentials from env (defaults for dev)
COMPANY_USERNAME = os.getenv("COMPANY_USERNAME", "estimator")
COMPANY_PASSWORD_HASH = os.getenv(
    "COMPANY_PASSWORD_HASH",
    "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "secret"
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")
router = APIRouter(prefix="/api/auth", tags=["auth"])


class Token(BaseModel):
    access_token: str
    token_type: str


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != COMPANY_USERNAME:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not pwd_context.verify(form_data.password, COMPANY_PASSWORD_HASH):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}
