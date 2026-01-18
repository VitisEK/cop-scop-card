// /config/www/cop-scop-card.js
// COP/SCOP Card – LTS stats + GUI editor + aux heater + responsive table
// v1.3.5 - Added "Aux included" toggle for flexible calculations + caching

/* eslint-disable no-console */

const CSC_VERSION = "1.3.5";

// --- Lit loader with CDN fallback ---
let Lit, __litFromCDN = false;
try { Lit = await import("lit"); }
catch {
  Lit = await import("https://cdn.jsdelivr.net/npm/lit@3/+esm");
  __litFromCDN = true;
}
const { LitElement, html, css, nothing } = Lit;

console.info(`[CSC] COP/SCOP Card v${CSC_VERSION} loaded (Lit: ${__litFromCDN ? "CDN" : "local"})`);

// -------------------- helpers --------------------
const fireEvent = (node, type, detail = {}) => {
  const ev = new Event(type, { bubbles: true, composed: true, cancelable: false });
  ev.detail = detail;
  node.dispatchEvent(ev);
  return ev;
};

const clampNumber = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normLang = (hass) => {
  const l = String(hass?.language || "en").toLowerCase();
  if (l.startsWith("cs")) return "cs";
  return "en";
};

const STRINGS = {
  cs: {
    category: "Kategorie",
    cop: "COP",
    scop: "SCOP",
    produced: "Δvýroba",
    consumed: "Δspotřeba",
    aux_from: "z toho přídavné topení",
    aux_heating: "topení",
    aux_dhw: "TUV",
    aux_total: "přídavné (celkem)",
    total_consumed: "Δspotřeba celkem",
    missing_cfg: "Chybí konfigurace – nastav kategorie v editoru.",
    loading: "Načítám…",
    stats_warn: "Nepodařilo se získat statistiky pro některé entity. Zkontroluj long-term statistics (state_class total/total_increasing, device_class energy).",
    mode_single: "Single",
    mode_table: "Table",
    show_class: "Zobrazovat energetickou třídu",
    colorize_table: "Barvit třídy v tabulce",
    class_mode: "Režim tříd",
    class_custom: "Custom (prahy COP/SCOP)",
    class_none: "None",
    class_eu: "EU space heating (orientačně)",
    class_eu_lt: "EU space heating LOW-TEMP (orientačně)",
    thresholds: "Prahy tříd (min COP/SCOP)",
    class_style: "Styl tříd (text + barva)",
    add_aux: "Přídavné topení (kWh) – entita",
    add_aux2: "Přídavné topení #2 (kWh) – entita",
    aux_included: "Přídavné topení je již zahrnuto ve spotřebě",
    produced_entity: "Výroba (kWh) – entita",
    consumed_entity: "Spotřeba (kWh) – entita",
    enabled: "Povoleno",
    name: "Název",
    refresh: "Refresh (min)",
    precision: "Desetinná místa",
    month_days: "Měsíc (dnů)",
    year_days: "Rok (dnů)",
    title: "Název",
    display: "Zobrazení",
  },
  en: {
    category: "Category",
    cop: "COP",
    scop: "SCOP",
    produced: "Δproduced",
    consumed: "Δconsumed",
    aux_from: "of which aux heater",
    aux_heating: "heating",
    aux_dhw: "DHW",
    aux_total: "aux (total)",
    total_consumed: "Δconsumed total",
    missing_cfg: "Missing config – set categories in the editor.",
    loading: "Loading…",
    stats_warn: "Unable to fetch statistics for some entities.",
    mode_single: "Single",
    mode_table: "Table",
    show_class: "Show energy class",
    colorize_table: "Colorize classes in table",
    class_mode: "Class mode",
    class_custom: "Custom (COP/SCOP thresholds)",
    class_none: "None",
    class_eu: "EU space heating (approx.)",
    class_eu_lt: "EU space heating LOW-TEMP (approx.)",
    thresholds: "Class thresholds (min COP/SCOP)",
    class_style: "Class style (label + color)",
    add_aux: "Aux heater (kWh) – entity",
    add_aux2: "Aux heater #2 (kWh) – entity",
    aux_included: "Aux heater already included in consumption",
    produced_entity: "Produced (kWh) – entity",
    consumed_entity: "Consumed (kWh) – entity",
    enabled: "Enabled",
    name: "Name",
    refresh: "Refresh (min)",
    precision: "Decimals",
    month_days: "Month (days)",
    year_days: "Year (days)",
    title: "Title",
    display: "Display",
  },
};

