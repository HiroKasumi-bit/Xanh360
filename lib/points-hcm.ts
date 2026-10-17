import type { Point, Source } from './domain';

// Collection points of the Việt Nam Tái Chế (VNTC) e-waste and battery take-back programme in Ho Chi Minh City,
// reviewed 2026-10-17 against VNTC's own pages:
// - The current list is the "Địa điểm thu hồi" page, which already uses the ward names in force since 1 July 2025. The
//   FAQ page still shows an older list (old district names, the District 4 point closed in March 2025, 22 Nguyễn Văn
//   Trỗi for Phú Nhuận); where they differ, the "Địa điểm thu hồi" page wins.
// - A point is confirmed only when its place on OpenStreetMap matches the name and address on that page and Google
//   Maps opens the same place from the Maps link (checked 2026-10-17, all within about 100 m); the OSM object is
//   recorded in coordinateSource. OSM has no house number 145/9 Nguyễn Văn Trỗi, so that point uses the mouth of
//   alley 145, about 50 m from where Google Maps places 145/9.
// - The Maps link searches the store name or full address (mapsQuery), so Google shows the place with its name, never
//   the programme name, which is what sent "Điểm VNTC tại KDC Phường Phú Nhuận" to the wrong place.
export const VNTC_HOTLINE = '0933 882 205';
const LIST_URL = 'https://vietnamrecycles.com/gioi-thieu/dia-diem-thu-hoi';
const CONTACT_URL = 'https://vietnamrecycles.com/lien-he';
const CHECKED = '2026-10-17';

export const pointSources: Source[] = [
  {
    id: 'vntc-points-2025',
    name: 'Việt Nam Tái Chế · Địa điểm thu hồi',
    url: LIST_URL,
    checkedAt: CHECKED,
    scope:
      'Danh sách hiện hành tại TP.HCM: MM Mega An Phú, MM Mega Bình Phú, 82 Bà Huyện Thanh Quan (Phường Nhiêu Lộc), KDC Phường Phú Nhuận (145/9 Nguyễn Văn Trỗi).',
  },
  {
    id: 'vntc-contact',
    name: 'Việt Nam Tái Chế · Liên hệ',
    url: CONTACT_URL,
    checkedAt: CHECKED,
    scope: 'Hotline (+84) 0933 882 205, thứ Hai–thứ Sáu 8h30–17h00.',
  },
];

// The FAQ lists computers, laptops, TVs, monitors, printers, phones, tablets, cameras, IT accessories and "pin điện
// tử các loại".
const accepted = [
  'pin-aa',
  'pin-cuc',
  'pin-9v',
  'pin-sac',
  'dien-thoai',
  'may-tinh-bang',
  'laptop',
  'may-in',
  'man-hinh',
  'tivi',
  'may-anh',
  'ban-phim',
  'chuot-may-tinh',
];

const acceptance: Point['acceptance'] = [
  {
    itemIds: accepted,
    status: 'accepted',
    condition:
      'Chương trình công bố nhận pin các loại, điện thoại, máy tính bảng, máy tính, màn hình, tivi, máy in, máy ảnh và phụ kiện công nghệ thông tin. Hỏi trước với thiết bị hỏng hoặc số lượng lớn.',
    sourceId: 'vntc-faq',
    checkedAt: CHECKED,
    validTo: null,
    verification: 'published',
    audience: 'household',
    maxQuantity: null,
    intactOnly: true,
  },
];

type Entry = Pick<
  Point,
  'id' | 'name' | 'address' | 'originalAddress' | 'areaId' | 'latitude' | 'longitude' | 'coordinateSource' | 'status'
> &
  Pick<Required<Point>, 'mapsQuery' | 'note'>;

const osm = (ref: string, what: string) => `OpenStreetMap ${ref} (“${what}”), khớp tên và địa chỉ, kiểm tra ${CHECKED}`;

