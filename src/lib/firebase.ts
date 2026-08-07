"use client";

import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB10NK8lIz26T6NzObu421kg7wX6YQoFxg",
  authDomain: "bar-rating.firebaseapp.com",
  projectId: "bar-rating",
  storageBucket: "bar-rating.firebasestorage.app",
  messagingSenderId: "372554240407",
  appId: "1:372554240407:web:103646f876f9c8416234d2",
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

export const db = firebase.firestore();
