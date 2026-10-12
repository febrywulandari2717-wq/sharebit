# Android ShareBite (React Native + Expo SDK 57)
```bash
npm install
npx expo start      # scan QR dengan Expo Go (HP & laptop satu Wi-Fi)
```
Alamat backend otomatis mengikuti IP laptop; override di `src/config.js` (`API_HOST_OVERRIDE`). Token disimpan dengan `expo-secure-store`.
Fitur: login/registrasi; penerima (katalog, ajukan, permintaan, donasi); donor (makanan, permintaan masuk, setujui/tolak/jadwalkan, donasi); admin (ringkasan).
