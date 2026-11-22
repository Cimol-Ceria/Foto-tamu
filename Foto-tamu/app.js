// ====== ISI DATA SUPABASE KAMU DI SINI ======
const SUPABASE_URL = "https://hcwfgjwafsxkjnghqzwu.supabase.co";
const SUPABASE_KEY = "sb_secret_GaNJW_z41qTeGE_Ewp0l2A_PNMISBAE";
const BUCKET = "foto-tamu";
// ============================================

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const statusEl = document.getElementById("status");
const gallery = document.getElementById("gallery");
const emptyEl = document.getElementById("empty");

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleUpload);

// Kompres foto supaya upload cepat (maks 1920px)
function compressImage(file, maxSize = 1920, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob || file);
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function handleUpload() {
  const files = Array.from(fileInput.files);
  if (!files.length) return;

  uploadBtn.disabled = true;
  let berhasil = 0;

  for (let i = 0; i < files.length; i++) {
    statusEl.textContent = `Mengupload ${i + 1} dari ${files.length}...`;
    const blob = await compressImage(files[i]);
    const nama = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await db.storage.from(BUCKET).upload(nama, blob, {
      contentType: "image/jpeg",
    });
    if (error) {
      console.error(error);
    } else {
      berhasil++;
    }
  }

  statusEl.textContent = berhasil === files.length
    ? `✅ ${berhasil} foto berhasil diupload!`
    : `⚠️ ${berhasil} dari ${files.length} foto berhasil. Coba lagi untuk sisanya.`;

  fileInput.value = "";
  uploadBtn.disabled = false;
  loadGallery();
}

async function loadGallery() {
  const { data, error } = await db.storage.from(BUCKET).list("", {
    limit: 500,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error(error);
    statusEl.textContent = "Gagal memuat galeri. Cek pengaturan Supabase.";
    return;
  }

  const files = (data || []).filter((f) => f.name && !f.name.startsWith("."));
  gallery.innerHTML = "";
  emptyEl.hidden = files.length > 0;

  files.forEach((f) => {
    const urlTampil = db.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl;
    const urlUnduh = db.storage.from(BUCKET).getPublicUrl(f.name, {
      download: `foto-tamu-${f.name}`,
    }).data.publicUrl;

    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = urlTampil;
    img.loading = "lazy";
    img.alt = "Foto tamu";
    img.addEventListener("click", () => bukaFotoBesar(urlTampil));

    const link = document.createElement("a");
    link.href = urlUnduh;
    link.textContent = "⬇ Unduh";

    card.append(img, link);
    gallery.appendChild(card);
  });
}

function bukaFotoBesar(url) {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<img src="${url}" alt="Foto">`;
  box.addEventListener("click", () => box.remove());
  document.body.appendChild(box);
}

loadGallery();
setInterval(loadGallery, 30000); // refresh otomatis tiap 30 detik