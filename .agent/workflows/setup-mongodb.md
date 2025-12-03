---
description: How to install and set up MongoDB Community Edition on Windows
---

# MongoDB Setup Guide for Windows

## 1. Download MongoDB
1. Go to the [MongoDB Community Server Download Page](https://www.mongodb.com/try/download/community).
2. Select the current version.
3. Platform: **Windows**.
4. Package: **msi**.
5. Click **Download**.

## 2. Install MongoDB
1. Run the downloaded `.msi` file.
2. Click **Next**.
3. Accept the license agreement and click **Next**.
4. Choose **Complete** setup.
5. **Important**: Ensure "Install MongoDB as a Service" is checked.
   - Service Name: `MongoDB`
   - Data Directory: `C:\Program Files\MongoDB\Server\X.X\data\`
   - Log Directory: `C:\Program Files\MongoDB\Server\X.X\log\`
6. (Optional) Check "Install MongoDB Compass" (recommended GUI).
7. Click **Next**, then **Install**.

## 3. Verify Installation
1. Open **Services** (Press `Win + R`, type `services.msc`, press Enter).
2. Look for **MongoDB Server**.
3. Ensure the Status is **Running**.

## 4. Test Connection
You can test the connection using PowerShell:

```powershell
# Check if port 27017 is listening
Test-NetConnection -ComputerName localhost -Port 27017
```

If `TcpTestSucceeded` is `True`, MongoDB is ready!
