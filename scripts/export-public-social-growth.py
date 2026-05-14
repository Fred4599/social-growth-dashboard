#!/usr/bin/env python3
"""Export sanitized public social-growth data from Hermes local history.

This script intentionally exports follower/subscriber counts only. It excludes
Apify run IDs, raw scrape payloads, local paths, Telegram metadata, and secrets.
"""
from __future__ import annotations
import json, os
from datetime import UTC, datetime
from pathlib import Path

SOURCE = Path(os.environ.get('SOCIAL_GROWTH_HISTORY', Path.home() / 'social-growth' / 'social_growth_history.jsonl'))
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
PLATFORMS = ['tiktok', 'instagram', 'youtube', 'linkedin', 'facebook']
ACCOUNTS = {
    'tiktok': 'https://www.tiktok.com/@carter.braydon',
    'instagram': 'https://www.instagram.com/thecoachbraydon',
    'youtube': 'https://youtube.com/@braydon_carter',
    'linkedin': 'https://www.linkedin.com/in/braydon-carter-701949a1',
    'facebook': 'https://www.facebook.com/carter.braydon',
}

def load_history():
    rows = []
    with SOURCE.open() as f:
        for line in f:
            if not line.strip():
                continue
            r = json.loads(line)
            item = {'date': r['date']}
            for p in PLATFORMS:
                item[p] = r.get(f'{p}_followers')
            item['total'] = sum(item[p] or 0 for p in PLATFORMS)
            rows.append(item)
    return sorted(rows, key=lambda x: x['date'])

def delta(history, days):
    latest = history[-1]
    ref = history[max(0, len(history) - 1 - days)]
    out = {p: (latest.get(p) or 0) - (ref.get(p) or 0) for p in PLATFORMS}
    out.update({'total': latest['total'] - ref['total'], 'from': ref['date'], 'to': latest['date']})
    return out

def main():
    DATA.mkdir(parents=True, exist_ok=True)
    history = load_history()
    latest = history[-1]
    first = history[0]
    summary = {
        'generatedAt': datetime.now(UTC).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'latestDate': latest['date'],
        'latest': latest,
        'deltas': {
            'oneDay': delta(history, 1),
            'sevenDay': delta(history, 7),
            'allTime': {p: (latest.get(p) or 0) - (first.get(p) or 0) for p in PLATFORMS} | {
                'total': latest['total'] - first['total'], 'from': first['date'], 'to': latest['date']
            },
        },
        'platforms': PLATFORMS,
        'accounts': ACCOUNTS,
        'dataPolicy': 'Public follower/subscriber counts only. No private analytics, credentials, scrape payloads, or internal run metadata.',
    }
    (DATA / 'history.json').write_text(json.dumps(history, indent=2) + '\n')
    (DATA / 'latest.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(f'Exported {len(history)} days to {DATA}')

if __name__ == '__main__':
    main()
