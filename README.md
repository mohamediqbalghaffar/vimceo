# VIM CEO - راهنمای دامەزراندن

## پێداویستییەکان
1. هەژماری Firebase
2. `http-server` یان هەر سێرڤەری تر

## گامەکانی دامەزراندن

### ١. دروستکردنی پرۆژەی Firebase
1. بڕۆ بۆ https://console.firebase.google.com
2. "Add project" کلیک بکە
3. ناوی پرۆژە: `vim-ceo-hts`
4. پاش دروستکردن: **Firestore Database** → Create database → **Test mode**
5. **Authentication** → Sign-in method → **Anonymous** → Enable

### ٢. وەرگرتنی Config
1. Project Settings (⚙️) → Your apps → Add app (`</>`)
2. ناوی app: `vim-ceo-web`
3. Copy the `firebaseConfig` object

### ٣. چڕکردنی Config
فایلی `firebase-config.js` بکەرەوە و قیمەتەکانت جێگا بکە:
```js
const firebaseConfig = {
    apiKey: "...",         // ← ئەمانە
    authDomain: "...",     // ← دابنێ
    projectId: "...",      // ← لەسەر
    ...
};
```

### ٤. ئامادەکردنی Firestore Index
تاسکەکان پێویستیان بە Index هەیە. کاتێک یەکەم جار بەکاری دەهێنیت،
لە Console بینی هەڵەی Firebase → کلیک لەسەر لینکەکە → Index دروست دەکات.

### ٥. کارپێکردنی ئەپ
```bash
cd D:\VIMCEO
npx http-server -p 8080
```
بڕۆ بۆ: http://127.0.0.1:8080

## ئەژمارەکان
- **ئادمین**: تێپەڕەوشە `Admin1234`
- **بەکارهێنەران**: ئادمین دروستیان دەکات

## پاراستن (Security Rules)
لە Firestore Rules، ئەمەی خوارەوە بنێ:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Development only!
    }
  }
}
```
