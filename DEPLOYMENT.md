# SIPA Deployment Guide

## Prerequisites
- Node.js (v18+)
- MongoDB (v4.4+)
- PM2 (optional, for process management)

## 1. Environment Configuration

Create a `.env` file in the `backend` directory for production:

```env
PORT=4000
HOST=0.0.0.0
JWT_SECRET=your_super_secure_secret_key_change_this
DATABASE_TYPE=mongo
MONGO_URI=mongodb://127.0.0.1:27017/sipa
CORS_ORIGIN=http://your-domain.com
SIPA_SERVE_FRONTEND=true
SIPA_FRONTEND_DIST=../frontend/dist
UPLOAD_DIR=uploads
```

## 2. Build Frontend

Navigate to the `frontend` directory and build the application:

```bash
cd frontend
npm install
npm run build
```

This will create a `dist` folder in `frontend/dist`.

## 3. Build Backend

Navigate to the `backend` directory and build the TypeScript code:

```bash
cd backend
npm install
npm run build
```

This will create a `dist` folder in `backend/dist`.

## 4. Start Production Server

You can start the server using `node`:

```bash
cd backend
node dist/index.js
```

Or using PM2 for better process management:

```bash
cd backend
pm2 start dist/index.js --name sipa-backend
```

## 5. Verify Deployment

- Access the application at `http://your-domain.com:4000` (or configured port).
- Ensure MongoDB is running and accessible.
- Check logs for any errors: `pm2 logs sipa-backend`.

## Notes
- **Uploads**: Ensure the `uploads` directory is writable and persistent.
- **Security**: Use a reverse proxy like Nginx to handle SSL (HTTPS) and forward requests to the backend port.
