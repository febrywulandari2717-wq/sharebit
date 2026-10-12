# ShareBite

Platform berbagi makanan berlebih yang masih layak dikonsumsi
| Bagian | Teknologi | Lokasi | Port |
|---|---|---|---|
| Website | HTML5, CSS3, JavaScript, Bootstrap 5 | `frontend/web` | 5500 |
| Android | React Native + Expo (SDK 57) | `frontend/mobile` | – |
| Food Service | Python, Flask, SQLAlchemy | `services/food-service` | 5001 |
| Request Service | Node.js, Express | `services/request-service` | 5002 |
| Donation + Identity Service | PHP, Laravel 12 | `services/donation-service` | 5003 |
| Database | MySQL XAMPP, 3 database terpisah | – | 3306 |

## Mulai cepat (Windows)
1. Start **MySQL** di XAMPP.
2. Jalankan `setup.bat` (sekali).
3. Jalankan `start-all.bat` → buka <http://localhost:5500>.

Akun: admin `admin@sharebite.local` / `Admin12345`; demo `donor@sharebite.local` & `penerima@sharebite.local` / `Rahasia123`.

Panduan lengkap: [setup-local](docs/setup-local.md) · [arsitektur](docs/architecture.md) · [kontrak API](docs/api-contracts.md) · [database](docs/database-design.md) · [pengujian](docs/testing.md) · [demo](docs/demo-guide.md) · [checklist](docs/checklist.md)

