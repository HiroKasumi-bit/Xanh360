'use client';
import {useEffect, useRef, useState} from 'react';
import {Loader2, ThumbsDown, ThumbsUp, Users} from 'lucide-react';
import {api} from '@/lib/client';
import {readPosition} from '@/lib/device-access';
import {deviceId} from '@/lib/device-id';
import {haversine} from '@/lib/domain';
import {MAX_ACCURACY_M, THRESHOLD, VOTE_RADIUS_M, WINDOW_DAYS, type VoteKind, type VoteSummary} from '@/lib/votes';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric'});

// "Điểm này có nhận" / "Không còn nhận" for someone standing at the point. The phone's position is checked here first
// (so a person 3 km away hears it at once) and again on the server, which is the check that counts.
export default function CommunityVotes({
  kind,
  targetId,
  target,
}: {
  kind: VoteKind;
  targetId: string;
  target: {lat: number; lng: number} | null;
}) {
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null);
  const [message, setMessage] = useState<{tone: 'ok' | 'error'; text: string} | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = new AbortController();
    void api<{summaries: Record<string, VoteSummary>}>(
      `/api/votes?kind=${kind}&ids=${encodeURIComponent(targetId)}`,
      undefined,
      c.signal,
    )
      .then(r => {
        if (!c.signal.aborted) setSummary(r.summaries[targetId] ?? null);
      })
      .catch(() => {});
    return () => {
      c.abort();
      controller.current?.abort();
    };
  }, [kind, targetId]);

  async function vote(choice: 'yes' | 'no') {
    if (busy || !target) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(choice);
    setMessage(null);
    try {
      const here = await readPosition(c.signal);
      if (here.accuracy > MAX_ACCURACY_M)
        throw new Error(`Vị trí chưa đủ chính xác (±${Math.round(here.accuracy)} m). Hãy bật GPS, ra chỗ thoáng và thử lại.`);
      const meters = haversine(here, target) * 1000;
      if (meters > VOTE_RADIUS_M)
        throw new Error(
          `Bạn đang cách điểm khoảng ${Math.round(meters).toLocaleString('vi-VN')} m. Chỉ xác nhận được khi ở trong bán kính ${VOTE_RADIUS_M} m.`,
        );
      const r = await api<{summary: VoteSummary}>(
        '/api/votes',
        {kind, targetId, vote: choice, deviceId: deviceId(), lat: here.lat, lng: here.lng, accuracy: here.accuracy},
        c.signal,
      );
      if (c.signal.aborted) return;
      setSummary(r.summary);
      setMessage({tone: 'ok', text: 'Cảm ơn bạn! Đã ghi nhận xác nhận của bạn.'});
    } catch (e) {
      if (!c.signal.aborted) setMessage({tone: 'error', text: (e as Error).message});
    } finally {
      if (!c.signal.aborted) setBusy(null);
    }
  }

  return (
    <section className="community" aria-label="Xác nhận của cộng đồng">
      <div className="community-status">
        <Users aria-hidden="true" />
        {summary?.status === 'confirmed' ? (
          <span className="badge recycle">Đã xác nhận bởi cộng đồng</span>
        ) : summary?.status === 'warning' ? (
          <span className="badge hazard">Cộng đồng báo: không còn nhận</span>
        ) : (
          <span>Chưa đủ {THRESHOLD} người xác nhận tại chỗ</span>
        )}
      </div>
      <p className="small">
        {summary?.lastConfirmedAt ? `Xác nhận lần cuối: ${day(summary.lastConfirmedAt)}` : 'Chưa có ai xác nhận tại chỗ.'}
        {summary && (summary.yes > 0 || summary.no > 0) && (
          <>
            {' '}
            · {WINDOW_DAYS} ngày qua: {summary.yes} người báo có nhận, {summary.no} người báo không còn nhận.
          </>
        )}
      </p>
      <div className="community-actions">
        {(['yes', 'no'] as const).map(choice => (
          <button
            key={choice}
            className="btn-outline"
            aria-disabled={!target || busy !== null || undefined}
            aria-busy={busy === choice || undefined}
            onClick={() => void vote(choice)}
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
        {target
          ? `Chỉ bấm được khi bạn đang ở trong bán kính ${VOTE_RADIUS_M} m quanh điểm. Mỗi thiết bị một lần mỗi điểm mỗi ngày; không lưu vị trí của bạn.`
          : 'Điểm chưa có tọa độ kiểm chứng nên chưa thể xác nhận tại chỗ.'}
      </p>
      <p className={'small community-message' + (message?.tone === 'error' ? ' is-error' : '')} role="status">
        {message?.text}
      </p>
    </section>
  );
}
