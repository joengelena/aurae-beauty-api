# Project Architecture Overview

## 🗺️ Folder Structure & Responsibilities

### Routes
- Define the **API endpoints** for the application.
- Specify the URL paths and HTTP methods (GET, POST, PUT, DELETE).
- Delegate request handling to the appropriate **middlewares** and **controllers**.

### Middleware
- Handle request **validation** and **security checks** before reaching controllers.
- Common tasks include:
  - Authentication (e.g., JWT verification)
  - CSRF token validation
  - Input validation & sanitization
  - Permission & role checks

### Controllers
- Act as the **business logic layer**.
- Receive validated requests from routes.
- Orchestrate processing logic and communicate with repositories.
- Format and return appropriate API responses.

### Repositories
- Responsible for **database operations**.
- Abstract away direct database queries.
- Provide a clean interface for controllers to perform CRUD operations.

### Utils
- Utility functions and **wrappers for third-party libraries**.
- Simplify integration with external services (e.g., S3 clients, payment gateways).

### Config
- Stores all the **configuration files** required by the API.
- Examples:
  - Environment variables (dotenv)
  - Database connection settings
  - Third-party API keys & endpoints

## 🛡️ Security Flow for Private Routes

- Every **private API route** requires:
  1. **Authentication Token** (Auth Token)
  2. **CSRF Token** for cross-site request forgery protection
  3. **Valid JWT Token** associated with the request

- Once the JWT is verified:
  - The **user ID** extracted from the token is stored in the `request` object.
  - This allows all downstream middlewares, controllers, and repositories to **easily access the current user's ID** during the request lifecycle.

## ✅ Summary
This structure ensures:
- **Separation of concerns** (clean code organization)
- **Security & validation layers** are handled early
- Controllers stay focused on business logic
- Database interactions remain decoupled and testable
