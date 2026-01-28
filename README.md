# DagmarCom Frontend

Staticka administrace pro nastaveni WhatsApp bota (api.hcasc.cz/settings) a staticke pravni dokumenty.

## Obsah
- `settings.html` + `settings.js` + `style.css` – jednoduche UI volajici backend API (`/api/settings`, `/api/logs`).
- `GDPR.cz.txt`, `GDPR.en.txt` – informace o zpracovani osobnich udaju.
- `TermsOfService.cz.txt`, `TermsOfService.en.txt` – obchodni podminky.
- `PrivacyPolicy.cz.txt`, `PrivacyPolicy.en.txt` – zasady ochrany soukromi.
- `ReadMe.me` – popis procesu v CS/EN pro Meta developer portal.

## Nasazeni
- Vystavte staticke soubory pod `https://api.hcasc.cz/` (napr. Nginx root nebo S3+CloudFront).
- Stranku nastaveni umistete na `/settings` (vyzaduje Basic Auth admin/+Sin8glov8, zprostredkuje backend).
- Pro lokalni test staci `python3 -m http.server 4173` a otevrit `http://localhost:4173/settings.html`.

## Backend napojeni
Frontend predpoklada, ze backend bezi na stejne domene (same-origin). Pro jine domény upravte `apiBase` v `settings.js` a povolte CORS v backendu.
