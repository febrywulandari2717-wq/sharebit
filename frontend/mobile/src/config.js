import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// ALAMAT BACKEND
// - Expo Go di HP : otomatis memakai IP laptop yang sama dengan Metro (tidak perlu diubah).
//   Syarat: HP dan laptop satu Wi-Fi, firewall mengizinkan port 5001, 5002, 8003.
// - Emulator Android: biasanya otomatis juga; jika gagal isi API_HOST_OVERRIDE = '10.0.2.2'.
// - Manual: isi API_HOST_OVERRIDE dengan IP laptop, contoh '192.168.1.10'.
// ---------------------------------------------------------------------------
const API_HOST_OVERRIDE = '';

function detectHost() {
  if (API_HOST_OVERRIDE) return API_HOST_OVERRIDE;
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  const host = hostUri.split(':')[0];
  return host || '10.0.2.2';
}

const HOST = detectHost();

export const API = {
  FOOD: `http://${HOST}:5001`,
  REQUEST: `http://${HOST}:5002`,
  DONATION: `http://${HOST}:8003`,
};
