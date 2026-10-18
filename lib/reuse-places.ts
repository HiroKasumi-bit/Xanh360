import { z } from 'zod';
import { activeDate, idSchema } from './domain';

// Services without one fixed address, shown in the "Điểm tiếp nhận" tab under the collection points: brand take-back
// and trade-in schemes, home pickups, charities and scrap-buying apps in Ho Chi Minh City. Places with an address
// (the Tân Mỹ MRF station, scrap shops) are collection points in lib/points-collectors.ts instead. Every entry here was
// checked on 2026-10-17 against the organisation's own page (verified: true); directory and listicle sites were not
// used. Left out because they had ended or had no current source: Bình Tân "đổi rác lấy quà" (one launch day),
// "Sách trao tay" (latest report 2019) and Biti's batteries (the 2026 drive ran 5–25 June).
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
  // True when the organisation's own page or a newspaper report was read directly and matches what is shown.
  verified: z.boolean(),
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
    id: 'vntc-pickup',
    type: 'brand',
    name: 'Việt Nam Tái Chế · thu gom đồ điện tử tận nhà',
    operator: 'Việt Nam Tái Chế (liên minh nhà sản xuất điện tử, do HP và Apple thành lập)',
    kind: 'pickup',
    address: '',
    mapsQuery: '',
    phone: '0933 882 205',
    website: 'https://vietnamrecycles.com/',
    itemIds: ['dien-thoai', 'may-tinh-bang', 'laptop', 'may-in', 'man-hinh', 'tivi', 'may-anh'],
    accepts:
      'Thu gom miễn phí tại nhà khi hộ gia đình có ít nhất 1 thiết bị lớn (tivi, màn hình, máy tính, máy in, máy fax, máy scan, máy photocopy) hoặc 10 thiết bị điện tử nhỏ. Pin các loại chỉ tính là 1 thiết bị; mỗi đợt tối đa 50 sản phẩm nhỏ.',
    schedule: 'Tình nguyện viên thường thu gom cuối tuần; hotline thứ Hai–thứ Sáu, 8h30–17h00.',
    note: 'Khu vực phục vụ trên website còn ghi theo tên quận cũ; hỏi lại khi gọi.',
    verified: true,
    validTo: null,
    sources: [
      { name: 'Việt Nam Tái Chế · Câu hỏi thường gặp', url: 'https://vietnamrecycles.com/faq-vn', checkedAt: checked },
      { name: 'Việt Nam Tái Chế · Liên hệ', url: 'https://vietnamrecycles.com/lien-he', checkedAt: checked },
    ],
  },
  {
    id: 'tgdd-thu-cu',
    type: 'brand',
    name: 'Thế Giới Di Động · thu cũ đổi mới',
    operator: 'Thế Giới Di Động',
    kind: 'network',
    address: 'Các cửa hàng Thế Giới Di Động tại TP.HCM',
    mapsQuery: 'Thế Giới Di Động, Thành phố Hồ Chí Minh',
    phone: '1900 232 460',
    website: 'https://www.thegioididong.com/thu-cu-doi-moi',
    itemIds: ['dien-thoai', 'may-tinh-bang', 'laptop'],
    accepts:
      'Khi mua máy mới: mang điện thoại, máy tính bảng hoặc laptop cũ tới cửa hàng để định giá và được trợ giá theo từng đợt chương trình.',
    schedule: 'Mức trợ giá đổi theo đợt; xem trang thu cũ đổi mới.',
    note: 'Chỉ áp dụng khi mua máy mới; máy còn hoạt động thường được định giá tốt hơn.',
    verified: true,
    validTo: null,
    sources: [{ name: 'Thế Giới Di Động · Thu cũ đổi mới', url: 'https://www.thegioididong.com/thu-cu-doi-moi', checkedAt: checked }],
  },
  {
    id: 'cellphones-thu-cu',
    type: 'brand',
    name: 'CellphoneS · thu cũ đổi mới, thu mua máy cũ',
    operator: 'CellphoneS',
    kind: 'network',
    address: 'Các cửa hàng CellphoneS tại TP.HCM',
    mapsQuery: 'CellphoneS, Thành phố Hồ Chí Minh',
    phone: '1800 2097',
    website: 'https://cellphones.com.vn/thu-cu-doi-moi',
    itemIds: ['dien-thoai', 'may-tinh-bang', 'laptop'],
    accepts:
      'Thu mua và thu cũ đổi mới điện thoại, máy tính bảng, laptop theo tình trạng máy. Laptop không còn hoạt động, không lên nguồn thì không thu mua.',
    schedule: 'Định giá tại cửa hàng.',
    note: 'Máy hư nặng nên tìm tiệm thu mua xác hoặc Việt Nam Tái Chế.',
    verified: true,
    validTo: null,
    sources: [
      { name: 'CellphoneS · Thu cũ đổi mới điện thoại', url: 'https://cellphones.com.vn/thu-cu-doi-moi', checkedAt: checked },
      { name: 'CellphoneS · Thu mua laptop cũ', url: 'https://cellphones.com.vn/thu-cu-doi-moi/trade-in-laptop', checkedAt: checked },
    ],
  },
  {
    id: 're-uniqlo',
    type: 'brand',
    name: 'RE.UNIQLO · hộp tái chế tại cửa hàng UNIQLO',
    operator: 'UNIQLO Việt Nam',
    kind: 'network',
    address: 'Mọi cửa hàng UNIQLO tại TP.HCM',
    mapsQuery: 'UNIQLO, Thành phố Hồ Chí Minh',
    phone: '',
    website: 'https://faq-vn.uniqlo.com/articles/vi/FAQ/UQVN-Gi%E1%BB%9Bi-thi%E1%BB%87u-v%E1%BB%81-Ch%C6%B0%C6%A1ng-tr%C3%ACnh-t%C3%A1i-ch%E1%BA%BF-UNIQLO',
    itemIds: ['quan-ao'],
    accepts:
      'Nhận mọi sản phẩm hiệu UNIQLO đã qua sử dụng: bỏ vào Hộp tái chế hoặc đưa nhân viên cửa hàng. Đồ dùng cá nhân không thuộc diện quyên góp.',
    schedule: 'Trong giờ mở cửa của cửa hàng.',
    note: 'Chỉ nhận đồ hiệu UNIQLO.',
    verified: true,
    validTo: null,
    sources: [
      { name: 'UNIQLO Việt Nam · Giới thiệu về Chương trình tái chế UNIQLO', url: 'https://faq-vn.uniqlo.com/articles/vi/FAQ/UQVN-Gi%E1%BB%9Bi-thi%E1%BB%87u-v%E1%BB%81-Ch%C6%B0%C6%A1ng-tr%C3%ACnh-t%C3%A1i-ch%E1%BA%BF-UNIQLO', checkedAt: checked },
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
    verified: true,
    validTo: null,
    sources: [
      { name: 'REshare · Mạng lưới trạm thu gom', url: 'https://tram.reshare.vn/', checkedAt: checked },
      { name: 'Người Lao Động · “Tái sinh” quần áo cũ', url: 'https://nld.com.vn/tai-sinh-quan-ao-cu-196250629201014129.htm', checkedAt: checked },
    ],
  },
  {
    id: 'goodwill-vn',
    type: 'charity',
    name: 'Goodwill Vietnam · quyên góp quần áo cũ',
    operator: 'Goodwill Vietnam',
    kind: 'pickup',
    address: '',
    mapsQuery: '',
    phone: '0974 00 11 33',
    website: 'https://goodwill.org.vn/',
    itemIds: ['quan-ao'],
    accepts:
      'Nhận quyên góp quần áo cũ: gọi Donation Center để được thu gom tận nhà, hoặc mang tới các trạm quyên góp của Goodwill (xem trên website).',
    schedule: 'Gọi hotline để hẹn thu gom.',
    note: '11 Nguyễn Văn Nghi (Gò Vấp cũ) là trụ sở chính, không phải trạm nhận đồ.',
    verified: true,
    validTo: null,
    sources: [{ name: 'Goodwill Vietnam · Trang chủ', url: 'https://goodwill.org.vn/pages/trang-chu', checkedAt: checked }],
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
    website: 'https://veca.app/',
    itemIds: [...plastics, ...papers, ...metals],
    accepts: 'Đặt lịch người thu mua ve chai, phế liệu đến tận nhà; giá theo thị trường.',
    schedule: 'Đặt lịch trong ứng dụng.',
    note: 'Khu vực phục vụ xem trong ứng dụng.',
    verified: true,
    validTo: null,
    sources: [
      { name: 'Google Play · VECA (cập nhật 25/05/2026)', url: 'https://play.google.com/store/apps/details?id=veca.di4l.vn.veca_customer', checkedAt: checked },
      { name: 'App Store · VECA', url: 'https://apps.apple.com/us/app/veca/id1499754021?l=vi', checkedAt: checked },
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
    verified: true,
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
