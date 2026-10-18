import type { Point, Source } from './domain';

// Collection points other than the VNTC programme, reviewed 2026-10-17:
// - The Tân Mỹ MRF station, run by the ward People's Committee with Unilever and Grac. Newspapers and Grac give two
//   addresses ("số 4 đường Tân Phú" and "04 Đường số 4"); Google Maps has the station itself at 04 Đường số 4, about
//   60 m from 4 Tân Phú on OpenStreetMap, so both name the same corner. Confirmed.
// - Shops that buy broken or old electronics ("thu mua xác"). Each one is listed on Google Maps at its address with a
//   phone number; that listing is the shop's own information, nothing independent, so every shop is marked
//   unconfirmed and the card asks people to call first. Shops were picked when their name says they buy broken
//   devices and the listing has a street number and a phone; one with a 3.0 rating was left out. They are businesses
//   that pay for parts, not certified recyclers.
const CHECKED = '2026-10-17';

export const collectorSources: Source[] = [
  {
    id: 'tan-my-mrf',
    name: 'SGGP · Đưa vào hoạt động trạm đổi rác nhận quà (Phường Tân Mỹ)',
    url: 'https://www.sggp.org.vn/dua-vao-hoat-dong-tram-doi-rac-nhan-qua-post846096.html',
    checkedAt: CHECKED,
    scope:
      'Trạm MRF do UBND Phường Tân Mỹ vận hành, Unilever Việt Nam tài trợ, Grac ghi nhận qua ứng dụng; người dân đổi chai, lon, giấy lấy quà. Hoạt động từ 04/2026 đến 12/2026.',
  },
  {
    id: 'gmaps-listing',
    name: 'Google Maps · thông tin cửa hàng tự đăng',
    url: 'https://www.google.com/maps',
    checkedAt: CHECKED,
    scope: 'Tên, địa chỉ, số điện thoại do cửa hàng đăng trên Google Maps; chưa được xác minh độc lập.',
  },
];

const recyclables = ['chai-nhua', 'hop-nhua', 'ly-nhua', 'can-nhua-thuc-pham', 'giay', 'bao', 'carton', 'tap-chi', 'lon', 'hop-thiec'];
const phones = ['dien-thoai', 'may-tinh-bang'];
const computers = ['laptop', 'man-hinh', 'may-in', 'ban-phim', 'chuot-may-tinh'];

const base = {
  placeId: '',
  website: 'https://www.google.com/maps',
  kind: 'fixed' as const,
  serviceAreaIds: [],
  validTo: null,
  demo: false,
  sourceCheckedAt: CHECKED,
};

export const tanMyMrf: Point = {
  ...base,
  id: 'mrf-tan-my',
  name: 'Trạm thu hồi vật liệu tái chế (MRF) Phường Tân Mỹ',
  provider: 'state',
  address: '04 Đường số 4, KĐT Phú Mỹ Hưng, Phường Tân Mỹ, TP.HCM',
  originalAddress: 'Báo SGGP ghi: công viên “Tân Mỹ muôn sắc hoa”, số 4 đường Tân Phú',
  areaId: 'tan-my',
  scopeSourceId: 'tan-my-mrf',
  latitude: 10.7314465,
  longitude: 106.7266794,
  coordinateSource: `OpenStreetMap: 4 Tân Phú, Phường Tân Mỹ; Google Maps đặt “Trạm phân loại rác (MRF) phường Tân Mỹ” ở 04 Đường số 4, cách khoảng 60 m, kiểm tra ${CHECKED}`,
  phone: '0902 727 053',
  phoneSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Tr%E1%BA%A1m%20MRF%20Ph%C6%B0%E1%BB%9Dng%20T%C3%A2n%20M%E1%BB%B9',
  website: 'https://grac.vn/doi-rac-tai-che-nhan-qua-thiet-thuc-tai-tram-mrf-phuong-tan-my/',
  sourceUrl: 'https://www.sggp.org.vn/dua-vao-hoat-dong-tram-doi-rac-nhan-qua-post846096.html',
  mapsQuery: 'Trạm phân loại rác (MRF) phường Tân Mỹ, Thành phố Hồ Chí Minh',
  note: 'Số điện thoại theo Google Maps. Đổi quà đến 31/12/2026.',
  status: 'active',
  validTo: '2026-12-31',
  hours: 'Giờ mở cửa chưa được công bố; gọi trước nếu đi xa.',
  fee: 'Miễn phí; rác được cân theo loại và đổi thành điểm thưởng trên ứng dụng Grac để nhận quà.',
  acceptance: [
    {
      itemIds: recyclables,
      status: 'accepted',
      condition:
        'Nhận rác tái chế đã phân loại, làm sạch và ép dẹp: chai và hộp nhựa, lon, giấy, bìa. Rác được cân theo loại (nhựa PET, HDPE, giấy, kim loại) và đổi điểm lấy quà.',
      sourceId: 'tan-my-mrf',
      checkedAt: CHECKED,
      validTo: '2026-12-31',
      verification: 'published',
      audience: 'household',
      maxQuantity: null,
      intactOnly: false,
    },
  ],
};

