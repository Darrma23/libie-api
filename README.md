<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=Libie%20REST%20API&fontSize=70&fontAlignY=35&animation=twinkling&fontColor=ffffff&desc=Scalable%20Plugin-Based%20Backend%20Framework&descAlignY=55&descSize=18" width="100%" />

<br/>

<img src="https://files.catbox.moe/zhwjz9.jpeg" width="100%" alt="Libie Logo" />

<br/>

# Libie REST API

A production-ready, plugin-based REST API built with Express.js and a modular architecture that preserves the existing plugin ecosystem while adding modern runtime safeguards.

## Highlights

- Modular app bootstrap under src/
- Automatic plugin discovery and hot reload support
- Standardized success/error API responses
- Centralized logging and error handling
- Rate limiting, sanitization, API key support, and request size limits
- Health, version, uptime, plugin list, plugin info, and reload endpoints

## Project Structure

```bash
.
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── utils/
├── plugins/
├── lib/
├── docs/
├── public/
└── package.json
```

## Installation

```bash
npm install
```

## Run

```bash
npm run dev
```

Production:

```bash
npm start
```

## Environment Variables

Copy .env.example to .env and adjust values as needed.

```bash
cp .env.example .env
```

## API Response Format

Success:

```json
{
  "success": true,
  "creator": "Himejima",
  "code": 200,
  "result": {},
  "execution_time": "12ms"
}
```

Error:

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Validation failed"
}
```

## Core Endpoints

- GET /health
- GET /stats
- GET /version
- GET /uptime
- GET /api/plugins
- GET /api/plugins/:pluginName
- POST /api/plugins/reload

## Plugin Development

See [docs/PLUGIN_DEVELOPMENT_GUIDE.md](docs/PLUGIN_DEVELOPMENT_GUIDE.md) for plugin authoring details.


```
PORT=3000
REDIS_URL=redis://localhost:6379
```

---

## 📖 API Documentation

| Endpoint        | Description               |
|-----------------|--------------------------|
| `/`             | Frontend Documentation   |
| `/api/info`     | JSON Endpoint List       |
| `/api/:plugin`  | Execute Plugin           |

---

## 🗺 Roadmap

- [ ] JWT Authentication  
- [ ] Role-Based Access Control  
- [ ] Swagger Documentation  
- [ ] Docker Support  
- [ ] CI/CD Pipeline  
- [ ] Unit & Integration Testing  

---

## 📜 License

MIT License

---

<div align="center">

Built with structure before speed.

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=footer&text=Happy%20Building&fontSize=35&fontColor=ffffff&animation=twinkling&fontAlignY=75" width="100%" />

</div>