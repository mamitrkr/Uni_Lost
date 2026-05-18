# Uni_Lost — Lost & Found Platform

A web-based platform for tracking lost and found items on a university campus. Developed as the 2026 Spring semester project for the Web Programming course at Atatürk University.

## Development Team

3-person project. For individual contributions, see: `docs/CONTRIBUTION_STATEMENT.md`.

## Technology Stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Firebase Authentication (email/password)
- Cloud Firestore (NoSQL database)
- Firebase Storage (file uploads)

## File Structure

```
Uni_Lost/
├── index.html              Homepage, login/register modal
├── pages/
│   ├── add.html            Add listing form
│   ├── list.html           Listing page with search, filter, and sort
│   ├── detail.html         Listing detail, claim management
│   └── admin.html          Admin panel
├── css/
│   └── style.css           Shared styles for all pages
├── js/
│   ├── firebase-config.js  Firebase initialization and error messages
│   ├── auth.js             Authentication
│   ├── items.js            Listing and claim CRUD operations
│   ├── search.js           Search and filtering logic
│   └── admin.js            Admin panel operations
├── docs/
│   ├── REPORT.md           Project report
│   └── CONTRIBUTION_STATEMENT.md  Individual contribution declaration
├── cors.json               Firebase Storage CORS configuration
├── .gitignore
└── README.md
```

## Project Architecture

- Page-based structure: login/homepage, listing page, add listing, listing detail, and admin panel are separate HTML pages.
- Business logic is split into JavaScript modules: authentication, listing/claim CRUD, search/filtering, and admin operations each have their own file.
- Shared styles are managed in a single CSS file, ensuring consistency across pages.
- Data flow on the client side follows the pattern: UI → relevant JS module → data layer.

## Setup

### 1. Firebase Project

1. Go to https://console.firebase.google.com and create a new project.
2. Add a web app and copy the `firebaseConfig` values.
3. Replace the configuration in `js/firebase-config.js` with your own values.

### 2. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

### 3. Firestore

Firebase Console → Firestore Database → Create database → Test mode → Select region.

Security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    match /claims/{claimId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Storage

Firebase Console → Storage → Get started → Test mode.

Security rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /items/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### 5. First Admin User

1. Register in the app.
2. Firebase Console → Firestore → `users` collection → open your document.
3. Set the `role` field to `"admin"`.

## Running the App

**VS Code Live Server:** Right-click `index.html` → Open with Live Server.

## Tech Stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Firebase Authentication (email/password)
- Cloud Firestore (NoSQL database)
- Firebase Storage (file uploads)

## Project Structure

```
Uni_Lost/
├── index.html              Home, login/register modal
├── pages/
│   ├── add.html            Add listing form
│   ├── list.html           Listing page, search, filter, sort
│   ├── detail.html         Listing details, claim flow
│   └── admin.html          Admin panel
├── css/
│   └── style.css           Shared styles
├── js/
│   ├── firebase-config.js  Firebase init and error messages
│   ├── auth.js             Auth flow
│   ├── items.js            Listing and claim CRUD
│   ├── search.js           Search and filter logic
│   └── admin.js            Admin panel logic
├── docs/
│   ├── project_report.txt  Project report
│   └── KATKI_BEYANI.md     Individual contribution statement
├── cors.json               Firebase Storage CORS config
├── .gitignore
└── README.md
```

## Architecture

- Page-based flow: home, list, add, detail, and admin are separate HTML pages.
- Business logic is split into JS modules: auth, listing/claim CRUD, search/filter, and admin.
- Shared styling lives in a single CSS file for consistent UI.
- Client-side data flow: UI action -> JS module -> data layer.

## Run Locally

Python:

```bash
cd Uni_Lost
python -m http.server 8000
```

Then open http://localhost:8000.

Node.js:

```bash
npx serve .
```
## Features

- Email/password sign up and sign in
- Add listings with photo upload
- Search by title, description, and location
- Category and status filters
- Date-based sorting
- Claim flow ("This is mine")
- Listing owner can approve/reject claims
- Admin panel (listings, claims, users)
- Two roles: `user` and `admin`
- Responsive UI

## Roles

| Role | Permissions |
|-----|----------|
| `user` | Create listings, delete own listings, create claims, manage claims on own listings |
| `admin` | View all listings/claims/users, delete any listing, change user roles |
