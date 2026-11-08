/**
 * DENTAL CRM - TREATMENT STEPS & CLINICAL WORKFLOW DEFINITIONS
 * Hỗ trợ tách biệt:
 * 1. Gói dịch vụ điều trị (Treatment Package)
 * 2. Nội dung điều trị lâm sàng theo bước (Treatment Step) & Trạng thái thanh toán
 */

export const PAYMENT_STATUSES = [
  { id: 'paid', label: 'Đã thanh toán', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'partial', label: 'Thanh toán một phần', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'pending', label: 'Chưa thanh toán (Ghi nợ)', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
];

/**
 * Danh mục bước điều trị mẫu (Preset Clinical Steps) phân theo nhóm dịch vụ nha khoa
 */
export const SERVICE_STEP_PRESETS = {
  // 1. Nhóm Chỉnh nha / Niềng răng
  orthodontics: {
    groupName: 'Niềng răng & Chỉnh nha',
    keywords: ['niềng', 'chỉnh nha', 'invisalign', 'mắc cài'],
    steps: [
      { name: 'Khám, chụp phim & Lấy dấu hàm', defaultShare: 0.15 },
      { name: 'Gắn mắc cài / Giao khay niềng đợt 1', defaultShare: 0.35 },
      { name: 'Tái khám & Siết răng định kỳ', defaultShare: 0.15 },
      { name: 'Thay dây cung & Tinh chỉnh khớp cắn', defaultShare: 0.15 },
      { name: 'Tháo mắc cài, đánh bóng & Gắn hàm duy trì', defaultShare: 0.20 },
    ]
  },

  // 2. Nhóm Cấy ghép Implant
  implant: {
    groupName: 'Cấy ghép Implant',
    keywords: ['implant', 'straumann', 'cấy ghép'],
    steps: [
      { name: 'Khám, chụp CT ConeBeam & Lên phác đồ', defaultShare: 0.10 },
      { name: 'Phẫu thuật cấy ghép trụ Implant', defaultShare: 0.50 },
      { name: 'Tái khám, cắt chỉ & Kiểm tra tích hợp xương', defaultShare: 0.10 },
      { name: 'Lấy dấu làm răng sứ trên trụ Implant', defaultShare: 0.10 },
      { name: 'Gắn mão sứ hoàn tất & Bàn giao bảo hành', defaultShare: 0.20 },
    ]
  },

  // 3. Nhóm Răng sứ thẩm mỹ
  veneers: {
    groupName: 'Bọc răng sứ thẩm mỹ',
    keywords: ['răng sứ', 'cercon', 'veneer', 'bọc răng'],
    steps: [
      { name: 'Khám, Smile Design & Mài cùi răng', defaultShare: 0.30 },
      { name: 'Lấy dấu răng & Gắn răng tạm', defaultShare: 0.20 },
      { name: 'Thử sườn, tinh chỉnh khớp cắn & Gắn mão sứ', defaultShare: 0.40 },
      { name: 'Tái khám kiểm tra khớp cắn sau 1 tuần', defaultShare: 0.10 },
    ]
  },

  // 4. Nhóm Tẩy trắng răng
  whitening: {
    groupName: 'Tẩy trắng răng',
    keywords: ['tẩy trắng', 'philips', 'zoom'],
    steps: [
      { name: 'Vệ sinh răng miệng & Lấy cao răng', defaultShare: 0.20 },
      { name: 'Chiếu đèn kích hoạt tẩy trắng tại ghế', defaultShare: 0.60 },
      { name: 'Bàn giao máng ngậm & Hướng dẫn duy trì', defaultShare: 0.20 },
    ]
  },

  // 5. Nhóm Nhổ răng & Tiểu phẫu
  surgery: {
    groupName: 'Nhổ răng & Tiểu phẫu',
    keywords: ['nhổ răng', 'răng khôn', 'piezotome', 'tiểu phẫu'],
    steps: [
      { name: 'Chụp X-quang & Phẫu thuật nhổ răng', defaultShare: 0.80 },
      { name: 'Tái khám, cắt chỉ & Liền thương', defaultShare: 0.20 },
    ]
  },

  // 6. Quy trình điều trị tổng quát chuẩn (Fallback)
  general: {
    groupName: 'Điều trị nha khoa tổng quát',
    keywords: [],
    steps: [
      { name: 'Khám tổng quát & Lên phác đồ điều trị', defaultShare: 0.20 },
      { name: 'Thực hiện thủ thuật điều trị chính', defaultShare: 0.50 },
      { name: 'Tái khám & Đánh giá kết quả', defaultShare: 0.20 },
      { name: 'Hoàn tất điều trị & Chăm sóc định kỳ', defaultShare: 0.10 },
    ]
  }
};

/**
 * Tự động tìm danh sách các bước mẫu (steps) phù hợp dựa trên tên gói dịch vụ
 * @param {string} serviceName Tên gói dịch vụ (ví dụ: "Niềng răng trong suốt Invisalign")
 * @returns {Array<{ name: string, defaultShare: number }>} Danh sách bước mẫu
 */
export function getPresetStepsForService(serviceName = '') {
  if (!serviceName) return SERVICE_STEP_PRESETS.general.steps;

  const lower = serviceName.toLowerCase();

  for (const key of ['orthodontics', 'implant', 'veneers', 'whitening', 'surgery']) {
    const preset = SERVICE_STEP_PRESETS[key];
    if (preset.keywords.some(kw => lower.includes(kw))) {
      return preset.steps;
    }
  }

  return SERVICE_STEP_PRESETS.general.steps;
}

/**
 * Trích xuất bước điều trị và trạng thái thanh toán từ ghi chú visit cũ (nếu có)
 * @param {string} note 
 * @returns {{ step: string, status: string }}
 */
export function parseVisitStepAndStatus(note = '') {
  if (!note) return { step: 'Điều trị', status: 'paid' };

  let status = 'paid';
  if (note.toLowerCase().includes('chưa thanh toán') || note.toLowerCase().includes('ghi nợ')) {
    status = 'pending';
  } else if (note.toLowerCase().includes('thanh toán một phần')) {
    status = 'partial';
  }

  // Khớp định dạng: "[Tên bước] ..." hoặc "Gói đầu tiên: ..." hoặc "Tái điều trị: ..."
  const matchBracket = note.match(/\[(.*?)\]/);
  if (matchBracket && matchBracket[1]) {
    return { step: matchBracket[1].trim(), status };
  }

  if (note.includes(':')) {
    const parts = note.split(':');
    return { step: parts[parts.length - 1].trim(), status };
  }

  return { step: note.trim(), status };
}
