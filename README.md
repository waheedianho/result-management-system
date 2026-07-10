# Student Result Management System (SRM)

A comprehensive and scalable Student Result Management System built with Node.js, Express, and MongoDB. This application is designed to streamline the process of managing schools, classes, students, subjects, and examination results efficiently. It features distinct role-based portals for administrators and students.

## 🚀 Features

### 🔑 Authentication & Authorization
- Secure login for administrators and students using `passport` and `bcrypt`.
- Role-based access control (Super Admin, Admin, Student).
- Session and JWT-based authentication.

### 🏛️ Administration (Admin/Super Admin)
- **School Management:** Create and manage multiple schools (Super Admin feature).
- **Class Management:** Easily create, update, and delete classes.
- **Subject Management:** Manage subjects and configure subject combinations for specific classes.
- **Student & Staff Management:** Add, update, and manage student and staff records. Bulk upload students using Excel templates.
- **Result Management:** 
  - Add, update, and manage examination results.
  - Download Excel templates for bulk result uploads.
  - Generate class-wide annual result pages.

### 🎓 Student Portal
- Secure login using student credentials.
- View individual annual results and performance reports.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose Object Modeling)
- **Templating Engine:** EJS (Embedded JavaScript)
- **Authentication:** Passport.js (Local Strategy & JWT), cookie-session
- **Utilities:** `xlsx` for Excel parsing/generation, `multer` & `formidable` for file uploads, `dotenv` for environment variable management.

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd result-management-system
   ```

2. **Install dependencies:**
   Make sure you have Node.js and `npm` or `pnpm` installed.
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add the following required environment variables:
   ```env
   PORT=3030
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Run the application:**
   For development with auto-reloading:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   For production:
   ```bash
   npm start
   # or
   pnpm start
   ```

5. **Access the Application:**
   Open your browser and navigate to `http://localhost:3030`

## 📁 Project Structure

- `src/app.js`: Application entry point and route definitions.
- `model/`: Mongoose schemas and database models (e.g., student, staff, result, school, subject).
- `controller/`: Business logic and request handlers for admins and students.
- `views/`: EJS templates for the frontend UI.
- `public/`: Static assets (CSS, client-side JS, images).
- `authentication.js`: Middleware for authenticating and verifying users.
- `config.js`: Application configuration variables.

## 📝 License

This project is licensed under the [ISC License](LICENSE).

## 👨‍💻 Author

**Ogidi Safiu Waheed**
