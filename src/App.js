import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアント初期化
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════════
// あみログ（AMILOG）- 毛糸・作品管理アプリ
// デザインシステム（DESIGN.md / 無印良品スタイル準拠）
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:           '#ffffff',
  bgKinari:     '#f4eede',
  bgBeige:      '#e0ceaa',
  bgGray:       '#f5f5f5',
  card:         '#ffffff',
  accent:       '#7f0019',
  accentHover:  '#5a0012',
  danger:       '#dd0c14',
  dangerLight:  '#fff5f5',
  success:      '#2d6a4f',
  successLight: '#d8f3dc',
  text:         '#3c3c43',
  textSub:      '#6d6d72',
  textMuted:    '#9d9da0',
  border:       '#d8d8d9',
  borderLight:  '#ebebec',
  shadow:       '0 1px 2px rgba(0,0,0,0.08)',
  shadowMd:     '0 2px 8px rgba(0,0,0,0.10)',
};

const FONT = '"Helvetica Neue", Arial, "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

// ═══════════════════════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════════════════════
const MATERIALS  = ['ウール', 'コットン', 'アクリル', 'モヘア', 'アルパカ', 'リネン', 'ナイロン', 'シルク', 'ミックス', 'その他'];
const THICKNESSES = ['合細', '中細', '合太', '並太', '極太', '超極太'];
const STATUSES   = ['進行中', '完成', '中断'];

const YARN_SORTS = [
  { value: 'newest',       label: '新着順' },
  { value: 'oldest',       label: '古い順' },
  { value: 'name',         label: '毛糸名順' },
  { value: 'maker',        label: 'メーカー順' },
  { value: 'qty_desc',     label: '所持数（多）' },
  { value: 'qty_asc',      label: '所持数（少）' },
  { value: 'price_desc',   label: '価格（高）' },
  { value: 'price_asc',    label: '価格（安）' },
];

const SCREEN_TITLES = {
  yarnList:      'あみログ',
  yarnDetail:    '毛糸の詳細',
  search:        '条件検索',
  projectList:   '作品管理',
  projectDetail: '作品の詳細',
  workLog:       '作業記録',
  counter:       '段数カウンター',
  settings:      '設定',
};

const NAV_ITEMS = [
  { screen: 'yarnList',    label: '毛糸一覧',       iconType: 'yarn'      },
  { screen: 'search',      label: '条件検索',       iconType: 'search'    },
  { screen: 'projectList', label: '作品管理',       iconType: 'clipboard' },
  { screen: 'workLog',     label: '作業記録',       iconType: 'notebook'  },
  { screen: 'counter',     label: 'カウンター',     iconType: 'counter'   },
  { screen: 'settings',    label: '設定',           iconType: 'settings'  },
];

// ═══════════════════════════════════════════════════════════════
// ユーティリティ
// ═══════════════════════════════════════════════════════════════
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatPrice(n) {
  if (n == null || n === '') return '—';
  return `¥${Number(n).toLocaleString()}`;
}

function formatDate(s) {
  if (!s) return '—';
  return String(s).replace(/-/g, '/');
}

function formatTime(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}時間 ${m}分` : `${m}分`;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function calcProjectCost(project, yarns) {
  if (!project?.yarnUsages?.length) return 0;
  return project.yarnUsages.reduce((sum, u) => {
    const yarn = yarns.find(y => y.id === u.yarnId);
    if (!yarn?.weightPerBall || !yarn?.pricePerBall) return sum;
    return sum + (u.usedGrams / yarn.weightPerBall) * yarn.pricePerBall;
  }, 0);
}

// ═══════════════════════════════════════════════════════════════
// SVG アイコンコンポーネント
// ═══════════════════════════════════════════════════════════════
function Icon({ type, size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  const a = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (type === 'yarn') return (
    <svg {...a}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M3.6 9c2.3-1 5.2.4 6.4 3.2 1.2 2.8.2 5.9-2 7.2"/>
      <path d="M20 15c-2 1.2-4.8.2-6.2-2.4"/>
      <path d="M12 3c.8 3-1.5 6.5-1 9.5"/>
    </svg>
  );
  if (type === 'search') return (
    <svg {...a}>
      <circle cx="11" cy="11" r="7"/>
      <line x1="16.5" y1="16.5" x2="22" y2="22"/>
    </svg>
  );
  if (type === 'clipboard') return (
    <svg {...a}>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
      <line x1="9" y1="15" x2="13" y2="15"/>
    </svg>
  );
  if (type === 'notebook') return (
    <svg {...a}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  );
  if (type === 'settings') return (
    <svg {...a}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
  if (type === 'pencil') return (
    <svg {...a}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  );
  if (type === 'info') return (
    <svg {...a}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="8.01"/>
      <polyline points="11 12 12 12 12 16"/>
    </svg>
  );
  if (type === 'counter') return (
    <svg {...a}>
      <line x1="4"  y1="9"  x2="20" y2="9"/>
      <line x1="4"  y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3"  x2="8"  y2="21"/>
      <line x1="16" y1="3"  x2="14" y2="21"/>
    </svg>
  );
  return null;
}

// ═══════════════════════════════════════════════════════════════
// スタイル定数
// ═══════════════════════════════════════════════════════════════
const S = {
  page: {
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 1.6,
    color: C.text,
    background: C.bg,
    minHeight: '100vh',
    maxWidth: 430,
    margin: '0 auto',
    position: 'relative',
  },
  header: {
    background: C.bg,
    borderBottom: `1px solid ${C.border}`,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  content: {
    padding: '20px 16px 100px',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.borderLight}`,
    padding: 16,
    marginBottom: 12,
  },
  btnPrimary: {
    background: C.text,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '9px 18px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONT,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    lineHeight: 1.4,
  },
  btnAccent: {
    background: C.accent,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '9px 18px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONT,
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  btnSecondary: {
    background: 'transparent',
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: '9px 18px',
    fontSize: 12,
    fontFamily: FONT,
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  btnDanger: {
    background: 'transparent',
    color: C.danger,
    border: `1px solid ${C.danger}`,
    borderRadius: 4,
    padding: '9px 16px',
    fontSize: 12,
    fontFamily: FONT,
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: 0,
    padding: '9px 12px',
    fontSize: 16,
    fontFamily: FONT,
    color: C.text,
    outline: 'none',
    lineHeight: 1.4,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: 0,
    padding: '9px 28px 9px 12px',
    fontSize: 16,
    fontFamily: FONT,
    color: C.text,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: C.textSub,
    marginBottom: 4,
    fontWeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textSub,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    background: C.bg,
    width: '100%',
    maxWidth: 430,
    maxHeight: '92vh',
    overflowY: 'auto',
    borderRadius: '8px 8px 0 0',
    padding: '24px 16px 40px',
  },
  divider: {
    height: 1,
    background: C.borderLight,
    margin: '16px 0',
  },
  fab: {
    position: 'fixed',
    bottom: 24,
    right: 'max(16px, calc(50vw - 215px + 16px))',
    background: C.accent,
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 56,
    height: 56,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(127,0,25,0.35)',
    zIndex: 99,
  },
};

// ═══════════════════════════════════════════════════════════════
// 共通コンポーネント
// ═══════════════════════════════════════════════════════════════

function Badge({ color, bg, children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 2,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: bg,
      lineHeight: 1.6,
    }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '9px 0',
      borderBottom: `1px solid ${C.borderLight}`,
      gap: 8,
    }}>
      <span style={{ fontSize: 13, color: C.textSub, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: highlight ? C.accent : C.text,
        fontWeight: highlight ? 700 : 400,
        textAlign: 'right',
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function EmptyState({ title, desc, iconType }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px', color: C.textMuted }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <Icon type={iconType} size={52} color={C.borderLight} strokeWidth={1} />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSub }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13 }}>{desc}</p>
    </div>
  );
}

function SelectWrapper({ value, onChange, children, style }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={{ ...S.select, ...style }}>
        {children}
      </select>
      <span style={{
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none', color: C.textMuted, fontSize: 11,
      }}>▼</span>
    </div>
  );
}

