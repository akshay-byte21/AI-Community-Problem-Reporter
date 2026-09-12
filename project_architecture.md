# Project Architecture Guide

Your project is a complex, full-stack ecosystem divided into four main folders. Here is a clear breakdown of why each folder exists and the purpose of the most important files inside them.

---

## 1. The Backend (`backend/`)
**Purpose:** This is the "Brain" of the operation. It runs on a server 24/7 (hosted on Render), connects to your Supabase database, talks to the Google Gemini AI, and handles all data requests from your mobile apps and website.

*   `server.js`: **The most important file in the project.** It contains all your API endpoints (e.g., `/login`, `/reports`, `/agent/resolve`). It handles the math for the 50-meter Geo-fence deduplication, strict AI image verification, Cloudinary file uploads, and JWT security tokens.
*   `package.json`: A list of all the backend libraries required to run your server (Express, PostgreSQL, JsonWebToken, Multer, etc.).
*   `.env`: A hidden file that securely stores your secret passwords (like your Supabase connection string and Gemini API Key) so they don't accidentally get leaked on GitHub.
*   `clear_db.js`, `test_api.js`: Helper scripts we wrote to debug the server or wipe the database clean without using an interface.

---

## 2. The User App (`frontend/`)
**Purpose:** The React Native mobile app installed by everyday citizens to report problems, earn Civic Points, and track issue resolution.

*   `App.js`: The starting point of the app. It loads the navigation system and the authentication state.
*   `app.json`: Configuration for building the `.apk` file. It defines the app name, the app logo icon, and the permissions required (Camera, Location).
*   `src/context/AuthContext.js`: Manages the user's secure session. It saves their login token to the phone's local storage so they don't have to log in every time they open the app.
*   `src/screens/CameraScreen.js`: Opens the phone's hardware camera, extracts exact GPS coordinates, and handles the initial AI analysis to verify the photo is a real-world civic issue.
*   `src/screens/SubmitScreen.js`: Packages the photo and data, sends it to the Backend, and gracefully handles the `409 Already Reported` Geo-fence error if a duplicate is found.
*   `src/screens/ReportsScreen.js`: Fetches and displays the user's personal complaint history.
*   `src/screens/ProfileScreen.js`: Displays the user's accumulated Civic Points and profile details.

---

## 3. The Agent App (`agent-app/`)
**Purpose:** The React Native mobile app used exclusively by Civic Workers/Agents to view tasks assigned to them and submit proof of resolution.

*   `src/screens/LoginScreen.js`: Allows agents to log in securely.
*   `src/screens/DashboardScreen.js`: Fetches and lists only the specific tasks assigned to the currently logged-in agent.
*   `src/screens/ResolutionScreen.js`: The complex screen where an agent resolves an issue. **It contains the strict GPS logic:** it actively checks the agent's live GPS and blocks them from taking a photo unless they are physically within 50 meters of the reported coordinates.

---

## 4. The Admin Dashboard (`admin-web/`)
**Purpose:** A React/Vite web application used by city administrators on their desktop computers to oversee the entire city, view analytics, and manage personnel.

*   `index.html`: The core HTML file that the browser loads.
*   `src/main.jsx`: The React entry point that injects your React code into the `index.html` file.
*   `src/App.jsx`: Sets up the web routing (e.g., navigating from `/` to `/users`).
*   `src/pages/Dashboard.jsx`: Fetches data from the backend to display visual charts, statistics, and a global map of all active issues.
*   `src/pages/Complaints.jsx`: A data table allowing the admin to view all issues and manually assign specific agents to unsolved tasks.
*   `package.json`: Contains the commands to run the website. `npm run dev` translates the complex React code into browser-friendly JavaScript in real-time, while `npm run build` compiles it into static files ready for global deployment.