const entries: Entry[] = [
  {
    id: 'mega-an-phu',
    name: 'MM Mega Market An Phú · điểm Việt Nam Tái Chế',
    address: 'Khu B, KĐT An Phú – An Khánh, Phường Bình Trưng, TP.HCM',
    originalAddress: 'Khu B, KĐT mới An Phú – An Khánh, Phường An Phú, Quận 2 (trước 01/07/2025)',
    areaId: 'binh-trung',
    latitude: 10.8003495,
    longitude: 106.7431726,
    coordinateSource: osm('way 112287488', 'Mega Market An Phú, Phường Bình Trưng'),
    status: 'active',
    mapsQuery: 'MM Mega Market An Phú, Thành phố Hồ Chí Minh',
    note: 'Trang của VNTC vẫn ghi "Phường An Phú" (tên cũ); theo bản đồ và đăng ký doanh nghiệp, nay thuộc Phường Bình Trưng. Không nhầm với Phường An Phú (Thuận An cũ).',
  },
  {
    id: 'mega-binh-phu',
    name: 'MM Mega Market Bình Phú · điểm Việt Nam Tái Chế',
    address: '10 Bình Phú, Phường Bình Phú, TP.HCM',
    originalAddress: '10 Bình Phú, Quận 6 (trước 01/07/2025)',
    areaId: 'binh-phu',
    latitude: 10.7424455,
    longitude: 106.631194,
    coordinateSource: osm('way 169081584', 'Siêu thị MM Mega Market Bình Phú, đường Bình Phú'),
    status: 'active',
    mapsQuery: 'MM Mega Market Bình Phú, 10 Bình Phú, Thành phố Hồ Chí Minh',
    note: '',
  },
  {
    id: 'nhieu-loc',
    name: 'Điểm Việt Nam Tái Chế · UBND Phường Nhiêu Lộc',
    address: '82 Bà Huyện Thanh Quan, Phường Nhiêu Lộc, TP.HCM',
    originalAddress: 'UBND Phường 9, Quận 3, 82 Bà Huyện Thanh Quan (trước 01/07/2025)',
    areaId: 'nhieu-loc',
    latitude: 10.7816307,
    longitude: 106.6821931,
    coordinateSource: osm('way 987255743', 'Ủy ban nhân dân phường Nhiêu Lộc, 82 Bà Huyện Thanh Quan'),
    status: 'active',
    mapsQuery: 'UBND Phường Nhiêu Lộc, 82 Bà Huyện Thanh Quan, Thành phố Hồ Chí Minh',
    note: '',
  },
  {
    id: 'phu-nhuan',
    name: 'Điểm Việt Nam Tái Chế · KDC Phường Phú Nhuận',
    address: '145/9 Nguyễn Văn Trỗi, Phường Phú Nhuận, TP.HCM',
    originalAddress: 'Trước đây: UBND Phường 17, 22 Nguyễn Văn Trỗi, Quận Phú Nhuận',
    areaId: 'phu-nhuan',
    latitude: 10.7944225,
    longitude: 106.6762581,
    coordinateSource: `OpenStreetMap: đầu hẻm 145 Nguyễn Văn Trỗi (bản đồ chưa có số nhà 145/9); Google Maps đặt 145/9 cách đó khoảng 50 m, kiểm tra ${CHECKED}`,
    status: 'active',
    mapsQuery: '145/9 Nguyễn Văn Trỗi, Phường Phú Nhuận, Thành phố Hồ Chí Minh',
    note: 'Trang FAQ cũ của VNTC còn ghi 22 Nguyễn Văn Trỗi; địa chỉ hiện hành là 145/9.',
  },
];

export const hcmPoints: Point[] = entries.map((e) => ({
  ...e,
  scopeSourceId: 'vntc-points-2025',
  placeId: '',
  phone: VNTC_HOTLINE,
  phoneSourceUrl: CONTACT_URL,
  website: 'https://vietnamrecycles.com/',
  sourceUrl: LIST_URL,
  sourceCheckedAt: CHECKED,
  kind: 'fixed',
  serviceAreaIds: [],
  validTo: null,
  hours: 'Giờ nhận tại điểm chưa được công bố. Hotline chương trình: thứ Hai–thứ Sáu, 8h30–17h00.',
  fee: 'Chương trình thu gom miễn phí.',
  demo: false,
  acceptance,
}));
