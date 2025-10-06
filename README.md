# Motorix API

RESTful API for the Motorix vehicle marketplace application with dual authentication systems.

## 🔐 Authentication Systems

### Authentication

-   Routes: `/api/v1/user/*`
-   Supabase Auth for user management
-   Passwords managed by Supabase
-   HttpOnly cookies for secure token storage
-   Auto email confirmation for development (configurable for production)

## 🗺️ Folder Structure & Responsibilities

### Routes

-   Define the **API endpoints** for the application.
-   Specify the URL paths and HTTP methods (GET, POST, PUT, DELETE).
-   Delegate request handling to the appropriate **middlewares** and **controllers**.

### Middleware

-   Handle request **validation** and **security checks** before reaching controllers.
-   Common tasks include:
    -   Authentication (e.g., JWT verification)
    -   CSRF token validation
    -   Input validation & sanitization
    -   Permission & role checks

### Controllers

-   Act as the **business logic layer**.
-   Receive validated requests from routes.
-   Orchestrate processing logic and communicate with repositories.
-   Format and return appropriate API responses.

### Repositories

-   Responsible for **database operations**.
-   Abstract away direct database queries.
-   Provide a clean interface for controllers to perform CRUD operations.

### Utils

-   Utility functions and **wrappers for third-party libraries**.
-   Simplify integration with external services (e.g., S3 clients, payment gateways).

### Config

-   Stores all the **configuration files** required by the API.
-   Examples:
    -   Environment variables (dotenv)
    -   Database connection settings
    -   Third-party API keys & endpoints
    -   Supabase client configuration (admin & auth clients)

## 🛡️ Security Flow for Private Routes

### V1 Routes (Legacy)

-   Every **private API route** requires:

    1. **Authentication Token** (Auth Token)
    2. **CSRF Token** for cross-site request forgery protection
    3. **Valid JWT Token** associated with the request

-   Once the JWT is verified:
    -   The **user ID** extracted from the token is stored in the `request` object.
    -   This allows all downstream middlewares, controllers, and repositories to **easily access the current user's ID** during the request lifecycle.

### V2 Routes (Supabase)

-   Private routes use **Supabase JWT verification**
-   Tokens stored in httpOnly cookies (`sb-access-token`, `sb-refresh-token`)
-   `supabaseAuth` middleware validates JWT from cookies
-   User ID extracted from Supabase JWT and stored in request object

## 🚀 Getting Started

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure database credentials (MySQL)
3. Add Supabase credentials:
    - `SUPABASE_URL` - Your Supabase project URL
    - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin operations)
    - `SUPABASE_ANON_KEY` - Anon key (authentication operations)
4. Configure other services (Cloudinary, Email, etc.)

### Installation

```bash
npm install
npm run dev
```

## ✅ Summary

This structure ensures:

-   **Separation of concerns** (clean code organization)
-   **Security & validation layers** are handled early
-   Controllers stay focused on business logic
-   Database interactions remain decoupled and testable
-   Dual authentication systems for flexibility and migration path
