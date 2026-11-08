# HH Dental Clinic — CRM Quản Trị Đối Tác & Chuỗi Khách Hàng (Production-Ready)

Hệ thống quản lý đối tác và bệnh nhân phòng khám **HH Dental Clinic** được chuẩn hóa theo mô hình **hai hệ thống độc lập**:
1. **Hệ thống 1 — Chuỗi khách hàng:** Hoa hồng tính theo **Độ sâu của khách trong chuỗi giới thiệu**, **Sàn không thu (0%)**, toàn bộ hoa hồng được **hoàn về Cộng tác viên (CTV) giới thiệu ban đầu**.
2. **Hệ thống 2 — Cây đối tác:** Phí nhánh **1% trên toàn bộ doanh thu cây con trực tiếp**, không giới hạn số tầng.

---

## 1. Công Thức & Chính Sách Hoa Hồng Chuẩn (Plan V5)

### Hệ Thống 1: Chuỗi Khách Hàng (Sàn 0% — Toàn Bộ Hoàn Về CTV Ban Đầu)
* **Tầng 1 (Khách trực tiếp):** CTV hưởng **20%**, Sàn **0%**.
* **Tầng 2+ (Khách từ F1 trở đi - Hạ tầng giới thiệu):** CTV hưởng **2%**, Sàn **0%**.
* *Chủ sở hữu khách (CTV ban đầu):* `customer.ownerPartnerId` kế thừa tự động từ khách giới thiệu ban đầu.
* *Doanh thu trọn đời:* Bảng `visits` lưu từng lần khám lâm sàng (gói điều trị, bước điều trị, trạng thái thanh toán).
* *Credit dịch vụ cho khách:* Khách được giới thiệu đến khám (+200.000 ₫), hoàn tất (+500.000 ₫). Không trừ vào hoa hồng đối tác.

### Hệ Thống 2: Cây Phả Hệ Đối Tác
* **Độ sâu đối tác (Depth):** Gốc = 0, con = depth(cha) + 1. Không giới hạn số tầng.
* **Sổ khách (ownRevenue):** Tổng doanh thu visit của khách do đối tác sở hữu trong kỳ.
* **Doanh thu nhánh (branchRevenue):** `ownRevenue` + tổng `branchRevenue` của toàn bộ cây con trực tiếp (đệ quy).
* **Phí nhánh 1% (branchFee):** $1\% \times \sum \text{branchRevenue}[\text{con trực tiếp}]$.
* **Tổng phải trả cho đối tác trong kỳ:** $\text{total} = \text{commission (CTV)} + \text{branchFee (1% nhánh)}$.

---

## 2. Kết Quả Kiểm Thử Tiêu Chuẩn (172.000.000 VNĐ)

Kịch bản chuẩn kỳ tháng 2026-11 (đối chiếu 3 nguồn độc lập: client engine `src/services/commissionEngine.js`, Postgres RPC `compute_month`, và `scripts/golden.json`):

| Đối tác | Mã REF | Sổ khách | Doanh thu nhánh | Hoa hồng CTV | Phí nhánh 1% | Tổng nhận |
|---|---|---:|---:|---:|---:|---:|
| **Bs. Nguyễn Văn A (P1)** | REF-A-FOUNDER | 86.000.000 ₫ | 172.000.000 ₫ | 8.380.000 ₫ | 860.000 ₫ | **9.240.000 ₫** |
| **Trần Thị B (P2)** | REF-B-LEVEL4 | 66.000.000 ₫ | 86.000.000 ₫ | 8.160.000 ₫ | 200.000 ₫ | **8.360.000 ₫** |
| **Lê Hoàng C (P3)** | REF-C-LEVEL3 | 20.000.000 ₫ | 20.000.000 ₫ | 4.000.000 ₫ | 0 ₫ | **4.000.000 ₫** |
| **Phạm Minh D (P4)** | REF-D-LEVEL2 | 0 ₫ | 0 ₫ | 0 ₫ | 0 ₫ | **0 ₫** |
| **Vũ Thảo D2 (P5)** | REF-D2-LEVEL2 | 0 ₫ | 0 ₫ | 0 ₫ | 0 ₫ | **0 ₫** |
| **Đặng Quốc E (P6)** | REF-E-LEVEL1 | 0 ₫ | 0 ₫ | 0 ₫ | 0 ₫ | **0 ₫** |

