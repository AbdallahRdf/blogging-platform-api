# Blogging Platform API

This is the backend API for a personal blog built using **Node.js**, **Express.js**, and **TypeScript**, with **MongoDB Atlas** as the database. The API includes JWT-based authentication and role-based authorization, supporting three roles: **Admin**, **Moderator**, and **User**.

**Hosted on Render:** [Blogging Platform API](https://blogging-platform-api-uhuy.onrender.com)

---

## 🛠️ Technologies Used

- **Backend:**
  - Node.js + Express.js
  - TypeScript
  - MongoDB Atlas (NoSQL, cloud-hosted)
- **Authentication & Authorization:**
  - JSON Web Tokens (JWT)
- **Email Services:**
  - Nodemailer (password reset emails)
- **Deployment:**
  - Render

---

## ✨ Features

### 🔓 Unauthenticated Users

- Can view posts and comments
- Cannot like, dislike, or comment

### 🔐 Authenticated Users

- Can like/dislike posts, comments, and replies
- Can comment on posts and reply to comments
- Can manage their own account (update/delete)
- Can view their profile and other users' profiles

### 🔑 Authentication

- JWT-based secure login and route protection
- Password reset via email

---

## 📚 API Documentation

The API is documented using OpenAPI/Swagger.

- Local Swagger UI: Once the server is running, visit http://localhost:5000/api-docs to explore the API interactively.

- The raw OpenAPI spec is available at: [swagger.yaml](src/doc/swagger.yaml)

---

## 🚀 Running the Project Locally

> ⚠️ **MongoDB must be cloud-hosted (e.g., Atlas)**. Local MongoDB will not work because this project uses **sessions and transactions**, which are not supported by standalone instances.

### ✅ Prerequisites

- Node.js (v14+)
- MongoDB Atlas account

### 📦 Installation Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/AbdallahRdf/blogging-platform-api.git
   cd blogging-platform-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```env
   PORT=5000
   JWT_SECRET_KEY=your_jwt_secret
   MONGODB_CONNECTION_STRING=your_mongodb_atlas_uri
   FRONTEND_URL=http://localhost:3000
   EMAIL_USER=your_email@example.com
   EMAIL_APP_PASSWORD=your_email_app_password
   NODE_ENV=development
   GLOBAL_RATE_LIMITER_MAX=number_of_requests_allowed_per_minute_globally
   AUTH_RATE_LIMITER_MAX=number_of_auth_requests_allowed_per_minute
   SEND_EMAIL_RATE_LIMITER_MAX=number_of_emails_allowed_to_be_sent_per_minute
   ```

4. Create an initial admin user:

   ```bash
   npm run create-admin
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit a pull request.

---

## 📝 License

This project is licensed under the MIT License.
