(function(){
  const yearEl = document.getElementById("y");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      if(ent.isIntersecting){
        ent.target.classList.add("is-in");
        io.unobserve(ent.target);
      }
    });
  }, {threshold: 0.12});

  // Stagger
  document.querySelectorAll(".stagger").forEach(group=>{
    [...group.children].forEach((ch,i)=>{
      ch.style.setProperty("--d", `${i*90}ms`);
      ch.classList.add("reveal");
    });
  });
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

  // Parallax hero background
  const heroBg = document.querySelector(".hero-bg");
  const frame = document.querySelector(".hero-frame");
  if(heroBg && frame){
    let last = 0;
    const onScroll = () => {
      const r = frame.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = ((r.top + r.height/2) - vh/2) / (vh/2);
      const y = Math.max(-18, Math.min(18, p * 18));
      if (Math.abs(y - last) > 0.1){
        heroBg.style.transform = `translate3d(0, ${y}px, 0) scale(1.05)`;
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, {passive:true});
  }

  // WhatsApp helper
  const WHATSAPP_PHONE = window.WHATSAPP_PHONE || "";
  function openWhatsApp(text){
    const url = WHATSAPP_PHONE
      ? `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  document.getElementById("btnTopWhatsApp")?.addEventListener("click", () => {
    openWhatsApp("Здравствуйте! Нужен монтаж плинтусов. Подскажите стоимость и сроки.");
  });
  document.getElementById("waLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    openWhatsApp("Здравствуйте! Хочу рассчитать монтаж плинтусов. Мой метраж: ...");
  });

  // ====== calculator ======
  const SERVICE_CATALOG = [
    { id: "hidden",  name: "Скрытый плинтус", pricePerM: 60 },
    { id: "led",     name: "С подсветкой",    pricePerM: 90 },
    { id: "shadow",  name: "Теневой плинтус", pricePerM: 30 },
    { id: "micro",   name: "Микро плинтус",   pricePerM: 6  },
    { id: "microL",  name: "Микро L",         pricePerM: 8  },
    { id: "duro",    name: "Дюрополимер",     pricePerM: 10 },
    { id: "mdf",     name: "МДФ",             pricePerM: 10 },
    { id: "pvc",     name: "ПВХ",             pricePerM: 8  },
    { id: "wood",    name: "Дерево",          pricePerM: 12 },
    { id: "metal",   name: "Металл",          pricePerM: 15 },
    { id: "poly",    name: "Полиуретан",      pricePerM: 12 },
    { id: "paint",   name: "Покраска",        pricePerM: 5  },
    { id: "seal",    name: "Герметизация",    pricePerM: 3  },
  ];

  const priceList = document.getElementById("priceList");
  if(priceList){
    SERVICE_CATALOG.slice(0, 9).forEach(s=>{
      const li = document.createElement("li");
      li.innerHTML = `<span>${s.name}</span><small>${s.pricePerM} руб/м.п</small>`;
      priceList.appendChild(li);
    });
  }

  const WALL_TYPES = [
    { id: "brick",    name: "Кирпичная"  },
    { id: "mono",     name: "Монолитная" },
    { id: "plaster",  name: "Штукатурка" },
    { id: "gkl",      name: "ГКЛ"        },
    { id: "block",    name: "Блочная"    },
    { id: "wood",     name: "Дерево"     },
    { id: "radius",   name: "Радиусная"  },
  ];

  // При необходимости включи цены за допы
  const ADDONS = { cornerPrice: 0, doorPrice: 0 };

  const LS_KEYS = { rows: "plint_calc_rows_v3", coefs: "plint_calc_wallcoefs_v3" };

  const elRows = document.getElementById("calcRows");
  const elTotal = document.getElementById("grandTotal");
  const elCoefGrid = document.getElementById("coefGrid");
  const elCopyHint = document.getElementById("copyHint");
  if(!elRows || !elTotal || !elCoefGrid) return;

  const clampNum = (v)=>{ const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const money = (n)=> String(Math.round(n));

  function loadCoefs(){
    const raw = localStorage.getItem(LS_KEYS.coefs);
    if(raw){ try{return JSON.parse(raw)}catch{} }
    const d={}; WALL_TYPES.forEach(w=>d[w.id]=1); return d;
  }
  function saveCoefs(c){ localStorage.setItem(LS_KEYS.coefs, JSON.stringify(c)); }

  function loadRows(){
    const raw = localStorage.getItem(LS_KEYS.rows);
    if(raw){ try{ const rows=JSON.parse(raw); if(Array.isArray(rows)&&rows.length) return rows; }catch{} }
    return [makeRow()];
  }
  function saveRows(rows){ localStorage.setItem(LS_KEYS.rows, JSON.stringify(rows)); }

  function makeRow(){ return { serviceId: SERVICE_CATALOG[0].id, meters:0, corners:0, doors:0, wallTypeId: WALL_TYPES[0].id }; }

  let wallCoefs = loadCoefs();
  let rowsState = loadRows();

  function renderCoefGrid(){
    elCoefGrid.innerHTML="";
    WALL_TYPES.forEach(w=>{
      const wrap=document.createElement("div");
      wrap.className="coef-item reveal";
      wrap.innerHTML = `<label for="coef_${w.id}">${w.name}</label>
                        <input id="coef_${w.id}" inputmode="decimal" value="${wallCoefs[w.id] ?? 1}">`;
      const inp = wrap.querySelector("input");
      inp.addEventListener("input", ()=>{
        wallCoefs[w.id]=Math.max(0, clampNum(inp.value));
        saveCoefs(wallCoefs);
        recalc();
      });
      elCoefGrid.appendChild(wrap);
    });
  }

  const serviceOptions = (sel)=> SERVICE_CATALOG.map(s=>`<option value="${s.id}" ${s.id===sel?"selected":""}>${s.name} — ${s.pricePerM} руб/м.п</option>`).join("");
  const wallOptions = (sel)=> WALL_TYPES.map(w=>`<option value="${w.id}" ${w.id===sel?"selected":""}>${w.name}</option>`).join("");

  function rowTotal(row){
    const svc = SERVICE_CATALOG.find(s=>s.id===row.serviceId) || SERVICE_CATALOG[0];
    const coef = clampNum(wallCoefs[row.wallTypeId] ?? 1);
    const meters = Math.max(0, clampNum(row.meters));
    const corners = Math.max(0, clampNum(row.corners));
    const doors = Math.max(0, clampNum(row.doors));
    return meters*svc.pricePerM*coef + corners*ADDONS.cornerPrice + doors*ADDONS.doorPrice;
  }

  function renderRows(){
    elRows.innerHTML="";
    rowsState.forEach((row, idx)=>{
      const tr=document.createElement("tr");
      tr.className="reveal";
      tr.innerHTML = `
        <td><select data-k="serviceId" data-i="${idx}">${serviceOptions(row.serviceId)}</select></td>
        <td><input data-k="meters" data-i="${idx}" inputmode="decimal" value="${row.meters}"></td>
        <td><input data-k="corners" data-i="${idx}" inputmode="numeric" value="${row.corners}"></td>
        <td><input data-k="doors" data-i="${idx}" inputmode="numeric" value="${row.doors}"></td>
        <td><select data-k="wallTypeId" data-i="${idx}">${wallOptions(row.wallTypeId)}</select></td>
        <td class="row-total" id="rowTotal_${idx}">${money(rowTotal(row))} руб</td>
        <td><button class="btn" type="button" title="Удалить" data-del="${idx}">✕</button></td>
      `;
      tr.querySelectorAll("input,select").forEach(el=>{
        el.addEventListener("input", onRowChange);
        el.addEventListener("change", onRowChange);
      });
      tr.querySelector("[data-del]")?.addEventListener("click", (e)=>{
        const i = Number(e.currentTarget.getAttribute("data-del"));
        rowsState.splice(i,1);
        if(!rowsState.length) rowsState=[makeRow()];
        saveRows(rowsState); renderRows(); recalc();
        document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
      });
      elRows.appendChild(tr);
    });
  }

  function onRowChange(e){
    const el=e.target;
    const i=Number(el.getAttribute("data-i"));
    const k=el.getAttribute("data-k");
    const val=el.value;
    if(!rowsState[i]) return;
    if(k==="serviceId") rowsState[i].serviceId=val;
    else if(k==="wallTypeId") rowsState[i].wallTypeId=val;
    else if(k==="meters") rowsState[i].meters=clampNum(val);
    else if(k==="corners") rowsState[i].corners=clampNum(val);
    else if(k==="doors") rowsState[i].doors=clampNum(val);
    saveRows(rowsState); recalc();
  }

  function recalc(){
    let sum=0;
    rowsState.forEach((r,idx)=>{
      const t=rowTotal(r); sum+=t;
      const cell=document.getElementById(`rowTotal_${idx}`);
      if(cell) cell.textContent = `${money(t)} руб`;
    });
    elTotal.textContent = money(sum);
  }

  function buildMessage(){
    const lines=[];
    lines.push("Расчёт монтажа плинтусов:");
    rowsState.forEach((r,i)=>{
      const svc=SERVICE_CATALOG.find(s=>s.id===r.serviceId) || SERVICE_CATALOG[0];
      const wall=WALL_TYPES.find(w=>w.id===r.wallTypeId) || WALL_TYPES[0];
      const coef=clampNum(wallCoefs[r.wallTypeId] ?? 1);
      lines.push(`${i+1}) ${svc.name}: ${r.meters} м.п; углы ${r.corners}; двери ${r.doors}; стена ${wall.name} (коэф ${coef}) → ${money(rowTotal(r))} руб`);
    });
    lines.push(`ИТОГО: ${elTotal.textContent} руб`);
    return lines.join("\n");
  }

  document.getElementById("btnAddRow")?.addEventListener("click", ()=>{
    rowsState.push(makeRow());
    saveRows(rowsState); renderRows(); recalc();
    document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
  });
  document.getElementById("btnClear")?.addEventListener("click", ()=>{
    rowsState=[makeRow()];
    saveRows(rowsState); renderRows(); recalc();
    document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
  });
  document.getElementById("btnCopy")?.addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(buildMessage());
      if(elCopyHint){ elCopyHint.textContent="Скопировано."; setTimeout(()=>elCopyHint.textContent="", 1600); }
    }catch{
      if(elCopyHint){ elCopyHint.textContent="Не удалось скопировать."; setTimeout(()=>elCopyHint.textContent="", 2000); }
    }
  });
  document.getElementById("btnWhatsApp")?.addEventListener("click", ()=>openWhatsApp(buildMessage()));

  renderCoefGrid(); renderRows(); recalc();
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
})();