type Shop = {
  id: string;
  name: string;
  address: string;
  areaId: string;
  lat: number;
  lng: number;
  phone: string;
  url: string;
  items: string[];
  note?: string;
};

// From each shop's Google Maps listing (name, address, phone, coordinates), checked 2026-10-17.
const shops: Shop[] = [
  {
    id: 'xac-dt-nguyen-kiem',
    name: 'Thu Mua Xác Điện Thoại Giá Cao',
    address: '968 Nguyễn Kiệm, Phường Hạnh Thông, TP.HCM',
    areaId: 'hanh-thong',
    lat: 10.824943,
    lng: 106.6796516,
    phone: '0981 688 188',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJVT6OuhwpdTERoe4WX3Rpq3k',
    items: phones,
  },
  {
    id: 'xac-dt-quang-trung',
    name: 'Mua Xác Điện Thoại Cũ TPHCM',
    address: '386/37 Quang Trung, Phường Gò Vấp, TP.HCM',
    areaId: 'go-vap',
    lat: 10.8331999,
    lng: 106.6674416,
    phone: '0363 090 345',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJ28WfA1kvdTERQ1A70X4tQkg',
    items: phones,
  },
  {
    id: 'xac-tuan-mobile-ba-dinh',
    name: 'Tuấn Mobile · thu xác điện thoại, laptop',
    address: '222 Ba Đình, Phường Chánh Hưng, TP.HCM',
    areaId: 'chanh-hung',
    lat: 10.7471666,
    lng: 106.6654794,
    phone: '0903 645 433',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJ2YGPZwAvdTERCD9shzSS7RA',
    items: [...phones, 'laptop'],
  },
  {
    id: 'xac-dt-an-binh',
    name: 'Thu mua xác điện thoại · An Bình',
    address: '18/38 Đường An Bình, Phường Dĩ An, TP.HCM',
    areaId: 'di-an',
    lat: 10.8762322,
    lng: 106.7613629,
    phone: '0929 291 138',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJWyLLEADZdDERycjvVab3Nak',
    items: phones,
  },
  {
    id: 'xac-dt-ql13',
    name: 'Mua xác điện thoại cũ, hư, bể, vào nước',
    address: '277 Quốc lộ 13 cũ, Phường Hiệp Bình, TP.HCM',
    areaId: 'hiep-binh',
    lat: 10.8677962,
    lng: 106.7173831,
    phone: '0981 770 880',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJYSVuJiIpdTERe3egoWDoh3w',
    items: phones,
  },
  {
    id: 'xac-tuan-nguyen-mobile',
    name: 'Tuấn Nguyễn Mobile',
    address: '219/69 Đỗ Thị Lời, Phường Nhiêu Lộc, TP.HCM',
    areaId: 'nhieu-loc',
    lat: 10.7866882,
    lng: 106.6718725,
    phone: '0984 039 038',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJwVUJIvsvdTERpXpz4G2aXr4',
    items: [...phones, 'laptop'],
  },
  {
    id: 'xac-dt-tan-thoi-nhat',
    name: 'Điện thoại T & N · thu mua xác điện thoại hư',
    address: '121 Tân Thới Nhất 01, Phường Đông Hưng Thuận, TP.HCM',
    areaId: 'dong-hung-thuan',
    lat: 10.8401972,
    lng: 106.6149203,
    phone: '0389 777 859',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJh0mDfwArdTERIcgN6BIRZvM',
    items: phones,
  },
  {
    id: 'xac-laptop-truong-chinh',
    name: 'Thu mua xác laptop, máy tính, máy in, màn hình hư',
    address: '509 Trường Chinh, Phường Đông Hưng Thuận, TP.HCM',
    areaId: 'dong-hung-thuan',
    lat: 10.8391821,
    lng: 106.6171232,
    phone: '0909 250 456',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJYygz5QApdTEROZZwZFkj6is',
    items: computers,
  },
  {
    id: 'xac-laptop-tien-giang',
    name: 'Thu Mua Xác Laptop',
    address: '2 Tiền Giang, Phường Tân Sơn Hòa, TP.HCM',
    areaId: 'tan-son-hoa',
    lat: 10.80798,
    lng: 106.6651954,
    phone: '0888 880 461',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJbTFwUCMpdTERhWfSMdj3eys',
    items: ['laptop'],
    note: 'Chưa có đánh giá trên Google Maps.',
  },
  {
    id: 'xac-laptop-nguyen-duy-trinh',
    name: 'Thu Mua Laptop Hư Cũ & Sửa Chữa Laptop PC',
    address: '1403A Nguyễn Duy Trinh, Phường Long Phước, TP.HCM',
    areaId: 'long-phuoc',
    lat: 10.8058853,
    lng: 106.8189042,
    phone: '0328 582 838',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJidGdRQAhdTERprNNtLcThPI',
    items: ['laptop'],
  },
  {
    id: 'xac-kho-thu-duc',
    name: 'Kho Thủ Đức · phế liệu điện tử',
    address: '205 Quốc lộ 1A, Phường Tam Bình, TP.HCM',
    areaId: 'tam-binh',
    lat: 10.8726386,
    lng: 106.7420257,
    phone: '0984 284 240',
    url: 'https://www.google.com/maps/place/?q=place_id:ChIJywGXXWUpdTERSknsItvTXu0',
    items: [...phones, ...computers, 'tivi', 'may-anh', 'loa', 'router', 'day-cap', 'cu-sac'],
  },
];

