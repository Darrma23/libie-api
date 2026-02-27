<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=Libie%20REST%20API&fontSize=70&fontAlignY=35&animation=twinkling&fontColor=ffffff&desc=Modular%20Plugin-Based%20Backend%20Architecture&descAlignY=55&descSize=18" width="100%" />

# 🚀 Libie REST API

**Scalable Modular REST API Framework built with Express.js**

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Express.js-Framework-black?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/Redis-Optional-red?style=for-the-badge&logo=redis" />
  <img src="https://img.shields.io/badge/Architecture-Plugin--Based-blue?style=for-the-badge" />
</p>

</div>

---

## ⚡ Overview

Libie REST API adalah backend modular dengan sistem auto-loading plugin.  
Tambahkan file ke folder `plugins/` → endpoint otomatis aktif tanpa router manual.

Dirancang untuk:
- Clean architecture
- Scalability
- Maintainability
- Rapid feature expansion

---

## 🏗️ Architecture Overview

```mermaid
graph TD

A[Client Request] --> B[Express Server]
B --> C[Global Middleware]
C --> D[Rate Limiter]
C --> E[JSON Parser]
C --> F[Logger]

B --> G{Route Resolver}
G -->|Match Plugin| H[Plugin Loader]
H --> I[Plugin Executor]
I --> J[External API / Scraper]
I --> K[Redis Cache]

J --> I
K --> I
I --> L[Response Formatter]
L --> M[Client Response]

style A fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
style B fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
style H fill:#fff3e0,stroke:#ff9800,stroke-width:2px
style I fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
style L fill:#fce4ec,stroke:#e91e63,stroke-width:2px
```

---

## 📂 Project Structure

```
.
├── server.js
├── lib/
│   ├── redis.js
│   └── iplimiter.js
├── plugins/
│   ├── ai/
│   ├── anime/
│   ├── download/
│   ├── info/
│   ├── internet/
│   ├── maker/
│   └── tool/
├── public/
└── package.json
```

---

## 🔌 Plugin System

Setiap endpoint didefinisikan sebagai module:

```js
module.exports = {
  name: "Cek Gempa",
  desc: "Informasi gempa terkini dari BMKG",
  category: "Info",
  method: "GET",
  path: "/gempa",

  async run(req, res) {
    res.status(200).json({
      status: true,
      data: {}
    });
  }
};
```

📌 File yang ditambahkan ke `plugins/` otomatis:
- Terdaftar sebagai route
- Muncul di `/api/info`
- Mengikuti format response global

---

## 📦 Global Response Format

### Success
```json
{
  "status": true,
  "data": {},
  "metadata": {
    "timestamp": "ISO-8601"
  }
}
```

### Error
```json
{
  "status": false,
  "message": "Error message",
  "error": "Detail error"
}
```

---

## 🛡 Core Features

| Feature | Description |
|----------|------------|
| Auto Plugin Loader | Tanpa router manual |
| Rate Limiting | Perlindungan basic anti-spam |
| Redis Support | Optional caching |
| Timeout Protection | External API safety |
| Structured Error | Konsisten & clean |
| Frontend Docs | UI responsif di `/` |

---

## ⚙️ Installation

```bash
npm install
```

### Run Development
```bash
npm run dev
```

### Run Production
```bash
npm start
```

Default:
```
http://localhost:3000
```

---

## 🔐 Environment Variables (Optional)

Buat file `.env`:

```
PORT=3000
REDIS_URL=redis://localhost:6379
```

---

## 📖 API Documentation

| Endpoint | Description |
|-----------|------------|
| `/` | Frontend Documentation |
| `/api/info` | JSON Endpoint List |
| `/api/:plugin` | Execute Plugin |

---

## 🚀 Design Philosophy

- Modular over monolith
- Scalable over quick hacks
- Clean code over spaghetti routes
- Structure before features

---

## 📜 License

MIT License

---

<div align="center">

Built for developers who prefer structure over chaos.

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=footer&text=Happy%20Building&fontSize=35&fontColor=ffffff&animation=twinkling&fontAlignY=75" width="100%" />

</div>