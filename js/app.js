/* КотоДом — галерея, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- галерея ---------- */
const GALLERY = [
  { img: "assets/render_start.jpg", preset: "start", nm: "«Старт»",
    ds: "Первый куб-нора и когтеточка. С этого начинается любой КотоДом — остальное докупается, когда захочется." },
  { img: "assets/render_wide.jpg", preset: "wide", nm: "«Мост»",
    ds: "Два куба, тоннель между ними и гамак сверху — маршрут для пробежек, засад и послеобеденного сна." },
  { img: "assets/render_tower.jpg", preset: "tower", nm: "«Башня»",
    ds: "Куб, смотровая площадка и крыша — вертикальный дом для кота, который любит наблюдать сверху." }
];
const grid = $("#galleryGrid");
GALLERY.forEach(g => {
  const el = document.createElement("div");
  el.className = "g-card";
  el.innerHTML = `
    <img src="${g.img}" alt="Конфигурация ${g.nm} в интерьере" loading="lazy"
         onerror="this.style.display='none'">
    <div class="g-body">
      <div class="g-nm">${g.nm}</div>
      <div class="g-ds">${g.ds}</div>
      <div class="g-ft">
        <button class="btn btn-ghost" data-p="${g.preset}">Собрать в конструкторе</button>
      </div>
    </div>`;
  grid.appendChild(el);
  el.querySelector("button").addEventListener("click", () => {
    KD.loadPreset(g.preset);
    document.getElementById("studio").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

/* ---------- модалка ---------- */
function open(html){ body.innerHTML = html; back.classList.add("open"); }
function close(){ back.classList.remove("open"); }
xBtn.addEventListener("click", close);
back.addEventListener("click", e => { if (e.target === back) close(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

/* ---------- оформление ---------- */
$("#btnOrder").addEventListener("click", () => {
  const lines = KD.configurator.orderLines();
  if (!lines.length) return;
  const t = KD.configurator.totals();
  open(`
    <h3>Ваш КотоДом</h3>
    <p class="m-sub">Проверьте состав и оставьте контакты — Момо примет заказ.</p>
    <ul class="order-lines">
      ${lines.map(l => `<li><span>${l.name} × ${l.n}</span><span class="n">${fmt(l.sum)}</span></li>`).join("")}
      ${t.disc ? `<li><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n">−${fmt(t.disc)}</span></li>` : ""}
      <li class="total"><span>Итого</span><span class="n">${fmt(t.total)}</span></li>
    </ul>
    <form id="orderForm">
      <div class="f-row"><label for="fNm">Как вас зовут</label>
        <input id="fNm" required maxlength="80" placeholder="Имя"></div>
      <div class="f-row"><label for="fCt">Telegram или телефон</label>
        <input id="fCt" required maxlength="80" placeholder="@username или +7…"></div>
      <div class="f-row"><label for="fAd">Город и адрес доставки</label>
        <input id="fAd" required maxlength="160" placeholder="Город, улица, дом"></div>
      <div class="f-row"><label for="fCm">Комментарий (кличка кота приветствуется)</label>
        <textarea id="fCm" rows="2" maxlength="300" placeholder="Например: кот Батон, 6 кг, любит высоту"></textarea></div>
      <button class="btn btn-aka" type="submit" style="width:100%">К оплате</button>
      <div class="err-note" id="orderErr"></div>
    </form>
  `);
  $("#orderForm").addEventListener("submit", e => {
    e.preventDefault();
    payStep({
      lines, total: t.total, disc: t.disc,
      customer: {
        name: $("#fNm").value.trim(),
        contact: $("#fCt").value.trim(),
        address: $("#fAd").value.trim(),
        comment: $("#fCm").value.trim()
      }
    });
  });
});

function payStep(order){
  open(`
    <h3>Оплата</h3>
    <p class="m-sub">Это демо-магазин: кнопка ниже имитирует оплату, деньги не списываются.</p>
    <div class="pay-demo">
      <div>к оплате</div>
      <div class="big">${fmt(order.total)}</div>
      <div>ЮKassa · демо-режим</div>
    </div>
    <button class="btn btn-aka" id="payBtn" style="width:100%">Оплатить ${fmt(order.total)}</button>
    <div class="err-note" id="payErr"></div>
  `);
  $("#payBtn").addEventListener("click", async () => {
    const btn = $("#payBtn"), err = $("#payErr");
    btn.disabled = true; btn.textContent = "Проводим оплату…";
    err.textContent = "";
    try{
      if (!KD.API) throw new Error("no-api");
      const r = await fetch(KD.API + "/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
        signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      successStep(j.orderId || "КД-????");
    }catch(e){
      btn.disabled = false; btn.textContent = `Оплатить ${fmt(order.total)}`;
      err.textContent = e.message === "no-api"
        ? "Backend не настроен — заказ некуда отправить."
        : "Сервер магазина не отвечает. Попробуйте ещё раз через минуту.";
    }
  });
}

function successStep(orderId){
  open(`
    <div class="success-cat">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="var(--sakura)"/>
        <path d="M18 26 L22 14 L29 22 Z M46 26 L42 14 L35 22 Z" fill="#FFFDF8" stroke="var(--ink)" stroke-width="1.2"/>
        <circle cx="32" cy="36" r="17" fill="#FFFDF8" stroke="var(--ink)" stroke-width="1.2"/>
        <path d="M25 34 q2 3 4 0 M35 34 q2 3 4 0" stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M29 41 q3 3 6 0" stroke="var(--aka)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      </svg>
    </div>
    <h3 style="text-align:center">Заказ принят!</h3>
    <div class="order-id">${orderId}</div>
    <p class="m-sub" style="text-align:center">Момо уже отправил заказ владельцу в Telegram.
       Мару шлёт довольное «мяу» и просит собрать домик поскорее.</p>
    <button class="btn btn-aka" style="width:100%" onclick="document.getElementById('modalBack').classList.remove('open')">Отлично!</button>
  `);
}
})();
