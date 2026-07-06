# API Documentation

## Core Endpoints

- GET /health
- GET /stats
- GET /version
- GET /uptime
- GET /api/plugins
- POST /api/plugins/reload

## Plugin Endpoints

Plugin endpoints are mounted under `/api/<category>/<path>`.

For example:

- GET /api/info/gempa
- GET /api/anime/otakudesu-search?q=jujutsu
