# English Battle (Bufobia) — Multiplayer English Word Guessing Game

Web game realtime nhiều người chơi đoán từ tiếng Anh qua gợi ý nghĩa tiếng Việt với cơ chế lật mở ký tự ngẫu nhiên độc đáo.

## 🚀 Tính năng nổi bật

- **Realtime Multiplayer**: Tạo phòng, chia sẻ mã phòng 5 ký tự (VD: `A7K9P`), hỗ trợ nhiều người chơi cùng lúc.
- **Server-Authoritative Gameplay**:
  - Gợi ý nghĩa tiếng Việt và số lượng ký tự.
  - Các chữ cái được mở ngẫu nhiên theo vị trí (không theo thứ tự từ trái qua phải).
  - Tự động mở khoảng trắng và dấu gạch nối (`-`).
  - Giới hạn mở tối đa 80% từ để người chơi luôn phải tự suy nghĩ đoán các chữ cái còn lại.
  - Đáp án tiếng Anh tuyệt đối được bảo mật trên server cho tới khi kết thúc vòng đấu (chống soi network/inspect).
- **Hệ thống tính điểm thông minh**:
  - Tính điểm kết hợp cả thời gian trả lời (`timeFactor`) và số lượng ký tự còn ẩn (`hintFactor`).
  - Chống spam / rate-limiting (300ms cooldown) và chống nộp điểm 2 lần.
- **Trải nghiệm UX/UI hiện đại**:
  - Hiệu ứng âm thanh tổng hợp siêu nhẹ (Web Audio API synthesizer, không phụ thuộc file ngoài).
  - Rung lắc khi trả lời sai, hiệu ứng pop-in khi ký tự mở, pháo hoa ăn mừng (Confetti) khi chiến thắng.
  - Bục vinh quang 3 vị trí (Podium) và thống kê: Trả lời nhanh nhất, đúng nhiều nhất, chuỗi đúng dài nhất (Streak).

---

## 🛠️ Cấu trúc Monorepo

```text
bufobiaaa/
├── packages/
│   └── shared/          # Types, Constants, DTOs & Socket Events dùng chung
├── apps/
│   ├── server/          # Backend Express + Socket.IO Game Engine
│   └── web/             # Frontend Next.js 15 + React + Tailwind CSS
```

---

## 💻 Hướng dẫn chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Chạy Backend Game Server (Port 3001)

```bash
npm run dev:server
```

Server sẽ chạy tại `http://localhost:3001` với các endpoint:
- `http://localhost:3001/health`: Kiểm tra trạng thái server
- `http://localhost:3001/api/meta`: Danh mục và số lượng từ vựng hiện có

### 3. Chạy Frontend Web App (Port 3000)

```bash
npm run dev:web
```

Mở trình duyệt tại `http://localhost:3000`.

### 4. Cấu hình tài khoản và test local

Tạo `.env.local` ở thư mục gốc (server đã tự nạp file này). Dùng database test riêng, không dùng production:

```text
DATABASE_URL=...
BETTER_AUTH_SECRET=chuoi-ngau-nhien-dai
BETTER_AUTH_URL=http://localhost:3001
AUTH_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Khi deploy, đổi bốn URL ở trên thành domain thật và giữ `BETTER_AUTH_SECRET` cố định.

Chạy migration một lần trên database hiện tại trước khi bật server mới:

```bash
psql "$DATABASE_URL" -f apps/server/src/auth/migration.sql
```

---

## 🧪 Kiểm thử tự động (Unit Test & Simulation)

Chạy bộ 15 Unit Test tự động với Vitest:
```bash
npm test
```

Chạy kịch bản mô phỏng 3 Socket Client cùng tham gia trận đấu:
```bash
npx tsx apps/server/tests/multiplayer-simulation.ts
```
