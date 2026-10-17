import type { Point, Source } from './domain';

// Collection points of the Việt Nam Tái Chế (VNTC) e-waste and battery take-back programme in Ho Chi Minh City,
// reviewed 2026-10-17. What could and could not be checked:
// - The point list and the hotline come from VNTC's own pages (a March 2025 notice lists the four HCMC points that
//   remained after the District 4 point closed). The pages could not be opened from the review environment, only read
//   through search results, so no point is marked confirmed.
// - Addresses carry the ward names in force since 1 July 2025 (Nghị quyết 1685/NQ-UBTVQH15); the old address is kept
//   for people who know the place by it.
// - No coordinates: they could not be geocoded and checked against the address, and a guessed coordinate is worse
//   than none (it would rank the point by a wrong distance). The Maps link searches the full address or the store
//   name, never the programme name, which is what sent "Điểm VNTC tại KDC Phường Phú Nhuận" to the wrong place.
// - Where sources disagree the card says so and asks people to call first.
export const VNTC_HOTLINE = '0933 882 205';

export const pointSources: Source[] = [
  {
    id: 'vntc-points-2025',
    name: 'Việt Nam Tái Chế · Thông báo điểm thu hồi tại TP.HCM (03/2025)',
    url: 'https://vietnamrecycles.com/thong-bao-ngung-nhan-rac-thai-dien-tu-tai-diem-ubnd-p-15-quan-4.html',
    checkedAt: '2026-10-17',
    scope:
      'Ngừng điểm UBND P.15 Quận 4 từ 10/03/2025; còn 4 điểm tại TP.HCM: MM Mega Market Bình Phú, MM Mega Market An Phú, UBND Phường 9 Quận 3 (82 Bà Huyện Thanh Quan), UBND Phường 17 Phú Nhuận (22 Nguyễn Văn Trỗi). Đọc qua kết quả tìm kiếm, chưa mở trực tiếp được trang.',
  },
  {
    id: 'vntc-contact',
    name: 'Việt Nam Tái Chế · Câu hỏi thường gặp (hotline, giờ làm việc)',
    url: 'https://vietnamrecycles.com/en/faq-en',
    checkedAt: '2026-10-17',
    scope: 'Hotline 0933 882 205, thứ Hai–thứ Sáu 8:30–17:00. Đọc qua kết quả tìm kiếm, chưa mở trực tiếp được trang.',
  },
];

const vntcAcceptance = (itemIds: string[]): Point['acceptance'] => [
  {
    itemIds,
    status: 'accepted',
    condition:
      'Website chương trình công bố tiếp nhận pin và các thiết bị điện tử trong danh mục. Cần xác nhận với chương trình trước khi mang tới, đặc biệt với thiết bị hỏng hoặc số lượng lớn.',
    sourceId: 'vntc-faq',
    checkedAt: '2026-10-04',
    validTo: null,
    verification: 'published',
    audience: 'household',
    maxQuantity: null,
    intactOnly: true,
  },
];

type Entry = Pick<Point, 'id' | 'name' | 'address' | 'originalAddress' | 'areaId'> &
  Pick<Required<Point>, 'mapsQuery' | 'note'>;

const entries: Entry[] = [
  {
    id: 'mega-an-phu',
    name: 'MM Mega Market An Phú · điểm Việt Nam Tái Chế',
    address: 'Khu B, Khu đô thị mới An Phú – An Khánh, TP.HCM',
    originalAddress: 'Khu B, KĐT mới An Phú – An Khánh, Phường An Phú, TP. Thủ Đức (trước 01/07/2025)',
    // Phường An Phú (Thủ Đức) was split between Phường Bình Trưng and Phường An Khánh; the store's ward is not settled
    // by the sources found, and today's Phường An Phú is a different place, so the point stays city-wide.
    areaId: 'all',
    mapsQuery: 'MM Mega Market An Phú, Thành phố Hồ Chí Minh',
    note: 'Phường mới sau sáp nhập chưa đối chiếu được: dữ liệu đăng ký doanh nghiệp ghi Phường Bình Trưng. Không nhầm với Phường An Phú (Thuận An cũ).',
  },
  {
    id: 'mega-binh-phu',
    name: 'MM Mega Market Bình Phú · điểm Việt Nam Tái Chế',
    address: '10 Bình Phú, Phường Bình Phú, TP.HCM',
    originalAddress: '10 Bình Phú, Quận 6 (trước 01/07/2025)',
    areaId: 'binh-phu',
    mapsQuery: 'MM Mega Market Bình Phú, 10 Bình Phú, Thành phố Hồ Chí Minh',
    note: '',
  },
  {
    id: 'nhieu-loc',
    name: 'Điểm Việt Nam Tái Chế · 82 Bà Huyện Thanh Quan',
    address: '82 Bà Huyện Thanh Quan, Phường Nhiêu Lộc, TP.HCM',
    originalAddress: 'UBND Phường 9, Quận 3, 82 Bà Huyện Thanh Quan (trước 01/07/2025)',
    areaId: 'nhieu-loc',
    mapsQuery: '82 Bà Huyện Thanh Quan, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh',
    note: 'Điểm đặt tại trụ sở UBND Phường 9 (Quận 3) cũ. Sau sáp nhập trụ sở có thể đổi công năng.',
  },
  {
    id: 'phu-nhuan',
    name: 'Điểm Việt Nam Tái Chế · Phú Nhuận',
    address: '145/9 Nguyễn Văn Trỗi, Phường Phú Nhuận, TP.HCM',
    originalAddress: '145/9 Nguyễn Văn Trỗi, Phú Nhuận (theo website VNTC, ghi nhận 04/10/2026)',
    areaId: 'phu-nhuan',
    mapsQuery: '145/9 Nguyễn Văn Trỗi, Phường Phú Nhuận, Thành phố Hồ Chí Minh',
    note: 'Nguồn chưa thống nhất: website VNTC (04/10/2026) ghi 145/9 Nguyễn Văn Trỗi, còn thông báo 03/2025 và báo chí ghi UBND Phường 17 cũ, 22 Nguyễn Văn Trỗi. Hãy gọi hỏi địa chỉ đang nhận trước khi đi.',
  },
];

const accepted = ['pin-aa', 'pin-cuc', 'pin-sac', 'dien-thoai', 'laptop', 'may-in', 'man-hinh', 'tivi', 'may-anh'];

export const hcmPoints: Point[] = entries.map((e) => ({
  ...e,
  scopeSourceId: 'vntc-points-2025',
  latitude: null,
  longitude: null,
  coordinateSource: '',
  placeId: '',
  phone: VNTC_HOTLINE,
  phoneSourceUrl: 'https://vietnamrecycles.com/en/faq-en',
  website: 'https://vietnamrecycles.com/',
  sourceUrl: 'https://vietnamrecycles.com/thong-bao-ngung-nhan-rac-thai-dien-tu-tai-diem-ubnd-p-15-quan-4.html',
  sourceCheckedAt: '2026-10-17',
  kind: 'fixed',
  serviceAreaIds: [],
  status: 'unconfirmed',
  validTo: null,
  hours: 'Giờ nhận tại điểm chưa được xác nhận. Hotline chương trình: thứ Hai–thứ Sáu, 8:30–17:00.',
  fee: 'Liên hệ xác nhận điều kiện tiếp nhận.',
  demo: false,
  acceptance: vntcAcceptance(accepted),
}));
