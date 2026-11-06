# HH Dental Clinic — CRM Quản Trị Đối Tác & Chuỗi Khách Hàng (Plan V5)

Hệ thống quản lý đối tác và bệnh nhân phòng khám **HH Dental Clinic** được chuẩn hóa theo mô hình **hai hệ thống độc lập**:
1. **Hệ thống 1 — Chuỗi khách hàng:** Hoa hồng tính theo **Độ sâu của khách trong chuỗi giới thiệu**, **Sàn không thu (0%)**, toàn bộ hoa hồng được **hoàn về Cộng tác viên (CTV) giới thiệu ban đầu**.
2. **Hệ thống 2 — Cây đối tác:** Phí nhánh **1% trên toàn bộ doanh thu cây con trực tiếp**, không giới hạn số tầng.

---

## 1. Công Thức & Chính Sách Hoa Hồng

### Hệ Thống 1: Chuỗi Khách Hàng (Sàn 0% — Toàn Bộ Hoàn Về CTV Ban Đầu)
* **Tầng 1 (Khách trực tiếp):** CTV hưởng **20%**, Sàn **0%**.
* **Tầng 2 (Khách F1 giới thiệu):** CTV hưởng **10%**, Sàn **0%** *(toàn bộ 10% hoàn về CTV giới thiệu ban đầu)*.
* **Tầng 3+ (Khách từ F2 trở đi):** CTV hưởng **5%**, Sàn **0%** *(toàn bộ 5% hoàn về CTV giới thiệu ban đầu)*.
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

Kịch bản 3 đối tác P1 $\to$ P2 $\to$ P3 và 6 khách hàng trong kỳ tháng 2026-11:
* **Doanh thu kỳ:** 172.000.000 ₫
* **Sổ khách P1:** 86.000.000 ₫ | **Doanh thu nhánh P1:** 172.000.000 ₫ | **Hoa hồng P1:** 12.300.000 ₫ (20%×37tr + 10%×49tr) | **Phí nhánh P1:** 860.000 ₫ | **Tổng nhận:** 13.160.000 ₫
* **Sổ khách P2:** 66.000.000 ₫ | **Doanh thu nhánh P2:** 86.000.000 ₫ | **Hoa hồng P2:** 10.400.000 ₫ (20%×38tr + 10%×28tr) | **Phí nhánh P2:** 200.000 ₫ | **Tổng nhận:** 10.600.000 ₫
* **Sổ khách P3:** 20.000.000 ₫ | **Doanh thu nhánh P3:** 20.000.000 ₫ | **Hoa hồng P3:** 4.000.000 ₫ (20%×20tr) | **Phí nhánh P3:** 0 ₫ | **Tổng nhận:** 4.000.000 ₫
* **Tổng hoa hồng CTV:** 26.700.000 ₫
* **Phần nền tảng (Sàn):** 0 ₫ *(Sàn không thu)*
* **Phí nhánh 1%:** 1.060.000 ₫
* **Tổng chi phí hệ thống:** 27.760.000 ₫ (**16,1%** doanh thu)

---

## 3. Khởi Chạy Ứng Dụng

```bash
# 1. Chạy bộ kiểm thử tự động
npm test

# 2. Khởi động Backend Server (Cổng 3001)
npm run server

# 3. Khởi động Frontend React + Vite (Cổng 3000)
npm run dev

# Mở trình duyệt tại: http://localhost:3000
```
