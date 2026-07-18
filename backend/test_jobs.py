import os
import subprocess
import unittest
from datetime import date
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import main


class CronJobTests(unittest.IsolatedAsyncioTestCase):
    def test_cron_auth(self):
        with patch.dict(os.environ, {"CRON_SECRET": "test-secret"}):
            main._require_cron_secret("Bearer test-secret")

            with self.assertRaises(HTTPException) as invalid:
                main._require_cron_secret("Bearer wrong")
            self.assertEqual(invalid.exception.status_code, 401)

        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as missing:
                main._require_cron_secret(None)
            self.assertEqual(missing.exception.status_code, 503)

    async def test_scraper_success_failure_and_timeout(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as missing_database:
                await main._run_scraper()
            self.assertEqual(missing_database.exception.status_code, 503)

        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch.object(
                main.asyncio,
                "to_thread",
                AsyncMock(return_value=subprocess.CompletedProcess([], 0, "ok", "")),
            ):
                await main._run_scraper()

            with patch.object(
                main.asyncio,
                "to_thread",
                AsyncMock(return_value=subprocess.CompletedProcess([], 1, "", "failed")),
            ):
                with self.assertRaises(HTTPException) as failed:
                    await main._run_scraper()
                self.assertEqual(failed.exception.status_code, 502)

            with patch.object(
                main.asyncio,
                "to_thread",
                AsyncMock(side_effect=subprocess.TimeoutExpired("scraper", 120)),
            ):
                with self.assertRaises(HTTPException) as timeout:
                    await main._run_scraper()
                self.assertEqual(timeout.exception.status_code, 504)

    async def test_hourly_job_response(self):
        class FakePool:
            async def fetchrow(self, query, retention_days):
                self.query = query
                self.retention_days = retention_days
                return {
                    "summary_rows": 38,
                    "deleted_raw_rows": 912,
                    "cutoff_date": date(2026, 4, 19),
                }

        pool = FakePool()
        with (
            patch.dict(os.environ, {"CRON_SECRET": "test-secret"}),
            patch.object(main, "_run_scraper", AsyncMock()),
            patch.object(main, "get_pool", AsyncMock(return_value=pool)),
        ):
            result = await main.hourly_job("Bearer test-secret")

        self.assertEqual(result.status, "ok")
        self.assertEqual(result.summary_rows, 38)
        self.assertEqual(result.deleted_raw_rows, 912)
        self.assertEqual(pool.retention_days, 90)


if __name__ == "__main__":
    unittest.main()