const t = (hass, key) => {
  const lang = normLang(hass);
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
};

// -------------------- default config --------------------
const DEFAULT_THRESHOLDS_CUSTOM = { "A+++": 4.5, "A++": 4.0, "A+": 3.5, "A": 3.0, "B": 2.7, "C": 2.4, "D": 2.1, "E": 1.8, "F": 1.5, "G": 0.0 };
const DEFAULT_CLASS_COLORS = { "A+++": "#00c853", "A++": "#64dd17", "A+": "#cddc39", "A": "#ffeb3b", "B": "#ffc107", "C": "#ff9800", "D": "#ff5722", "E": "#f44336", "F": "#d32f2f", "G": "#9e9e9e" };
const DEFAULT_CLASS_LABELS = { "A+++": "A+++", "A++": "A++", "A+": "A+", "A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F", "G": "G" };

const CC_EU = 2.5;
const EU_TABLE1_ETA_S = { "A+++": 150, "A++": 125, "A+": 98, "A": 90, "B": 82, "C": 75, "D": 36, "E": 34, "F": 30, "G": 0 };
const EU_TABLE2_ETA_S = { "A+++": 175, "A++": 150, "A+": 123, "A": 115, "B": 107, "C": 100, "D": 61, "E": 59, "F": 55, "G": 0 };

const etaToScopThresholds = (etaMap) => {
  const out = {};
  Object.keys(etaMap).forEach((k) => { out[k] = (etaMap[k] * CC_EU) / 100; });
  return out;
};

const pickClass = (ratio, thresholdsMap) => {
  if (!Number.isFinite(ratio) || !thresholdsMap) return null;
  const entries = Object.entries(thresholdsMap).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number.isFinite(v)).sort((a, b) => b[1] - a[1]);
  for (const [cls, thr] of entries) if (ratio >= thr) return cls;
  return null;
};

const formatNum = (v, precision) => (v == null || !Number.isFinite(v)) ? "—" : Number(v).toFixed(precision);

const PERIODS = [
  { key: "day", label: "24h", kind: "cop", days: 1, group: "hour" },
  { key: "week", label: "7d", kind: "cop", days: 7, group: "day" },
  { key: "month", label: "30d", kind: "cop", daysCfg: "month_days", group: "day" },
  { key: "year", label: "365d", kind: "scop", daysCfg: "year_days", group: "day" },
];

const periodStart = (now, cfg, p) => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const days = p.daysCfg ? clampNumber(cfg[p.daysCfg], (p.key === "month" ? 30 : 365)) : p.days;
  return new Date(now.getTime() - days * oneDayMs);
};

const sumChangeFromStats = (points) => {
  if (!Array.isArray(points) || points.length === 0) return null;
  let hasChange = false, sumChange = 0;
  for (const p of points) { if (p && p.change != null) { hasChange = true; sumChange += Number(p.change); } }
  if (hasChange) return sumChange;
  const first = points[0], last = points[points.length - 1];
  const a = first?.sum ?? first?.state, b = last?.sum ?? last?.state;
  const na = Number(a), nb = Number(b);
  return (Number.isFinite(na) && Number.isFinite(nb)) ? (nb - na) : null;
};

const DEFAULT_CONFIG = {
  title: "Tepelné čerpadlo – COP/SCOP",
  mode: "single", precision: 2, refresh_minutes: 60, month_days: 30, year_days: 365, show_classes: true, colorize_table_classes: true, class_mode: "custom",
  custom_class_thresholds: { ...DEFAULT_THRESHOLDS_CUSTOM }, class_colors: { ...DEFAULT_CLASS_COLORS }, class_labels: { ...DEFAULT_CLASS_LABELS },
  categories: [
    { key: "dhw", name: "TUV", enabled: true, produced_entity: "", consumed_entity: "", aux_entity: "", aux_included: false },
    { key: "heating", name: "Topení", enabled: true, produced_entity: "", consumed_entity: "", aux_entity: "", aux_included: false },
    { key: "cooling", name: "Chlazení", enabled: true, produced_entity: "", consumed_entity: "", aux_entity: "", aux_included: false },
    { key: "total", name: "Celkem", enabled: true, produced_entity: "", consumed_entity: "", aux_entity: "", aux_entity2: "", aux_included: false },
  ],
};

