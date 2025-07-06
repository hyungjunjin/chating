// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// ✅ 정확한 Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyB06agZYyGpLv-rPhcGtVp23ns1f20WJcQ",
  authDomain: "chatings8607.firebaseapp.com",
  projectId: "chatings8607",
  storageBucket: "chatings8607.firebasestorage.app",  // ✅ 수정됨
  messagingSenderId: "1066080732442",
  appId: "1:1066080732442:web:30a258e934608d8791c2a3",
  measurementId: "G-31CHWVSSH"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Storage 인스턴스 export
export const storage = getStorage(app);
