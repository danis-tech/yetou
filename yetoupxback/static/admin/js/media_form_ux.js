(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var typeField = document.getElementById("id_type");
    var fileInput = document.getElementById("id_file");
    var thumbInput = document.getElementById("id_thumbnail");

    /* ─── Aperçu instantané des fichiers sélectionnés (avant même l'enregistrement) ─── */
    function buildPreviewBox(input) {
      var box = document.createElement("div");
      box.className = "yetou-input-preview";
      box.style.cssText = "margin-top:10px;display:none";
      input.insertAdjacentElement("afterend", box);
      return box;
    }

    function isVideoFile(file) {
      if (file.type) return file.type.indexOf("video") === 0;
      return !!(typeField && typeField.value === "video");
    }

    function renderPreview(box, file) {
      if (!file) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }
      var url = URL.createObjectURL(file);
      var style = "max-width:320px;max-height:220px;border-radius:10px;object-fit:contain;background:#0A0A0F;display:block";
      if (isVideoFile(file)) {
        box.innerHTML = '<video src="' + url + '" controls preload="metadata" style="' + style + '"></video>';
      } else {
        box.innerHTML = '<img src="' + url + '" alt="Aperçu" style="' + style + '" />';
      }
      box.style.display = "block";
    }

    if (fileInput) {
      var filePreviewBox = buildPreviewBox(fileInput);
      fileInput.addEventListener("change", function () {
        renderPreview(filePreviewBox, fileInput.files && fileInput.files[0]);
      });
    }

    if (thumbInput) {
      var thumbPreviewBox = buildPreviewBox(thumbInput);
      thumbInput.addEventListener("change", function () {
        renderPreview(thumbPreviewBox, thumbInput.files && thumbInput.files[0]);
      });
    }

    /* ─── Masquer les sections spécifiques au type de média non sélectionné ─── */
    function findFieldsetByHeading(needle) {
      var headings = document.querySelectorAll("fieldset.module h2, fieldset.module summary");
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].textContent.indexOf(needle) !== -1) {
          return headings[i].closest("fieldset.module");
        }
      }
      return null;
    }

    var photoFieldset = findFieldsetByHeading("Photo — Résolution");
    var videoFieldset = findFieldsetByHeading("Vidéo — Détails");

    function toggleTypeSections() {
      if (!typeField) return;
      var isPhoto = typeField.value === "photo";
      var isVideo = typeField.value === "video";
      if (photoFieldset) photoFieldset.style.display = isPhoto ? "" : "none";
      if (videoFieldset) videoFieldset.style.display = isVideo ? "" : "none";
    }

    if (typeField && (photoFieldset || videoFieldset)) {
      typeField.addEventListener("change", toggleTypeSections);
      toggleTypeSections();
    }
  });
})();