// -------------------- CARD --------------------
class CopScopCard extends LitElement {
  static get properties() {
    return { hass: {}, _config: { state: true }, _data: { state: true }, _error: { state: true }, _loading: { state: true }, _lastFetch: { state: true }, _selectedKey: { state: true }, _w: { state: true } };
  }

  static getConfigElement() { return document.createElement("cop-scop-card-editor"); }
  static getStubConfig() { return { ...DEFAULT_CONFIG }; }

  static styles = css`
    :host { display: block; color: var(--primary-text-color); }
    ha-card { overflow: hidden; }
    .card { padding: 16px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .title { font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
    .muted { opacity: 0.72; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    select { background: var(--card-background-color, var(--ha-card-background, #1c1c1c)); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 10px; padding: 8px 10px; font-size: 0.95rem; outline: none; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    @media (max-width: 800px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .tile { border: 1px solid var(--divider-color); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.02); min-height: 92px; display: flex; flex-direction: column; gap: 6px; }
    .tileTop { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .tileLabel { font-size: 0.9rem; opacity: 0.85; }
    .value { font-size: 1.7rem; font-weight: 800; letter-spacing: 0.2px; line-height: 1.1; }
    .meta { margin-top: 2px; display: grid; gap: 4px; font-size: 0.82rem; opacity: 0.78; }
    .metaRow{ display:flex; justify-content: space-between; gap: 10px; }
    .badge { border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 2px 10px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; color: rgba(0,0,0,0.85); }
    .err { border-radius: 12px; padding: 10px 12px; margin-top: 10px; border: 1px solid var(--divider-color); background: rgba(255,255,255,0.02); color: var(--error-color); font-size: 0.92rem; }
    .tableWrap{ width: 100%; overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.92rem; table-layout: fixed; }
    .table th, .table td { border-bottom: 1px solid var(--divider-color); padding: 12px 8px; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .table th { font-weight: 700; opacity: 0.92; text-align: left; }
    .colCat { width: 140px; }
    .colPeriodHeader { text-align: center !important; }
    .colVal { text-align: right; }
    .colCls { text-align: left; width: 92px; }
    .cellVal{ font-variant-numeric: tabular-nums; display: inline-block; min-width: 4.8ch; }
    .badgeCell{ display: inline-flex; justify-content: flex-start; width: 100%; }
    /* Mobile grid */
    .mCats { display: grid; gap: 12px; }
    .mCat { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; }
    .mCat:first-child { border-top: none; padding-top: 0; }
    .mCatTitle { font-weight: 800; margin: 2px 0 8px 2px; opacity: 0.95; }
    .mGrid{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
    .mTile{ border: 1px solid var(--divider-color); border-radius: 14px; background: rgba(255,255,255,0.02); padding: 10px 10px; display: grid; gap: 8px; }
    .mTileTop{ display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .mTileLabel{ font-weight: 700; opacity: 0.8; }
    .mTileVal{ font-size: 1.25rem; font-weight: 900; font-variant-numeric: tabular-nums; }
  `;

  constructor() { super(); this._config = null; this._data = null; this._loading = false; this._lastFetch = 0; this._selectedKey = "total"; this._w = 9999; this.__ro = null; }

  setConfig(config) {
    const cfg = config || {};
    this._config = {
      ...DEFAULT_CONFIG, ...cfg,
      custom_class_thresholds: { ...DEFAULT_CONFIG.custom_class_thresholds, ...(cfg.custom_class_thresholds || {}) },
      class_colors: { ...DEFAULT_CONFIG.class_colors, ...(cfg.class_colors || {}) },
      class_labels: { ...DEFAULT_CONFIG.class_labels, ...(cfg.class_labels || {}) },
      categories: Array.isArray(cfg.categories) ? cfg.categories.map((c, i) => ({ ...(DEFAULT_CONFIG.categories[i] || {}), ...c })) : DEFAULT_CONFIG.categories.map((c) => ({ ...c })),
    };
    this._selectedKey = (this._getEnabledCategories()[0]?.key) || "total";
    this._loadCache();
  }

