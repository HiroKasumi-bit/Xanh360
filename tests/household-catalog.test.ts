import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('../app/chatgpt-auth', () => ({getChatGPTUser: async () => null}));
import {sqlite, env} from './runtime';
import {POST as recognizeRoute} from '../app/api/recognize/route';
import {classify, normalize, ruleSchema, rulesOverlap, searchItems, type Answers, type Category} from '../lib/domain';
import {extraAliases, householdItemDefs, householdRules, visionHints} from '../lib/catalog-household';
import {seed} from '../lib/seed';

const now = new Date('2026-10-17T05:00:00Z');

// A label (what someone types, or the name the photo model picks) → catalog item → waste group after the usual
// questions are answered.
const table: [string, string, Answers, Category][] = [
  ['bút bi', 'but-bi', {}, 'residual'],
  ['ballpoint pen', 'but-bi', {}, 'residual'],
  ['bút dạ quang', 'but-da', {}, 'residual'],
  ['bút lông bảng', 'but-da', {}, 'residual'],
  ['ống hút', 'ong-hut', {}, 'residual'],
  ['ống hút trà sữa', 'ong-hut', {}, 'residual'],
  ['ly trà sữa', 'ly-tra-sua', {empty: true, clean: true}, 'recycle'],
  ['hộp xốp', 'hop-xop', {}, 'residual'],
  ['túi ni lông', 'tui-nilon', {clean: true}, 'unknown'],
  ['pin tiểu', 'pin-aa', {intact: true}, 'special'],
  ['dây sạc', 'day-cap', {intact: true}, 'special'],
  ['sạc điện thoại', 'cu-sac', {intact: true}, 'special'],
  ['tai nghe', 'tai-nghe', {intact: true}, 'special'],
  ['bóng led', 'den-led', {intact: true}, 'special'],
  ['bàn chải đánh răng', 'ban-chai', {}, 'residual'],
  ['khẩu trang đã dùng', 'khau-trang', {}, 'residual'],
  ['giấy in', 'giay', {clean: true}, 'recycle'],
  ['vỏ hộp sữa giấy', 'hop-sua', {empty: true}, 'unknown'],
  ['lon nhôm', 'lon', {empty: true}, 'recycle'],
  ['chai thủy tinh', 'chai-thuy-tinh', {empty: true, intact: true}, 'recycle'],
  ['quần áo cũ', 'quan-ao', {}, 'unknown'],
  ['giày thể thao', 'giay-dep', {}, 'unknown'],
  ['sách vở', 'sach', {clean: true}, 'recycle'],
  ['đồ điện tử nhỏ', 'do-dien-tu-nho', {intact: true}, 'special'],
  ['remote', 'do-dien-tu-nho', {intact: true}, 'special'],
  ['thẻ nhớ', 'usb-the-nho', {intact: true}, 'special'],
  ['dầu ăn thải', 'dau-an-thai', {}, 'unknown'],
  ['thuốc hết hạn', 'thuoc-het-han', {}, 'special'],
  ['kẹp giấy', 'kep-ghim', {}, 'recycle'],
  ['ly mì', 'mi-ly', {}, 'residual'],
  ['đũa dùng một lần', 'dua-go', {}, 'residual'],
  ['hoa héo', 'hoa-tuoi', {}, 'organic'],
  ['ba lô', 'tui-xach', {intact: true}, 'recycle'],
  ['ba lô', 'tui-xach', {intact: false}, 'residual'],
  ['bình xịt khử mùi', 'binh-xit-phong', {intact: true}, 'special'],
  ['bóng đèn tròn', 'bong-den-soi-dot', {intact: true}, 'residual'],
  ['móc áo nhựa', 'moc-ao-nhua', {clean: true}, 'recycle'],
];

