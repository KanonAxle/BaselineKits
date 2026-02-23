# API Endpoints for Survival Kit Builder

## What is an Endpoint?
An endpoint is a URL your website calls to do something:
- `GET /products` = "Show me all products"
- `POST /orders` = "Create a new order"

---

## AUTHENTICATION (Login/Signup)

### 1. Create New User Account
**Endpoint:** `POST /auth/register`
**What it does:** Creates a new customer account

**Website sends:**
```json
{
  "email": "john@example.com",
  "password": "secure123",
  "name": "John Smith"
}