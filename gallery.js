(function () {
  const FILES = [
    { file: "01-people-construction-feed.jpg", title: "People · Construction" },
    { file: "02-people-beauty-feed.jpg", title: "People · Beauty" },
    { file: "03-people-retail-feed.jpg", title: "People · Retail" },
    { file: "04-people-resale-feed.jpg", title: "People · Resale" },
    { file: "05-people-construction-story.jpg", title: "People · Construction story" },
    { file: "06-location-warehouse.jpg", title: "Location · Warehouse" },
    { file: "07-location-jobsite.jpg", title: "Location · Jobsite" },
    { file: "08-location-salon-backbar.jpg", title: "Location · Salon back-bar" },
    { file: "09-location-retail-stockroom.jpg", title: "Location · Retail stockroom" },
    { file: "10-location-resale-showroom.jpg", title: "Location · Resale showroom" },
    { file: "11-location-warehouse-banner.jpg", title: "Location · Warehouse banner" },
    { file: "12-location-jobsite-story.jpg", title: "Location · Jobsite story" },
    { file: "13-product-know-shelf.jpg", title: "Product · Know your shelf" },
    { file: "14-product-construction-today.jpg", title: "Product · Construction today" },
    { file: "15-product-beauty-inventory.jpg", title: "Product · Beauty inventory" },
    { file: "16-product-item-detail.jpg", title: "Product · Item detail" },
    { file: "17-product-industries-banner.jpg", title: "Product · Industries" },
    { file: "18-product-spreadsheet-story.jpg", title: "Product · Spreadsheet story" },
    { file: "19-location-shop-desk.jpg", title: "Location · Shop desk" },
    { file: "20-location-beauty-story.jpg", title: "Location · Beauty story" }
  ];

  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const zipBtn = document.getElementById("zipBtn");
  const blobs = {};

  function b64ToUint8(b64) {
    const bin = atob(b64.replace(/\s+/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function loadB64(file) {
    let text = "";
    try {
      const single = await fetch("src/" + file + ".b64", { cache: "force-cache" });
      if (single.ok) text = await single.text();
    } catch (e) {}
    if (!text) {
      for (let i = 0; ; i++) {
        const part = String(i).padStart(2, "0");
        const res = await fetch("src/" + file + ".b64." + part, { cache: "force-cache" });
        if (!res.ok) break;
        text += await res.text();
      }
    }
    if (!text) throw new Error("missing " + file);
    const bytes = b64ToUint8(text);
    if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("bad jpeg " + file);
    }
    return new Blob([bytes], { type: "image/jpeg" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
  }

  async function boot() {
    let ready = 0;
    for (const item of FILES) {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        '<div class="imgwrap"><img alt="' + item.title + '" /></div>' +
        '<div class="meta"><h2>' + item.title + "</h2>" +
        '<div class="actions">' +
          '<button type="button" class="btn save">Save photo</button>' +
          '<button type="button" class="btn ghost open">Open</button>' +
        "</div></div>";
      grid.appendChild(card);
      const img = card.querySelector("img");
      const saveBtn = card.querySelector(".save");
      const openBtn = card.querySelector(".open");
      saveBtn.disabled = true;
      openBtn.disabled = true;

      loadB64(item.file).then(function (blob) {
        blobs[item.file] = blob;
        const url = URL.createObjectURL(blob);
        img.src = url;
        saveBtn.disabled = false;
        openBtn.disabled = false;
        saveBtn.addEventListener("click", function () { downloadBlob(blob, item.file); });
        openBtn.addEventListener("click", function () { window.open(url, "_blank", "noopener"); });
        ready++;
        status.textContent = ready + " of " + FILES.length + " photos ready.";
        if (ready === FILES.length) zipBtn.disabled = false;
      }).catch(function (err) {
        img.replaceWith(Object.assign(document.createElement("p"), {
          textContent: "Could not load " + item.file,
          style: "padding:16px;color:#6B645C;margin:0"
        }));
        console.error(err);
      });
    }
  }

  zipBtn.disabled = true;
  zipBtn.addEventListener("click", async function () {
    if (typeof JSZip === "undefined") {
      status.textContent = "ZIP helper failed to load. Save photos one by one.";
      return;
    }
    zipBtn.disabled = true;
    status.textContent = "Building ZIP…";
    try {
      const zip = new JSZip();
      FILES.forEach(function (item) {
        if (blobs[item.file]) zip.file(item.file, blobs[item.file]);
      });
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, "cavix-marketing-20-photos.zip");
      status.textContent = "ZIP ready — check your downloads.";
    } catch (e) {
      status.textContent = "Could not build ZIP. Save photos one by one.";
      console.error(e);
    } finally {
      zipBtn.disabled = false;
    }
  });

  boot();
})();
