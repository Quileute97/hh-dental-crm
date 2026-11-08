# Chính Sách Bảo Mật (Security Policy) — HH Dental CRM

## 1. Kiến Trúc Bảo Mật & Ranh Giới RLS (Security Boundary)

Dự án HH Dental CRM là ứng dụng Single Page Application (SPA) chạy trên Cloudflare Pages/Workers Static Assets, kết nối trực tiếp với backend Supabase (PostgreSQL + PostgREST + GoTrue Auth).

### Cơ chế hoạt động của Supabase Keys:
- **`VITE_SUPABASE_ANON_KEY` (hoặc `sb_publishable_...`)**:
  - Được thiết kế để nằm công khai trong client bundle.
  - Khách truy cập web hay bất kỳ ai dịch ngược mã nguồn frontend đều có thể nhìn thấy khóa này.
  - **Khóa này KHÔNG PHẢI là ranh giới bảo mật.**
- **Hàng rào bảo vệ cốt lõi: PostgreSQL Row Level Security (RLS)**:
  - Mọi bảng trong database (`partners`, `customers`, `visits`, `settlements`, `profiles`, `audit_logs`) bắt buộc phải bật RLS (`ENABLE ROW LEVEL SECURITY`).
  - Hàm `my_role()` và `auth.uid()` xác định danh tính và vai trò thật của phiên người dùng.
  - Khi chưa đăng nhập (`auth.uid() is null`), vai trò trả về là `'anon'`. Quyền đọc và ghi các bảng nhạy cảm đối với `'anon'` bị chặn hoàn toàn.
  - Các hàm RPC quan trọng (`compute_month`, `settle_month`) bắt buộc phải thu hồi quyền `EXECUTE` từ `public` và `anon` (`REVOKE EXECUTE ... FROM PUBLIC, ANON`), chỉ cấp cho `authenticated` và `service_role`.

---

## 2. Quy Tắc Bất Di Bất Dịch Về Khóa Bí Mật (`service_role`)

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG BAO GIỜ COMMIT `SUPABASE_SERVICE_ROLE_KEY` HOẶC CÁC KHÓA BÍ MẬT (`sb_secret_...`) VÀO MÃ NGUỒN FRONTEND (`src/`) HOẶC REPO GIT.**

- Khóa `service_role` có quyền vượt qua toàn bộ cơ chế RLS (Bypass RLS) và sở hữu toàn quyền quản trị cao nhất trên database.
- Bất kỳ vị trí nào trong thư mục `src/` chứa `service_role` đều bị bộ kiểm tra bảo mật `npm run scan:secrets` chặn và báo lỗi ngay lập tức.
- Khóa `service_role` chỉ được phép lưu trong biến môi trường máy chủ độc lập hoặc tệp `.env` cục bộ (đã đưa vào `.gitignore`).

---

## 3. Quy Trình Thu Hồi & Đổi Khóa (Key Rotation)

Nếu nghi ngờ bất kỳ khóa bí mật nào bị lộ:
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án **HH Dental CRM** -> **Project Settings** -> **API**.
3. Tại phần **Project API Keys**:
   - Nhấn **Roll keys** / **Generate new JWT secret**.
   - Cập nhật lại các biến môi trường tại Cloudflare Workers:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
4. Deploy lại ứng dụng frontend:
   ```bash
   npm run build
   npx wrangler deploy --assets dist
   ```
5. Chạy kiểm chứng an toàn:
   ```bash
   npm run verify:rls
   ```

---

## 4. Kiểm Thử & Kiểm Vết Thường Xuyên

- **Kiểm tra rò rỉ khóa**: `npm run scan:secrets`
- **Kiểm tra lỗ hổng RLS**: `npm run verify:rls`
- **Kiểm tra toàn diện**: `npm run verify:all`

