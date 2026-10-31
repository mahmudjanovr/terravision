from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import DatabaseUnavailableException

_engine: Optional[AsyncEngine] = None
_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> Optional[AsyncEngine]:
    global _engine, _sessionmaker
    if _engine is None and settings.DATABASE_URL:
        try:
            db_url = settings.DATABASE_URL
            if db_url.startswith("postgresql://"):
                db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

            _engine = create_async_engine(
                db_url,
                echo=False,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            _sessionmaker = async_sessionmaker(
                bind=_engine,
                expire_on_commit=False,
                class_=AsyncSession,
            )
            logger.info("Initialized PostgreSQL async engine with asyncpg.")
        except Exception as e:
            logger.warning(f"Could not initialize PostgreSQL engine: {e}")
            _engine = None
            _sessionmaker = None
    return _engine


async def close_db_engine() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _sessionmaker = None
        logger.info("PostgreSQL async engine disposed.")


async def check_db_health() -> dict:
    if not settings.DATABASE_URL:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "DATABASE_URL not configured. Running in stateless mode.",
            "postgis_installed": False,
        }

    engine = get_engine()
    if engine is None:
        return {
            "status": "unreachable",
            "connected": False,
            "message": "Engine initialization failed.",
            "postgis_installed": False,
        }

    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1;"))
            _ = res.scalar()

            postgis_version = None
            try:
                pgis_res = await conn.execute(text("SELECT postgis_full_version();"))
                postgis_version = pgis_res.scalar()
            except Exception:
                postgis_version = None

            return {
                "status": "healthy",
                "connected": True,
                "message": "PostgreSQL connection active.",
                "postgis_installed": postgis_version is not None,
                "postgis_version": postgis_version,
            }
    except Exception as e:
        return {
            "status": "unreachable",
            "connected": False,
            "message": f"PostgreSQL connection error: {str(e)}",
            "postgis_installed": False,
        }


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    engine = get_engine()
    if engine is None or _sessionmaker is None:
        raise DatabaseUnavailableException(
            "PostgreSQL database is unconfigured or offline. TERRAVISION is operating in stateless real-time mode."
        )

    async with _sessionmaker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
