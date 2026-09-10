let catalog = [];
let liveSubtotal = 0;

async function loadCatalog() {
  const res = await fetch("/api/checks-catalog");
  catalog = await res.json();
  const list = document.getElementById("checks-list");
  list.innerHTML = "";
  catalog.forEach((check) => {
    const row = document.createElement("div");
    row.className = "check-row";
    row.innerHTML = `
      <input type="checkbox" id="check-${check.id}" value="${check.id}" data-price="${check.price}" />
      <label for="check-${check.id}">${check.name}</label>
      <span>${check.price}</span>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", onCheckToggle);
  });
}

function onCheckToggle(e) {
  // BUG (UI): only adds to the live preview, never subtracts on uncheck
  if (e.target.checked) {
    liveSubtotal += Number(e.target.dataset.price);
  }
  document.getElementById("live-subtotal").textContent = `₹${liveSubtotal}`;
}

function getSelectedCheckIds() {
  return Array.from(document.querySelectorAll("input[type=checkbox]:checked")).map(
    (cb) => cb.id
  );
}

// BUG (UI, Hard): only re-validates the discount field the FIRST time it
// changes. After one edit has been checked, `discountValidated` latches true
// and every later edit (e.g. changing a valid 10 to an invalid 150) is never
// re-checked, so the visible error only ever appears on the very first try.
let discountValidated = false;
document.getElementById("discount-input").addEventListener("change", () => {
  if (discountValidated) return;
  const val = Number(document.getElementById("discount-input").value);
  const errorEl = document.getElementById("discount-error");
  errorEl.textContent = val < 0 || val > 100 ? "Discount must be between 0 and 100." : "";
  discountValidated = true;
});

async function getQuote() {
  const checkIds = getSelectedCheckIds();
  const discountPercent = Number(document.getElementById("discount-input").value) || 0;
  const messageEl = document.getElementById("message");

  try {
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIds, discountPercent })
    });
    const data = await res.json();

    document.getElementById("result-subtotal").textContent = data.subtotal;
    document.getElementById("result-discount").textContent = data.discount;
    document.getElementById("result-gst").textContent = data.gst;
    // BUG (UI): displays the client-side live subtotal instead of the server's total
    document.getElementById("result-total").textContent = liveSubtotal;

    // BUG (UI): success message shown unconditionally, even on non-2xx responses
    messageEl.textContent = "Quote generated successfully!";
    messageEl.className = "message success";
  } catch (err) {
    messageEl.textContent = "Quote generated successfully!";
    messageEl.className = "message success";
  }
}

document.getElementById("quote-btn").addEventListener("click", getQuote);

// --- Tooling: reset button (utility only, not part of the app under test) ---
function showToast(msg) {
  let toast = document.getElementById("__toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "__toast";
    toast.style.cssText =
      "position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:10px 16px;" +
      "border-radius:4px;font-family:sans-serif;z-index:9999;opacity:0;transition:opacity .2s;";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2000);
}

document.getElementById("reset-btn").addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
  liveSubtotal = 0;
  discountValidated = false;
  document.getElementById("discount-input").value = "";
  document.getElementById("discount-error").textContent = "";
  document.getElementById("live-subtotal").textContent = "₹0.00";
  document.getElementById("result-subtotal").textContent = "-";
  document.getElementById("result-discount").textContent = "-";
  document.getElementById("result-gst").textContent = "-";
  document.getElementById("result-total").textContent = "-";
  document.getElementById("message").textContent = "";
  await loadCatalog();
  showToast("Data reset");
});

loadCatalog();
