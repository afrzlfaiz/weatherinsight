"""asyncpg connection pool — satu file, satu pool, dipakai bareng di seluruh app."""
import os
import asyncpg

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Kembalikan pool yang sudah ada, atau buat baru kalau belum ada."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL", "postgresql://localhost:5432/weatherinsight"),
            min_size=1,
            max_size=5,  # ponytail: Render free tier + Supabase free tier = koneksi dikit aja
        )
    return _pool


async def close_pool():
    """Tutup pool — dipanggil saat app shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
