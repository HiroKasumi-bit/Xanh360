import {describe, expect, it} from 'vitest';
import {classify, findPoints, normalize, ruleSchema, rulesOverlap, searchItems, type Answers} from '../lib/domain';
import {additionalItemDefs, additionalRules} from '../lib/catalog-expansion';
import {seed} from '../lib/seed';

const now = new Date('2026-10-06T12:00:00Z');
const result = (id:string, answers:Answers={}) => classify(seed, id, 'all', answers, now);
const pointQuery = {itemId:'nhiet-ke-thuy-ngan',areaId:'all',quantity:1,audience:'household' as const,intact:true,radius:0};

describe('Danh mục mở rộng có thể tra cứu và có hướng dẫn', () => {
  it('thêm 72 món, không trùng mã hoặc tên với 48 món đang có', () => {
    expect(additionalItemDefs).toHaveLength(72);
    expect(seed.items).toHaveLength(120);
    expect(new Set(seed.items.map(i=>i.id)).size).toBe(seed.items.length);
    expect(new Set(seed.items.map(i=>normalize(i.name))).size).toBe(seed.items.length);
  });

  it.each([
    ['nhiet ke thuy ngan','nhiet-ke-thuy-ngan'],['nhiệt kế thuỷ ngân','nhiet-ke-thuy-ngan'],
    ['nhiệt kế thủy ngân vỡ','nhiet-ke-thuy-ngan'],['cặp nhiệt độ','nhiet-ke-thuy-ngan'],
    ['nhiệt kế điện tử','nhiet-ke-dien-tu'],['hộp quẹt','bat-lua'],['vape','thuoc-la-dien-tu'],
    ['kim thử đường huyết','kim-chich-mau'],['bàn là','ban-ui'],['javen','nuoc-tay'],
  ])('tìm %s đúng món %s', (query,id) => {
    expect(searchItems(seed.items,query)[0]?.id).toBe(id);
  });

  it('tìm nhiệt kế cho phép phân biệt thủy ngân và điện tử', () => {
    expect(searchItems(seed.items,'nhiệt kế').map(i=>i.id)).toEqual(expect.arrayContaining(['nhiet-ke-thuy-ngan','nhiet-ke-dien-tu']));
  });

  it('mọi món có hướng dẫn có nguồn sau khi xác nhận tình trạng thông thường', () => {
    for (const item of seed.items) {
      const answers=Object.fromEntries(item.questions.map(q=>[q,true]));
      const r=result(item.id,answers);
      expect(r.rule, item.id).not.toBeNull();
      expect(r.rule?.steps.length, item.id).toBeGreaterThan(0);
      expect(r.rule?.sourceIds.length, item.id).toBeGreaterThan(0);
    }
  });

  it('các liên kết nguồn, vật dụng và phạm vi tồn tại; không có quy tắc chồng lấn', () => {
    for(const rule of additionalRules) {
      expect(ruleSchema.safeParse(rule).success,rule.id).toBe(true);
      expect(rule.itemIds.every(id=>seed.items.some(i=>i.id===id)),rule.id).toBe(true);
      expect(rule.sourceIds.every(id=>seed.sources.some(s=>s.id===id)),rule.id).toBe(true);
      expect(seed.rules.filter(other=>rulesOverlap(rule,other)),rule.id).toHaveLength(0);
    }
  });
});

