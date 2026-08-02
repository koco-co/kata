#!/usr/bin/env python3
"""
Refresh Lanhu cookie by logging in via Playwright headless browser.

Credential resolution order:
  1. config/private/integrations/lanhu.yaml via KATA_LANHU_CONFIG
  2. Interactive prompt (stdin)

After login, navigates to --target-url (if provided) to acquire
project-scoped cookies, then writes the cookie to KATA_LANHU_COOKIE_OUTPUT.

Usage:
  KATA_LANHU_CONFIG=/path/to/lanhu.yaml KATA_LANHU_COOKIE_OUTPUT=/path/to/private-file \
    uv run python refresh-cookie.py [--target-url URL]
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import os
import sys
import tempfile

import yaml


def _emit_error(message: str, code: str) -> None:
    payload = {"error": message, "code": code}
    sys.stderr.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.exit(1)


def _resolve_credentials() -> tuple[str, str]:
    # Prefer credentials from config/private/integrations/lanhu.yaml via KATA_LANHU_CONFIG.
    username = ""
    password = ""
    config_path = os.getenv("KATA_LANHU_CONFIG", "")
    if config_path:
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            if isinstance(data, dict):
                username = (data.get("username") or "").strip()
                password = (data.get("password") or "").strip()
        except OSError:
            username = password = ""

    if username and password:
        return username, password

    # Interactive fallback
    if not sys.stdin.isatty():
        _emit_error(
            "No credentials available. Configure Lanhu credentials in config/private/integrations/lanhu.yaml or run interactively.",
            "NO_CREDENTIALS",
        )

    print("蓝湖登录凭据未配置，请手动输入：", file=sys.stderr)
    if not username:
        username = input("  邮箱/手机号: ").strip()
    if not password:
        password = getpass.getpass("  密码: ").strip()

    if not username or not password:
        _emit_error("Username and password are required.", "NO_CREDENTIALS")

    return username, password


async def _login_and_get_cookie(
    username: str,
    password: str,
    target_url: str | None,
) -> str:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        _emit_error(
            "playwright is not installed. Run: uv pip install playwright && uv run playwright install chromium",
            "MISSING_PLAYWRIGHT",
        )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        # Step 1: Navigate to login page
        await page.goto(
            "https://lanhuapp.com/web/#/user/login",
            wait_until="networkidle",
            timeout=30000,
        )
        await page.wait_for_timeout(2000)

        # Step 2: Enter username
        await page.fill('input[name="username"]', username)
        await page.wait_for_timeout(500)

        # Step 3: Click "登录 / 注册"
        await page.evaluate(
            """() => {
            const divs = document.querySelectorAll('div');
            for (const d of divs) {
                if (d.textContent.trim() === '登录 / 注册' && d.children.length === 0) {
                    d.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(2000)

        # Step 4: Handle agreement dialog (click "同意" if present)
        await page.evaluate(
            """() => {
            const els = document.querySelectorAll('div, button, span');
            for (const el of els) {
                if (el.textContent.trim() === '同意' && el.children.length === 0) {
                    el.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(3000)

        # Step 5: Enter password
        pwd_input = await page.query_selector('input[type="password"]')
        if not pwd_input:
            await browser.close()
            _emit_error(
                "Login flow error: password input not found after entering username.",
                "LOGIN_FLOW_ERROR",
            )

        await pwd_input.fill(password)
        await page.wait_for_timeout(500)

        # Step 6: Click login button
        await page.evaluate(
            """() => {
            const els = document.querySelectorAll('div, button');
            for (const el of els) {
                if (el.textContent.trim() === '登录' && el.children.length === 0) {
                    el.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(5000)

        # Verify login succeeded
        cookies = await page.context.cookies()
        has_token = any(
            c["name"] == "user_token" and c["value"] not in ("undefined", "")
            for c in cookies
        )
        if not has_token:
            # Random temp name: concurrent refreshes must not clobber each other.
            fd, screenshot_path = tempfile.mkstemp(
                prefix="lanhu-login-failed-", suffix=".png"
            )
            os.close(fd)
            await page.screenshot(path=screenshot_path)
            await browser.close()
            _emit_error(
                "Login failed: user_token not found after login. "
                f"Check username/password. Screenshot saved to {screenshot_path}",
                "LOGIN_FAILED",
            )

        # Step 7: Navigate to target URL to get project-scoped cookies
        if target_url:
            await page.goto(target_url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)

        # Step 8: Collect cookies
        cookies = await page.context.cookies()
        cookie_str = "; ".join(f'{c["name"]}={c["value"]}' for c in cookies)

        await browser.close()
        return cookie_str


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh Lanhu cookie via login")
    parser.add_argument(
        "--target-url",
        default=None,
        help="Navigate to this URL after login to get project-scoped cookies",
    )
    args = parser.parse_args()

    username, password = _resolve_credentials()

    print("正在登录蓝湖...", file=sys.stderr)

    cookie = asyncio.run(_login_and_get_cookie(username, password, args.target_url))

    output_path = os.getenv("KATA_LANHU_COOKIE_OUTPUT", "").strip()
    if not output_path:
        _emit_error("KATA_LANHU_COOKIE_OUTPUT is required.", "NO_COOKIE_OUTPUT")
    try:
        fd = os.open(output_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(cookie)
        os.chmod(output_path, 0o600)
    except OSError as error:
        _emit_error(f"Unable to write cookie output: {error}", "COOKIE_OUTPUT_ERROR")


if __name__ == "__main__":
    main()
