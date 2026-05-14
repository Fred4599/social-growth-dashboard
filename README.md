# Social Growth Dashboard

Public creator analytics dashboard for Braydon Carter's social audience growth across TikTok, Instagram, YouTube, LinkedIn, and Facebook.

## What is published

This repo intentionally publishes only public-safe data:

- follower/subscriber counts
- dates
- platform names
- public account links

It does **not** publish private analytics, credentials, Apify run IDs, raw scrape payloads, Telegram metadata, or local machine paths.

## Data files

- `data/history.json` — daily follower/subscriber time series
- `data/latest.json` — latest totals and computed deltas

## Local development

This is a static dashboard. You can serve it with any static server:

```bash
python3 -m http.server 8080
```

## Updating data

The data is exported from the private Hermes social-growth history using:

```bash
python3 scripts/export-public-social-growth.py
```

The daily Hermes scan can run that exporter and commit the sanitized data back to this public repo.
