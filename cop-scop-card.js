const CSC_VERSION="1.3.5";let Lit,__litFromCDN=!1;try{Lit=await import("lit")}catch{Lit=await import("https://cdn.jsdelivr.net/npm/lit@3/+esm"),__litFromCDN=!0}const{LitElement:e,html:a,css:s,nothing:i}=Lit;console.info(`[CSC] COP/SCOP Card v1.3.5 loaded (Lit: ${__litFromCDN?"CDN":"local"})`);const fireEvent=(e,a,s={})=>{let i=new Event(a,{bubbles:!0,composed:!0,cancelable:!1});return i.detail=s,e.dispatchEvent(i),i},clampNumber=(e,a)=>{let s=Number(e);return Number.isFinite(s)?s:a},normLang=e=>{let a=String(e?.language||"en").toLowerCase();return a.startsWith("cs")?"cs":"en"},STRINGS={cs:{category:"Kategorie",cop:"COP",scop:"SCOP",produced:"Δv\xfdroba",consumed:"Δspotřeba",aux_from:"z toho př\xeddavn\xe9 topen\xed",aux_heating:"topen\xed",aux_dhw:"TUV",aux_total:"př\xeddavn\xe9 (celkem)",total_consumed:"Δspotřeba celkem",missing_cfg:"Chyb\xed konfigurace – nastav kategorie v editoru.",loading:"Nač\xedt\xe1m…",stats_warn:"Nepodařilo se z\xedskat statistiky pro někter\xe9 entity. Zkontroluj long-term statistics (state_class total/total_increasing, device_class energy).",mode_single:"Single",mode_table:"Table",show_class:"Zobrazovat energetickou tř\xeddu",colorize_table:"Barvit tř\xeddy v tabulce",class_mode:"Režim tř\xedd",class_custom:"Custom (prahy COP/SCOP)",class_none:"None",class_eu:"EU space heating (orientačně)",class_eu_lt:"EU space heating LOW-TEMP (orientačně)",thresholds:"Prahy tř\xedd (min COP/SCOP)",class_style:"Styl tř\xedd (text + barva)",add_aux:"Př\xeddavn\xe9 topen\xed (kWh) – entita",add_aux2:"Př\xeddavn\xe9 topen\xed #2 (kWh) – entita",aux_included:"Př\xeddavn\xe9 topen\xed je již zahrnuto ve spotřebě",produced_entity:"V\xfdroba (kWh) – entita",consumed_entity:"Spotřeba (kWh) – entita",enabled:"Povoleno",name:"N\xe1zev",refresh:"Refresh (min)",precision:"Desetinn\xe1 m\xedsta",month_days:"Měs\xedc (dnů)",year_days:"Rok (dnů)",title:"N\xe1zev",display:"Zobrazen\xed"},en:{category:"Category",cop:"COP",scop:"SCOP",produced:"Δproduced",consumed:"Δconsumed",aux_from:"of which aux heater",aux_heating:"heating",aux_dhw:"DHW",aux_total:"aux (total)",total_consumed:"Δconsumed total",missing_cfg:"Missing config – set categories in the editor.",loading:"Loading…",stats_warn:"Unable to fetch statistics for some entities.",mode_single:"Single",mode_table:"Table",show_class:"Show energy class",colorize_table:"Colorize classes in table",class_mode:"Class mode",class_custom:"Custom (COP/SCOP thresholds)",class_none:"None",class_eu:"EU space heating (approx.)",class_eu_lt:"EU space heating LOW-TEMP (approx.)",thresholds:"Class thresholds (min COP/SCOP)",class_style:"Class style (label + color)",add_aux:"Aux heater (kWh) – entity",add_aux2:"Aux heater #2 (kWh) – entity",aux_included:"Aux heater already included in consumption",produced_entity:"Produced (kWh) – entity",consumed_entity:"Consumed (kWh) – entity",enabled:"Enabled",name:"Name",refresh:"Refresh (min)",precision:"Decimals",month_days:"Month (days)",year_days:"Year (days)",title:"Title",display:"Display"}},t=(e,a)=>{let s=normLang(e);return STRINGS[s]&&STRINGS[s][a]||STRINGS.en[a]||a},DEFAULT_THRESHOLDS_CUSTOM={"A+++":4.5,"A++":4,"A+":3.5,A:3,B:2.7,C:2.4,D:2.1,E:1.8,F:1.5,G:0},DEFAULT_CLASS_COLORS={"A+++":"#00c853","A++":"#64dd17","A+":"#cddc39",A:"#ffeb3b",B:"#ffc107",C:"#ff9800",D:"#ff5722",E:"#f44336",F:"#d32f2f",G:"#9e9e9e"},DEFAULT_CLASS_LABELS={"A+++":"A+++","A++":"A++","A+":"A+",A:"A",B:"B",C:"C",D:"D",E:"E",F:"F",G:"G"},CC_EU=2.5,EU_TABLE1_ETA_S={"A+++":150,"A++":125,"A+":98,A:90,B:82,C:75,D:36,E:34,F:30,G:0},EU_TABLE2_ETA_S={"A+++":175,"A++":150,"A+":123,A:115,B:107,C:100,D:61,E:59,F:55,G:0},etaToScopThresholds=e=>{let a={};return Object.keys(e).forEach(s=>{a[s]=2.5*e[s]/100}),a},pickClass=(e,a)=>{if(!Number.isFinite(e)||!a)return null;let s=Object.entries(a).map(([e,a])=>[e,Number(a)]).filter(([,e])=>Number.isFinite(e)).sort((e,a)=>a[1]-e[1]);for(let[i,o]of s)if(e>=o)return i;return null},formatNum=(e,a)=>null!=e&&Number.isFinite(e)?Number(e).toFixed(a):"—",PERIODS=[{key:"day",label:"24h",kind:"cop",days:1,group:"hour"},{key:"week",label:"7d",kind:"cop",days:7,group:"day"},{key:"month",label:"30d",kind:"cop",daysCfg:"month_days",group:"day"},{key:"year",label:"365d",kind:"scop",daysCfg:"year_days",group:"day"},],periodStart=(e,a,s)=>{let i=s.daysCfg?clampNumber(a[s.daysCfg],"month"===s.key?30:365):s.days;return new Date(e.getTime()-864e5*i)},sumChangeFromStats=e=>{if(!Array.isArray(e)||0===e.length)return null;let a=!1,s=0;for(let i of e)i&&null!=i.change&&(a=!0,s+=Number(i.change));if(a)return s;let o=e[0],l=e[e.length-1],r=o?.sum??o?.state,d=l?.sum??l?.state,n=Number(r),c=Number(d);return Number.isFinite(n)&&Number.isFinite(c)?c-n:null},DEFAULT_CONFIG={title:"Tepeln\xe9 čerpadlo – COP/SCOP",mode:"single",precision:2,refresh_minutes:60,month_days:30,year_days:365,show_classes:!0,colorize_table_classes:!0,class_mode:"custom",custom_class_thresholds:{...DEFAULT_THRESHOLDS_CUSTOM},class_colors:{...DEFAULT_CLASS_COLORS},class_labels:{...DEFAULT_CLASS_LABELS},categories:[{key:"dhw",name:"TUV",enabled:!0,produced_entity:"",consumed_entity:"",aux_entity:"",aux_included:!1},{key:"heating",name:"Topen\xed",enabled:!0,produced_entity:"",consumed_entity:"",aux_entity:"",aux_included:!1},{key:"cooling",name:"Chlazen\xed",enabled:!0,produced_entity:"",consumed_entity:"",aux_entity:"",aux_included:!1},{key:"total",name:"Celkem",enabled:!0,produced_entity:"",consumed_entity:"",aux_entity:"",aux_entity2:"",aux_included:!1},]};class CopScopCard extends e{static get properties(){return{hass:{},_config:{state:!0},_data:{state:!0},_error:{state:!0},_loading:{state:!0},_lastFetch:{state:!0},_selectedKey:{state:!0},_w:{state:!0}}}static getConfigElement(){return document.createElement("cop-scop-card-editor")}static getStubConfig(){return{...DEFAULT_CONFIG}}static styles=s`
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
  `;constructor(){super(),this._config=null,this._data=null,this._loading=!1,this._lastFetch=0,this._selectedKey="total",this._w=9999,this.__ro=null}setConfig(e){let a=e||{};this._config={...DEFAULT_CONFIG,...a,custom_class_thresholds:{...DEFAULT_CONFIG.custom_class_thresholds,...a.custom_class_thresholds||{}},class_colors:{...DEFAULT_CONFIG.class_colors,...a.class_colors||{}},class_labels:{...DEFAULT_CONFIG.class_labels,...a.class_labels||{}},categories:Array.isArray(a.categories)?a.categories.map((e,a)=>({...DEFAULT_CONFIG.categories[a]||{},...e})):DEFAULT_CONFIG.categories.map(e=>({...e}))},this._selectedKey=this._getEnabledCategories()[0]?.key||"total",this._loadCache()}_getCacheKey(){return`csc_cache_${(this._config?.title||"default").replace(/\s+/g,"_").toLowerCase()}`}_loadCache(){try{let e=localStorage.getItem(this._getCacheKey());if(e){let a=JSON.parse(e);this._data=a.data,this._lastFetch=a.ts||0}}catch(s){console.warn("[CSC] Cache load error",s)}}_saveCache(e){try{localStorage.setItem(this._getCacheKey(),JSON.stringify({ts:Date.now(),data:e}))}catch(a){console.warn("[CSC] Cache save error",a)}}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{let e=this.renderRoot?.querySelector(".card");e&&!this.__ro&&(this.__ro=new ResizeObserver(e=>{let a=Math.round(e?.[0]?.contentRect?.width||0);a&&a!==this._w&&(this._w=a)}),this.__ro.observe(e))})}disconnectedCallback(){this.__ro?.disconnect(),super.disconnectedCallback()}_getEnabledCategories(){return(this._config?.categories||[]).filter(e=>e&&e.enabled)}_getAllEntityIds(){let e=new Set;for(let a of this._getEnabledCategories())[a.produced_entity,a.consumed_entity,a.aux_entity,a.aux_entity2].forEach(a=>a&&e.add(a));return[...e]}_badge(e,s=!0){if(!e)return i;let o=(this._config?.class_labels||DEFAULT_CLASS_LABELS)[e]||e,l=s?(this._config?.class_colors||DEFAULT_CLASS_COLORS)[e]||"#64dd17":"rgba(255,255,255,0.08)";return a`<span class="badge" style="background:${l}; color:${s?"rgba(0,0,0,0.85)":"var(--primary-text-color)"}; border-color:${s?"transparent":"rgba(255,255,255,0.16)"};">${o}</span>`}async _fetchIfNeeded(){if(!this.hass||!this._config||this._loading)return;let e=6e4*clampNumber(this._config.refresh_minutes,60);if(this._data&&Date.now()-this._lastFetch<e)return;let a=this._getAllEntityIds();if(0===a.length){this._error=t(this.hass,"missing_cfg");return}this._loading=!0,this._error=null;try{let s=new Date,i={};for(let o of PERIODS){let l=await this.hass.callWS({type:"recorder/statistics_during_period",start_time:periodStart(s,this._config,o).toISOString(),end_time:s.toISOString(),statistic_ids:a,period:o.group,types:["change","sum","state"]});i[o.key]={changes:{}},a.forEach(e=>{i[o.key].changes[e]=sumChangeFromStats(l?.[e]||[])})}let r={};for(let d of this._getEnabledCategories()){let n={name:d.name,key:d.key,periods:{}};for(let c of PERIODS){let h=i[c.key].changes,p=h[d.produced_entity],u=h[d.consumed_entity],m=h[d.aux_entity]||0,g=h[d.aux_entity2]||0,f=m+g,y=null!=u?d.aux_included?u:u+f:null,b=null!=p&&y>0?p/y:null;n.periods[c.key]={produced_kwh:p,consumed_kwh:u,aux1_kwh:m,aux2_kwh:g,aux_total_kwh:null!=h[d.aux_entity]||null!=h[d.aux_entity2]?f:null,consumed_total_kwh:y,ratio:b}}r[d.key]=n}this._data={categories:r},this._saveCache(this._data),this._lastFetch=Date.now()}catch($){this._error=`Error: ${$?.message||$}`}finally{this._loading=!1}}updated(){this._fetchIfNeeded()}_renderTilesForCategory(e){let s=clampNumber(this._config.precision,2),o=this._config.show_classes?"custom"===this._config.class_mode?this._config.custom_class_thresholds:"eu_space_heating"===this._config.class_mode?etaToScopThresholds(EU_TABLE1_ETA_S):etaToScopThresholds(EU_TABLE2_ETA_S):null;return a`
      <div class="grid">
        ${PERIODS.map(l=>{let r=e?.periods?.[l.key]||{};return a`
            <div class="tile">
              <div class="tileTop"><div class="tileLabel">${("scop"===l.kind?"SCOP ":"COP ")+l.label}</div>${o?this._badge(pickClass(r.ratio,o),!0):i}</div>
              <div class="value">${formatNum(r.ratio,s)}</div>
              <div class="meta">
                <div class="metaRow"><div>${t(this.hass,"produced")}:</div><div class="muted">${formatNum(r.produced_kwh,2)} kWh</div></div>
                <div class="metaRow"><div>${t(this.hass,"consumed")}:</div><div class="muted">${formatNum(r.consumed_kwh,2)} kWh</div></div>
                ${null!=r.aux_total_kwh?a`
                  ${"total"===e.key?a`
                    <div class="metaRow"><div>${t(this.hass,"aux_from")} (Top):</div><div class="muted">${formatNum(r.aux1_kwh,2)} kWh</div></div>
                    <div class="metaRow"><div>${t(this.hass,"aux_from")} (TUV):</div><div class="muted">${formatNum(r.aux2_kwh,2)} kWh</div></div>
                  `:a`<div class="metaRow"><div>${t(this.hass,"aux_from")}:</div><div class="muted">${formatNum(r.aux_total_kwh,2)} kWh</div></div>`}
                  <div class="metaRow"><div>${t(this.hass,"total_consumed")}:</div><div class="muted">${formatNum(r.consumed_total_kwh,2)} kWh</div></div>
                `:i}
              </div>
            </div>
          `})}
      </div>
    `}render(){if(!this._config)return i;let e=this._getEnabledCategories(),s="single"===this._config.mode?this._data?.categories?.[this._selectedKey]||this._data?.categories?.[e?.[0]?.key]:null,o=this._config.show_classes?"custom"===this._config.class_mode?this._config.custom_class_thresholds:"eu_space_heating"===this._config.class_mode?etaToScopThresholds(EU_TABLE1_ETA_S):etaToScopThresholds(EU_TABLE2_ETA_S):null;return a`
      <ha-card>
        <div class="card">
          <div class="header"><div class="title">${this._config.title}</div><div class="muted">${this._loading?t(this.hass,"loading"):""}</div></div>
          ${"single"===this._config.mode&&e.length>1?a`<div class="row"><div>${t(this.hass,"category")}:</div><select @change=${e=>this._selectedKey=e.target.value} .value=${this._selectedKey}>${e.map(e=>a`<option value=${e.key}>${e.name}</option>`)}</select></div>`:i}
          ${"single"===this._config.mode?s?this._renderTilesForCategory(s):i:a`
            <div class="tableWrap">
              <table class="table">
                <thead><tr><th class="colCat">${t(this.hass,"category")}</th>${PERIODS.map(e=>a`<th class="colPeriodHeader" colspan="2">${("scop"===e.kind?"SCOP ":"COP ")+e.label}</th>`)}</tr></thead>
                <tbody>${e.map(e=>{let s=this._data?.categories?.[e.key];return a`<tr><td>${e.name}</td>${PERIODS.map(e=>a`<td class="colVal"><span class="cellVal">${formatNum(s?.periods?.[e.key]?.ratio,this._config.precision)}</span></td><td class="colCls"><span class="badgeCell">${o?this._badge(pickClass(s?.periods?.[e.key]?.ratio,o),!!this._config.colorize_table_classes):i}</span></td>`)}</tr>`})}</tbody>
              </table>
            </div>
          `}
          ${this._error?a`<div class="err">${this._error}</div>`:i}
        </div>
      </ha-card>
    `}}customElements.define("cop-scop-card",CopScopCard);class CopScopCardEditor extends e{static get properties(){return{hass:{},_config:{state:!0}}}static styles=s`
    :host { display:block; padding: 8px 0; }
    .wrap { display: grid; gap: 12px; }
    .box { border: 1px solid var(--divider-color); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.02); }
    .head { font-weight: 800; margin-bottom: 10px; opacity: 0.95; }
    .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .hr { height:1px; background: var(--divider-color); opacity:0.6; margin: 10px 0; }
    .catBox { padding-top: 8px; }
    .rowLine { display:flex; align-items:center; gap: 10px; }
    .badgePreview{ width: 100%; display:flex; justify-content:flex-end; align-items:center; gap: 10px; }
  `;setConfig(e){this._config={...DEFAULT_CONFIG,...e}}_setThreshold(e,a){let s={...this._config,custom_class_thresholds:{...this._config.custom_class_thresholds,[e]:clampNumber(a,0)}};fireEvent(this,"config-changed",{config:s})}_setCategory(e,a){let s=[...this._config.categories];s[e]={...s[e],...a},fireEvent(this,"config-changed",{config:{...this._config,categories:s}})}render(){return this.hass&&this._config?a`
      <div class="wrap">
        <div class="box">
          <div class="head">${t(this.hass,"display")}</div>
          <ha-form .hass=${this.hass} .data=${this._config} .schema=${[{name:"title",selector:{text:{}}},{name:"mode",selector:{select:{mode:"dropdown",options:[{value:"single",label:t(this.hass,"mode_single")},{value:"table",label:t(this.hass,"mode_table")}]}}},{name:"precision",selector:{number:{min:0,max:4,step:1,mode:"box"}}},{name:"refresh_minutes",selector:{number:{min:5,max:240,step:5,mode:"box"}}},{name:"show_classes",selector:{boolean:{}}},{name:"colorize_table_classes",selector:{boolean:{}}},{name:"class_mode",selector:{select:{mode:"dropdown",options:[{value:"none",label:t(this.hass,"class_none")},{value:"custom",label:t(this.hass,"class_custom")},{value:"eu_space_heating",label:t(this.hass,"class_eu")},{value:"eu_space_heating_lowtemp",label:t(this.hass,"class_eu_lt")}]}}},]} @value-changed=${e=>fireEvent(this,"config-changed",{config:e.detail.value})}></ha-form>
        </div>
        ${this._config.show_classes&&"custom"===this._config.class_mode?a`<div class="box"><div class="head">${t(this.hass,"thresholds")}</div><div class="grid3">${["A+++","A++","A+","A","B","C","D","E","F","G"].map(e=>a`<ha-number-input .label=${e} .value=${this._config.custom_class_thresholds[e]} .min=${0} .max=${20} .step=${.01} @value-changed=${a=>this._setThreshold(e,a.detail.value)}></ha-number-input>`)}</div></div>`:i}
        <div class="box">
          <div class="head">${t(this.hass,"category")}</div>
          ${(this._config.categories||[]).map((e,s)=>a`
            <div class="catBox">
              <b>${e.key.toUpperCase()}</b>
              <ha-form .hass=${this.hass} .data=${e} .schema=${[{name:"name",label:t(this.hass,"name"),selector:{text:{}}},{name:"enabled",label:t(this.hass,"enabled"),selector:{boolean:{}}},{name:"produced_entity",label:t(this.hass,"produced_entity"),selector:{entity:{}}},{name:"consumed_entity",label:t(this.hass,"consumed_entity"),selector:{entity:{}}},{name:"aux_entity",label:t(this.hass,"add_aux"),selector:{entity:{}}},..."total"===e.key?[{name:"aux_entity2",label:t(this.hass,"add_aux2"),selector:{entity:{}}}]:[],{name:"aux_included",label:t(this.hass,"aux_included"),selector:{boolean:{}}},]} @value-changed=${e=>this._setCategory(s,e.detail.value)}></ha-form>
              <div class="hr"></div>
            </div>
          `)}
        </div>
      </div>
    `:i}}customElements.define("cop-scop-card-editor",CopScopCardEditor),window.customCards=window.customCards||[],window.customCards.push({type:"cop-scop-card",name:"COP/SCOP Card",description:"COP/SCOP statistics with local caching and aux heater settings.",preview:!0});