# How to Run the Budget Tracker Project

This guide covers everything you need to know to run the full-stack Budget Tracker application locally on your machine. 

The project is split into two main parts:
1. **Frontend**: A React application powered by Vite, Tailwind CSS, and Zustand.
2. **Backend**: A Go server built with Gin and GORM, which connects to a PostgreSQL database.

---

## 🛠️ Prerequisites

Before you start, make sure you have the following installed:
- **Node.js** (v18 or higher)
- **Go** (v1.20 or higher)
- **PostgreSQL** database running locally or remotely

---

## 💻 1. Frontend Setup (React / Vite)

The frontend lives in the root directory of the project.

### Step 1: Install Dependencies
Open your terminal in the root folder (`d:\Codes\budget-tracker`) and run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy the template `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in the missing values. The default configuration connects to the local Go server and uses port `5173` for Vite. If you are using the AI features, make sure to add your `VITE_GEMINI_API_KEY`.

### Step 3: Start the Development Server
Run the Vite development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

---

## ⚙️ 2. Backend Setup (Go Server)

The backend code lives inside the `go-server` directory.

### Step 1: Navigate to the Server Directory
```bash
cd go-server
```

### Step 2: Setup the Database Environment Variable
The Go server requires a PostgreSQL connection string. You can define it in the `.env` file inside the `go-server` folder, or set it directly in your terminal:
```powershell
# For PowerShell
$env:DATABASE_URL="postgres://user:password@localhost:5432/splitwise"
```

### Step 3: Run the Server
Start the Go server:
```bash
go run main.go
```
The server will start on port `8080` (or `3001` depending on your environment config). It will automatically run database migrations on startup.

---

## 🧪 3. Testing the API (Bruno)

This project uses **Bruno** (an open-source API client like Postman) for API testing. 

1. Download and install [Bruno](https://www.usebruno.com/).
2. Open Bruno and click **Open Collection**.
3. Select the `bruno` folder located in the root of this repository.
4. You can now run all predefined API requests against your local Go server.

---

## 🚀 Production Build

If you wish to build the frontend for production deployment:
```bash
npm run build
```
The bundled files will be placed inside the `dist/` directory, ready to be served by any static file host (like Netlify or Vercel).

For the Go Backend, you can build a standalone executable:
```bash
go build -o main main.go
```
