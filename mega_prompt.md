# Project: AI Community Problem Reporter

Please build a comprehensive civic issue reporting ecosystem consisting of four parts: a **User Mobile App**, an **Agent Mobile App**, an **Admin Web Dashboard**, and a unified **Node.js/Express Backend** with a PostgreSQL database (Supabase) and Cloudinary for image storage. 

Below are the strict requirements for each component and the core business logic.

---

### 1. Unified Backend (Node.js, Express, PostgreSQL, Cloudinary)
- **Database:** Use PostgreSQL to store `users`, `agents`, `reports`, and `departments`. 
- **Auth:** Implement JWT-based authentication where users and agents sign up and log in using their **Phone Number** and **Password**.
- **Storage:** All uploaded images must be sent to Cloudinary, saving the URLs in the database.
- **Push Notifications:** Integrate Expo Push Notifications to alert users when their reported issue status changes.

### 2. User App (React Native / Expo)
- **Reporting an Issue:** Users capture a photo of a civic issue. 
  - The photo must automatically have a watermark stamped on it containing the current Date, Time, Latitude, and Longitude.
  - **AI Verification (Gemini 1.5):** The app sends the photo to the backend for Gemini AI analysis. The AI must explicitly verify it is a real-world civic issue (Garbage, Road Pothole, Electricity, Water Leakage, Sanitary) and **strictly reject** photos of computer screens, monitors, or random indoor objects. If valid, the AI auto-generates a title, description, and assigns a department.
  - **Geo-fence Deduplication:** Before submitting to the database, the backend must check a **50-meter radius** around the GPS coordinates. If an identical active issue (e.g., another "Pothole") exists within 50m, block the submission and alert the user: "Already Reported".
- **Tracking & Gamification:** 
  - Users have a "Reports" tab to track the status of their complaints (Pending -> In Progress -> Pending Verification -> Solved).
  - **Civic Points:** Users have a Profile tab displaying their "Civic Points". They earn points (e.g., +50) when their reported issues are successfully resolved.

### 3. Agent App (React Native / Expo)
- **Task Management:** Agents log in and see a dashboard of issues assigned to them by the Admin.
- **GPS Validation:** When an agent attempts to resolve a task, the app must check their live device GPS. They **cannot** capture a resolution photo unless they are physically within **50 meters** of the issue's original reported coordinates. Include a "Refresh GPS" button to handle GPS drift.
- **Solution Validation (AI Audit):** When the agent captures the "After" photo, the backend sends both the User's "Before" photo and the Agent's "After" photo to Gemini AI.
  - The AI must perform a strict environmental audit. It must verify that the surrounding landmarks, trees, roads, and walls match perfectly between the two photos. 
  - If the environment doesn't match, or the issue isn't physically repaired, the AI must reject the agent's submission.
- **Workflow:** Once the agent's photo passes AI verification, the issue moves to "Pending User Verification". The user receives a push notification to open their app, view the agent's photo, and click "Yes, it is solved" to permanently close the ticket and claim their Civic Points.

### 4. Admin Web Dashboard (React, Vite, Tailwind CSS)
- **Overview:** A web portal that requires Admin login.
- **Analytics:** A dashboard showing charts of complaints by category, complaints over time, and a map plotting all active issues using their GPS coordinates.
- **Management:** 
  - A tab to view all users, their complaint history, and their civic points.
  - A tab to view all reports, filter them, and manually assign random or specific Agents to newly reported issues.
  - Ensure the UI is responsive, fits the screen properly, and uses modern styling (e.g., Tailwind).

**Tech Stack Constraints:** Use React Native with Expo for mobile apps (so they can be built into APKs), React/Vite for the web dashboard, Node.js/Express for the API, and Supabase (PostgreSQL) for the database. Ensure all API calls handle server cold-starts gracefully (e.g., pull-to-refresh mechanisms).