  _getCacheKey() { return `csc_cache_${(this._config?.title || "default").replace(/\s+/g, '_').toLowerCase()}`; }
  _loadCache() {
    try {
      const cached = localStorage.getItem(this._getCacheKey());
      if (cached) { const parsed = JSON.parse(cached); this._data = parsed.data; this._lastFetch = parsed.ts || 0; }
    } catch (e) { console.warn("[CSC] Cache load error", e); }
  }
  _saveCache(data) { try { localStorage.setItem(this._getCacheKey(), JSON.stringify({ ts: Date.now(), data })); } catch (e) { console.warn("[CSC] Cache save error", e); } }

  connectedCallback() {
    super.connectedCallback();
    this.updateComplete.then(() => {
      const host = this.renderRoot?.querySelector(".card");
      if (!host || this.__ro) return;
      this.__ro = new ResizeObserver((entries) => { const w = Math.round(entries?.[0]?.contentRect?.width || 0); if (w && w !== this._w) this._w = w; });
      this.__ro.observe(host);
    });
  }

  disconnectedCallback() { this.__ro?.disconnect(); super.disconnectedCallback(); }

  _getEnabledCategories() { return (this._config?.categories || []).filter((c) => c && c.enabled); }
  _getAllEntityIds() {
    const ids = new Set();
    for (const c of this._getEnabledCategories()) { [c.produced_entity, c.consumed_entity, c.aux_entity, c.aux_entity2].forEach(id => id && ids.add(id)); }
    return [...ids];
  }

  _badge(cls, colorize = true) {
    if (!cls) return nothing;
    const label = (this._config?.class_labels || DEFAULT_CLASS_LABELS)[cls] || cls;
    const bg = colorize ? ((this._config?.class_colors || DEFAULT_CLASS_COLORS)[cls] || "#64dd17") : "rgba(255,255,255,0.08)";
    return html`<span class="badge" style="background:${bg}; color:${colorize ? "rgba(0,0,0,0.85)" : "var(--primary-text-color)"}; border-color:${colorize ? "transparent" : "rgba(255,255,255,0.16)"};">${label}</span>`;
  }

  async _fetchIfNeeded() {
    if (!this.hass || !this._config || this._loading) return;
    const refreshMs = clampNumber(this._config.refresh_minutes, 60) * 60 * 1000;
    if (this._data && (Date.now() - this._lastFetch) < refreshMs) return;

    const ids = this._getAllEntityIds();
    if (ids.length === 0) { this._error = t(this.hass, "missing_cfg"); return; }
    
    this._loading = true; this._error = null;
    try {
      const now = new Date();
      const resultsByPeriod = {};
      for (const p of PERIODS) {
        const resp = await this.hass.callWS({ type: "recorder/statistics_during_period", start_time: periodStart(now, this._config, p).toISOString(), end_time: now.toISOString(), statistic_ids: ids, period: p.group, types: ["change", "sum", "state"] });
        resultsByPeriod[p.key] = { changes: {} };
        ids.forEach(id => { resultsByPeriod[p.key].changes[id] = sumChangeFromStats(resp?.[id] || []); });
      }

      const categories = {};
      for (const c of this._getEnabledCategories()) {
        const cat = { name: c.name, key: c.key, periods: {} };
        for (const p of PERIODS) {
          const res = resultsByPeriod[p.key].changes;
          const prod = res[c.produced_entity], consMain = res[c.consumed_entity];
          const aux1 = res[c.aux_entity] || 0, aux2 = res[c.aux_entity2] || 0;
          const auxTotal = aux1 + aux2;
          
          // LOGIKA: Pokud je aux_included=true, nejpřičítáme ho k hlavní spotřebě pro výpočet COP
          const totalConsForCalc = (consMain != null) ? (c.aux_included ? consMain : (consMain + auxTotal)) : null;
          const ratio = (prod != null && totalConsForCalc > 0) ? (prod / totalConsForCalc) : null;

          cat.periods[p.key] = { produced_kwh: prod, consumed_kwh: consMain, aux1_kwh: aux1, aux2_kwh: aux2, aux_total_kwh: (res[c.aux_entity] != null || res[c.aux_entity2] != null) ? auxTotal : null, consumed_total_kwh: totalConsForCalc, ratio };
        }
        categories[c.key] = cat;
      }
      this._data = { categories };
      this._saveCache(this._data);
      this._lastFetch = Date.now();
    } catch (e) { this._error = `Error: ${e?.message || e}`; } finally { this._loading = false; }
  }

  updated() { this._fetchIfNeeded(); }

