(function () {
  "use strict";

  if (!document.querySelector('form[id$="_form"]')) return;

  const overlayHtml =
    '<div id="upload-progress-overlay" style="display:none;position:fixed;inset:0;background:rgba(5,5,8,0.85);z-index:99999;flex-direction:column;align-items:center;justify-content:center;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
    '<div style="background:#14141A;border:1px solid #2A2A35;border-radius:16px;padding:40px;width:520px;max-width:92vw;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5);">' +
    '<div style="font-size:40px;margin-bottom:12px;">&#128228;</div>' +
    '<div style="font-family:Sora,sans-serif;font-size:18px;font-weight:700;color:#F0EFEA;margin-bottom:6px;">Envoi en cours...</div>' +
    '<div id="upload-filename" style="font-size:12px;color:#8A8A95;margin-bottom:28px;word-break:break-all;line-height:1.5;"></div>' +
    '<div style="background:#0A0A0F;border-radius:10px;height:14px;overflow:hidden;margin-bottom:12px;position:relative;">' +
    '<div id="upload-progress-bar" style="background:linear-gradient(90deg,#C8371A,#e04528);height:100%;width:0%;border-radius:10px;transition:width .25s ease-out;position:relative;">' +
    '<div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);animation:uploadShimmer 1.5s infinite;"></div>' +
    "</div>" +
    "</div>" +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<div id="upload-progress-pct" style="font-size:14px;color:#F0EFEA;font-weight:700;">0%</div>' +
    '<div id="upload-speed" style="font-size:11px;color:#8A8A95;"></div>' +
    "</div>" +
    '<div id="upload-size-detail" style="font-size:11px;color:#8A8A95;margin-bottom:20px;text-align:right;"></div>' +
    '<div id="upload-error" style="display:none;background:rgba(200,55,26,0.08);border:1px solid rgba(200,55,26,0.25);color:#F0EFEA;font-size:13px;padding:12px 16px;border-radius:8px;margin-bottom:16px;text-align:left;line-height:1.5;"></div>' +
    '<div style="display:flex;gap:10px;justify-content:center;">' +
    '<button id="upload-cancel-btn" type="button" style="background:#2A2A35;color:#F0EFEA;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:background .15s;">Annuler</button>' +
    '<button id="upload-retry-btn" type="button" style="display:none;background:#C8371A;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:background .15s;">R\u00e9essayer</button>' +
    "</div>" +
    "</div>" +
    "</div>";

  document.body.insertAdjacentHTML("beforeend", overlayHtml);

  var styleEl = document.createElement("style");
  styleEl.textContent =
    "@keyframes uploadShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }";
  document.head.appendChild(styleEl);

  var overlay = document.getElementById("upload-progress-overlay");
  var bar = document.getElementById("upload-progress-bar");
  var pctEl = document.getElementById("upload-progress-pct");
  var speedEl = document.getElementById("upload-speed");
  var sizeEl = document.getElementById("upload-size-detail");
  var errEl = document.getElementById("upload-error");
  var cancelBtn = document.getElementById("upload-cancel-btn");
  var retryBtn = document.getElementById("upload-retry-btn");
  var filenameEl = document.getElementById("upload-filename");

  var currentXhr = null;
  var startTime = 0;
  var lastForm = null;
  var lastBtn = null;

  function fmtSpeed(bps) {
    if (bps < 1024) return bps.toFixed(0) + " o/s";
    if (bps < 1048576) return (bps / 1024).toFixed(1) + " Ko/s";
    return (bps / 1048576).toFixed(1) + " Mo/s";
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
    if (bytes < 1048576000) return (bytes / 1048576).toFixed(1) + " Mo";
    return (bytes / 1073741824).toFixed(2) + " Go";
  }

  function show() {
    overlay.style.display = "flex";
    bar.style.width = "0%";
    pctEl.textContent = "0%";
    speedEl.textContent = "";
    sizeEl.textContent = "";
    errEl.style.display = "none";
    retryBtn.style.display = "none";
    cancelBtn.style.display = "inline-block";
    startTime = Date.now();
  }

  function hide() {
    overlay.style.display = "none";
    currentXhr = null;
  }

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.display = "block";
    cancelBtn.style.display = "none";
    retryBtn.style.display = "inline-block";
    pctEl.textContent = "\u26a0\ufe0f Erreur";
    pctEl.style.color = "#C8371A";
    currentXhr = null;
  }

  cancelBtn.addEventListener("click", function () {
    if (currentXhr) currentXhr.abort();
    hide();
  });

  retryBtn.addEventListener("click", function () {
    if (lastForm) doSubmit(lastForm, lastBtn);
  });

  function hasFiles(form) {
    var inputs = form.querySelectorAll('input[type="file"]:not([name$="-clear"])');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].files && inputs[i].files.length > 0) return true;
    }
    var checks = form.querySelectorAll('input[type="checkbox"][name$="-clear"]');
    for (var j = 0; j < checks.length; j++) {
      if (checks[j].checked) return true;
    }
    return false;
  }

  function getFileInfo(form) {
    var parts = [];
    var inputs = form.querySelectorAll('input[type="file"]:not([name$="-clear"])');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].files && inputs[i].files.length > 0) {
        parts.push(inputs[i].files[0].name + " (" + fmtSize(inputs[i].files[0].size) + ")");
      }
    }
    var checks = form.querySelectorAll('input[type="checkbox"][name$="-clear"]');
    for (var j = 0; j < checks.length; j++) {
      if (checks[j].checked) {
        parts.push("Suppression du fichier existant");
      }
    }
    return parts.join(" + ");
  }

  function doSubmit(form, btn) {
    if (!hasFiles(form)) {
      form.submit();
      return;
    }

    filenameEl.textContent = getFileInfo(form);

    lastForm = form;
    lastBtn = btn;
    show();
    pctEl.style.color = "#F0EFEA";

    var fd = new FormData(form);
    if (btn && btn.name) {
      fd.append(btn.name, btn.value || "");
    }

    var xhr = new XMLHttpRequest();
    currentXhr = xhr;

    xhr.upload.addEventListener("progress", function (e) {
      if (!e.lengthComputable) return;
      var pct = Math.round((e.loaded / e.total) * 100);
      bar.style.width = pct + "%";
      pctEl.textContent = pct + "%";
      var elapsed = Math.max((Date.now() - startTime) / 1000, 0.1);
      var speed = e.loaded / elapsed;
      speedEl.textContent = fmtSpeed(speed);
      sizeEl.textContent = fmtSize(e.loaded) + " / " + fmtSize(e.total);
    });

    xhr.upload.addEventListener("loadend", function () {
      pctEl.textContent = "100%";
      pctEl.style.color = "#22c55e";
      speedEl.textContent = "";
      sizeEl.textContent = "Fichier reçu — Traitement en cours sur le serveur...";
      bar.style.width = "100%";
    });

    xhr.addEventListener("load", function () {
      currentXhr = null;
      if (xhr.status >= 200 && xhr.status < 400) {
        var redirectUrl = xhr.getResponseHeader("X-Django-Redirect") || "";
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
        if (
          xhr.responseURL &&
          xhr.responseURL !== window.location.href &&
          !xhr.responseURL.endsWith("/add/")
        ) {
          window.location.href = xhr.responseURL;
          return;
        }
        try {
          var ct = xhr.getResponseHeader("content-type") || "";
          if (ct.indexOf("application/json") !== -1) {
            var data = JSON.parse(xhr.responseText);
            if (data.redirect) {
              window.location.href = data.redirect;
              return;
            }
            if (data.success) {
              window.location.reload();
              return;
            }
            if (data.error) {
              showErr(data.error);
              return;
            }
          }
        } catch (_) {}
        if (xhr.responseText) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(xhr.responseText, "text/html");
          var formErrors = doc.querySelectorAll(".errorlist li, .errornote, .errorlist.nonfield li");
          var msgs = [];
          formErrors.forEach(function (el) {
            var t = el.textContent.trim();
            if (t && msgs.indexOf(t) === -1) msgs.push(t);
          });
          if (msgs.length > 0) {
            showErr(msgs.join("\n"));
            return;
          }
          var newForm = doc.querySelector('form[id$="_form"]');
          if (newForm) {
            var existingForm = document.querySelector('form[id$="_form"]');
            if (existingForm) {
              existingForm.innerHTML = newForm.innerHTML;
              var messagesEl = doc.querySelector(".messagelist");
              if (messagesEl) {
                var existingMessages = document.querySelector(".messagelist");
                if (existingMessages) {
                  existingMessages.innerHTML = messagesEl.innerHTML;
                } else {
                  var content = document.querySelector("#content");
                  if (content)
                    content.insertAdjacentHTML("afterbegin", messagesEl.outerHTML);
                }
              }
              hide();
              return;
            }
          }
        }
        window.location.reload();
      } else {
        if (xhr.status === 0) return;
        var msg = "Erreur serveur (HTTP " + xhr.status + ")";
        var ct2 = xhr.getResponseHeader("content-type") || "";
        if (ct2.indexOf("text/html") !== -1) {
          try {
            var parser2 = new DOMParser();
            var doc2 = parser2.parseFromString(xhr.responseText, "text/html");
            var title = doc2.querySelector("title");
            if (title && title.textContent) msg += " — " + title.textContent.trim();
          } catch (_) {}
        }
        showErr(msg);
      }
    });

    xhr.addEventListener("error", function () {
      showErr("Erreur r\u00e9seau. V\u00e9rifiez votre connexion internet.");
    });

    xhr.addEventListener("abort", function () {
      hide();
    });

    xhr.open(form.method || "POST", form.action);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("X-Upload-Progress", "1");
    xhr.send(fd);
  }

  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target.closest('input[type="submit"], button[type="submit"]');
      if (!btn) return;
      var form = btn.form;
      if (!form || !form.id || !form.id.endsWith("_form")) return;
      if (!hasFiles(form)) return;
      e.preventDefault();
      e.stopPropagation();
      doSubmit(form, btn);
    },
    true
  );
})();
