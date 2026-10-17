'use client';
import {ExternalLink, Gift, Landmark, Navigation, Phone, PhoneCall, Recycle, Search, Tag} from 'lucide-react';
import CommunityVotes from './community-votes';
import {type PlaceType, type ReusePlace, placeMapsUrl, placesFor, scrapYardSearchUrl} from '@/lib/reuse-places';

const typeIcons: Record<PlaceType, typeof Recycle> = {state: Landmark, brand: Tag, charity: Gift, scrap: Recycle};
const kindLabels: Record<ReusePlace['kind'], string> = {
  fixed: 'Điểm cố định',
  network: 'Chuỗi cửa hàng',
  app: 'Ứng dụng',
  pickup: 'Thu gom tận nhà',
  event: 'Theo đợt',
};
const day = (iso: string) => iso.split('-').reverse().join('/');

// Under the disposal guidance: where the item can be recycled or given away instead of thrown out, grouped by who runs
// it. None of these is confirmed yet, so each card leads with the call-ahead line and the number (or says there is
// none), the same rule as the collection points.
export default function ReusePlaces({itemId}: {itemId: string}) {
  const groups = placesFor(itemId);
  if (!groups.length) return null;
  const hasScrap = groups.some(g => g.type === 'scrap');
  return (
    <section className="reuse-places" aria-labelledby="reuse-title">
      <span className="eyebrow">Cho món đồ thêm một vòng đời</span>
      <h3 id="reuse-title">Tái chế, quyên góp ở đâu?</h3>
      <p className="small">
        Chỉ gồm chương trình tại TP.HCM có nguồn. Thông tin có thể đã thay đổi: hãy gọi trước khi mang đồ tới.
      </p>
      {groups.map(g => {
        const Icon = typeIcons[g.type];
        return (
          <div className="reuse-group" key={g.type}>
            <h4>
              <Icon aria-hidden="true" />
              {g.label}
            </h4>
            {g.places.map(p => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        );
      })}
      {hasScrap && (
        <a className="text-button" href={scrapYardSearchUrl()} target="_blank" rel="noreferrer">
          <Search aria-hidden="true" />
          Tìm vựa ve chai gần bạn trên Google Maps (chưa xác minh)
        </a>
      )}
    </section>
  );
}

function PlaceCard({place: p}: {place: ReusePlace}) {
  const maps = placeMapsUrl(p);
  const tel = p.phone ? 'tel:' + p.phone.replace(/[^+0-9]/g, '') : '';
  return (
    <article className="reuse-card">
      <div className="reuse-card-head">
        <span className="badge special">Chưa xác nhận</span>
        <span className="reuse-kind">{kindLabels[p.kind]}</span>
      </div>
      <h5>{p.name}</h5>
      {p.address && <p className="small">{p.address}</p>}
      <p>{p.accepts}</p>
      {p.schedule && <p className="small">{p.schedule}</p>}
      <div className="reuse-call" role="note">
        <PhoneCall aria-hidden="true" />
        <div>
          <b>Gọi trước để chắc chắn điểm còn nhận</b>
          <span>
            {p.phone ? `Số liên hệ: ${p.phone}` : 'Chưa tìm được số điện thoại liên hệ.'}
            {p.note && <> · {p.note}</>}
          </span>
        </div>
      </div>
      <div className="point-actions">
        {tel && (
          <a className="primary" href={tel}>
            <Phone aria-hidden="true" />
            Gọi {p.phone}
          </a>
        )}
        {maps && (
          <a className="btn-outline" href={maps} target="_blank" rel="noreferrer">
            <Navigation aria-hidden="true" />
            Xem trên Google Maps
          </a>
        )}
        {p.website && (
          <a className="text-button" href={p.website} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            Website
          </a>
        )}
      </div>
      {p.kind === 'fixed' && (
        <CommunityVotes
          kind="place"
          targetId={p.id}
          target={p.latitude != null && p.longitude != null ? {lat: p.latitude, lng: p.longitude} : null}
        />
      )}
      <p className="small reuse-sources">
        Nguồn:{' '}
        {p.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && '; '}
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.name}
            </a>
          </span>
        ))}{' '}
        · kiểm tra {day(p.sources[0].checkedAt)}
        {p.validTo && <> · hết hạn {day(p.validTo)}</>}
      </p>
    </article>
  );
}
