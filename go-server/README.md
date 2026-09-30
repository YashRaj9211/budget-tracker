# Splitwise Go Server Prototype

A high-performance backend for Splitwise built with **Go**, **Gin**, and **GORM**, ready for serverless deployment on AWS Lambda.

## 🚀 Features

- **Gin Web Framework**: Fast, easy-to-use HTTP web framework.
- **GORM**: Powerful Object Relational Mapper for Go (Postgres).
- **AWS Lambda Ready**: Includes adapter to run as a monolithic Lambda function behind API Gateway.
- **Data Models**: Replicates your existing Prisma schema (User, Expense, Splits, Friendships).
- **Dual Mode**: Runs as a standard HTTP server locally, and as a Lambda handler on AWS.

## 🛠️ Project Structure

```
go-server/
├── main.go             # Entry point (Lambda handler + Local server)
├── database/
│   └── db.go           # GORM database connection
├── models/
│   └── models.go       # Structs matching database tables
├── handlers/
│   └── expense.go      # API logic (Controllers)
├── go.mod              # Dependencies
└── go.sum
```

## 🏃‍♂️ How to Run Locally

1. **Install Go**: [Download Go](https://go.dev/dl/) (v1.20+)
2. **Setup Database URL**:
   Set the `DATABASE_URL` environment variable to your Postgres connection string.
   ```powershell
   $env:DATABASE_URL="postgres://user:password@localhost:5432/splitwise"
   ```
3. **Run**:
   ```powershell
   go run main.go
   ```
   The server will start on port 8080.
4. **Test Endpoints**:
   - `GET /ping` -> `{"message": "pong"}`
   - `GET /expenses?userId=...` -> Returns expenses with splits
   - `POST /expenses` -> Create new expense

## ☁️ Deploying to AWS Lambda

This project uses `aws-lambda-go-api-proxy`. You don't need to change any code!

1. **Build the Binary**:
   ```powershell
   set GOOS=linux
   set GOARCH=amd64
   go build -o main main.go
   ```
2. **Zip & Upload**:

   - Zip the `main` binary.
   - Upload to AWS Lambda.
   - Set Handler to `main`.
   - Set Environment Variable `DATABASE_URL` in Lambda console.

3. **API Gateway**:
   - Create an API Gateway.
   - Route all traffic (`/{proxy+}`) to this Lambda.

## 📦 Dependencies

- `github.com/gin-gonic/gin`
- `gorm.io/gorm`
- `gorm.io/driver/postgres`
- `github.com/awslabs/aws-lambda-go-api-proxy`
