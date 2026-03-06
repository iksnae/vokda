"""
Vokda SDK for Python — voice catalog browsing + TTS synthesis.

Usage:
    from vokda import VokdaCatalogClient, VokdaClient

    # Public catalog (no auth)
    catalog = VokdaCatalogClient()
    voices = catalog.list_voices()

    # Authenticated synthesis
    client = VokdaClient(api_key="vk_live_...")
    clip = client.synthesize(text="Hello!", provider="openai", provider_voice_id="alloy")
"""

from .client import VokdaCatalogClient, VokdaClient, VokdaApiError

__all__ = ["VokdaCatalogClient", "VokdaClient", "VokdaApiError"]
__version__ = "0.1.0"
