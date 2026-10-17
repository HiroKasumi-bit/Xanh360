'use client';
import {useState} from 'react';
import {MapPin, Navigation, ExternalLink, Phone, PhoneCall, ShieldCheck} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {findPoints} from '@/lib/domain';
import CommunityVotes from './community-votes';

export type PointMatch = ReturnType<typeof findPoints>['confirm'][number];

const day = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Radix opens a dialog on its first control that is not a link; in the point details that is the report button at the
// very end, out of sight on a short screen. The dialog itself takes focus instead: its title and address are read
// first, and Tab goes on to the website link.
const focusDialog = (event: Event) => {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({preventScroll: true});
};

// A point that is not confirmed still shows, with the number to call and a call-ahead line that cannot be missed:
// the published list may be out of date, and a wasted trip with a bag of batteries is how people give up.
export default function PointCard({data, onFeedback}: {data: PointMatch; onFeedback: () => void}) {
  const [open, setOpen] = useState(false);
  const p = data.point;
  const tel = p.phone ? 'tel:' + p.phone.replace(/[^+0-9]/g, '') : '';
  return (
    <article className={'point-card' + (data.verified ? '' : ' is-unconfirmed')}>
      <div className="point-title">
        <span className="pin-icon">
          <MapPin />
        </span>
        <div>
          <span className={'badge ' + (data.verified ? 'recycle' : 'special')}>
            {data.verified ? (
              <>
                <ShieldCheck aria-hidden="true" />
                Đã xác nhận
              </>
            ) : (
              'Chưa xác nhận'
            )}
          </span>
          <h3>{p.name}</h3>
        </div>
      </div>
      <p>{p.address}</p>
      <p className="small">
        {data.km !== null
          ? `${data.km.toFixed(1)} km theo đường chim bay`
          : 'Chưa có tọa độ kiểm chứng nên chưa tính khoảng cách.'}
      </p>
      {!data.verified && (
        <div className="call-ahead" role="note">
          <PhoneCall aria-hidden="true" />
          <div>
            <b>Gọi trước để chắc chắn điểm còn nhận</b>
            <span>
              {p.phone ? `Số liên hệ: ${p.phone}` : 'Chưa tìm được số điện thoại liên hệ cho điểm này.'}
              {p.note && <> · {p.note}</>}
            </span>
          </div>
        </div>
      )}
      <div className="point-actions">
        {!data.verified && tel && (
          <a className="primary" href={tel}>
            <Phone aria-hidden="true" />
            Gọi {p.phone}
          </a>
        )}
        {data.directions && (
          <a
            className={data.verified ? 'primary' : 'btn-outline'}
            target="_blank"
            rel="noreferrer"
            href={data.directions}
          >
            <Navigation aria-hidden="true" />
            Xem trên Google Maps
          </a>
        )}
        {data.verified && tel && (
          <a className="btn-outline" href={tel}>
            <Phone aria-hidden="true" />
            Gọi {p.phone}
          </a>
        )}
        <button className="text-button" onClick={() => setOpen(true)}>
          Chi tiết
        </button>
      </div>
      {p.kind !== 'pickup' && (
        <CommunityVotes
          kind="point"
          targetId={p.id}
          target={p.latitude !== null && p.longitude !== null ? {lat: p.latitude, lng: p.longitude} : null}
        />
      )}
      {p.sourceUrl && (
        <p className="small point-source">
          Nguồn:{' '}
          <a href={p.sourceUrl} target="_blank" rel="noreferrer">
            {new URL(p.sourceUrl).hostname.replace(/^www\./, '')}
          </a>
          {p.sourceCheckedAt && <> · kiểm tra {day(p.sourceCheckedAt)}</>}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onOpenAutoFocus={focusDialog}>
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>{p.address}</DialogDescription>
          {p.originalAddress && p.originalAddress !== p.address && (
            <p className="small">Địa chỉ cũ: {p.originalAddress}</p>
          )}
          {p.note && <p className="small">{p.note}</p>}
          <h3>Điều kiện tiếp nhận</h3>
          <p>{data.acceptance.condition}</p>
          <p>{p.hours}</p>
          <p>{p.fee}</p>
          <p className="small">
            {data.verified
              ? `Đã đối chiếu nguồn chính thức và tọa độ${p.sourceCheckedAt ? ` (kiểm tra ${day(p.sourceCheckedAt)})` : ''}.`
              : `Chưa xác nhận trực tiếp: điểm có trong danh sách công bố nhưng chưa có tọa độ kiểm chứng hoặc xác nhận tại chỗ. Danh mục tiếp nhận kiểm tra ${day(data.acceptance.checkedAt)}.`}
          </p>
          {p.phone && (
            <p className="small">
              Số điện thoại {p.phone}
              {p.phoneSourceUrl && (
                <>
                  {' '}
                  theo{' '}
                  <a href={p.phoneSourceUrl} target="_blank" rel="noreferrer">
                    trang liên hệ của chương trình
                  </a>
                </>
              )}
              .
            </p>
          )}
          <a className="btn-outline" href={p.website} target="_blank" rel="noreferrer">
            <ExternalLink />
            Website chương trình
          </a>
          <button
            className="text-button"
            onClick={() => {
              setOpen(false);
              onFeedback();
            }}
          >
            Báo thông tin chưa đúng
          </button>
        </DialogContent>
      </Dialog>
    </article>
  );
}