describe('Thủy ngân và tình huống vỡ, rò rỉ', () => {
  it('hỏi nhiệt kế còn nguyên trước khi đưa ra hướng xử lý', () => {
    const r=result('nhiet-ke-thuy-ngan');
    expect(r.status).toBe('questions');
    expect(r.questions).toEqual(['intact']);
    expect(r.rule).toBeNull();
  });

  it('nhiệt kế còn nguyên được giữ riêng, không gom như chai lọ hoặc pin', () => {
    const r=result('nhiet-ke-thuy-ngan',{intact:true});
    expect(r.status).toBe('result');
    expect(r.rule?.id).toBe('mercury-intact');
    expect(r.rule?.category).toBe('special');
    expect(r.rule?.avoid).toMatch(/thùng chai lọ thủy tinh/);
  });

  it('nhiệt kế vỡ có hướng dẫn đặc thù và nguồn, không chỉ cảnh báo chung', () => {
    const r=result('nhiet-ke-thuy-ngan',{intact:false});
    expect(r.status).toBe('hazard');
    expect(r.rule?.id).toBe('mercury-spill');
    expect(r.rule?.steps.join(' ')).toMatch(/người và vật nuôi/);
    expect(r.rule?.avoid).toMatch(/máy hút bụi, chổi/);
    expect(r.rule?.sourceIds).toContain('epa-mercury-spill');
  });

  it('bóng huỳnh quang vỡ dùng hướng dẫn dành cho bóng đèn', () => {
    const r=result('bong-den',{intact:false});
    expect(r.status).toBe('hazard');
    expect(r.rule?.id).toBe('fluorescent-broken');
    expect(r.rule?.sourceIds).toContain('epa-lamp-spill');
  });

  it('nhiệt kế điện tử không bị gán là có thủy ngân', () => {
    const r=result('nhiet-ke-dien-tu',{intact:true});
    expect(r.rule?.category).toBe('special');
    expect(r.rule?.sourceIds).not.toContain('epa-mercury-spill');
    expect(r.rule?.id).not.toBe('mercury-intact');
  });

  it('giữ cảnh báo an toàn khi hướng dẫn thủy ngân thiếu nguồn hoặc hết hiệu lực', () => {
    for(const change of ['missing-source','expired','conflict']) {
      const c=structuredClone(seed);
      const rule=c.rules.find(r=>r.id==='mercury-spill')!;
      if(change==='missing-source')c.sources=c.sources.filter(s=>s.id!=='epa-mercury-spill');
      if(change==='expired')rule.validTo='2026-10-05';
      if(change==='conflict')c.rules.push({...rule,id:'conflicting-safety-guide'});
      const r=classify(c,'nhiet-ke-thuy-ngan','all',{intact:false},now);
      expect(r.status,change).toBe('hazard');
      expect(r.rule,change).toBeNull();
    }
  });

  it('không cho quy tắc an toàn áp dụng tràn sang cả nhóm hoặc trạng thái nguyên vẹn', () => {
    const rule=seed.rules.find(r=>r.id==='mercury-spill')!;
    expect(ruleSchema.safeParse({...rule,itemIds:[]}).success).toBe(false);
    expect(ruleSchema.safeParse({...rule,conditions:{intact:true}}).success).toBe(false);
    expect(ruleSchema.safeParse({...rule,category:'recycle'}).success).toBe(false);
  });

  it('pin hỏng vẫn chặn hướng dẫn thu gom bình thường', () => {
    const r=result('pin-sac',{intact:false});
    expect(r.status).toBe('hazard');
    expect(r.rule).toBeNull();
  });

  it('không gán điểm thu gom pin là nơi nhận thủy ngân, thuốc hoặc kim tiêm', () => {
    for(const itemId of ['nhiet-ke-thuy-ngan','thuoc-het-han','kim-chich-mau','pin-xe-dien']) {
      expect(findPoints(seed,{...pointQuery,itemId},now)).toEqual({verified:[],confirm:[]});
    }
  });
});

describe('Phân biệt vật liệu và chất còn bên trong', () => {
  it('thuốc hết hạn và vật sắc nhọn không trở thành rác sinh hoạt', () => {
    expect(result('thuoc-het-han').rule?.category).toBe('special');
    expect(result('kim-tiem').rule?.id).toBe('medical-sharps');
    expect(result('but-tiem-insulin').rule?.id).toBe('medical-sharps');
  });
  it('vỉ thuốc còn thuốc và đã rỗng có hướng dẫn khác nhau', () => {
    expect(result('vi-thuoc',{empty:false}).rule?.category).toBe('special');
    expect(result('vi-thuoc',{empty:true}).rule?.id).toBe('blister-empty');
  });
  it('bật lửa chỉ được xếp rác còn lại khi đã xác nhận hết gas và nguyên vẹn', () => {
    expect(result('bat-lua',{intact:true}).status).toBe('questions');
    expect(result('bat-lua',{intact:true,empty:false}).rule?.category).toBe('special');
    expect(result('bat-lua',{intact:true,empty:true}).rule?.category).toBe('residual');
    expect(result('bat-lua',{intact:false,empty:true}).status).toBe('hazard');
  });
  it('nhựa màng, compostable, bao bì nhiều lớp không mặc định tái chế được', () => {
    for(const id of ['tui-nilon','mang-boc-thuc-pham','xop-bong-bong','nhua-phan-huy','ly-giay','hop-sua']) {
      expect(result(id,{clean:true,empty:true}).rule?.category,id).toBe('unknown');
    }
  });
});