describe('Map nhãn → vật dụng → nhóm rác', () => {
  it.each(table)('"%s" → %s → nhóm %s…', (label, id, answers, category) => {
    expect(searchItems(seed.items, label)[0]?.id).toBe(id);
    const r = classify(seed, id, 'all', answers, now);
    expect(r.status).toBe('result');
    expect(r.rule?.category).toBe(category);
    expect(r.rule?.sourceIds.length).toBeGreaterThan(0);
  });

  it('ly trà sữa còn nước hoặc chưa rửa không được xếp vào nhóm tái chế', () => {
    expect(classify(seed, 'ly-tra-sua', 'all', {empty: false, clean: true}, now).rule?.category).not.toBe('recycle');
    expect(classify(seed, 'ly-tra-sua', 'all', {empty: true, clean: false}, now).rule?.category).not.toBe('recycle');
  });

  it('bút bi nói rõ vì sao không bỏ vào nhóm nhựa tái chế', () => {
    const r = classify(seed, 'but-bi', 'all', {}, now);
    expect(r.rule?.avoid).toMatch(/nhựa tái chế/);
    expect(r.rule?.sourceIds).toContain('hcm-qd63-2024');
  });

  it('dầu ăn thải có cảnh báo không đổ xuống cống', () => {
    expect(classify(seed, 'dau-an-thai', 'all', {}, now).rule?.avoid).toMatch(/cống/);
  });

  it('đồ điện tử nhỏ bị hỏng, phồng chuyển sang hướng dẫn an toàn', () => {
    expect(classify(seed, 'do-dien-tu-nho', 'all', {intact: false}, now).status).toBe('hazard');
  });
});

describe('Toàn vẹn danh mục bổ sung', () => {
  it('thêm 40 món, không trùng mã hoặc tên', () => {
    expect(householdItemDefs).toHaveLength(40);
    expect(new Set(seed.items.map(i => i.id)).size).toBe(seed.items.length);
    expect(new Set(seed.items.map(i => normalize(i.name))).size).toBe(seed.items.length);
  });

  it('mỗi món mới có hướng dẫn có nguồn sau khi trả lời câu hỏi tình trạng', () => {
    for (const [id, , , , questions] of householdItemDefs) {
      const r = classify(seed, id, 'all', Object.fromEntries(questions.map(q => [q, true])), now);
      expect(r.rule, id).not.toBeNull();
      expect(r.rule?.steps.length, id).toBeGreaterThan(0);
    }
  });

  it('quy tắc hợp lệ, trỏ tới món và nguồn có thật, không chồng lấn', () => {
    for (const rule of householdRules) {
      expect(ruleSchema.safeParse(rule).success, rule.id).toBe(true);
      expect(rule.itemIds.every(id => seed.items.some(i => i.id === id)), rule.id).toBe(true);
      expect(rule.sourceIds.every(id => seed.sources.some(s => s.id === id)), rule.id).toBe(true);
      expect(seed.rules.filter(other => rulesOverlap(rule, other)), rule.id).toHaveLength(0);
    }
  });

  it('tên gọi bổ sung và gợi ý tiếng Anh chỉ trỏ tới món có trong danh mục', () => {
    for (const id of [...Object.keys(extraAliases), ...Object.keys(visionHints)]) {
      expect(seed.items.some(i => i.id === id), id).toBe(true);
    }
    for (const [id] of householdItemDefs) expect(visionHints[id], id).toBeTruthy();
  });
});

describe('Nhận diện ảnh gửi gợi ý tiếng Anh cho mô hình', () => {
  const run = vi.fn();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACklEQVR4nGP4DwABAQEAWdUqfgAAAABJRU5ErkJggg==';
  beforeEach(() => {
    sqlite.exec('DELETE FROM rate_limits');
    run.mockReset();
    env.AI = {run};
  });
  afterEach(() => {
    delete env.AI;
  });

  it('danh mục gửi kèm "Bút bi (ballpoint pen)", người dùng vẫn thấy tên tiếng Việt', async () => {
    run.mockResolvedValue({response: {status: 'ok', candidates: [{itemId: 'but-bi', label: 'pen'}]}});
    const res = await recognizeRoute(
      new Request('https://app.test/api/recognize', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', origin: 'https://app.test'},
        body: JSON.stringify({consent: true, image: png}),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({status: 'ok', candidates: [{itemId: 'but-bi', label: 'Bút bi'}]});
    const input = run.mock.calls[0][1] as {messages: {role: string; content: unknown}[]};
    const text = (input.messages.find(m => m.role === 'user')!.content as {type: string; text?: string}[]).find(
      p => p.type === 'text',
    )!.text!;
    expect(text).toContain('but-bi: Bút bi (ballpoint pen)');
    expect(text).toContain('pin-aa: Pin AA / AAA (AA or AAA battery)');
  });
});
