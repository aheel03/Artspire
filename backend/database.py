from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Update DATABASE_URL to use postgresql instead of postgresql+asyncpg
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:ahilahil@localhost:5432/artcommission_db")

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