export const scrapShops: Point[] = shops.map((s) => ({
  ...base,
  id: s.id,
  name: s.name,
  provider: 'scrap',
  address: s.address,
  originalAddress: '',
  areaId: s.areaId,
  scopeSourceId: 'gmaps-listing',
  latitude: s.lat,
  longitude: s.lng,
  coordinateSource: `Google Maps, thông tin cửa hàng tự đăng, kiểm tra ${CHECKED}`,
  phone: s.phone,
  phoneSourceUrl: s.url,
  sourceUrl: s.url,
  mapsQuery: `${s.name.split(' · ')[0]}, ${s.address.replace(/TP\.HCM$/, 'Thành phố Hồ Chí Minh')}`,
  note: s.note ?? '',
  status: 'unconfirmed',
  hours: 'Giờ mở cửa xem trên Google Maps.',
  fee: 'Tiệm trả tiền theo tình trạng máy; hỏi giá trước.',
  acceptance: [
    {
      itemIds: s.items,
      status: 'accepted',
      condition:
        'Tiệm tư nhân thu mua đồ điện tử cũ và hư (xác máy) để lấy linh kiện, không phải điểm tái chế chính thức. Sao lưu, xóa dữ liệu và đăng xuất tài khoản trước khi bán.',
      sourceId: 'gmaps-listing',
      checkedAt: CHECKED,
      validTo: null,
      verification: 'unverified',
      audience: 'both',
      maxQuantity: null,
      intactOnly: false,
    },
  ],
}));

export const collectorPoints: Point[] = [tanMyMrf, ...scrapShops];
