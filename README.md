# NearTalk – Location-Based Anonymous Group Chat

A production-ready React + Firebase web application for location-based anonymous group chats.

---

## 🚀 Features

- **Google Authentication** – Sign in with Google, stay anonymous in chats
- **Location-Based Groups** – Discover groups within 5km using GPS (+ IP fallback)
- **Real-Time Messaging** – Firestore `onSnapshot` for live updates
- **Anonymous Nicknames** – Choose a new nickname per group
- **Dicebear Avatars** – Pick from 8 avatar styles for your group
- **Mobile-First UI** – Fully responsive layout with Tailwind CSS

---

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── Login.jsx          – Google sign-in screen
│   ├── group/
│   │   ├── CreateGroup.jsx    – Create a new group
│   │   ├── DiscoverGroups.jsx – Browse nearby groups
│   │   ├── JoinedGroups.jsx   – Your joined groups list
│   │   └── JoinGroupModal.jsx – Nickname entry + join flow
│   └── chat/
│       └── ChatWindow.jsx     – Real-time chat interface
├── contexts/
│   └── AuthContext.jsx        – Firebase auth state
├── utils/
│   ├── geolocation.js         – GPS + IP fallback + Haversine
│   └── avatar.js              – Dicebear avatar helpers
├── firebase.js                – Firebase initialization
├── App.jsx                    – Main layout + routing
└── main.jsx                   – Entry point
```

---

## ⚙️ Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it (e.g. `neartalk`)
3. Enable **Google Analytics** (optional)

### 2. Enable Firebase Services

- **Authentication**: Console → Authentication → Sign-in method → Enable **Google**
- **Firestore**: Console → Firestore Database → Create database → Start in **test mode** (then apply rules below)
- **Hosting**: Console → Hosting → Get started

### 3. Register Web App & Get Config

1. Console → Project Settings → Your apps → Click `</>` (Web)
2. Register app name, enable **Firebase Hosting**
3. Copy the `firebaseConfig` values

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...
```

### 5. Apply Firestore Security Rules

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.

Or deploy via CLI:
```bash
firebase deploy --only firestore:rules
```

### 6. Install Dependencies

```bash
npm install
```

### 7. Run Locally

```bash
npm run dev
```

Open `http://localhost:5173`

---

## 🚀 Deploy to Firebase Hosting

```bash
npm run build
firebase login
firebase init hosting  # select existing project, set public to "dist", SPA: yes
firebase deploy
```

Or deploy everything at once:
```bash
firebase deploy --only hosting,firestore:rules
```

---

## 🗄️ Firestore Data Structure

```
groups/
  {groupId}/
    name: string
    avatar: string (DiceBear URL)
    latitude: number
    longitude: number
    createdBy: string (userId)
    memberCount: number
    lastMessage: string
    createdAt: timestamp
    updatedAt: timestamp
    members/ (subcollection)
      {userId}/
        nickname: string
        joinedAt: timestamp
    messages/ (subcollection)
      {messageId}/
        text: string
        senderId: string
        senderName: string
        createdAt: timestamp

users/
  {userId}/
    joinedGroups/ (subcollection)
      {groupId}/
        groupId: string
        name: string
        avatar: string
        joinedAt: timestamp
```

---

## 🔒 Key Design Decisions

- **No undefined Firestore values** – All writes validated before `addDoc`/`setDoc`
- **No senderAvatar in messages** – Only `senderId`, `senderName`, `text`, `createdAt`
- **No null latitude/longitude** – GPS → IP fallback → error message (never null stored)
- **Atomic memberCount** – Uses `increment()` for safe concurrent joins
- **Haversine distance** – Accurate great-circle distance for group filtering
- **IP-based fallback** – Uses `ipapi.co` when GPS permission is denied

---

## 📱 Mobile Support

- Touch-friendly layout with proper tap targets
- Bottom nav for mobile, sidebar for desktop
- Back button in chat for mobile navigation
- Responsive breakpoints at `md` (768px)

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 + Vite | UI Framework |
| Firebase Auth | Google Sign-In |
| Firestore | Real-time database |
| Firebase Hosting | Deployment |
| Tailwind CSS | Styling |
| Dicebear | Avatar generation |
| ipapi.co | IP geolocation fallback |
