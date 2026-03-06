#!/usr/bin/env python3
"""Smoke test for the Vokda Python SDK."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from vokda import VokdaCatalogClient, VokdaClient, VokdaApiError

API_KEY = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VOKDA_API_KEY", "")


def test_catalog():
    print("── Catalog Client ──")
    catalog = VokdaCatalogClient()

    data = catalog.list_voices()
    print(f"  list_voices: {len(data['voices'])} voices ✓")

    voice = catalog.get_voice(data["voices"][0]["id"])
    print(f"  get_voice: {voice['name']} ({voice['provider']}) ✓")

    providers = catalog.list_providers()
    print(f"  list_providers: {providers['total']} providers ✓")

    openai = catalog.get_provider("openai")
    print(f"  get_provider: {openai['name']} — {openai['voiceCount']} voices ✓")

    stats = catalog.get_stats()
    print(f"  get_stats: {stats['totalVoices']} voices, {stats['totalProviders']} providers ✓")


def test_authenticated():
    if not API_KEY:
        print("\n── Authenticated Client (skipped — no API_KEY) ──")
        return

    print("\n── Authenticated Client ──")
    client = VokdaClient(api_key=API_KEY)

    creds = client.list_credentials()
    print(f"  list_credentials: {creds['count']} credentials ✓")

    keys = client.list_api_keys()
    print(f"  list_api_keys: {len(keys['keys'])} keys ✓")

    usage = client.get_usage()
    print(f"  get_usage: {usage['fileCount']} clips, {usage['usagePercent']}% ✓")

    clips = client.list_clips(limit=5)
    print(f"  list_clips: {clips['count']} total ✓")

    if clips["jobs"]:
        clip = client.get_clip(clips["jobs"][0]["jobId"])
        print(f"  get_clip: {clip['jobId']} ({clip['provider']}) ✓")

    try:
        client.synthesize(text="", provider="openai")
    except VokdaApiError as e:
        print(f"  error handling: VokdaApiError({e.status}) \"{e.body['error']}\" ✓")


test_catalog()
test_authenticated()
print("\n✅ All smoke tests passed")
