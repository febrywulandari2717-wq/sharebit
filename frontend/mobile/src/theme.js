export const C = {
  cream: '#fbf6ec', paper: '#fffdf8', ink: '#2a2118', muted: '#7a6c5d', line: '#e8dcc8',
  terra: '#c8502d', terraDark: '#a63f20', green: '#24503a', greenSoft: '#e3eee6', sun: '#f2b94b', danger: '#b3261e',
};
export const STATUS = {
  pending: ['Menunggu', '#fff1cf', '#8a5a00'], approved: ['Disetujui', '#dcefe3', '#1f5a38'], scheduled: ['Dijadwalkan', '#dbe8f7', '#1e4a80'],
  completed: ['Selesai', '#cfe9d8', '#14502c'], rejected: ['Ditolak', '#f6dcd6', '#8f2c18'], cancelled: ['Dibatalkan', '#f6dcd6', '#8f2c18'],
  expired: ['Kedaluwarsa', '#ece6dc', '#6b5d4c'], available: ['Tersedia', '#dcefe3', '#1f5a38'], out_of_stock: ['Habis', '#f6dcd6', '#8f2c18'],
  closed: ['Ditutup', '#ece6dc', '#6b5d4c'],
};
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
// Input tanggal manual: "2026-10-12 14:30" (waktu setempat) <-> ISO UTC
const p2 = (n) => String(n).padStart(2, '0');
export const toLocalText = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const textToIso = (t) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec((t || '').trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().replace(/\.\d+Z$/, 'Z');
};
