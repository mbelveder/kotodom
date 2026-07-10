/* Котоши — галерея, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- галерея ---------- */
const GALLERY = [
  { img: "assets/render_start.jpg", preset: "start", nm: "«Старт»",
    ds: "Первый куб-нора и когтеточка. С этого начинается любой Котоши — остальное докупается, когда захочется." },
  { img: "assets/render_wide.jpg", preset: "wide", nm: "«Мост»",
    ds: "Два куба, тоннель между ними и гамак сверху — маршрут для пробежек, засад и послеобеденного сна." },
  { img: "assets/render_tower.jpg", preset: "tower", nm: "«Башня»",
    ds: "Куб, смотровая площадка и крыша — вертикальный дом для кота, который любит наблюдать сверху." }
];
const grid = $("#galleryGrid");
const presetPrice = key => Object.values(KD.PRESETS[key].cells)
  .reduce((s, t) => s + KD.MODULES[t].price, 0);
GALLERY.forEach(g => {
  const el = document.createElement("div");
  el.className = "g-card";
  el.innerHTML = `
    <div class="g-media">
      <img src="${g.img}" alt="Конфигурация ${g.nm} в интерьере" loading="lazy"
           onerror="this.style.display='none'">
      <div class="g-hover">${g.ds}</div>
    </div>
    <div class="g-body">
      <div class="g-nm">${g.nm}<span class="g-pr">${fmt(presetPrice(g.preset))}</span></div>
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
/* плейсхолдер каталога готовых сборок */
const more = document.createElement("div");
more.className = "g-card g-more";
more.innerHTML = `
  <div class="g-media">
    <div class="g-mock">🏯</div>
    <div class="g-hover">«Пагода», «Лабиринт», «Двухэтажка для двоих» и другие сборки от Момо и покупателей.</div>
  </div>
  <div class="g-body">
    <div class="g-nm">Каталог готовых сборок</div>
    <span class="soon">скоро</span>
  </div>`;
grid.appendChild(more);

/* ---------- логотип = кнопка «домой» ---------- */
const homeLink = document.querySelector(".hanko");
if (homeLink) homeLink.addEventListener("click", e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ---------- ролик: уважаем «поменьше движения» ---------- */
const filmVid = document.getElementById("filmVid");
if (filmVid && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  filmVid.removeAttribute("autoplay");
  filmVid.pause();
}

/* ---------- модалка ---------- */
function open(html){ body.innerHTML = html; back.classList.add("open"); }
function close(){ back.classList.remove("open"); }
xBtn.addEventListener("click", close);
back.addEventListener("click", e => { if (e.target === back) close(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

/* ---------- оформление ---------- */
function linesTotals(lines){
  const sum = lines.reduce((s, l) => s + l.sum, 0);
  const count = lines.reduce((s, l) => s + l.n, 0);
  const disc = count >= KD.DISCOUNT_FROM ? Math.round(sum * KD.DISCOUNT) : 0;
  return { count, sum, disc, total: sum - disc };
}
function checkoutStep(lines, t, subtitle){
  open(`
    <h3>Ваш Котоши</h3>
    <p class="m-sub">${subtitle || "Проверьте состав и оставьте контакты — Момо примет заказ."}</p>
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
}

/* заказ того, что собрано в сцене */
$("#btnOrder").addEventListener("click", () => {
  const lines = KD.configurator.orderLines();
  if (!lines.length) return;
  checkoutStep(lines, KD.configurator.totals());
});

/* заказ списком: модули по счёту, без сборки в сцене */
$("#btnBulk").addEventListener("click", () => {
  const qty = {};
  const rows = Object.entries(KD.MODULES).map(([t, m]) => `
    <li><span>${m.name}</span><span class="n">${fmt(m.price)}</span>
      <span class="qty"><button type="button" data-t="${t}" data-d="-1" aria-label="меньше">−</button><b
        id="q_${t}">0</b><button type="button" data-t="${t}" data-d="1" aria-label="больше">+</button></span></li>`).join("");
  open(`
    <h3>Заказать списком</h3>
    <p class="m-sub">Наберите модули по счёту — например, 5 тоннелей и 2 куба. Собирать в сцене не обязательно.</p>
    <ul class="order-lines bulk-lines">${rows}</ul>
    <ul class="order-lines">
      <li id="bulkDisc" style="display:none"><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n" id="bulkDiscN"></span></li>
      <li class="total"><span>Итого</span><span class="n" id="bulkTotal">0 ₽</span></li>
    </ul>
    <button class="btn btn-aka" id="bulkGo" style="width:100%" disabled>Продолжить</button>
  `);
  const goBtn = $("#bulkGo");
  const bulkLines = () => Object.entries(qty).filter(([, n]) => n > 0)
    .map(([t, n]) => ({ type: t, name: KD.MODULES[t].name, n, price: KD.MODULES[t].price, sum: KD.MODULES[t].price * n }));
  const redraw = () => {
    const t = linesTotals(bulkLines());
    $("#bulkTotal").textContent = fmt(t.total);
    $("#bulkDisc").style.display = t.disc ? "" : "none";
    if (t.disc) $("#bulkDiscN").textContent = "−" + fmt(t.disc);
    goBtn.disabled = !t.count;
    goBtn.textContent = t.count ? `Продолжить · ${fmt(t.total)}` : "Продолжить";
  };
  body.querySelectorAll(".qty button").forEach(b => b.addEventListener("click", () => {
    const t = b.dataset.t;
    qty[t] = Math.min(20, Math.max(0, (qty[t] || 0) + (+b.dataset.d)));
    $("#q_" + t).textContent = qty[t];
    redraw();
  }));
  goBtn.addEventListener("click", () => {
    const lines = bulkLines();
    if (lines.length) checkoutStep(lines, linesTotals(lines), "Модули списком — Момо примет заказ, соберёте сами как захотите.");
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
      successStep(j.orderId || "КШ-????");
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
      <img src="assets/logo-momo.png?v=2" alt="">
    </div>
    <h3 style="text-align:center">Заказ принят!</h3>
    <div class="order-id">${orderId}</div>
    <p class="m-sub" style="text-align:center">Момо уже отправил заказ владельцу в Telegram.
       Момо шлёт довольное «мяу» и просит собрать домик поскорее.</p>
    <button class="btn btn-aka" style="width:100%" onclick="document.getElementById('modalBack').classList.remove('open')">Отлично!</button>
  `);
}
})();