  _renderTilesForCategory(cat) {
    const prec = clampNumber(this._config.precision, 2);
    const thresholds = (this._config.show_classes ? (this._config.class_mode === "custom" ? this._config.custom_class_thresholds : (this._config.class_mode === "eu_space_heating" ? etaToScopThresholds(EU_TABLE1_ETA_S) : etaToScopThresholds(EU_TABLE2_ETA_S))) : null);
    
    return html`
      <div class="grid">
        ${PERIODS.map((p) => {
          const m = cat?.periods?.[p.key] || {};
          return html`
            <div class="tile">
              <div class="tileTop"><div class="tileLabel">${(p.kind === "scop" ? "SCOP " : "COP ") + p.label}</div>${thresholds ? this._badge(pickClass(m.ratio, thresholds), true) : nothing}</div>
              <div class="value">${formatNum(m.ratio, prec)}</div>
              <div class="meta">
                <div class="metaRow"><div>${t(this.hass, "produced")}:</div><div class="muted">${formatNum(m.produced_kwh, 2)} kWh</div></div>
                <div class="metaRow"><div>${t(this.hass, "consumed")}:</div><div class="muted">${formatNum(m.consumed_kwh, 2)} kWh</div></div>
                ${m.aux_total_kwh != null ? html`
                  ${cat.key === "total" ? html`
                    <div class="metaRow"><div>${t(this.hass, "aux_from")} (Top):</div><div class="muted">${formatNum(m.aux1_kwh, 2)} kWh</div></div>
                    <div class="metaRow"><div>${t(this.hass, "aux_from")} (TUV):</div><div class="muted">${formatNum(m.aux2_kwh, 2)} kWh</div></div>
                  ` : html`<div class="metaRow"><div>${t(this.hass, "aux_from")}:</div><div class="muted">${formatNum(m.aux_total_kwh, 2)} kWh</div></div>`}
                  <div class="metaRow"><div>${t(this.hass, "total_consumed")}:</div><div class="muted">${formatNum(m.consumed_total_kwh, 2)} kWh</div></div>
                ` : nothing}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  render() {
    if (!this._config) return nothing;
    const enabled = this._getEnabledCategories();
    const cat = (this._config.mode === "single") ? (this._data?.categories?.[this._selectedKey] || this._data?.categories?.[enabled?.[0]?.key]) : null;
    const thresholds = (this._config.show_classes ? (this._config.class_mode === "custom" ? this._config.custom_class_thresholds : (this._config.class_mode === "eu_space_heating" ? etaToScopThresholds(EU_TABLE1_ETA_S) : etaToScopThresholds(EU_TABLE2_ETA_S))) : null);

    return html`
      <ha-card>
        <div class="card">
          <div class="header"><div class="title">${this._config.title}</div><div class="muted">${this._loading ? t(this.hass, "loading") : ""}</div></div>
          ${(this._config.mode === "single" && enabled.length > 1) ? html`<div class="row"><div>${t(this.hass, "category")}:</div><select @change=${(e) => this._selectedKey = e.target.value} .value=${this._selectedKey}>${enabled.map(c => html`<option value=${c.key}>${c.name}</option>`)}</select></div>` : nothing}
          ${this._config.mode === "single" ? (cat ? this._renderTilesForCategory(cat) : nothing) : html`
            <div class="tableWrap">
              <table class="table">
                <thead><tr><th class="colCat">${t(this.hass, "category")}</th>${PERIODS.map(p => html`<th class="colPeriodHeader" colspan="2">${(p.kind === "scop" ? "SCOP " : "COP ") + p.label}</th>`)}</tr></thead>
                <tbody>${enabled.map(c => { const m = this._data?.categories?.[c.key]; return html`<tr><td>${c.name}</td>${PERIODS.map(p => html`<td class="colVal"><span class="cellVal">${formatNum(m?.periods?.[p.key]?.ratio, this._config.precision)}</span></td><td class="colCls"><span class="badgeCell">${thresholds ? this._badge(pickClass(m?.periods?.[p.key]?.ratio, thresholds), !!this._config.colorize_table_classes) : nothing}</span></td>`)}</tr>`; })}</tbody>
              </table>
            </div>
          `}
          ${this._error ? html`<div class="err">${this._error}</div>` : nothing}
        </div>
      </ha-card>
    `;
  }
}
customElements.define("cop-scop-card", CopScopCard);

// -------------------- EDITOR --------------------
class CopScopCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: { state: true } }; }
  static styles = css`
    :host { display:block; padding: 8px 0; }
    .wrap { display: grid; gap: 12px; }
    .box { border: 1px solid var(--divider-color); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.02); }
    .head { font-weight: 800; margin-bottom: 10px; opacity: 0.95; }
    .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .hr { height:1px; background: var(--divider-color); opacity:0.6; margin: 10px 0; }
    .catBox { padding-top: 8px; }
    .rowLine { display:flex; align-items:center; gap: 10px; }
    .badgePreview{ width: 100%; display:flex; justify-content:flex-end; align-items:center; gap: 10px; }
  `;

  setConfig(config) { this._config = { ...DEFAULT_CONFIG, ...config }; }

  _setThreshold(cls, val) { const cfg = { ...this._config, custom_class_thresholds: { ...this._config.custom_class_thresholds, [cls]: clampNumber(val, 0) } }; fireEvent(this, "config-changed", { config: cfg }); }
  _setCategory(idx, patch) { const cats = [...this._config.categories]; cats[idx] = { ...cats[idx], ...patch }; fireEvent(this, "config-changed", { config: { ...this._config, categories: cats } }); }

  render() {
    if (!this.hass || !this._config) return nothing;
    const classKeys = ["A+++","A++","A+","A","B","C","D","E","F","G"];
    return html`
      <div class="wrap">
        <div class="box">
          <div class="head">${t(this.hass, "display")}</div>
          <ha-form .hass=${this.hass} .data=${this._config} .schema=${[
            { name: "title", selector: { text: {} } },
            { name: "mode", selector: { select: { mode: "dropdown", options: [{ value: "single", label: t(this.hass, "mode_single") }, { value: "table", label: t(this.hass, "mode_table") }] } } },
            { name: "precision", selector: { number: { min: 0, max: 4, step: 1, mode: "box" } } },
            { name: "refresh_minutes", selector: { number: { min: 5, max: 240, step: 5, mode: "box" } } },
            { name: "show_classes", selector: { boolean: {} } },
            { name: "colorize_table_classes", selector: { boolean: {} } },
            { name: "class_mode", selector: { select: { mode: "dropdown", options: [{ value: "none", label: t(this.hass, "class_none") }, { value: "custom", label: t(this.hass, "class_custom") }, { value: "eu_space_heating", label: t(this.hass, "class_eu") }, { value: "eu_space_heating_lowtemp", label: t(this.hass, "class_eu_lt") }] } } },
          ]} @value-changed=${(e) => fireEvent(this, "config-changed", { config: e.detail.value })}></ha-form>
        </div>
        ${(this._config.show_classes && this._config.class_mode === "custom") ? html`<div class="box"><div class="head">${t(this.hass, "thresholds")}</div><div class="grid3">${classKeys.map(k => html`<ha-number-input .label=${k} .value=${this._config.custom_class_thresholds[k]} .min=${0} .max=${20} .step=${0.01} @value-changed=${(e) => this._setThreshold(k, e.detail.value)}></ha-number-input>`)}</div></div>` : nothing}
        <div class="box">
          <div class="head">${t(this.hass, "category")}</div>
          ${(this._config.categories || []).map((c, idx) => html`
            <div class="catBox">
              <b>${c.key.toUpperCase()}</b>
              <ha-form .hass=${this.hass} .data=${c} .schema=${[
                { name: "name", label: t(this.hass, "name"), selector: { text: {} } },
                { name: "enabled", label: t(this.hass, "enabled"), selector: { boolean: {} } },
                { name: "produced_entity", label: t(this.hass, "produced_entity"), selector: { entity: {} } },
                { name: "consumed_entity", label: t(this.hass, "consumed_entity"), selector: { entity: {} } },
                { name: "aux_entity", label: t(this.hass, "add_aux"), selector: { entity: {} } },
                ...(c.key === "total" ? [{ name: "aux_entity2", label: t(this.hass, "add_aux2"), selector: { entity: {} } }] : []),
                { name: "aux_included", label: t(this.hass, "aux_included"), selector: { boolean: {} } },
              ]} @value-changed=${(e) => this._setCategory(idx, e.detail.value)}></ha-form>
              <div class="hr"></div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
customElements.define("cop-scop-card-editor", CopScopCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "cop-scop-card", name: "COP/SCOP Card", description: "COP/SCOP statistics with local caching and aux heater settings.", preview: true });