function PhotoInput({ label, value, onChange }) {
  return (
    <div style={S.formGroup}>
      <label style={S.label}>{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) {
            alert('3MB以下の画像を選択してください');
            return;
          }
          onChange(await toBase64(file));
        }}
        style={{ fontSize: 13, color: C.textSub, width: '100%' }}
      />
      {value && (
        <div style={{ marginTop: 8, position: 'relative' }}>
          <img src={value} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 4, right: 4,
              background: 'rgba(0,0,0,0.5)', color: '#fff',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              padding: '2px 6px', fontSize: 12,
            }}
          >削除</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════
const ADD_LABELS = {
  yarnList:    '＋ 毛糸追加',
  search:      '＋ 毛糸追加',
  projectList: '＋ 作品追加',
};

function Header({ screen, onMenuClick, onBack, showBack, onAdd, showAdd }) {
  return (
    <header style={S.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack ? (
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.text, padding: 0, lineHeight: 1 }}
            aria-label="戻る"
          >←</button>
        ) : (
          <button
            onClick={onMenuClick}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.text, padding: 0, lineHeight: 1 }}
            aria-label="メニュー"
          >☰</button>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
          {SCREEN_TITLES[screen] || 'あみログ'}
        </span>
      </div>
      {showAdd && (
        <button onClick={onAdd} style={{ ...S.btnPrimary, fontSize: 11, padding: '7px 12px' }}>
          {ADD_LABELS[screen] || '＋ 追加'}
        </button>
      )}
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════════════════════════════
function Sidebar({ currentScreen, onNavigate, onClose }) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 150 }}
        onClick={onClose}
      />
      <nav style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 256,
        background: C.bgKinari, zIndex: 160,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '56px 24px 20px' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.accent, letterSpacing: '0.04em' }}>あみログ</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSub, letterSpacing: '0.12em' }}>AMILOG</p>
        </div>
        <div style={{ height: 1, background: C.bgBeige, margin: '0 24px' }} />
        <div style={{ marginTop: 8 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              style={{
                width: '100%',
                background: currentScreen === item.screen ? C.bgBeige : 'transparent',
                border: 'none',
                borderLeft: `3px solid ${currentScreen === item.screen ? C.accent : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 24px',
                fontSize: 14,
                color: currentScreen === item.screen ? C.accent : C.text,
                fontWeight: currentScreen === item.screen ? 700 : 400,
                fontFamily: FONT,
                textAlign: 'left',
              }}
            >
              <Icon
                type={item.iconType}
                size={18}
                color={currentScreen === item.screen ? C.accent : C.textSub}
                strokeWidth={currentScreen === item.screen ? 2.2 : 1.6}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: `1px solid ${C.bgBeige}` }}>
          <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>あみログ v1.0</p>
        </div>
      </nav>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// YarnListScreen
// ═══════════════════════════════════════════════════════════════
function YarnListScreen({ yarns, sort, onSortChange, onYarnClick }) {
  return (
    <div style={S.content}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: C.textSub, flexShrink: 0 }}>並び替え：</span>
        <SelectWrapper value={sort} onChange={e => onSortChange(e.target.value)}>
          {YARN_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </SelectWrapper>
      </div>

      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
        {yarns.length} 種類の毛糸
      </p>

      {yarns.length === 0 ? (
        <EmptyState title="毛糸がまだありません" desc='右上の「＋ 毛糸追加」から登録しましょう' iconType="yarn" />
      ) : (
        yarns.map(yarn => <YarnCard key={yarn.id} yarn={yarn} onClick={() => onYarnClick(yarn.id)} />)
      )}
    </div>
  );
}

function YarnCard({ yarn, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ ...S.card, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
    >
      <div style={{
        width: 64, height: 64, flexShrink: 0,
        background: C.bgKinari,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {yarn.photoUrl
          ? <img src={yarn.photoUrl} alt={yarn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon type="yarn" size={30} color={C.bgBeige} strokeWidth={1.4} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.text }}>
          {yarn.name || '（名前未設定）'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSub }}>
          {[yarn.maker, yarn.material, yarn.thickness].filter(Boolean).join(' · ')}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {yarn.colorName && <Badge color={C.textSub} bg={C.bgGray}>{yarn.colorName}</Badge>}
          <Badge color={C.text} bg={C.bgKinari}>
            {yarn.quantity != null ? yarn.quantity : '?'} 玉
          </Badge>
          {yarn.pricePerBall && (
            <span style={{ fontSize: 11, color: C.textMuted }}>{formatPrice(yarn.pricePerBall)}/玉</span>
          )}
        </div>
      </div>
      <span style={{ color: C.textMuted, fontSize: 18, alignSelf: 'center', flexShrink: 0 }}>›</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// YarnDetailScreen
// ═══════════════════════════════════════════════════════════════
function YarnDetailScreen({ yarn, projects, workLogs, onEdit, onDelete }) {
  const relatedLogs = workLogs.filter(l => l.yarnId === yarn.id);
  const relatedProjects = projects.filter(p =>
    (p.yarnUsages || []).some(u => u.yarnId === yarn.id)
  );
  const totalUsedGrams  = relatedLogs.reduce((s, l) => s + (l.usedGrams  || 0), 0);
  const totalUsedMeters = relatedLogs.reduce((s, l) => s + (l.usedMeters || 0), 0);

  return (
    <div style={S.content}>
      {yarn.photoUrl && (
        <div style={{ marginBottom: 20, aspectRatio: '16/9', overflow: 'hidden', background: C.bgKinari }}>
          <img src={yarn.photoUrl} alt={yarn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{yarn.name || '（名前未設定）'}</h1>
        {yarn.maker && <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textSub }}>{yarn.maker}</p>}
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>基本情報</p>
        <InfoRow label="素材"   value={yarn.material}   />
        <InfoRow label="太さ"   value={yarn.thickness}  />
        <InfoRow label="色名"   value={yarn.colorName}  />
        <InfoRow label="色番号" value={yarn.colorNumber} />
        <InfoRow label="ロット番号" value={yarn.lot}    />
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>数量・価格</p>
        <InfoRow label="所持数"     value={yarn.quantity != null ? `${yarn.quantity} 玉` : null} />
        <InfoRow label="1玉の重さ"  value={yarn.weightPerBall  ? `${yarn.weightPerBall} g`  : null} />
        <InfoRow label="1玉の長さ"  value={yarn.lengthPerBall  ? `${yarn.lengthPerBall} m`  : null} />
        <InfoRow label="1玉の価格"  value={yarn.pricePerBall   ? formatPrice(yarn.pricePerBall) : null} />
        {yarn.quantity && yarn.pricePerBall && (
          <InfoRow
            label="合計在庫額"
            value={formatPrice(Math.round(yarn.quantity * yarn.pricePerBall))}
            highlight
          />
        )}
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>使用実績</p>
        <InfoRow label="使用済み" value={totalUsedGrams > 0 ? `${totalUsedGrams} g` : '0 g'} />
        <InfoRow label="使用済み（m）" value={totalUsedMeters > 0 ? `${totalUsedMeters} m` : null} />
        <InfoRow label="使用作品数" value={`${relatedProjects.length} 作品`} />
      </div>

      {yarn.usagePhotoUrl && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ ...S.sectionTitle, marginBottom: 8 }}>使用作品例</p>
          <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: C.bgKinari }}>
            <img src={yarn.usagePhotoUrl} alt="使用作品例" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      )}

      {relatedProjects.length > 0 && (
        <div style={S.card}>
          <p style={S.sectionTitle}>使用作品</p>
          {relatedProjects.map(p => {
            const usage = (p.yarnUsages || []).find(u => u.yarnId === yarn.id);
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  {usage?.usedGrams ? `${usage.usedGrams}g` : ''}
                  {usage?.usedMeters ? ` · ${usage.usedMeters}m` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {yarn.note && (
        <div style={{ ...S.card, background: C.bgKinari }}>
          <p style={S.sectionTitle}>メモ</p>
          <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>{yarn.note}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onEdit}   style={{ ...S.btnSecondary, flex: 1 }}>編集</button>
        <button onClick={onDelete} style={S.btnDanger}>削除</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SearchScreen
// ═══════════════════════════════════════════════════════════════
function SearchScreen({ filters, onFiltersChange, onSearch, results, onYarnClick, onReset }) {
  const set = (key, val) => onFiltersChange(prev => ({ ...prev, [key]: val }));

  return (
    <div style={S.content}>
      <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 16px' }}>
        複数の条件を組み合わせて毛糸を絞り込めます
      </p>

      <div style={S.card}>
        <div style={S.formGroup}>
          <label style={S.label}>素材</label>
          <SelectWrapper value={filters.material} onChange={e => set('material', e.target.value)}>
            <option value="">すべて</option>
            {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
          </SelectWrapper>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>太さ</label>
          <SelectWrapper value={filters.thickness} onChange={e => set('thickness', e.target.value)}>
            <option value="">すべて</option>
            {THICKNESSES.map(t => <option key={t} value={t}>{t}</option>)}
          </SelectWrapper>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>メーカー（部分一致）</label>
          <input
            style={S.input}
            value={filters.maker}
            onChange={e => set('maker', e.target.value)}
            placeholder="例：ハマナカ、リッチモア"
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>色名・色番号（部分一致）</label>
          <input
            style={S.input}
            value={filters.colorName}
            onChange={e => set('colorName', e.target.value)}
            placeholder="例：ネイビー、101"
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>価格（円/玉）</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...S.input }} type="number" min="0" value={filters.minPrice}
              onChange={e => set('minPrice', e.target.value)} placeholder="最小" />
            <span style={{ color: C.textMuted, flexShrink: 0 }}>〜</span>
            <input style={{ ...S.input }} type="number" min="0" value={filters.maxPrice}
              onChange={e => set('maxPrice', e.target.value)} placeholder="最大" />
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={S.label}>所持数（玉）</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...S.input }} type="number" min="0" value={filters.minQuantity}
              onChange={e => set('minQuantity', e.target.value)} placeholder="最小" />
            <span style={{ color: C.textMuted, flexShrink: 0 }}>〜</span>
            <input style={{ ...S.input }} type="number" min="0" value={filters.maxQuantity}
              onChange={e => set('maxQuantity', e.target.value)} placeholder="最大" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={onSearch} style={{ ...S.btnPrimary, flex: 1 }}>検索する</button>
        <button onClick={onReset}  style={S.btnSecondary}>リセット</button>
      </div>

      {results !== null && (
        <>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
            {results.length} 件 見つかりました
          </p>
          {results.length === 0
            ? <EmptyState title="該当する毛糸がありません" desc="条件を変えて再検索してみてください" iconType="search" />
            : results.map(yarn => <YarnCard key={yarn.id} yarn={yarn} onClick={() => onYarnClick(yarn.id)} />)
          }
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ProjectListScreen
// ═══════════════════════════════════════════════════════════════
function ProjectListScreen({ projects, yarns, onProjectClick }) {
  return (
    <div style={S.content}>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
        {projects.length} 件の作品
      </p>

      {projects.length === 0 ? (
        <EmptyState title="作品がまだありません" desc='右上の「＋ 作品追加」から登録しましょう' iconType="clipboard" />
      ) : (
        projects.map(project => {
          const cost = calcProjectCost(project, yarns);
          const statusColors = { '進行中': C.accent, '完成': C.success, '中断': C.textMuted };
          const statusBg = statusColors[project.status] || C.textMuted;
          return (
            <div
              key={project.id}
              onClick={() => onProjectClick(project.id)}
              style={{ ...S.card, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              <div style={{
                width: 64, height: 64, flexShrink: 0,
                background: C.bgKinari,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {project.photoUrl
                  ? <img src={project.photoUrl} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon type="clipboard" size={28} color={C.bgBeige} strokeWidth={1.4} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
                    {project.name || '（タイトル未設定）'}
                  </p>
                  <Badge color="#fff" bg={statusBg}>{project.status || '進行中'}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  {cost > 0 && (
                    <span style={{ fontSize: 12, color: C.textSub }}>
                      原価 {formatPrice(Math.round(cost))}
                    </span>
                  )}
                  {(project.totalTimeMinutes || 0) > 0 && (
                    <span style={{ fontSize: 12, color: C.textMuted }}>
                      {formatTime(project.totalTimeMinutes)}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ color: C.textMuted, fontSize: 18, alignSelf: 'center', flexShrink: 0 }}>›</span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ProjectDetailScreen
// ═══════════════════════════════════════════════════════════════
function ProjectDetailScreen({ project, yarns, workLogs, onEdit, onDelete, onExportCSV, onAddWorkLog }) {
  const totalCost   = calcProjectCost(project, yarns);
  const projectLogs = workLogs.filter(l => l.projectId === project.id);
  const statusColors = { '進行中': C.accent, '完成': C.success, '中断': C.textMuted };
  const statusBg = statusColors[project.status] || C.textMuted;

  return (
    <div style={S.content}>
      {project.photoUrl && (
        <div style={{ marginBottom: 20, aspectRatio: '16/9', overflow: 'hidden', background: C.bgKinari }}>
          <img src={project.photoUrl} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{project.name || '（タイトル未設定）'}</h1>
          {project.description && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textSub }}>{project.description}</p>
          )}
        </div>
        <Badge color="#fff" bg={statusBg}>{project.status || '進行中'}</Badge>
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>概要</p>
        <InfoRow label="開始日"     value={formatDate(project.startDate)} />
        <InfoRow label="完成日"     value={formatDate(project.endDate)}   />
        <InfoRow label="総作業時間" value={formatTime(project.totalTimeMinutes)} />
        <InfoRow label="原価合計"   value={totalCost > 0 ? formatPrice(Math.round(totalCost)) : '—'} highlight />
      </div>

      {(project.yarnUsages || []).length > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ ...S.sectionTitle, margin: 0 }}>使用毛糸・原価明細</p>
            <button onClick={onExportCSV} style={{ ...S.btnSecondary, padding: '4px 12px', fontSize: 11 }}>
              CSV出力
            </button>
          </div>
          {(project.yarnUsages || []).map(usage => {
            const yarn = yarns.find(y => y.id === usage.yarnId);
            if (!yarn) return null;
            const cost = (yarn.weightPerBall && yarn.pricePerBall)
              ? (usage.usedGrams / yarn.weightPerBall) * yarn.pricePerBall
              : 0;
            return (
              <div key={usage.yarnId} style={{ padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{yarn.name}</span>
                  <span style={{ fontSize: 14, color: C.accent, fontWeight: 700 }}>
                    {cost > 0 ? formatPrice(Math.round(cost)) : '—'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>
                  {usage.usedGrams  ? `${usage.usedGrams}g` : ''}
                  {usage.usedMeters ? ` · ${usage.usedMeters}m` : ''}
                  {yarn.pricePerBall && yarn.weightPerBall
                    ? ` · ${formatPrice(yarn.pricePerBall)}/${yarn.weightPerBall}g` : ''}
                </p>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
            <span style={{ fontWeight: 700 }}>原価合計</span>
            <span style={{ fontWeight: 700, color: C.accent }}>{formatPrice(Math.round(totalCost))}</span>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ ...S.sectionTitle, margin: 0 }}>作業記録</p>
          <button onClick={onAddWorkLog} style={{ ...S.btnSecondary, padding: '4px 12px', fontSize: 11 }}>
            + 記録追加
          </button>
        </div>
        {projectLogs.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>作業記録はまだありません</p>
        ) : (
          [...projectLogs].reverse().map(log => {
            const yarn = yarns.find(y => y.id === log.yarnId);
            return (
              <div key={log.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(log.date)}</span>
                  {log.workMinutes > 0 && (
                    <Badge color={C.textSub} bg={C.bgKinari}>{formatTime(log.workMinutes)}</Badge>
                  )}
                </div>
                {yarn && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSub }}>
                    {yarn.name}
                    {log.usedGrams  ? ` — ${log.usedGrams}g`  : ''}
                    {log.usedMeters ? ` · ${log.usedMeters}m` : ''}
                  </p>
                )}
                {log.note && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>{log.note}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {project.note && (
        <div style={{ ...S.card, background: C.bgKinari }}>
          <p style={S.sectionTitle}>メモ</p>
          <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>{project.note}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onEdit}   style={{ ...S.btnSecondary, flex: 1 }}>編集</button>
        <button onClick={onDelete} style={S.btnDanger}>削除</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkLogScreen
// ═══════════════════════════════════════════════════════════════
function WorkLogScreen({ workLogs, yarns, projects }) {
  const grouped = {};
  workLogs.forEach(log => {
    const d = log.date || (log.createdAt || '').slice(0, 10) || '不明';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(log);
  });
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div style={S.content}>
      {workLogs.length === 0 ? (
        <EmptyState
          title="作業記録がまだありません"
          desc="右下の赤いボタンから作業記録を追加しましょう"
          iconType="notebook"
        />
      ) : (
        dates.map(date => (
          <div key={date} style={{ marginBottom: 24 }}>
            <p style={{ ...S.sectionTitle, marginBottom: 8 }}>{formatDate(date)}</p>
            {grouped[date].map(log => {
              const yarn    = yarns.find(y => y.id === log.yarnId);
              const project = projects.find(p => p.id === log.projectId);
              return (
                <div key={log.id} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      {project && <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{project.name}</p>}
                      {yarn    && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSub }}>{yarn.name}</p>}
                    </div>
                    {log.workMinutes > 0 && (
                      <Badge color={C.textSub} bg={C.bgKinari}>{formatTime(log.workMinutes)}</Badge>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {log.usedGrams  > 0 && <span style={{ fontSize: 12, color: C.textMuted }}>{log.usedGrams}g 使用</span>}
                    {log.usedMeters > 0 && <span style={{ fontSize: 12, color: C.textMuted }}>{log.usedMeters}m 使用</span>}
                  </div>
                  {log.note && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMuted }}>{log.note}</p>}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SettingsScreen
// ═══════════════════════════════════════════════════════════════
function SettingsScreen({ projects, yarns, workLogs, onExportCSV, onClearData, userEmail, onLogout }) {
  const totalStock = Math.round(
    yarns.reduce((s, y) => s + (y.quantity || 0) * (y.pricePerBall || 0), 0)
  );

  return (
    <div style={S.content}>
      <div style={S.card}>
        <p style={S.sectionTitle}>データ概要</p>
        <InfoRow label="登録毛糸数"   value={`${yarns.length} 種類`}    />
        <InfoRow label="作品数"       value={`${projects.length} 件`}   />
        <InfoRow label="作業記録数"   value={`${workLogs.length} 件`}   />
        <InfoRow label="毛糸在庫総額" value={formatPrice(totalStock)} highlight />
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>CSV出力</p>
        <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 16px' }}>
          作品ごとの使用毛糸・原価明細をCSVで出力できます
        </p>
        {projects.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted }}>作品が登録されていません</p>
        ) : (
          projects.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>
                  原価 {formatPrice(Math.round(calcProjectCost(p, yarns)))}
                </p>
              </div>
              <button onClick={() => onExportCSV(p.id)} style={{ ...S.btnSecondary, padding: '6px 14px', fontSize: 12 }}>
                CSV
              </button>
            </div>
          ))
        )}
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>データ管理</p>
        <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 16px' }}>
          データはクラウド（Supabase）に保存されています。<br />
          複数の端末から同じアカウントでアクセスできます。
        </p>
        <button onClick={onClearData} style={{ ...S.btnDanger, width: '100%' }}>
          全データを削除する
        </button>
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>アカウント</p>
        <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 16px', wordBreak: 'break-all' }}>
          ログイン中：{userEmail}
        </p>
        <button onClick={onLogout} style={{ ...S.btnSecondary, width: '100%' }}>
          ログアウト
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>あみログ (AMILOG) v2.0</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// YarnFormModal
// ═══════════════════════════════════════════════════════════════
function YarnFormModal({ yarn, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', maker: '', material: '', thickness: '',
    colorName: '', colorNumber: '', lot: '',
    pricePerBall: '', weightPerBall: '', lengthPerBall: '',
    quantity: '', note: '', photoUrl: '', usagePhotoUrl: '',
    ...(yarn || {}),
    pricePerBall:  yarn?.pricePerBall  ?? '',
    weightPerBall: yarn?.weightPerBall ?? '',
    lengthPerBall: yarn?.lengthPerBall ?? '',
    quantity:      yarn?.quantity      ?? '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) { alert('毛糸名を入力してください'); return; }
    onSave({
      ...form,
      pricePerBall:  form.pricePerBall  !== '' ? Number(form.pricePerBall)  : null,
      weightPerBall: form.weightPerBall !== '' ? Number(form.weightPerBall) : null,
      lengthPerBall: form.lengthPerBall !== '' ? Number(form.lengthPerBall) : null,
      quantity:      form.quantity      !== '' ? Number(form.quantity)      : null,
    });
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{yarn ? '毛糸を編集' : '毛糸を追加'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.textMuted, padding: 0 }}>×</button>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>毛糸名 *</label>
          <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="例：メリノウール並太" />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>メーカー</label>
          <input style={S.input} value={form.maker} onChange={e => set('maker', e.target.value)} placeholder="例：ハマナカ、リッチモア" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <label style={S.label}>素材</label>
            <SelectWrapper value={form.material} onChange={e => set('material', e.target.value)}>
              <option value="">選択...</option>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </SelectWrapper>
          </div>
          <div>
            <label style={S.label}>太さ</label>
            <SelectWrapper value={form.thickness} onChange={e => set('thickness', e.target.value)}>
              <option value="">選択...</option>
              {THICKNESSES.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectWrapper>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <label style={S.label}>色名</label>
            <input style={S.input} value={form.colorName} onChange={e => set('colorName', e.target.value)} placeholder="例：ネイビー" />
          </div>
          <div>
            <label style={S.label}>色番号</label>
            <input style={S.input} value={form.colorNumber} onChange={e => set('colorNumber', e.target.value)} placeholder="例：112" />
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>ロット番号</label>
          <input style={S.input} value={form.lot} onChange={e => set('lot', e.target.value)} placeholder="例：L23" />
        </div>

        <div style={S.divider} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <label style={S.label}>1玉の重さ(g)</label>
            <input style={S.input} type="number" min="0" value={form.weightPerBall}
              onChange={e => set('weightPerBall', e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={S.label}>1玉の長さ(m)</label>
            <input style={S.input} type="number" min="0" value={form.lengthPerBall}
              onChange={e => set('lengthPerBall', e.target.value)} placeholder="100" />
          </div>
          <div>
            <label style={S.label}>価格(円/玉)</label>
            <input style={S.input} type="number" min="0" value={form.pricePerBall}
              onChange={e => set('pricePerBall', e.target.value)} placeholder="500" />
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>所持数（玉）</label>
          <input style={S.input} type="number" min="0" step="0.1" value={form.quantity}
            onChange={e => set('quantity', e.target.value)} placeholder="例：5" />
        </div>

        <div style={S.divider} />

        <PhotoInput label="写真" value={form.photoUrl} onChange={v => set('photoUrl', v)} />
        <PhotoInput label="使用作品例の写真" value={form.usagePhotoUrl} onChange={v => set('usagePhotoUrl', v)} />

        <div style={S.formGroup}>
          <label style={S.label}>メモ</label>
          <textarea
            style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="購入場所・使用感・針の号数など"
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSubmit} style={{ ...S.btnPrimary, flex: 1 }}>
            {yarn ? '更新する' : '登録する'}
          </button>
          <button onClick={onClose} style={S.btnSecondary}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ProjectFormModal
// ═══════════════════════════════════════════════════════════════
function ProjectFormModal({ project, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', description: '', status: '進行中',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', note: '', photoUrl: '',
    ...(project || {}),
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) { alert('作品名を入力してください'); return; }
    onSave(form);
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{project ? '作品を編集' : '作品を追加'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.textMuted, padding: 0 }}>×</button>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>作品名 *</label>
          <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="例：メリノのセーター" />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>説明</label>
          <input style={S.input} value={form.description} onChange={e => set('description', e.target.value)} placeholder="サイズ・パターン番号など" />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>ステータス</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => set('status', s)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  border: `1px solid ${form.status === s ? C.accent : C.border}`,
                  background: form.status === s ? C.accent : 'transparent',
                  color: form.status === s ? '#fff' : C.text,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: FONT,
                  lineHeight: 1.4,
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <label style={S.label}>開始日</label>
            <input style={S.input} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>完成日</label>
            <input style={S.input} type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>

        <PhotoInput label="写真" value={form.photoUrl} onChange={v => set('photoUrl', v)} />

        <div style={S.formGroup}>
          <label style={S.label}>メモ</label>
          <textarea
            style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="パターン番号・変更点・使用針など"
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSubmit} style={{ ...S.btnPrimary, flex: 1 }}>
            {project ? '更新する' : '登録する'}
          </button>
          <button onClick={onClose} style={S.btnSecondary}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkLogFormModal
// ═══════════════════════════════════════════════════════════════
function WorkLogFormModal({ yarns, projects, defaultProjectId, onSave, onClose }) {
  const [form, setForm] = useState({
    date:        new Date().toISOString().slice(0, 10),
    projectId:   defaultProjectId || '',
    yarnId:      '',
    usedGrams:   '',
    usedMeters:  '',
    workHours:   '',
    workMins:    '',
    note:        '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const selectedYarn = yarns.find(y => y.id === form.yarnId);
  const previewQty = (selectedYarn?.weightPerBall && form.usedGrams)
    ? Math.max(0, (selectedYarn.quantity || 0) - (Number(form.usedGrams) / selectedYarn.weightPerBall))
    : null;

  const handleSubmit = () => {
    if (!form.projectId) { alert('作品を選択してください'); return; }
    if (!form.yarnId)    { alert('使用した毛糸を選択してください'); return; }
    const workMinutes = (parseInt(form.workHours || 0) * 60) + parseInt(form.workMins || 0);
    onSave({
      date:        form.date,
      projectId:   form.projectId,
      yarnId:      form.yarnId,
      usedGrams:   form.usedGrams   !== '' ? Number(form.usedGrams)  : 0,
      usedMeters:  form.usedMeters  !== '' ? Number(form.usedMeters) : 0,
      workMinutes,
      note:        form.note,
    });
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>作業記録を追加</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.textMuted, padding: 0 }}>×</button>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>作業日 *</label>
          <input style={S.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>作品 *</label>
          <SelectWrapper value={form.projectId} onChange={e => set('projectId', e.target.value)}>
            <option value="">選択してください</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectWrapper>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>使用した毛糸 *</label>
          <SelectWrapper value={form.yarnId} onChange={e => set('yarnId', e.target.value)}>
            <option value="">選択してください</option>
            {yarns.map(y => (
              <option key={y.id} value={y.id}>
                {y.name}{y.quantity != null ? ` (${y.quantity}玉)` : ''}
              </option>
            ))}
          </SelectWrapper>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <label style={S.label}>使用量（g）</label>
            <input style={S.input} type="number" min="0" value={form.usedGrams}
              onChange={e => set('usedGrams', e.target.value)} placeholder="例：50" />
          </div>
          <div>
            <label style={S.label}>使用量（m）</label>
            <input style={S.input} type="number" min="0" value={form.usedMeters}
              onChange={e => set('usedMeters', e.target.value)} placeholder="例：100" />
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>作業時間</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...S.input, width: 72 }} type="number" min="0" value={form.workHours}
              onChange={e => set('workHours', e.target.value)} placeholder="0" />
            <span style={{ color: C.textSub, flexShrink: 0, fontSize: 14 }}>時間</span>
            <input style={{ ...S.input, width: 72 }} type="number" min="0" max="59" value={form.workMins}
              onChange={e => set('workMins', e.target.value)} placeholder="0" />
            <span style={{ color: C.textSub, flexShrink: 0, fontSize: 14 }}>分</span>
          </div>
        </div>

        {previewQty !== null && (
          <div style={{ background: C.bgKinari, padding: 12, marginBottom: 16, fontSize: 13, color: C.textSub, lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon type="info" size={16} color={C.textSub} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>保存後、<strong>{selectedYarn.name}</strong> の所持数が{' '}
            <strong>{selectedYarn.quantity}</strong> 玉 →{' '}
            <strong style={{ color: previewQty < 1 ? C.danger : C.text }}>{previewQty.toFixed(1)}</strong> 玉 になります</span>
          </div>
        )}

        <div style={S.formGroup}>
          <label style={S.label}>メモ</label>
          <textarea
            style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="その日の作業メモ（進み具合・気づきなど）"
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSubmit} style={{ ...S.btnPrimary, flex: 1 }}>記録する</button>
          <button onClick={onClose} style={S.btnSecondary}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DB ↔ JS 変換関数（snake_case ↔ camelCase）
// ═══════════════════════════════════════════════════════════════
const yarnToDb   = (y, uid) => ({ id: y.id, user_id: uid, name: y.name, maker: y.maker, material: y.material, thickness: y.thickness, color_name: y.colorName, color_number: y.colorNumber, lot: y.lot, price_per_ball: y.pricePerBall, weight_per_ball: y.weightPerBall, length_per_ball: y.lengthPerBall, quantity: y.quantity, photo_url: y.photoUrl, usage_photo_url: y.usagePhotoUrl, note: y.note, created_at: y.createdAt });
const yarnFromDb = (r) => ({ id: r.id, name: r.name, maker: r.maker, material: r.material, thickness: r.thickness, colorName: r.color_name, colorNumber: r.color_number, lot: r.lot, pricePerBall: r.price_per_ball, weightPerBall: r.weight_per_ball, lengthPerBall: r.length_per_ball, quantity: r.quantity, photoUrl: r.photo_url, usagePhotoUrl: r.usage_photo_url, note: r.note, createdAt: r.created_at });

const projToDb   = (p, uid) => ({ id: p.id, user_id: uid, name: p.name, description: p.description, status: p.status, start_date: p.startDate, end_date: p.endDate, photo_url: p.photoUrl, total_time_minutes: p.totalTimeMinutes, yarn_usages: p.yarnUsages, note: p.note, created_at: p.createdAt });
const projFromDb = (r) => ({ id: r.id, name: r.name, description: r.description, status: r.status, startDate: r.start_date, endDate: r.end_date, photoUrl: r.photo_url, totalTimeMinutes: r.total_time_minutes, yarnUsages: r.yarn_usages || [], note: r.note, createdAt: r.created_at });

const logToDb    = (l, uid) => ({ id: l.id, user_id: uid, date: l.date, project_id: l.projectId, yarn_id: l.yarnId, used_grams: l.usedGrams, used_meters: l.usedMeters, work_minutes: l.workMinutes, note: l.note, created_at: l.createdAt });
const logFromDb  = (r) => ({ id: r.id, date: r.date, projectId: r.project_id, yarnId: r.yarn_id, usedGrams: r.used_grams, usedMeters: r.used_meters, workMinutes: r.work_minutes, note: r.note, createdAt: r.created_at });

const rcToDb     = (r, uid) => ({ id: r.id, user_id: uid, project_id: r.projectId, date: r.date, count: r.count, note: r.note, created_at: r.createdAt });
const rcFromDb   = (r) => ({ id: r.id, projectId: r.project_id, date: r.date, count: r.count, note: r.note, createdAt: r.created_at });

// ═══════════════════════════════════════════════════════════════
// CounterScreen（段数カウンター）
// ═══════════════════════════════════════════════════════════════
function CounterScreen({ projects, rowCounts, onSave }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [count, setCount]   = useState(0);
  const [note,  setNote]    = useState('');
  const [saved, setSaved]   = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const adjust = (delta) => {
    setCount(c => Math.max(0, c + delta));
    setSaved(false);
  };

  const handleSave = () => {
    if (!selectedProjectId) { alert('作品を選択してください'); return; }
    onSave({ projectId: selectedProjectId, date: today, count, note });
    setSaved(true);
    setNote('');
  };

  const handleProjectChange = (id) => {
    setSelectedProjectId(id);
    setCount(0);
    setSaved(false);
  };

  const history = rowCounts
    .filter(r => r.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return (
    <div style={S.content}>

      {/* 作品選択 */}
      <div style={S.formGroup}>
        <label style={S.label}>作品を選択</label>
        {projects.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
            先に「作品管理」から作品を登録してください
          </p>
        ) : (
          <SelectWrapper
            value={selectedProjectId}
            onChange={e => handleProjectChange(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectWrapper>
        )}
      </div>

      {/* カウンター表示 */}
      <div style={{
        textAlign: 'center',
        padding: '36px 0 28px',
        background: C.bgKinari,
        marginBottom: 16,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: C.textSub, letterSpacing: '0.12em', textTransform: 'uppercase' }}>ROWS</p>
        <p style={{ margin: 0, fontSize: 88, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {count}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSub }}>段</p>
      </div>

      {/* ±ボタン */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { delta: -10, label: '−10', accent: false },
          { delta: -1,  label: '−１', accent: false },
          { delta: +1,  label: '＋１', accent: true  },
          { delta: +10, label: '＋10', accent: true  },
        ].map(({ delta, label, accent }) => (
          <button
            key={delta}
            onClick={() => adjust(delta)}
            style={{
              ...(accent ? S.btnPrimary : S.btnSecondary),
              fontSize: 16,
              fontWeight: 700,
              padding: '18px 0',
              borderRadius: 4,
              display: 'block',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* リセット */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <button
          onClick={() => { setCount(0); setSaved(false); }}
          style={{ ...S.btnDanger, fontSize: 12 }}
        >
          リセット
        </button>
      </div>

      {/* 保存エリア */}
      <div style={{ ...S.card, background: C.bgGray, marginBottom: 24 }}>
        <p style={S.sectionTitle}>この段数を記録する</p>
        <div style={S.formGroup}>
          <label style={S.label}>メモ（任意）</label>
          <input
            style={S.input}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例：右袖の3段目まで完了"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedProjectId || projects.length === 0}
          style={{
            ...S.btnAccent,
            width: '100%',
            padding: '14px',
            fontSize: 15,
            fontWeight: 700,
            opacity: (!selectedProjectId || projects.length === 0) ? 0.5 : 1,
            cursor: (!selectedProjectId || projects.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {saved ? '✓ 保存しました！' : `${count} 段を記録する`}
        </button>
      </div>

      {/* 記録履歴 */}
      {history.length > 0 && (
        <div>
          <p style={S.sectionTitle}>記録履歴（直近 {history.length} 件）</p>
          {history.map(r => (
            <div key={r.id} style={{
              ...S.card,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>{formatDate(r.date)}</p>
                {r.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>{r.note}</p>}
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{r.count}<span style={{ fontSize: 13, fontWeight: 400, color: C.textSub, marginLeft: 2 }}>段</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LoginScreen（ログイン・新規登録）
// ═══════════════════════════════════════════════════════════════
function LoginScreen() {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [message,  setMessage]  = useState('');

  const handleSubmit = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('確認メールを送信しました。メール内のリンクをクリックしてください。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: FONT, background: C.bgKinari,
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ background: C.bg, width: '100%', maxWidth: 360, padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.accent, letterSpacing: '0.04em' }}>あみログ</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMuted, letterSpacing: '0.16em' }}>AMILOG</p>
        </div>

        {/* ログイン / 新規登録 切替タブ */}
        <div style={{ display: 'flex', marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
          {[['login', 'ログイン'], ['signup', '新規登録']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', fontSize: 14, fontFamily: FONT,
                color: mode === m ? C.accent : C.textMuted,
                fontWeight: mode === m ? 700 : 400,
                borderBottom: mode === m ? `2px solid ${C.accent}` : '2px solid transparent',
                marginBottom: -1,
              }}>{label}</button>
          ))}
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>メールアドレス</label>
          <input style={S.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="example@email.com" />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>パスワード（6文字以上）</label>
          <input style={S.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {error   && <p style={{ color: C.danger,  fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        {message && <p style={{ color: C.success, fontSize: 13, margin: '0 0 12px' }}>{message}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ ...S.btnAccent, width: '100%', padding: '14px', fontSize: 15, opacity: loading ? 0.6 : 1 }}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// App（メインコンポーネント）
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── ナビゲーション ──────────────────────────────────
  const [screen,      setScreen]      = useState('yarnList');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── 認証 ───────────────────────────────────────────
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── データ ─────────────────────────────────────────
  const [yarns,     setYarns]     = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [workLogs,  setWorkLogs]  = useState([]);
  const [rowCounts, setRowCounts] = useState([]);

  // ── 選択中アイテム ──────────────────────────────────
  const [selectedYarnId,    setSelectedYarnId]    = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // ── モーダル ────────────────────────────────────────
  const [yarnModalOpen,    setYarnModalOpen]    = useState(false);
  const [yarnEditId,       setYarnEditId]       = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectEditId,    setProjectEditId]    = useState(null);
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);

  // ── 毛糸一覧のソート ────────────────────────────────
  const [yarnSort, setYarnSort] = useState('newest');

  // ── 検索 ───────────────────────────────────────────
  const [searchFilters, setSearchFilters] = useState({
    material: '', thickness: '', maker: '', colorName: '',
    minPrice: '', maxPrice: '', minQuantity: '', maxQuantity: '',
  });
  const [searchResults, setSearchResults] = useState(null);

  // ── 認証状態の監視 ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── ログイン時にデータ取得 ──────────────────────────
  useEffect(() => {
    if (user) {
      fetchData(user.id);
    } else {
      setYarns([]); setProjects([]); setWorkLogs([]); setRowCounts([]);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (userId) => {
    try {
      const [y, p, w, r] = await Promise.all([
        supabase.from('yarns').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('work_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('row_counts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (y.data) setYarns(y.data.map(yarnFromDb));
      if (p.data) setProjects(p.data.map(projFromDb));
      if (w.data) setWorkLogs(w.data.map(logFromDb));
      if (r.data) setRowCounts(r.data.map(rcFromDb));
    } catch (e) {
      console.error('データ取得エラー', e);
    }
  };

  // ── 毛糸 CRUD ───────────────────────────────────────
  const saveYarn = async (data) => {
    const id   = data.id || genId();
    const yarn = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
    if (data.id) {
      setYarns(prev => prev.map(y => y.id === data.id ? yarn : y));
    } else {
      setYarns(prev => [yarn, ...prev]);
    }
    setYarnModalOpen(false); setYarnEditId(null);
    const { error } = await supabase.from('yarns').upsert(yarnToDb(yarn, user.id));
    if (error) { console.error(error); alert('保存に失敗しました: ' + error.message); }
  };

  const deleteYarn = async (id) => {
    if (!window.confirm('この毛糸を削除しますか？')) return;
    setYarns(prev => prev.filter(y => y.id !== id));
    navigate('yarnList');
    const { error } = await supabase.from('yarns').delete().eq('id', id).eq('user_id', user.id);
    if (error) console.error(error);
  };

  // ── プロジェクト CRUD ───────────────────────────────
  const saveProject = async (data) => {
    const id      = data.id || genId();
    const project = data.id
      ? { ...projects.find(p => p.id === data.id), ...data }
      : { ...data, id, createdAt: new Date().toISOString(), yarnUsages: [], totalTimeMinutes: 0 };
    if (data.id) {
      setProjects(prev => prev.map(p => p.id === data.id ? project : p));
    } else {
      setProjects(prev => [project, ...prev]);
    }
    setProjectModalOpen(false); setProjectEditId(null);
    const { error } = await supabase.from('projects').upsert(projToDb(project, user.id));
    if (error) { console.error(error); alert('保存に失敗しました: ' + error.message); }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('この作品を削除しますか？')) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    navigate('projectList');
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id);
    if (error) console.error(error);
  };

  // ── 作業記録の保存（在庫・作品を自動更新）──────────
  const saveWorkLog = async (logData) => {
    const log = { ...logData, id: genId(), createdAt: new Date().toISOString() };
    setWorkLogs(prev => [log, ...prev]);

    // 毛糸の所持数を減らす
    let updatedYarn = null;
    if (logData.yarnId && logData.usedGrams > 0) {
      setYarns(prev => prev.map(y => {
        if (y.id !== logData.yarnId) return y;
        const ballsUsed = logData.usedGrams / (y.weightPerBall || 50);
        const newQty = Math.max(0, (y.quantity || 0) - ballsUsed);
        updatedYarn = { ...y, quantity: parseFloat(newQty.toFixed(2)) };
        return updatedYarn;
      }));
    }

    // 作品の使用毛糸リストを更新
    let updatedProject = null;
    if (logData.projectId && logData.yarnId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== logData.projectId) return p;
        const usages = p.yarnUsages || [];
        const idx = usages.findIndex(u => u.yarnId === logData.yarnId);
        let newUsages;
        if (idx >= 0) {
          newUsages = usages.map((u, i) => i !== idx ? u : {
            ...u,
            usedGrams:  (u.usedGrams  || 0) + (logData.usedGrams  || 0),
            usedMeters: (u.usedMeters || 0) + (logData.usedMeters || 0),
          });
        } else {
          newUsages = [...usages, {
            yarnId:     logData.yarnId,
            usedGrams:  logData.usedGrams  || 0,
            usedMeters: logData.usedMeters || 0,
          }];
        }
        const newTotal = (p.totalTimeMinutes || 0) + (logData.workMinutes || 0);
        updatedProject = { ...p, yarnUsages: newUsages, totalTimeMinutes: newTotal };
        return updatedProject;
      }));
    }

    setWorkLogModalOpen(false);

    // Supabase に保存
    const { error: logErr } = await supabase.from('work_logs').insert(logToDb(log, user.id));
    if (logErr) console.error(logErr);
    if (updatedYarn) {
      const { error } = await supabase.from('yarns')
        .update({ quantity: updatedYarn.quantity })
        .eq('id', updatedYarn.id).eq('user_id', user.id);
      if (error) console.error(error);
    }
    if (updatedProject) {
      const { error } = await supabase.from('projects')
        .update({ yarn_usages: updatedProject.yarnUsages, total_time_minutes: updatedProject.totalTimeMinutes })
        .eq('id', updatedProject.id).eq('user_id', user.id);
      if (error) console.error(error);
    }
  };

  // ── 段数カウンターの保存 ───────────────────────────
  const saveRowCount = async (data) => {
    const record = { ...data, id: genId(), createdAt: new Date().toISOString() };
    setRowCounts(prev => [record, ...prev]);
    const { error } = await supabase.from('row_counts').insert(rcToDb(record, user.id));
    if (error) console.error(error);
  };

  // ── ナビゲーション ──────────────────────────────────
  const navigate = (s, params = {}) => {
    if (params.yarnId)    setSelectedYarnId(params.yarnId);
    if (params.projectId) setSelectedProjectId(params.projectId);
    setScreen(s);
    setSidebarOpen(false);
  };

  const goBack = () => {
    if (screen === 'yarnDetail')    navigate('yarnList');
    else if (screen === 'projectDetail') navigate('projectList');
    else navigate('yarnList');
  };

  // ── 検索実行 ────────────────────────────────────────
  const runSearch = () => {
    const f = searchFilters;
    setSearchResults(yarns.filter(y => {
      if (f.material  && y.material  !== f.material)  return false;
      if (f.thickness && y.thickness !== f.thickness) return false;
      if (f.maker     && !y.maker?.toLowerCase().includes(f.maker.toLowerCase())) return false;
      if (f.colorName && !(
        y.colorName?.toLowerCase().includes(f.colorName.toLowerCase()) ||
        y.colorNumber?.toLowerCase().includes(f.colorName.toLowerCase())
      )) return false;
      if (f.minPrice    && (y.pricePerBall || 0) < Number(f.minPrice))    return false;
      if (f.maxPrice    && (y.pricePerBall || 0) > Number(f.maxPrice))    return false;
      if (f.minQuantity && (y.quantity     || 0) < Number(f.minQuantity)) return false;
      if (f.maxQuantity && (y.quantity     || 0) > Number(f.maxQuantity)) return false;
      return true;
    }));
  };

  // ── CSV出力 ─────────────────────────────────────────
  const exportCSV = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const rows = [['毛糸名', 'メーカー', '素材', '太さ', '使用量(g)', '使用量(m)', '単価(円/玉)', '1玉の重さ(g)', '原価(円)']];
    (project.yarnUsages || []).forEach(u => {
      const yarn = yarns.find(y => y.id === u.yarnId);
      if (!yarn) return;
      const cost = (yarn.weightPerBall && yarn.pricePerBall)
        ? Math.round((u.usedGrams / yarn.weightPerBall) * yarn.pricePerBall)
        : 0;
      rows.push([
        yarn.name || '', yarn.maker || '', yarn.material || '', yarn.thickness || '',
        u.usedGrams || 0, u.usedMeters || 0,
        yarn.pricePerBall || 0, yarn.weightPerBall || 0, cost,
      ]);
    });
    const total = Math.round(calcProjectCost(project, yarns));
    rows.push(['', '', '', '', '', '', '', '合計原価', total]);

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${project.name}_原価明細_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // ── ソート済み毛糸リスト ────────────────────────────
  const sortedYarns = [...yarns].sort((a, b) => {
    switch (yarnSort) {
      case 'oldest':     return new Date(a.createdAt) - new Date(b.createdAt);
      case 'name':       return (a.name  || '').localeCompare(b.name  || '', 'ja');
      case 'maker':      return (a.maker || '').localeCompare(b.maker || '', 'ja');
      case 'qty_desc':   return (b.quantity     || 0) - (a.quantity     || 0);
      case 'qty_asc':    return (a.quantity     || 0) - (b.quantity     || 0);
      case 'price_desc': return (b.pricePerBall || 0) - (a.pricePerBall || 0);
      case 'price_asc':  return (a.pricePerBall || 0) - (b.pricePerBall || 0);
      default:           return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  // ── 認証チェック ────────────────────────────────────
  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: FONT, color: C.textSub }}>
      読み込み中...
    </div>
  );
  if (!user) return <LoginScreen />;

  const selectedYarn    = yarns.find(y => y.id === selectedYarnId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // ── ヘッダー右ボタン表示制御 ────────────────────────
  const showAdd   = ['yarnList', 'search', 'projectList'].includes(screen);
  const showBack  = ['yarnDetail', 'projectDetail'].includes(screen);

  const handleAdd = () => {
    if (screen === 'projectList') {
      setProjectEditId(null); setProjectModalOpen(true);
    } else {
      setYarnEditId(null); setYarnModalOpen(true);
    }
  };

  // ── レンダリング ────────────────────────────────────
  return (
    <div style={S.page}>
      <Header
        screen={screen}
        onMenuClick={() => setSidebarOpen(true)}
        onBack={goBack}
        showBack={showBack}
        onAdd={handleAdd}
        showAdd={showAdd}
      />

      {sidebarOpen && (
        <Sidebar
          currentScreen={screen}
          onNavigate={navigate}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* ── 各画面 ── */}
      {/* ─────────── 各画面 ─────────── */}
      {screen === 'yarnList' && (
        <YarnListScreen
          yarns={sortedYarns}
          sort={yarnSort}
          onSortChange={setYarnSort}
          onYarnClick={id => navigate('yarnDetail', { yarnId: id })}
        />
      )}

      {screen === 'yarnDetail' && selectedYarn && (
        <YarnDetailScreen
          yarn={selectedYarn}
          projects={projects}
          workLogs={workLogs}
          onEdit={() => { setYarnEditId(selectedYarn.id); setYarnModalOpen(true); }}
          onDelete={() => deleteYarn(selectedYarn.id)}
        />
      )}

      {screen === 'search' && (
        <SearchScreen
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          onSearch={runSearch}
          results={searchResults}
          onYarnClick={id => navigate('yarnDetail', { yarnId: id })}
          onReset={() => { setSearchFilters({ material: '', thickness: '', maker: '', colorName: '', minPrice: '', maxPrice: '', minQuantity: '', maxQuantity: '' }); setSearchResults(null); }}
        />
      )}

      {screen === 'projectList' && (
        <ProjectListScreen
          projects={projects}
          yarns={yarns}
          onProjectClick={id => navigate('projectDetail', { projectId: id })}
        />
      )}

      {screen === 'projectDetail' && selectedProject && (
        <ProjectDetailScreen
          project={selectedProject}
          yarns={yarns}
          workLogs={workLogs}
          onEdit={() => { setProjectEditId(selectedProject.id); setProjectModalOpen(true); }}
          onDelete={() => deleteProject(selectedProject.id)}
          onExportCSV={() => exportCSV(selectedProject.id)}
          onAddWorkLog={() => setWorkLogModalOpen(true)}
        />
      )}

      {screen === 'workLog' && (
        <WorkLogScreen
          workLogs={workLogs}
          yarns={yarns}
          projects={projects}
        />
      )}

      {screen === 'counter' && (
        <CounterScreen
          projects={projects}
          rowCounts={rowCounts}
          onSave={saveRowCount}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          projects={projects}
          yarns={yarns}
          workLogs={workLogs}
          onExportCSV={exportCSV}
          userEmail={user.email}
          onLogout={async () => {
            await supabase.auth.signOut();
          }}
          onClearData={async () => {
            if (window.confirm('全データを削除しますか？この操作は元に戻せません。')) {
              setYarns([]); setProjects([]); setWorkLogs([]); setRowCounts([]);
              await Promise.all([
                supabase.from('yarns').delete().eq('user_id', user.id),
                supabase.from('projects').delete().eq('user_id', user.id),
                supabase.from('work_logs').delete().eq('user_id', user.id),
                supabase.from('row_counts').delete().eq('user_id', user.id),
              ]);
            }
          }}
        />
      )}

      {/* 作業記録 FAB（常時表示） */}
      <button
        style={S.fab}
        onClick={() => setWorkLogModalOpen(true)}
        title="作業記録を追加"
        aria-label="作業記録を追加"
      >
        <Icon type="pencil" size={24} color="#fff" strokeWidth={2} />
      </button>

      {/* ── モーダル ── */}
      {yarnModalOpen && (
        <YarnFormModal
          yarn={yarnEditId ? yarns.find(y => y.id === yarnEditId) : null}
          onSave={saveYarn}
          onClose={() => { setYarnModalOpen(false); setYarnEditId(null); }}
        />
      )}

      {projectModalOpen && (
        <ProjectFormModal
          project={projectEditId ? projects.find(p => p.id === projectEditId) : null}
          onSave={saveProject}
          onClose={() => { setProjectModalOpen(false); setProjectEditId(null); }}
        />
      )}

      {workLogModalOpen && (
        <WorkLogFormModal
          yarns={yarns}
          projects={projects}
          defaultProjectId={screen === 'projectDetail' ? selectedProjectId : null}
          onSave={saveWorkLog}
          onClose={() => setWorkLogModalOpen(false)}
        />
      )}
    </div>
  );
}
