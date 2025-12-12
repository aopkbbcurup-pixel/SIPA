# Environment Setup Guide

## Overview
This guide explains how to configure environment variables for both frontend and backend.

---

## Backend Setup

### 1. Create `.env` file
```bash
cd backend
cp .env.example .env
```

### 2. Configure Variables

**Required:**
```env
PORT=5000
JWT_SECRET=your-secure-secret-key-min-32-chars
DATABASE_TYPE=firestore
```

**Firebase (Required if using Firestore):**
- Download `serviceAccountKey.json` from Firebase Console
- Place in `backend/` directory
- Or set `FIREBASE_SERVICE_ACCOUNT` env variable

**Optional:**
```env
GOOGLE_MAPS_API_KEY=your-api-key
MONGODB_URI=mongodb://localhost:27017/sipa
```

---

## Frontend Setup

### 1. Create `.env` file
```bash
cd frontend
cp .env.example .env
```

### 2. Configure Variables

**Development:**
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

**Production:**
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_GOOGLE_MAPS_API_KEY=your-api-key
```

---

## Security Notes

⚠️ **NEVER commit `.env` files to Git**
- `.env` is already in `.gitignore`
- Only commit `.env.example`

✅ **Use strong JWT secrets**
- Minimum 32 characters
- Random alphanumeric + symbols

✅ **Rotate secrets regularly**
- Change JWT_SECRET periodically
- Update API keys when needed

---

## Deployment

### Backend (Render)
1. Add environment variables in Render dashboard
2. Upload `serviceAccountKey.json` as secret file
3. Deploy from main branch

### Frontend (Firebase)
1. Build: `npm run build`
2. Deploy: `firebase deploy --only hosting`

---

**Environment config already exists!** ✅
