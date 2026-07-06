(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var typeField = document.getElementById("id_type");
    var qualityField = document.getElementById("id_quality");
    var priceRow = document.querySelector(".field-price_display .readonly");

    if (!typeField || !qualityField || !priceRow) return;

    var originalText = priceRow.textContent;
    var cache = null;

    function formatFcfa(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
    }

    function applyPrice() {
      if (!cache) return;
      var list = cache.pricing[typeField.value] || [];
      var match = list.filter(function (row) {
        return row.quality === qualityField.value;
      })[0];

      if (match) {
        priceRow.textContent = formatFcfa(match.price) + " (tarif " + match.quality_display + ")";
        priceRow.style.color = "";
      } else {
        priceRow.textContent = originalText + " — aucun tarif configuré pour cette combinaison";
        priceRow.style.color = "var(--body-quiet-color)";
      }
    }

    fetch("/api/pricing/")
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        cache = data;
        applyPrice();
      })
      .catch(function () {
        /* API indisponible : on garde le prix affiché par défaut */
      });

    typeField.addEventListener("change", applyPrice);
    qualityField.addEventListener("change", applyPrice);
  });
})();
