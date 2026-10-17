import { z } from 'zod';
import { activeDate, idSchema } from './domain';

// Places that give a reusable or recyclable item a second life, shown under the disposal guidance: public programmes,
// brand take-back schemes, charities and scrap-buying apps in Ho Chi Minh City. Reviewed 2026-10-17 through search
// results (the organisations' own pages could not be opened from the review environment), so none is marked confirmed
// and every card asks people to call first. Only entries backed by the organisation's own page or a newspaper report
// are listed; directory and listicle sites were not used on their own. Entries whose address, schedule or current
// status could not be pinned down were removed (Tân Mỹ MRF station, Bình Tân "đổi rác lấy quà", RE.UNIQLO, Biti's
// batteries, Goodwill Vietnam); add them back once confirmed. No coordinates were added: they could not be checked
// against the address.
export const placeTypes = ['state', 'brand', 'charity', 'scrap'] as const;
export type PlaceType = (typeof placeTypes)[number];
export const placeTypeLabels: Record<PlaceType, string> = {
  state: 'Chương trình nhà nước',
  brand: 'Thương hiệu thu hồi',
  charity: 'Quyên góp, từ thiện',
  scrap: 'Ve chai, thu mua phế liệu',
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reusePlaceSchema = z.object({
  id: idSchema,
  type: z.enum(placeTypes),
  name: z.string().min(2).max(120),
  operator: z.string().max(200),
  // How people reach it: a fixed address, a chain of stores, a phone app, a pickup at home, or a seasonal drive.
  kind: z.enum(['fixed', 'network', 'app', 'pickup', 'event']),
  address: z.string().max(200),
  mapsQuery: z.string().max(200),
  phone: z.string().regex(/^[+0-9 ().-]*$/).max(30),
  website: z.string().url().startsWith('https://').or(z.literal('')),
  itemIds: z.array(idSchema).min(1),
  accepts: z.string().min(3).max(400),
  schedule: z.string().max(200),
  note: z.string().max(400),
  validTo: date.nullable(),
  sources: z.array(z.object({ name: z.string().min(2), url: z.string().url().startsWith('https://'), checkedAt: date })).min(1),
});
export type ReusePlace = z.infer<typeof reusePlaceSchema>;

const checked = '2026-10-17';
const plastics = ['chai-nhua', 'hop-nhua', 'ly-nhua', 'can-nhua-thuc-pham', 'chai-dau-goi', 'chai-sua-tam'];
const papers = ['giay', 'bao', 'carton', 'tap-chi', 'tap-vo', 'sach', 'tui-giay'];
const metals = ['lon', 'hop-thiec', 'noi-chao', 'nap-chai-kim-loai'];

export const reusePlaces: ReusePlace[] = [
  {
    id: 'sach-trao-tay',
    type: 'state',
    name: 'Sách trao tay – Cầu nối yêu thương',
    operator: 'Sở Giáo dục và Đào tạo TP.HCM, qua các trường học',
    kind: 'event',
    address: '',
    mapsQuery: '',
    phone: '',
    website: '',
    itemIds: ['sach', 'tap-vo'],
    accepts: 'Sách giáo khoa, sách tham khảo và dụng cụ học tập còn nguyên vẹn, sạch đẹp, tặng học sinh khó khăn.',
    schedule: 'Hoạt động thường niên dịp hè; nhận qua trường học.',
    note: 'Hỏi trường học gần nhà thời gian nhận sách năm nay.',
    validTo: null,
    sources: [
      { name: 'Báo Văn Hóa · TP.HCM quyên góp gần 20.000 bộ sách giáo khoa tặng học sinh nghèo', url: 'https://baovanhoa.vn/giao-duc/tphcm-quyen-gop-duoc-gan-20000-bo-sach-giao-khoa-tang-hoc-sinh-ngheo-60826.html', checkedAt: checked },
    ],
  },
  {
    id: 'vntc-pickup',
    type: 'brand',
    name: 'Việt Nam Tái Chế · thu gom đồ điện tử tận nhà',
    operator: 'Việt Nam Tái Chế (liên minh nhà sản xuất thu hồi rác thải điện tử)',
    kind: 'pickup',
    address: '',
    mapsQuery: '',
    phone: '0933 882 205',
    website: 'https://vietnamrecycles.com/',
    itemIds: ['dien-thoai', 'laptop', 'may-in', 'man-hinh', 'tivi', 'may-anh'],
    accepts:
      'Thu gom miễn phí tại nhà cho hộ gia đình khi có ít nhất 1 thiết bị lớn (tivi, màn hình, máy tính, máy in) hoặc 10 thiết bị nhỏ. Không đến lấy riêng pin.',
    schedule: 'Hotline thứ Hai–thứ Sáu, 8:30–17:00.',
    note: 'Khu vực phục vụ công bố theo tên quận cũ; hỏi lại sau sáp nhập 2025.',
    validTo: null,
    sources: [
      { name: 'Việt Nam Tái Chế · Câu hỏi thường gặp', url: 'https://vietnamrecycles.com/en/faq-en', checkedAt: checked },
      { name: 'Việt Nam Tái Chế · Dịch vụ thu gom tại hộ gia đình', url: 'https://vietnamrecycles.com/en/vietnam-recycles-kicks-off-household-e-waste-collection-service.html', checkedAt: checked },
    ],
  },
  {
    id: 'reshare',
    type: 'charity',
    name: 'REshare · trạm xanh nhận quần áo cũ',
    operator: 'REshare',
    kind: 'network',
    address: 'Khoảng 40 trạm tại cửa hàng, văn phòng, chung cư ở TP.HCM',
    mapsQuery: '',
    phone: '0901 900 001',
    website: 'https://tram.reshare.vn/',
    itemIds: ['quan-ao'],
    accepts: 'Nhận quần áo đã qua sử dụng: đồ còn dùng được chuyển tới tủ đồ 0 đồng và tổ chức từ thiện, đồ hỏng đưa đi tái chế. Một số trạm khóa một chiều, nhận gói dưới 5 kg.',
    schedule: 'Xem bản đồ trạm trên website.',
    note: 'Có thể gửi đồ qua website reshare.vn.',
    validTo: null,
    sources: [
      { name: 'REshare · Mạng lưới trạm thu gom', url: 'https://tram.reshare.vn/', checkedAt: checked },
      { name: 'Người Lao Động · “Tái sinh” quần áo cũ', url: 'https://nld.com.vn/tai-sinh-quan-ao-cu-196250629201014129.htm', checkedAt: checked },
    ],
  },
  {
    id: 'veca-app',
    type: 'scrap',
    name: 'VECA · ứng dụng hẹn thu mua ve chai tại nhà',
    operator: 'VECA',
    kind: 'app',
    address: '',
    mapsQuery: '',
    phone: '028 6682 7889',
    website: 'https://apps.apple.com/us/app/veca/id1499754021?l=vi',
    itemIds: [...plastics, ...papers, ...metals],
    accepts: 'Đặt lịch người thu mua ve chai, phế liệu đến tận nhà; giá theo thị trường.',
    schedule: 'Đặt lịch trong ứng dụng.',
    note: 'Khu vực phục vụ hiện tại chưa có nguồn mới; kiểm tra trong ứng dụng.',
    validTo: null,
    sources: [
      { name: 'App Store · VECA', url: 'https://apps.apple.com/us/app/veca/id1499754021?l=vi', checkedAt: checked },
      { name: 'VietNamNet · Thu mua đồng nát theo mô hình app gọi xe công nghệ', url: 'https://vietnamnet.vn/thu-mua-dong-nat-sat-vun-theo-mo-hinh-app-goi-xe-cong-nghe-2047233.html', checkedAt: checked },
    ],
  },
  {
    id: 'grac-app',
    type: 'scrap',
    name: 'Grac · bán ve chai qua ứng dụng',
    operator: 'Grac',
    kind: 'app',
    address: '',
    mapsQuery: '',
    phone: '',
    website: 'https://grac.vn/grac-app-thu-gom-rac/',
    itemIds: [...plastics, ...papers, ...metals],
    accepts: 'Ứng dụng miễn phí: đặt lịch thu gom rác sinh hoạt và bán ve chai, phế liệu.',
    schedule: 'Đặt lịch trong ứng dụng.',
    note: 'Chưa tìm được số điện thoại; liên hệ qua ứng dụng hoặc website.',
    validTo: null,
    sources: [{ name: 'Grac · Ứng dụng thu gom rác', url: 'https://grac.vn/grac-app-thu-gom-rac/', checkedAt: checked }],
  },
];

// Places that take this item, active on the given day, grouped in the order of placeTypes.
export function placesFor(itemId: string, places: ReusePlace[] = reusePlaces, now = new Date()) {
  const found = places.filter((p) => p.itemIds.includes(itemId) && activeDate(null, p.validTo, now));
  return placeTypes
    .map((type) => ({ type, label: placeTypeLabels[type], places: found.filter((p) => p.type === type) }))
    .filter((g) => g.places.length);
}

export function placeMapsUrl(p: ReusePlace) {
  if (!p.mapsQuery) return '';
  const u = new URL('https://www.google.com/maps/search/');
  u.searchParams.set('api', '1');
  u.searchParams.set('query', p.mapsQuery);
  return u.toString();
}

// "Vựa ve chai" near the visitor: an outside search, clearly labelled as unverified in the page.
export function scrapYardSearchUrl() {
  const u = new URL('https://www.google.com/maps/search/');
  u.searchParams.set('api', '1');
  u.searchParams.set('query', 'vựa ve chai thu mua phế liệu gần đây');
  return u.toString();
}