* **Tổng doanh thu toàn hệ thống:** 172.000.000 ₫
* **Tổng hoa hồng CTV:** 20.540.000 ₫
* **Phần nền tảng (Sàn):** 0 ₫ *(Sàn không thu)*
* **Tổng phí nhánh 1%:** 1.060.000 ₫
* **Tổng chi phí hệ thống:** 21.600.000 ₫ (**12,6%** doanh thu)
* **Lợi nhuận giữ lại Nha khoa:** 150.400.000 ₫ (**87,4%** doanh thu)

---

## 3. Triển Khai (Deployment) — Cloudflare Workers Static Assets

Frontend chạy dưới dạng Static Assets trên Cloudflare Workers (`https://hh-dental-crm.drminhdat-work.workers.dev/`).

### Cấu hình biến môi trường tại thời điểm Build (Build-Time):
Tại Cloudflare Dashboard (**Workers & Pages > hh-dental-crm > Settings > Variables and Secrets**):
- `VITE_SUPABASE_URL`: `https://cbumyrnukqqznfizcgwi.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `sb_publishable_...`

> ⚠️ **CẢNH BÁO BẢO MẬT**: Khóa `VITE_SUPABASE_ANON_KEY` là public key theo thiết kế. Toàn bộ cơ chế an toàn phụ thuộc vào PostgreSQL Row Level Security (RLS). Tuyệt đối **KHÔNG** đưa `SUPABASE_SERVICE_ROLE_KEY` vào frontend bundle.

### Lệnh Deploy:
```bash
# 1. Build tối ưu hóa bundle (< 350 kB per chunk)
npm run build

# 2. Deploy lên Cloudflare Workers Static Assets
npx wrangler deploy --assets dist
```

---

## 4. Kiểm Chứng Hệ Thống (Verification Commands)

Bộ kiểm chứng tự động toàn diện:
```bash
# Chạy toàn bộ chu trình kiểm tra: Tests + Golden + Quét Secret + Build + Kiểm tra RLS
npm run verify:all

# Kiểm tra đơn lẻ:
npm test                  # 3 bộ test: settlement, api-contract, permissions (100% PASS)
npm run golden            # Đối soát số liệu chuẩn kỳ 2026-11
npm run scan:secrets      # Quét mã nguồn src/ chặn lộ service_role hoặc JWT
npm run verify:rls        # Kiểm tra 4 probe bảo mật RLS bằng anon key
node scripts/apply-sql.mjs --dry-run  # Kiểm tra các tệp SQL migration
```

---

## 5. Quy Trình Cập Nhật Cơ Sở Dữ Liệu (Migrations)

Khi có thay đổi schema hoặc vá lỗi bảo mật, thực hiện theo thứ tự:
1. `supabase/security_fix.sql` — Bật RLS, sửa hàm `my_role()`, bảo vệ RPC `compute_month` và `settle_month`.
2. `supabase/migrations/005_audit_triggers.sql` — Kích hoạt trigger tự động ghi vết thay đổi vào `audit_logs`.
3. `supabase/migrations/006_visit_clinical_fields.sql` — Bổ sung cột lâm sàng & trạng thái thanh toán cho bảng `visits`.

Chạy tự động (nếu có `DATABASE_URL` hoặc `SUPABASE_ACCESS_TOKEN`):
```bash
node scripts/apply-sql.mjs
```
Hoặc dán thủ công vào **Supabase Dashboard > SQL Editor**, sau đó kiểm chứng bằng `npm run verify:rls`.
