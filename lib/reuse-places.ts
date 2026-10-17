import { z } from 'zod';
import { activeDate, idSchema } from './domain';

// Places that give a reusable or recyclable item a second life, shown under the disposal guidance: public programmes,
// brand take-back schemes, charities and scrap-buying apps in Ho Chi Minh City. Reviewed 2026-10-17 through search
// results (the organisations' own pages could not be opened from the review environment), so none is marked confirmed
// and every card asks people to call first. Only entries backed by the organisation's own page or a newspaper report
// are listed; directory and listicle sites were not used on their own. No coordinates were added: they could not be
// checked against the address.
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
  // Only for fixed places, once checked against the address; enables community confirmation on site.
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  sources: z.array(z.object({ name: z.string().min(2), url: z.string().url().startsWith('https://'), checkedAt: date })).min(1),
});
export type ReusePlace = z.infer<typeof reusePlaceSchema>;

const checked = '2026-10-17';
const plastics = ['chai-nhua', 'hop-nhua', 'ly-nhua', 'can-nhua-thuc-pham', 'chai-dau-goi', 'chai-sua-tam'];
const papers = ['giay', 'bao', 'carton', 'tap-chi', 'tap-vo', 'sach', 'tui-giay'];
const metals = ['lon', 'hop-thiec', 'noi-chao', 'nap-chai-kim-loai'];

