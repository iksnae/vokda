"""
Vokda API client — zero-dependency (stdlib only), Python 3.9+.

Two clients:
  - VokdaCatalogClient: public catalog (no auth)
  - VokdaClient: authenticated synthesis API (extends catalog)
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
import urllib.parse
from dataclasses import dataclass, field
from typing import Any, Optional


# ─── Error ────────────────────────────────────────────────────────────────────


@dataclass
class VokdaApiError(Exception):
    """Raised when the API returns a non-2xx response."""

    status: int
    body: dict[str, Any]

    def __str__(self) -> str:
        msg = self.body.get("message") or self.body.get("error", "Unknown error")
        return f"VokdaApiError({self.status}): {msg}"


# ─── HTTP helper ──────────────────────────────────────────────────────────────


def _request(
    method: str,
    url: str,
    body: Any = None,
    headers: dict[str, str] | None = None,
) -> Any:
    """Make an HTTP request and return parsed JSON."""
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read())
        except Exception:
            err_body = {"error": f"HTTP {e.code}", "message": e.reason}
        raise VokdaApiError(status=e.code, body=err_body) from None


# ─── Catalog Client (public, no auth) ────────────────────────────────────────


class VokdaCatalogClient:
    """Browse the Vokda voice catalog. No authentication required."""

    def __init__(self, base_url: str = "https://vokda.iksnae.com"):
        self._base = base_url.rstrip("/")

    def list_voices(self) -> dict[str, Any]:
        """List all voices in the catalog."""
        return _request("GET", f"{self._base}/api/v1/voices.json")

    def get_voice(self, voice_id: str) -> dict[str, Any]:
        """Get a single voice by ID."""
        return _request("GET", f"{self._base}/api/v1/voices/{urllib.parse.quote(voice_id)}.json")

    def list_providers(self) -> dict[str, Any]:
        """List all providers with capabilities, pricing, and links."""
        return _request("GET", f"{self._base}/api/v1/providers.json")

    def get_provider(self, provider_id: str) -> dict[str, Any] | None:
        """Get a single provider by ID."""
        data = self.list_providers()
        for p in data.get("providers", []):
            if p.get("id") == provider_id:
                return p
        return None

    def get_stats(self) -> dict[str, Any]:
        """Get catalog statistics."""
        return _request("GET", f"{self._base}/api/v1/stats.json")


# ─── Authenticated Client ────────────────────────────────────────────────────


class VokdaClient(VokdaCatalogClient):
    """
    Full Vokda API client — catalog + synthesis + clips + credentials + keys.

    Requires a Vokda API key (``vk_live_...``) or Cognito JWT.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://vokda.iksnae.com",
        synthesis_base_url: str = "https://api.vokda.iksnae.com",
    ):
        super().__init__(base_url)
        self._api_base = synthesis_base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
        }

    def _auth(self, method: str, path: str, body: Any = None) -> Any:
        return _request(method, f"{self._api_base}{path}", body=body, headers=self._headers)

    # ── Synthesis ──

    def synthesize(
        self,
        text: str,
        provider: str,
        provider_voice_id: str = "",
        voice_name: str = "",
        voice_id: str = "",
        mode: str = "text",
        **options: Any,
    ) -> dict[str, Any]:
        """Synthesize speech from text or SSML."""
        body: dict[str, Any] = {"text": text, "provider": provider, "mode": mode}
        if provider_voice_id:
            body["providerVoiceId"] = provider_voice_id
        if voice_name:
            body["voiceName"] = voice_name
        if voice_id:
            body["voiceId"] = voice_id
        if options:
            body["options"] = options
        return self._auth("POST", "/v1/synthesize", body)

    # ── Clips ──

    def list_clips(self, limit: int = 50, status: str | None = None) -> dict[str, Any]:
        """List audio clips."""
        params: dict[str, str] = {"limit": str(limit)}
        if status:
            params["status"] = status
        qs = urllib.parse.urlencode(params)
        return self._auth("GET", f"/v1/jobs?{qs}")

    def get_clip(self, clip_id: str) -> dict[str, Any]:
        """Get a clip by ID (refreshes presigned audio URL)."""
        return self._auth("GET", f"/v1/jobs/{urllib.parse.quote(clip_id)}")

    def update_clip(
        self,
        clip_id: str,
        clip_name: str | None = None,
        clip_description: str | None = None,
        clip_tags: list[str] | None = None,
    ) -> dict[str, Any]:
        """Update clip metadata."""
        body: dict[str, Any] = {}
        if clip_name is not None:
            body["clipName"] = clip_name
        if clip_description is not None:
            body["clipDescription"] = clip_description
        if clip_tags is not None:
            body["clipTags"] = clip_tags
        return self._auth("PATCH", f"/v1/jobs/{urllib.parse.quote(clip_id)}", body)

    def delete_clip(self, clip_id: str) -> dict[str, Any]:
        """Delete a clip and its audio file."""
        return self._auth("DELETE", f"/v1/jobs/{urllib.parse.quote(clip_id)}")

    # ── Credentials ──

    def save_credential(
        self,
        provider_id: str,
        credential_data: dict[str, str],
        label: str = "",
    ) -> dict[str, Any]:
        """Store or update a provider credential (BYOK)."""
        body: dict[str, Any] = {
            "providerId": provider_id,
            "credentialData": credential_data,
        }
        if label:
            body["label"] = label
        return self._auth("POST", "/v1/credentials", body)

    def list_credentials(self) -> dict[str, Any]:
        """List all stored credentials (keys are masked)."""
        return self._auth("GET", "/v1/credentials")

    def test_credential(
        self,
        provider_id: str,
        credential_data: dict[str, str],
    ) -> dict[str, Any]:
        """Test a credential without storing it (dry-run synthesis)."""
        return self._auth("POST", "/v1/credentials/test", {
            "providerId": provider_id,
            "credentialData": credential_data,
        })

    def delete_credential(self, provider_id: str) -> dict[str, Any]:
        """Remove a stored provider credential."""
        return self._auth("DELETE", f"/v1/credentials/{urllib.parse.quote(provider_id)}")

    # ── API Keys ──

    def create_api_key(self, label: str = "") -> dict[str, Any]:
        """Create a new Vokda API key. The full key is returned only once."""
        body = {"label": label} if label else {}
        return self._auth("POST", "/v1/keys", body)

    def list_api_keys(self) -> dict[str, Any]:
        """List all API keys (values masked)."""
        return self._auth("GET", "/v1/keys")

    def revoke_api_key(self, key_id: str) -> dict[str, Any]:
        """Revoke an API key by ID."""
        return self._auth("DELETE", f"/v1/keys/{urllib.parse.quote(key_id)}")

    # ── Usage ──

    def get_usage(self) -> dict[str, Any]:
        """Get storage usage and quota."""
        return self._auth("GET", "/v1/media/usage")
