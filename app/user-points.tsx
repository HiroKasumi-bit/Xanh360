'use client';
import {useEffect, useRef, useState} from 'react';
import {CheckCircle2, Flag, Loader2, LocateFixed, MapPinPlus, Navigation, ThumbsDown, ThumbsUp, Users} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {api} from '@/lib/client';
import {readPosition} from '@/lib/device-access';
import {deviceId} from '@/lib/device-id';
import {haversine} from '@/lib/domain';
import {MAX_ACCURACY_M, VOTE_RADIUS_M} from '@/lib/votes';
import {
  CREATE_ACCURACY_M,
  USER_THRESHOLD,
  groupLabels,
  itemGroups,
  plainText,
  reportLabels,
  reportReasons,
  textProblem,
  userPointMapsUrl,
  type ItemGroup,
  type UserPoint,
} from '@/lib/user-points';

type Position = {lat: number; lng: number};

// Points added by visitors for the chosen item's group, under the sourced ones and clearly apart from them. Distance
// and the radius filter are worked out here from the visitor's position, which never leaves the page for this list.
export default function UserPoints({
  group,
  position,
  radiusKm,
  listHidden,
  addOpen,
  onAddOpenChange,
}: {
  group: ItemGroup | undefined;
  position: Position | null;
  radiusKm: number;
  listHidden: boolean;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}) {
  // The list is kept with the group it belongs to, so switching group shows the loading line until the new one lands.
  const [loaded, setLoaded] = useState<{group: ItemGroup; points: UserPoint[]} | null>(null);
  const points = group && loaded?.group === group ? loaded.points : null;
  const setPoints = (update: (list: UserPoint[]) => UserPoint[]) =>
    setLoaded(l => (l && group && l.group === group ? {group, points: update(l.points)} : l));
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!group) return;
    const c = new AbortController();
    void api<{points: UserPoint[]}>(`/api/user-points?group=${group}`, undefined, c.signal)
      .then(r => {
        if (!c.signal.aborted) setLoaded({group, points: r.points});
      })
      .catch(() => {
        if (!c.signal.aborted) setLoaded({group, points: []});
      });
    return () => c.abort();
  }, [group]);

  const shown = (points ?? [])
    .map(p => ({p, km: position ? haversine(position, {lat: p.latitude, lng: p.longitude}) : null}))
    .filter(x => !radiusKm || x.km === null || x.km <= radiusKm)
    .sort((a, b) => (a.km !== null && b.km !== null ? a.km - b.km : 0));
  const replace = (next: UserPoint) => setPoints(list => list.map(p => (p.id === next.id ? next : p)));
  const dialog = (
    <AddPointDialog
      open={addOpen}
      onOpenChange={onAddOpenChange}
      initialGroup={group}
      onAdded={p => {
        setPoints(list => [p, ...list.filter(x => x.id !== p.id)]);
        setNotice(`Đã thêm “${p.name}”. Cảm ơn bạn! Điểm sẽ hiện cho mọi người với nhãn “chưa kiểm chứng”.`);
      }}
    />
  );
  // While the safety notice for a damaged item leads the tab, the list stays out of the way; the form still opens.
  if (listHidden) return dialog;

  return (
    <section className="user-points" aria-labelledby="user-points-title">
      <div className="section-heading">
        <h2 id="user-points-title">Do người dùng thêm{'\u00a0'}· chưa kiểm chứng</h2>
        {shown.length > 0 && <span className="small">{shown.length} điểm</span>}
      </div>
      <p className="small">
        Người dùng Xanh360 tự thêm khi đang đứng tại điểm. Chưa đối chiếu với nguồn chính thức; đủ {USER_THRESHOLD} người
        tới tận nơi xác nhận thì điểm được ghi “Cộng đồng xác nhận”. Hãy gọi hỏi hoặc ghé xem trước khi mang nhiều đồ tới.
      </p>
      <p className="small user-points-notice" role="status">
        {notice}
      </p>
      {points === null ? (
        <div className="notice">
          <Loader2 className="spin" aria-hidden="true" />
          Đang tải điểm do người dùng thêm…
        </div>
      ) : (
        shown.map(({p, km}) => <UserPointCard key={p.id} point={p} km={km} onChange={replace} />)
      )}
      <div className="user-points-add">
        <p className="small">
          {points !== null && !shown.length ? 'Chưa có điểm nào do người dùng thêm cho loại này. ' : ''}Biết một điểm thu gom
          hoặc tiệm thu mua chưa có ở đây?
        </p>
        <button className="btn-outline" onClick={() => onAddOpenChange(true)}>
          <MapPinPlus aria-hidden="true" />
          Thêm điểm
        </button>
      </div>
      {dialog}
    </section>
  );
}