export const reusePlaces: ReusePlace[] = [
  {
    id: 'mrf-tan-my',
    type: 'state',
    name: 'Trạm thu hồi vật liệu tái chế (MRF) Phường Tân Mỹ',
    operator: 'UBND Phường Tân Mỹ, phối hợp Unilever Việt Nam và Grac',
    kind: 'fixed',
    address: 'Số 4 đường Tân Phú, Phường Tân Mỹ, TP.HCM',
    mapsQuery: 'Trạm MRF Phường Tân Mỹ, Thành phố Hồ Chí Minh',
    phone: '',
    website: 'https://grac.vn/doi-rac-tai-che-nhan-qua-thiet-thuc-tai-tram-mrf-phuong-tan-my/',
    itemIds: [...plastics, ...papers, 'lon'],
    accepts:
      'Đổi rác tái chế lấy quà: chai nhựa, lon nhôm, giấy, bìa. Rác cần được phân loại, làm sạch, ép dẹp trước khi mang tới; điểm thưởng ghi qua ứng dụng Grac.',
    schedule: 'Chương trình đổi quà từ 28/03/2026 đến 31/12/2026. Giờ mở cửa chưa có nguồn.',
    note: 'Nguồn chưa thống nhất về địa chỉ: báo SGGP ghi số 4 đường Tân Phú (trong công viên), Grac ghi số 04 đường số 4.',
    validTo: '2026-12-31',
    sources: [
      { name: 'SGGP · Đưa vào hoạt động trạm đổi rác nhận quà', url: 'https://www.sggp.org.vn/dua-vao-hoat-dong-tram-doi-rac-nhan-qua-post846096.html', checkedAt: checked },
      { name: 'PLO · Phường Tân Mỹ có trạm thu hồi vật liệu tái chế', url: 'https://plo.vn/phuong-tan-my-co-tram-thu-hoi-vat-lieu-tai-che-post902458.html', checkedAt: checked },
      { name: 'Grac · Đổi rác tái chế tại trạm MRF Phường Tân Mỹ', url: 'https://grac.vn/doi-rac-tai-che-nhan-qua-thiet-thuc-tai-tram-mrf-phuong-tan-my/', checkedAt: checked },
    ],
  },
  {
    id: 'doi-rac-binh-tan',
    type: 'state',
    name: 'Đổi rác lấy quà · Phường Bình Tân',
    operator: 'UBND Phường Bình Tân',
    kind: 'event',
    address: 'Công viên trung tâm Phường Bình Tân, TP.HCM',
    mapsQuery: 'Công viên trung tâm Phường Bình Tân, Thành phố Hồ Chí Minh',
    phone: '',
    website: '',
    itemIds: [...plastics, ...papers, ...metals],
    accepts: 'Đổi rác tái chế đã phân loại lấy quà, gắn với phân loại rác tại nguồn.',
    schedule: 'Phát động ngày 29/04/2026; lịch các đợt sau chưa có nguồn.',
    note: 'Hỏi UBND phường hoặc tổ dân phố lịch đổi gần nhất.',
    validTo: null,
    sources: [
      { name: 'SGGP · Phường Bình Tân phát động chương trình “đổi rác lấy quà”', url: 'https://www.sggp.org.vn/phuong-binh-tan-phat-dong-chuong-trinh-doi-rac-lay-qua-post850341.html', checkedAt: checked },
    ],
  },
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
    id: 're-uniqlo',
    type: 'brand',
    name: 'RE.UNIQLO · thùng thu quần áo tại cửa hàng UNIQLO',
    operator: 'UNIQLO Việt Nam, phối hợp Quỹ Hy Vọng',
    kind: 'network',
    address: 'Các cửa hàng UNIQLO tại TP.HCM',
    mapsQuery: 'UNIQLO, Thành phố Hồ Chí Minh',
    phone: '',
    website: 'https://faq-vn.uniqlo.com/articles/vi/FAQ/UQVN-Gi%E1%BB%9Bi-thi%E1%BB%87u-v%E1%BB%81-Ch%C6%B0%C6%A1ng-tr%C3%ACnh-t%C3%A1i-ch%E1%BA%BF-UNIQLO',
    itemIds: ['quan-ao'],
    accepts: 'Chỉ nhận quần áo hiệu UNIQLO đã giặt sạch; không nhận giày dép và đồ mặc trong. Quần áo được trao tặng cộng đồng khó khăn.',
    schedule: 'Theo giờ mở cửa của cửa hàng.',
    note: 'Nguồn về thùng thu gom đã có từ 2021; hỏi cửa hàng xem còn thùng không.',
    validTo: null,
    sources: [
      { name: 'UNIQLO Việt Nam · Giới thiệu chương trình tái chế UNIQLO', url: 'https://faq-vn.uniqlo.com/articles/vi/FAQ/UQVN-Gi%E1%BB%9Bi-thi%E1%BB%87u-v%E1%BB%81-Ch%C6%B0%C6%A1ng-tr%C3%ACnh-t%C3%A1i-ch%E1%BA%BF-UNIQLO', checkedAt: checked },
      { name: 'Saigon Times (Tuổi Trẻ) · Uniqlo thu gom quần áo đã qua sử dụng', url: 'https://tuoitre.vn/saigontimes/uniqlo-thu-gom-quan-ao-da-qua-su-dung-106216038.htm', checkedAt: checked },
    ],
  },
  {
    id: 'bitis-pin',
    type: 'brand',
    name: "Biti's · thu hồi pin cũ tại cửa hàng",
    operator: "Biti's",
    kind: 'network',
    address: "Các cửa hàng Biti's tham gia tại TP.HCM",
    mapsQuery: "Biti's, Thành phố Hồ Chí Minh",
    phone: '',
    website: 'https://bitis.com.vn/blogs/news/biti-s-cac-diem-thu-hoi-pin-cu-tren-toan-quoc',
    itemIds: ['pin-aa', 'pin-cuc', 'pin-9v'],
    accepts: 'Nhận pin cũ gia dụng tại các cửa hàng có trong danh sách của hãng.',
    schedule: 'Theo giờ mở cửa của cửa hàng.',
    note: 'Danh sách cửa hàng đăng khoảng năm 2024, có chỗ không khớp địa chỉ; gọi cửa hàng trước khi mang pin tới.',
    validTo: null,
    sources: [
      { name: "Biti's · Các điểm thu hồi pin cũ trên toàn quốc", url: 'https://bitis.com.vn/blogs/news/biti-s-cac-diem-thu-hoi-pin-cu-tren-toan-quoc', checkedAt: checked },
    ],
  },
  {
    id: 'goodwill-vn',
    type: 'charity',
    name: 'Goodwill Vietnam · nhận quyên góp quần áo',
    operator: 'Goodwill Vietnam',
    kind: 'fixed',
    address: '11 Nguyễn Văn Nghi, TP.HCM',
    mapsQuery: '11 Nguyễn Văn Nghi, Gò Vấp, Thành phố Hồ Chí Minh',
    phone: '0974 00 11 33',
    website: 'https://goodwill.org.vn/',
    itemIds: ['quan-ao'],
    accepts: 'Nhận quyên góp quần áo cũ; có thu gom tận nhà và các trạm quyên góp.',
    schedule: 'Hỏi Donation Center trước khi mang tới.',
    note: 'Địa chỉ trước 01/07/2025: Phường 4, Gò Vấp; chưa đối chiếu được tên phường mới. Chưa rõ đây là trạm nhận hay văn phòng.',
    validTo: null,
    sources: [{ name: 'Goodwill Vietnam · Trang chủ', url: 'https://goodwill.org.vn/pages/trang-chu', checkedAt: checked }],
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
