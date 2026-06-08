/* VIZION Portal — Firebase init. Must load AFTER firebase CDN scripts, BEFORE store.js */
const firebaseConfig = {
  apiKey: "AIzaSyDLv7pIFUYUgBzXdVnCTM4-Enx_NkKQi14",
  authDomain: "vizion-portal.firebaseapp.com",
  projectId: "vizion-portal",
  storageBucket: "vizion-portal.firebasestorage.app",
  messagingSenderId: "405076834160",
  appId: "1:405076834160:web:90d1db22292cbc44be81b5"
};

firebase.initializeApp(firebaseConfig);
window.db      = firebase.firestore();
window.auth    = firebase.auth();
window.storage = firebase.storage();
