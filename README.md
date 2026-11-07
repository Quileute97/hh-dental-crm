# HH Dental Clinic — CRM Quản Trị Đối Tác & Chuỗi Khách Hàng (Plan V5)

Hệ thống quản lý đối tác và bệnh nhân phòng khám **HH Dental Clinic** được chuẩn hóa theo mô hình **hai hệ thống độc lập**:
1. **Hệ thống 1 — Chuỗi khách hàng:** Hoa hồng tính theo **Độ sâu của khách trong chuỗi giới thiệu**, **Sàn không thu (0%)**, toàn bộ hoa hồng được **hoàn về Cộng tác viên (CTV) giới thiệu ban đầu**.
2. **Hệ thống 2 — Cây đối tác:** Phí nhánh **1% trên toàn bộ doanh thu cây con trực tiếp**, không giới hạn số tầng.

---

## 1. Công Thức & Chính Sách Hoa Hồng Chuẩn

### Hệ Thống 1: Chuỗi Khách Hàng (Sàn 0% — Toàn Bộ Hoàn Về CTV Ban Đầu)
* **Tầng 1 (Khách trực tiếp):** CTV hưởng **20%**, Sàn **0%**.
* **Tầng 2+ (Khách từ F1 trở đi - Hạ tầng giới thiệu):** CTV hưởng **2%**, Sàn **0%**.
* *Chủ sở hữu khách (CTV ban đầu):* `customer.ownerPartnerId` kế thừa tự động từ khách giới thiệu ban đầu.
* *Doanh thu trọn đời:* Bảng `visits` lưu từng lần khám (gói đầu tiên, tái điều trị...).
* *Credit dịch vụ cho khách:* Khách được giới thiệu đến khám (+200.000 ₫), hoàn tất (+500.000 ₫). Không trừ vào hoa hồng đối tác.

### Hệ Thống 2: Cây Phả Hệ Đối Tác
* **Độ sâu đối tác (Depth):** Gốc = 0, con = depth(cha) + 1. Không giới hạn số tầng.
* **Sổ khách (ownRevenue):** Tổng doanh thu visit của khách do đối tác sở hữu trong kỳ.
* **Doanh thu nhánh (branchRevenue):** `ownRevenue` + tổng `branchRevenue` của toàn bộ cây con trực tiếp (đệ quy).
* **Phí nhánh 1% (branchFee):** $1\% \times \sum \text{branchRevenue}[\text{con trực tiếp}]$.
* **Tổng phải trả cho đối tác trong kỳ:** $\text{total} = \text{commission (CTV)} + \text{branchFee (1% nhánh)}$.

---

## 2. Kết Quả Kiểm Thử Tiêu Chuẩn (172.000.000 VNĐ)

Kịch bản chuẩn kỳ tháng 2026-11 (đối chiếu 3 nguồn: engine client, Postgres RPC `compute_month`, `scripts/golden.json`):
* **Doanh thu kỳ:** 172.000.000 ₫
* **Sổ khách P1:** 86.000.000 ₫ | **Doanh thu nhánh P1:** 172.000.000 ₫ | **Hoa hồng P1:** 8.380.000 ₫ (20%×37tr + 2%×49tr) | **Phí nhánh P1:** 860.000 ₫ | **Tổng nhận:** 9.240.000 ₫
* **Sổ khách P2:** 66.000.000 ₫ | **Doanh thu nhánh P2:** 86.000.000 ₫ | **Hoa hồng P2:** 8.160.000 ₫ (20%×38tr + 2%×28tr) | **Phí nhánh P2:** 200.000 ₫ | **Tổng nhận:** 8.360.000 ₫
* **Sổ khách P3:** 20.000.000 ₫ | **Doanh thu nhánh P3:** 20.000.000 ₫ | **Hoa hồng P3:** 4.000.000 ₫ (20%×20tr) | **Phí nhánh P3:** 0 ₫ | **Tổng nhận:** 4.000.000 ₫
* **Tổng hoa hồng CTV:** 20.540.000 ₫
* **Phần nền tảng (Sàn):** 0 ₫ *(Sàn không thu)*
* **Phí nhánh 1%:** 1.060.000 ₫
* **Tổng chi phí hệ thống:** 21.600.000 ₫ (**12,6%** doanh thu)

---

## 3. Cấu Hình Biến Môi Trường (Cloudflare Deployment)

Trên Cloudflare Dashboard (**Workers & Pages > Settings > Variables and Secrets**), bắt buộc phải thiết lập 2 biến môi trường tại thời điểm build:
- `VITE_SUPABASE_URL`: `https://your-project-ref.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOi...`

> ⚠️ **CẢNH BÁO QUAN TRỌNG**: Nếu thiếu 2 biến môi trường này, ứng dụng sẽ hiển thị màn hình thông báo *"Thiếu cấu hình Supabase — liên hệ quản trị"* và từ chối tải giao diện nhằm đảm bảo an toàn, không bao giờ để xảy ra lỗi sập trắng trang.

---

## 4. Lệnh Khởi Chạy & Kiểm Thử

```bash
# 1. Chạy bộ kiểm thử tự động (5 bộ test PASS 100%)
npm test

# 2. Chạy đối soát golden benchmark
npm run golden

# 3. Khởi động môi trường phát triển (cổng 3000)
npm run dev

# 4. Build sản phẩm (dist/)
npm run build
```
