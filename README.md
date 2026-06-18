# MobileApp

A full-stack mobile application built with **React Native** (frontend), **ASP.NET Core** (backend), and **PostgreSQL** (database).

---

## Project Structure

```
MobileApp/
├── backend/                   # C# ASP.NET Core Web API
│   └── MobileApp.Api/
│       ├── Controllers/       # API endpoints
│       ├── DTOs/              # Data Transfer Objects
│       ├── Data/              # EF Core DbContext & migrations
│       ├── Models/            # Domain models
│       ├── Program.cs         # App entry point & DI setup
│       └── appsettings.json   # Configuration
│
├── frontend/                  # React Native app
│   └── src/
│       ├── context/           # Global state (AuthContext, etc.)
│       ├── navigation/        # React Navigation setup
│       └── services/          # API service layer
│
├── database/
│   ├── migrations/            # SQL migration scripts (run in order)
│   └── seeds/                 # SQL seed data scripts
│
├── docs/                      # Architecture docs, API specs
├── docker-compose.yml         # PostgreSQL + PgAdmin for local dev
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| [.NET SDK](https://dotnet.microsoft.com/) | 8.0+ |
| [Node.js](https://nodejs.org/) | 18+ |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest |
| [React Native CLI](https://reactnative.dev/docs/environment-setup) | latest |

---

### 1. Start the Database

```bash
docker-compose up -d postgres
```

> PgAdmin UI is available at [http://localhost:5050](http://localhost:5050)  
> Login: `admin@mobileapp.com` / `admin`

---

### 2. Run the Backend

```bash
cd backend/MobileApp.Api
dotnet restore
dotnet run
```

The API will be available at `https://localhost:7001` (or the port shown in the console).

> **Note:** Update the connection string in `appsettings.Development.json` if your DB credentials differ.

---

### 3. Run the Frontend

```bash
cd frontend
npm install
npx react-native start
```

In a separate terminal:

```bash
# Android
npx react-native run-android

# iOS (macOS only)
npx react-native run-ios
```

---

## Environment Variables

### Backend (`appsettings.Development.json`)

| Key | Description |
|-----|-------------|
| `ConnectionStrings.DefaultConnection` | PostgreSQL connection string |
| `JwtSettings.SecretKey` | JWT signing secret (min 32 chars) |
| `JwtSettings.Issuer` | Token issuer |
| `JwtSettings.Audience` | Token audience |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native + React Navigation |
| Backend API | ASP.NET Core 8, Entity Framework Core |
| Database | PostgreSQL 16 |
| Auth | JWT Bearer Tokens |
| Dev Infra | Docker Compose |

---

## License

MIT