function UserPointCard({point: p, km, onChange}: {point: UserPoint; km: number | null; onChange: (p: UserPoint) => void}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{tone: 'ok' | 'error'; text: string} | null>(null);
  const [reporting, setReporting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const s = p.summary;

  async function send(kind: 'yes' | 'no' | (typeof reportReasons)[number]) {
    if (busy) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(kind);
    setMessage(null);
    try {
      let data: Record<string, unknown>;
      if (kind === 'yes' || kind === 'no') {
        const here = await readPosition(c.signal);
        if (here.accuracy > MAX_ACCURACY_M)
          throw new Error(`Vị trí chưa đủ chính xác (±${Math.round(here.accuracy)} m). Hãy bật GPS, ra chỗ thoáng và thử lại.`);
        const meters = haversine(here, {lat: p.latitude, lng: p.longitude}) * 1000;
        if (meters > VOTE_RADIUS_M)
          throw new Error(
            `Bạn đang cách điểm khoảng ${Math.round(meters).toLocaleString('vi-VN')} m. Chỉ xác nhận được khi ở trong bán kính ${VOTE_RADIUS_M} m.`,
          );
        data = {action: 'vote', id: p.id, vote: kind, deviceId: deviceId(), lat: here.lat, lng: here.lng, accuracy: here.accuracy};
      } else data = {action: 'report', id: p.id, reason: kind, deviceId: deviceId()};
      const r = await api<{point: UserPoint}>('/api/user-points', data, c.signal);
      if (c.signal.aborted) return;
      onChange(r.point);
      setReporting(false);
      setMessage({
        tone: 'ok',
        text: kind === 'yes' || kind === 'no' ? 'Cảm ơn bạn! Đã ghi nhận xác nhận của bạn.' : 'Cảm ơn bạn đã báo. Đủ 3 người báo thì điểm sẽ được ẩn.',
      });
    } catch (e) {
      if (!c.signal.aborted) setMessage({tone: 'error', text: (e as Error).message});
    } finally {
      if (!c.signal.aborted) setBusy(null);
    }
  }

  return (
    <article className="point-card is-unconfirmed is-user">
      <div className="point-title">
        <span className="pin-icon">
          <Users aria-hidden="true" />
        </span>
        <div>
          {s.status === 'confirmed' ? (
            <span className="badge recycle">
              <CheckCircle2 aria-hidden="true" />
              Cộng đồng xác nhận
            </span>
          ) : s.status === 'warning' ? (
            <span className="badge hazard">Cộng đồng báo: không còn nhận</span>
          ) : (
            <span className="badge special">Do người dùng thêm</span>
          )}
          <h3>{p.name}</h3>
        </div>
      </div>
      <p>{p.address}</p>
      <p className="small user-point-groups">Nhận: {p.groups.map(g => groupLabels[g]).join(' · ')}</p>
      {p.note && <p className="small">{p.note}</p>}
      <p className="small">{km !== null ? `${km.toFixed(1)} km theo đường chim bay` : 'Bật vị trí để xem khoảng cách.'}</p>
      <div className="point-actions">
        <a className="btn-outline" target="_blank" rel="noreferrer" href={userPointMapsUrl(p)}>
          <Navigation aria-hidden="true" />
          Xem trên Google Maps
        </a>
        <button className="text-button" aria-expanded={reporting} onClick={() => setReporting(v => !v)}>
          <Flag aria-hidden="true" />
          Báo điểm sai
        </button>
      </div>
      {reporting && (
        <div className="user-point-report" role="group" aria-label="Lý do báo điểm sai">
          {reportReasons.map(reason => (
            <button
              key={reason}
              className="btn-outline"
              aria-disabled={busy !== null || undefined}
              aria-busy={busy === reason || undefined}
              onClick={() => void send(reason)}
            >
              {busy === reason && <Loader2 className="spin" aria-hidden="true" />}
              {reportLabels[reason]}
            </button>
          ))}
        </div>
      )}
      <section className="community" aria-label="Xác nhận của cộng đồng">
        <div className="community-status">
          <Users aria-hidden="true" />
          <span>
            {s.yes} / {USER_THRESHOLD} người xác nhận tại chỗ
            {s.no > 0 && ` · ${s.no} người báo không còn nhận`}
          </span>
        </div>
        <div className="community-actions">
          {(['yes', 'no'] as const).map(choice => (
            <button
              key={choice}
              className="btn-outline"
              aria-disabled={busy !== null || undefined}
              aria-busy={busy === choice || undefined}
              onClick={() => void send(choice)}
            >
              {busy === choice ? (
                <Loader2 className="spin" aria-hidden="true" />
              ) : choice === 'yes' ? (
                <ThumbsUp aria-hidden="true" />
              ) : (
                <ThumbsDown aria-hidden="true" />
              )}
              {choice === 'yes' ? 'Điểm này có nhận' : 'Không còn nhận'}
            </button>
          ))}
        </div>
        <p className="small community-help">
          Chỉ bấm được khi bạn đang ở trong bán kính {VOTE_RADIUS_M} m quanh điểm. Người thêm điểm không tự xác nhận được.
        </p>
        <p className={'small community-message' + (message?.tone === 'error' ? ' is-error' : '')} role="status">
          {message?.text}
        </p>
      </section>
    </article>
  );
}

// The form for a new point. The position comes only from the phone at the place itself, read when the visitor asks
// for it; they can open it in Google Maps to check it is the right spot before sending. A problem is shown under the
// field it belongs to (and linked to it for screen readers), which takes focus; a refusal from the server that is not
// about one field shows above the buttons.
type Field = 'name' | 'address' | 'note' | 'groups' | 'location' | 'form';
const fieldOf = (message: string): Field =>
  message.startsWith('Tên điểm')
    ? 'name'
    : message.startsWith('Địa chỉ')
      ? 'address'
      : message.startsWith('Ghi chú')
        ? 'note'
        : message.startsWith('Vị trí')
          ? 'location'
          : 'form';

function AddPointDialog({
  open,
  onOpenChange,
  initialGroup,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGroup: ItemGroup | undefined;
  onAdded: (p: UserPoint) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-point-dialog">
        <DialogTitle>Thêm điểm thu gom, tái chế</DialogTitle>
        <DialogDescription>
          Chỉ thêm khi bạn đang đứng tại điểm: vị trí hiện tại của bạn sẽ là vị trí của điểm. Mỗi thiết bị thêm được 1 điểm
          mỗi ngày.
        </DialogDescription>
        <AddPointForm
          initialGroup={initialGroup}
          onCancel={() => onOpenChange(false)}
          onAdded={p => {
            onAdded(p);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Mounted with the dialog content, so every opening starts from an empty form with the chosen item's group ticked.
function AddPointForm({
  initialGroup,
  onCancel,
  onAdded,
}: {
  initialGroup: ItemGroup | undefined;
  onCancel: () => void;
  onAdded: (p: UserPoint) => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [groups, setGroups] = useState<ItemGroup[]>(initialGroup ? [initialGroup] : []);
  const [here, setHere] = useState<(Position & {accuracy: number}) | null>(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{field: Field; text: string} | null>(null);
  const controller = useRef<AbortController | null>(null);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  useEffect(() => () => controller.current?.abort(), []);

  const fail = (field: Field, text: string) => {
    setError({field, text});
    requestAnimationFrame(() => refs.current[field]?.focus());
  };
  // Props that tie a field to its error line.
  const describe = (field: Field) =>
    error?.field === field ? {'aria-invalid': true, 'aria-describedby': `add-point-${field}-error`} : {};
  const errorLine = (field: Field) =>
    error?.field === field && (
      <span id={`add-point-${field}-error`} className="small add-point-error" role="alert">
        {error.text}
      </span>
    );

  async function locate() {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setLocating(true);
    setError(null);
    try {
      const p = await readPosition(c.signal);
      if (c.signal.aborted) return;
      setHere(p);
      if (p.accuracy > CREATE_ACCURACY_M)
        fail('location', `Vị trí chưa đủ chính xác (±${Math.round(p.accuracy)} m). Hãy bật GPS, ra chỗ thoáng gần điểm rồi lấy lại.`);
    } catch (e) {
      if (!c.signal.aborted) fail('location', (e as Error).message);
    } finally {
      if (!c.signal.aborted) setLocating(false);
    }
  }

  // Field by field, top to bottom, so focus lands on the first field that needs attention.
  function check(): [Field, string] | null {
    for (const [field, value, min, empty] of [
      ['name', name, 3, 'Hãy nhập tên điểm, ít nhất 3 ký tự.'],
      ['address', address, 5, 'Hãy nhập địa chỉ, ít nhất 5 ký tự.'],
      ['note', note, 0, ''],
    ] as const) {
      if (plainText(value).length < min) return [field, empty];
      const problem = textProblem(plainText(value));
      if (problem) return [field, problem];
    }
    if (!groups.length) return ['groups', 'Hãy chọn ít nhất một loại điểm này nhận.'];
    if (!here) return ['location', 'Hãy bấm “Lấy vị trí tại đây” khi bạn đang đứng tại điểm.'];
    if (here.accuracy > CREATE_ACCURACY_M) return ['location', 'Vị trí chưa đủ chính xác. Hãy lấy lại vị trí ở chỗ thoáng.'];
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    const problem = check();
    if (problem) {
      fail(...problem);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await api<{point: UserPoint}>('/api/user-points', {
        action: 'create',
        name,
        address,
        note,
        groups,
        deviceId: deviceId(),
        lat: here!.lat,
        lng: here!.lng,
        accuracy: here!.accuracy,
      });
      onAdded(r.point);
    } catch (e) {
      const text = (e as Error).message;
      fail(fieldOf(text), text.replace(/^(Tên điểm|Địa chỉ|Ghi chú): /, ''));
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="add-point-form" onSubmit={e => void submit(e)} noValidate>
      <label>
        Tên điểm
        <input
          ref={el => {
            refs.current.name = el;
          }}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={80}
          placeholder="Ví dụ: Tiệm ve chai đầu hẻm 12"
          {...describe('name')}
        />
        {errorLine('name')}
      </label>
      <label>
        Địa chỉ
        <input
          ref={el => {
            refs.current.address = el;
          }}
          value={address}
          onChange={e => setAddress(e.target.value)}
          maxLength={160}
          placeholder="Số nhà, tên đường, phường"
          {...describe('address')}
        />
        {errorLine('address')}
      </label>
      <fieldset {...describe('groups')}>
        <legend>Điểm này nhận những loại nào?</legend>
        <div className="add-point-groups">
          {itemGroups.map((g, i) => (
            <label key={g} className="add-point-chip">
              <input
                ref={
                  i === 0
                    ? el => {
                        refs.current.groups = el;
                      }
                    : undefined
                }
                type="checkbox"
                checked={groups.includes(g)}
                onChange={e => setGroups(list => (e.target.checked ? [...list, g] : list.filter(x => x !== g)))}
              />
              {groupLabels[g]}
            </label>
          ))}
        </div>
        {errorLine('groups')}
      </fieldset>
      <label>
        <span>
          Ghi chú <span className="muted">(không bắt buộc)</span>
        </span>
        <input
          ref={el => {
            refs.current.note = el;
          }}
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={200}
          placeholder="Giờ mở cửa, điều kiện nhận…"
          {...describe('note')}
        />
        {errorLine('note')}
      </label>
      <div className="add-point-location">
        <button
          ref={el => {
            refs.current.location = el;
          }}
          type="button"
          className="btn-outline"
          aria-busy={locating || undefined}
          onClick={() => void locate()}
          {...describe('location')}
        >
          {locating ? <Loader2 className="spin" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
          {here ? 'Lấy lại vị trí' : 'Lấy vị trí tại đây'}
        </button>
        {here && (
          <p className="small">
            Đã lấy vị trí (±{Math.round(here.accuracy)} m).{' '}
            <a href={userPointMapsUrl({latitude: here.lat, longitude: here.lng})} target="_blank" rel="noreferrer">
              Kiểm tra trên Google Maps
            </a>
          </p>
        )}
        {errorLine('location')}
      </div>
      <p className="small muted">
        Không thêm nhà riêng, số điện thoại hay đường link. Điểm sẽ hiện cho mọi người với nhãn “chưa kiểm chứng”.
      </p>
      <p
        ref={el => {
          refs.current.form = el;
        }}
        tabIndex={-1}
        className="small add-point-error"
        role="alert"
      >
        {error?.field === 'form' ? error.text : ''}
      </p>
      <div className="add-point-actions">
        <button type="button" className="btn-outline" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary" aria-busy={sending || undefined}>
          {sending && <Loader2 className="spin" aria-hidden="true" />}
          Thêm điểm
        </button>
      </div>
    </form>
  );
}
