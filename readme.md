# Chef IQ App — README

Chef IQ is a mobile-first social media recipe application with an AI-powered recipe generator. Users can create recipes, browse feeds, follow other cooks, and generate dishes using AI based on their available ingredients.

This README covers installation instructions for both **frontend (Ionic)** and **backend (Express + MongoDB)**.

---

# 🚀 Tech Stack
- **Frontend:** Ionic + Capacitor
- **Backend:** Express.js
- **Database:** MongoDB
- **AI:** Google Gemini API
- **Storage:** Cloudinary
- **Mobile Build Tools:** Android Studio & Xcode (for iOS)

---

# 📱 Frontend Setup (Ionic)

### **1. Install Node.js**
Download from: https://nodejs.org

### **2. Install Ionic CLI**
```
npm install -g @ionic/cli
```

### **3. Install dependencies**
```
npm install
```

### **4. Update the environment URL**
Change the API base URL in your environment file to point to the backend server.
```
export const environment = {
  apiUrl: "https://your-server-url.com"
};
```

### **5. Build and Sync Capacitor**
```
npx ionic build
npx cap sync
```

### **6. Open Android Studio / Xcode**
To open the Android version:
```
npx cap open android
```

To open the iOS version:
```
npx cap open ios
```
(Note: macOS is required for iOS build + Xcode must be installed.)

---

# 🖥 Backend Setup (Express)

### **1. Install dependencies**
```
npm install
```

### **2. Add your `.env` file**
Create a file named **.env** in the backend root folder and paste:
```
# .env
MONGO_URI=
JWT_SECRET=
PORT=5000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
```
Fill in the required values.

### **3. Run the server**
```
npm run dev
```

Backend should now be running on:  
`http://localhost:5000`

---

# 📦 Build Notes
- Make sure MongoDB is accessible (local or Atlas).
- Ensure your Cloudinary credentials are correct for media uploads.
- Gemini API key is required for AI recipe generation.
- Use Android Studio’s emulator or a real device for testing.
- For iOS, Xcode + a physical iPhone or simulator is required.

---

# 🎯 Summary
You now have the full setup for both frontend and backend:
- **Frontend:** Install → Configure env → Build → Sync → Run on device/emulator
- **Backend:** Install → Add env → Start server


