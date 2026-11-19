/* ==========================================================================
   BODYVERSE — CORE APPLICATION LOGIC (app.js)
   ========================================================================== */

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwHJdenNXUYd98DSWJ04IGe5GoJj49uomRYRQAC7YNCr8a0rewRRi_Is18xxkgsvf56/exec";

const AKUN_BAWAAN = [
    {
        username: "yoga",
        password: "yoga1234",
        nama: "Muhammad Yoga Dwi Nugraha (Peneliti)",
        usia: "21",
        jk: "Laki-laki",
        durasi: "1 - 3 Jam per hari",
        isAdmin: true
    }
];

let modeSesiAktif = 1;
let akunSedangLogin = null;
let breathInterval = null;
let adminRespondenList = [];

let statusSesiUser = {
    sesi1Done: false,
    verifikasiSesi2: false,
    sesi2Done: false,
    verifikasiSesi3: false,
    sesi3Done: false,
    reopenSesi1: false,
    reopenSesi2: false,
    reopenSesi3: false,
    savedData: null
};

const butirKuesioner = [
    "Saya menghormati tubuh saya.",
    "Saya merasa nyaman dengan tubuh saya.",
    "Saya merasa bahwa tubuh saya setidaknya memiliki beberapa kelebihan atau kualitas yang baik.",
    "Saya memiliki sikap yang positif terhadap tubuh saya.",
    "Saya memperhatikan kebutuhan tubuh saya.",
    "Saya merasakan kasih sayang terhadap tubuh saya.",
    "Saya menghargai karakteristik unik dan berbeda yang dimiliki tubuh saya.",
    "Perilaku saya mencerminkan sikap positif saya terhadap tubuh saya (misalnya berjalan dengan percaya diri dan tersenyum).",
    "Saya merasa betah dan nyaman berada di dalam tubuh saya sendiri.",
    "Saya merasa diri saya menarik meskipun berbeda dengan penampilan model atau foto di media sosial."
];

const skalaLikert = [
    { nilai: 1, label: "1 - Tidak Pernah" },
    { nilai: 2, label: "2 - Jarang" },
    { nilai: 3, label: "3 - Kadang-kadang" },
    { nilai: 4, label: "4 - Sering" },
    { nilai: 5, label: "5 - Selalu" }
];

const allViews = [
    'view-login', 'view-home', 'view-admin',
    'view-pretest', 'view-pretest-done',
    'view-act-1', 'view-act-2', 'view-act-3', 'view-act-4', 'view-act-5', 'view-sesi2-done',
    'view-posttest'
];

window.addEventListener('DOMContentLoaded', () => {
    renderKuesioner('pretest-container', 'pre');
    renderKuesioner('posttest-container', 'post');
    renderAktivitas1Inputs();
    cekSesiLoginTersimpan();
});

// =========================================================================
// HELPER KATEGORI INDEKS APRESIASI TUBUH (1.00 - 5.00)
// =========================================================================
function getKategoriApresiasi(meanVal) {
    const num = parseFloat(meanVal);
    if (isNaN(num) || num <= 0) {
        return {
            title: "Belum Ada Data",
            short: "Belum Ada",
            badgeClass: "bg-slate-100 text-slate-500",
            desc: "Responden belum menyelesaikan evaluasi pada sesi ini."
        };
    }
    if (num >= 4.0) {
        return {
            title: "🌟 Strong Body Appreciator",
            short: "🌟 Strong",
            badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
            desc: `Indeks (${num.toFixed(2)}/5.00) berada pada kategori TINGGI. Menunjukkan rasa nyaman, hormat, dan penghargaan yang sangat kuat terhadap fungsi tubuh.`
        };
    } else if (num >= 3.0) {
        return {
            title: "🌿 Growing Body Appreciator",
            short: "🌿 Growing",
            badgeClass: "bg-teal-100 text-teal-800 border border-teal-200",
            desc: `Indeks (${num.toFixed(2)}/5.00) berada pada kategori MENENGAH / BERTUMBUH. Sudah memiliki penerimaan tubuh yang baik, namun sesekali masih terpengaruh konten media sosial.`
        };
    } else {
        return {
            title: "🌱 Developing Body Connection",
            short: "🌱 Developing",
            badgeClass: "bg-amber-100 text-amber-900 border border-amber-200",
            desc: `Indeks (${num.toFixed(2)}/5.00) berada pada kategori TAHAP AWAL. Masih cenderung membandingkan fisik dan membutuhkan penguatan koneksi positif terhadap fungsi tubuh.`
        };
    }
}

// =========================================================================
// 1. AUTENTIKASI LOGIN & REGISTER (DENGAN VALIDASI USIA 15-25 TAHUN)
// =========================================================================
function switchAuthTab(mode) {
    const tabLogin = document.getElementById('tab-auth-login');
    const tabReg = document.getElementById('tab-auth-register');
    const boxLogin = document.getElementById('form-login-box');
    const boxReg = document.getElementById('form-register-box');

    if (mode === 'login') {
        tabLogin.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all bg-white text-teal-700 shadow-sm";
        tabReg.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all text-slate-500 hover:text-slate-800";
        boxLogin.classList.remove('hidden');
        boxReg.classList.add('hidden');
    } else {
        tabReg.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all bg-white text-teal-700 shadow-sm";
        tabLogin.className = "py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all text-slate-500 hover:text-slate-800";
        boxReg.classList.remove('hidden');
        boxLogin.classList.add('hidden');
    }
}

async function prosesLogin() {
    const uname = document.getElementById('login-username').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value.trim();

    if (!uname || !pass) {
        alert('Mohon masukkan Username dan Password kamu.');
        return;
    }

    const cekBawaan = AKUN_BAWAAN.find(a => a.username === uname && a.password === pass);
    if (cekBawaan) {
        await setBerhasilLogin(cekBawaan);
        return;
    }

    const btn = document.getElementById('btn-submit-login');
    btn.disabled = true;
    btn.innerText = 'Memeriksa Akun di Database...';

    try {
        const res = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "LOGIN_AKUN",
                username: uname,
                password: pass
            })
        });
        const result = await res.json();

        if (result.status === "success" && result.user) {
            await setBerhasilLogin(result.user);
        } else {
            alert(result.message || 'Username atau Password salah!');
        }
    } catch (err) {
        const akunLokal = JSON.parse(localStorage.getItem('bodyverse_users') || '[]');
        const ditemukanLokal = akunLokal.find(a => a.username.toLowerCase() === uname && a.password === pass);
        if (ditemukanLokal) {
            await setBerhasilLogin(ditemukanLokal);
        } else {
            alert('Gagal memverifikasi akun. Pastikan Username & Password benar.');
        }
    } finally {
        btn.disabled = false;
        btn.innerText = 'Masuk ke BodyVerse →';
    }
}
    function togglePasswordVisibility(inputId, btnId) {
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(btnId);
    if (!inputEl || !btnEl) return;

    const isHidden = inputEl.type === "password";
    inputEl.type = isHidden ? "text" : "password";

    if (isHidden) {
        // Password sedang terlihat -> tampilkan ikon mata terbuka
        btnEl.innerHTML = `
            <svg class="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
        `;
    } else {
        // Password disembunyikan kembali -> tampilkan ikon mata tercoret
        btnEl.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            </svg>
        `;
    }
}

async function prosesRegister() {
    const uname = document.getElementById('reg-username').value.trim().toLowerCase();
    const pass = document.getElementById('reg-password').value.trim();
    const nama = document.getElementById('reg-nama').value.trim();
    const usiaRaw = document.getElementById('reg-usia').value.trim();
    const usia = Number(usiaRaw);
    const jk = document.getElementById('reg-jk').value;
    const durasi = document.getElementById('reg-durasi').value;

    if (!uname || !pass || !nama || !usiaRaw || !jk || !durasi) {
        alert('Mohon lengkapi seluruh kolom pendaftaran akun.');
        return;
    }

    if (pass.length < 8) {
        alert('Password wajib minimal 8 karakter!');
        return;
    }

    if (!Number.isInteger(usia) || usia < 15 || usia > 25) {
        alert('Usia tidak valid! Usia responden wajib berada di rentang 15 sampai 25 tahun (tidak boleh kurang dari 15 atau lebih dari 25).');
        return;
    }

    const btn = document.getElementById('btn-submit-register');
    btn.disabled = true;
    btn.innerText = 'Mendaftarkan Akun ke Database...';

    const akunBaru = {
        tipeSesi: "REGISTER_AKUN",
        tanggal: new Date().toLocaleString('id-ID'),
        username: uname,
        password: pass,
        nama: nama,
        usia: String(usia),
        jk: jk,
        durasi: durasi
    };

    try {
        const res = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(akunBaru)
        });
        const result = await res.json();

        if (result.status === "error") {
            alert(result.message);
            return;
        }

        const akunLokal = JSON.parse(localStorage.getItem('bodyverse_users') || '[]');
        akunLokal.push({ username: uname, password: pass, nama, usia: String(usia), jk, durasi });
        localStorage.setItem('bodyverse_users', JSON.stringify(akunLokal));

        alert('Pendaftaran berhasil! Kamu akan langsung masuk ke BodyVerse.');
        await setBerhasilLogin({ username: uname, nama, usia: String(usia), jk, durasi });
    } catch (err) {
        alert('Gagal terhubung ke server. Pastikan koneksi internet aktif.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Daftar Akun & Masuk →';
    }
}

async function setBerhasilLogin(akun) {
    akunSedangLogin = akun;
    sessionStorage.setItem('bodyverse_active_user', JSON.stringify(akun));

    document.getElementById('greeting-nama').innerText = akun.nama;
    document.getElementById('nama-responden').value = akun.nama || '';
    document.getElementById('usia-responden').value = akun.usia || '';
    document.getElementById('jk-responden').value = akun.jk || 'Perempuan';
    document.getElementById('durasi-sosmed').value = akun.durasi || '1 - 3 Jam per hari';

    document.getElementById('btn-logout').classList.remove('hidden');

    if (akun.username === 'yoga' || akun.isAdmin) {
        document.getElementById('btn-nav-admin').classList.remove('hidden');
        bukaDashboardAdmin();
        return;
    } else {
        document.getElementById('btn-nav-admin').classList.add('hidden');
    }

    showView('view-home', 'Beranda Utama', 15);
    await sinkronisasiProgresDariServer(false);
}

function cekSesiLoginTersimpan() {
    const tersimpan = sessionStorage.getItem('bodyverse_active_user');
    if (tersimpan) {
        setBerhasilLogin(JSON.parse(tersimpan));
    } else {
        showView('view-login', 'Akses Terkunci', 5);
    }
}

function logoutAkun() {
    sessionStorage.removeItem('bodyverse_active_user');
    akunSedangLogin = null;
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('btn-logout').classList.add('hidden');
    document.getElementById('btn-nav-admin').classList.add('hidden');
    showView('view-login', 'Akses Terkunci', 5);
}

// =========================================================================
// 2. SINKRONISASI STATUS 3 SESI & STATUS BUKA ULANG DARI GOOGLE SHEETS
// =========================================================================
async function sinkronisasiProgresDariServer(tampilkanNotif = false) {
    if (!akunSedangLogin) return;
    const btnRefresh = document.getElementById('btn-refresh-status');
    if (btnRefresh) btnRefresh.innerText = '⏳ Mengecek...';

    if (akunSedangLogin.username === 'yoga' || akunSedangLogin.isAdmin) {
        statusSesiUser = {
            sesi1Done: false,
            verifikasiSesi2: true,
            sesi2Done: false,
            verifikasiSesi3: true,
            sesi3Done: false,
            reopenSesi1: true,
            reopenSesi2: true,
            reopenSesi3: true,
            savedData: null
        };
        perbaruiTampilanKartu3Sesi();
        if (btnRefresh) btnRefresh.innerText = '🔄 Cek Bukaan Sesi';
        return;
    }

    try {
        const res = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "CEK_STATUS_SESI",
                username: akunSedangLogin.username,
                namaResponden: akunSedangLogin.nama
            })
        });
        const result = await res.json();
        if (result.status === "success" && result.progres) {
            statusSesiUser = result.progres;
            localStorage.setItem(`bv_prog_${akunSedangLogin.username}`, JSON.stringify(statusSesiUser));
            isiKembaliDataSesi2JikaAda();
        }
    } catch (e) {
        const cadangan = localStorage.getItem(`bv_prog_${akunSedangLogin.username}`);
        if (cadangan) statusSesiUser = JSON.parse(cadangan);
    } finally {
        if (btnRefresh) btnRefresh.innerText = '🔄 Cek Bukaan Sesi';
        perbaruiTampilanKartu3Sesi();
        if (tampilkanNotif) {
            alert('Status sesi berhasil diperbarui dari database peneliti!');
        }
    }
}

function isiKembaliDataSesi2JikaAda() {
    const sd = statusSesiUser.savedData;
    if (!sd) return;

    if (sd.act1) {
        const list10 = sd.act1.split(' | ');
        for (let i = 1; i <= 10; i++) {
            const el = document.getElementById(`act1-item-${i}`);
            if (el && list10[i - 1]) el.value = list10[i - 1];
        }
        updateAct1Progress();
    }
    if (sd.act2Fungsi) {
        const list3 = sd.act2Fungsi.split(' | ');
        if (list3[0]) document.getElementById('act2-fungsi-1').value = list3[0];
        if (list3[1]) document.getElementById('act2-fungsi-2').value = list3[1];
        if (list3[2]) document.getElementById('act2-fungsi-3').value = list3[2];
    }
    if (sd.act2Alasan) document.getElementById('act2-alasan').value = sd.act2Alasan;
    if (sd.act3Refleksi) document.getElementById('act3-refleksi').value = sd.act3Refleksi;
    if (sd.act4Surat) document.getElementById('act4-surat').value = sd.act4Surat;
    if (sd.act5Komitmen) {
        const listKom = sd.act5Komitmen.split(' | ');
        if (listKom[0]) document.getElementById('act5-komitmen-1').value = listKom[0];
        if (listKom[1]) document.getElementById('act5-komitmen-2').value = listKom[1];
        if (listKom[2]) document.getElementById('act5-komitmen-3').value = listKom[2];
        updateAct5Progress();
    }
}

function perbaruiTampilanKartu3Sesi() {
    const p1 = document.getElementById('status-pill-1');
    const p2 = document.getElementById('status-pill-2');
    const p3 = document.getElementById('status-pill-3');

    if (statusSesiUser.sesi1Done && statusSesiUser.reopenSesi1) {
        p1.innerText = "🔄 Dibuka Ulang";
        p1.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800";
    } else if (statusSesiUser.sesi1Done) {
        p1.innerText = "✅ Selesai";
        p1.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
    } else {
        p1.innerText = "🔓 Terbuka";
        p1.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800";
    }

    if (statusSesiUser.sesi2Done && statusSesiUser.reopenSesi2) {
        p2.innerText = "🔄 Dibuka Ulang";
        p2.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800";
    } else if (statusSesiUser.sesi2Done) {
        p2.innerText = "✅ Selesai";
        p2.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
    } else if (statusSesiUser.sesi1Done && statusSesiUser.verifikasiSesi2) {
        p2.innerText = "🔓 Terbuka";
        p2.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800";
    } else if (statusSesiUser.sesi1Done && !statusSesiUser.verifikasiSesi2) {
        p2.innerText = "⏳ Menunggu ACC";
        p2.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800";
    } else {
        p2.innerText = "🔒 Terkunci";
        p2.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
    }

    if (statusSesiUser.sesi3Done && statusSesiUser.reopenSesi3) {
        p3.innerText = "🔄 Dibuka Ulang";
        p3.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800";
    } else if (statusSesiUser.sesi3Done) {
        p3.innerText = "🎓 Lihat Rapor";
        p3.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
    } else if (statusSesiUser.sesi2Done && statusSesiUser.verifikasiSesi3) {
        p3.innerText = "🔓 Terbuka";
        p3.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800";
    } else if (statusSesiUser.sesi2Done && !statusSesiUser.verifikasiSesi3) {
        p3.innerText = "⏳ Menunggu ACC";
        p3.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800";
    } else {
        p3.innerText = "🔒 Terkunci";
        p3.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
    }

    if (!statusSesiUser.sesi1Done || statusSesiUser.reopenSesi1) {
        pilihModeSesi(1, true);
    } else if (!statusSesiUser.sesi2Done || statusSesiUser.reopenSesi2) {
        pilihModeSesi(2, true);
    } else {
        pilihModeSesi(3, true);
    }
}

function pilihModeSesi(sesi, dariOtomatis = false) {
    const isAdmin = akunSedangLogin && (akunSedangLogin.username === 'yoga' || akunSedangLogin.isAdmin);

    if (!isAdmin && !dariOtomatis) {
        if (sesi === 1 && statusSesiUser.sesi1Done && !statusSesiUser.reopenSesi1) {
            alert('Sesi 1 sudah selesai dan dikunci. Jika kamu ingin membuka kembali Sesi 1, minta peneliti mengaktifkan "Buka Ulang Sesi 1" di Dashboard Admin.');
            return;
        }
        if (sesi === 2) {
            if (!statusSesiUser.sesi1Done) {
                alert('🔒 Sesi 2 masih terkunci! Kamu wajib menyelesaikan Sesi 1 terlebih dahulu.');
                return;
            }
            if (statusSesiUser.sesi2Done && !statusSesiUser.reopenSesi2) {
                alert('Sesi 2 sudah selesai dan dikunci. Jika ingin membuka kembali Sesi 2, minta peneliti mengaktifkan "Buka Ulang Sesi 2" di Dashboard Admin.');
                return;
            }
            if (!statusSesiUser.verifikasiSesi2 && !statusSesiUser.reopenSesi2) {
                alert('⏳ Sesi 1 kamu sudah selesai! Saat ini Sesi 2 sedang menunggu verifikasi peneliti. Jika sudah dibuka, klik tombol "🔄 Cek Bukaan Sesi".');
                return;
            }
        }
        if (sesi === 3) {
            if (!statusSesiUser.sesi2Done) {
                alert('🔒 Sesi 3 masih terkunci! Kamu wajib menyelesaikan Sesi 1 dan Sesi 2 terlebih dahulu.');
                return;
            }
            if (!statusSesiUser.verifikasiSesi3 && !statusSesiUser.sesi3Done && !statusSesiUser.reopenSesi3) {
                alert('⏳ Sesi 2 kamu sudah selesai! Saat ini Sesi 3 sedang menunggu verifikasi peneliti. Jika sudah dibuka, klik tombol "🔄 Cek Bukaan Sesi".');
                return;
            }
        }
    }

    modeSesiAktif = sesi;
    const c1 = document.getElementById('card-sesi-1');
    const c2 = document.getElementById('card-sesi-2');
    const c3 = document.getElementById('card-sesi-3');
    const fieldsSesi1 = document.getElementById('fields-sesi-1');
    const btnAction = document.getElementById('btn-home-action');
    const infoBox = document.getElementById('info-status-sesi');

    const normalClass = "p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between space-y-2 border-slate-200 bg-slate-50/70 opacity-85";
    const activeClass = "p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between space-y-2 border-teal-600 bg-teal-50/50 shadow-sm";

    c1.className = sesi === 1 ? activeClass : normalClass;
    c2.className = sesi === 2 ? activeClass : normalClass;
    c3.className = sesi === 3 ? activeClass : normalClass;

    if (sesi === 1) {
        fieldsSesi1.classList.remove('hidden');
        if (statusSesiUser.sesi1Done && statusSesiUser.reopenSesi1) {
            btnAction.innerHTML = "🔄 Buka Kembali Sesi 1: Kuesioner Awal &rarr;";
            infoBox.innerHTML = "🔄 <b>Sesi 1 Dibuka Kembali oleh Peneliti:</b> Kamu dapat membuka dan memperbarui jawaban Sesi 1 kamu sekarang.";
        } else if (statusSesiUser.sesi1Done) {
            btnAction.innerHTML = "✅ Sesi 1 Sudah Selesai Dikerjakan";
            infoBox.innerHTML = "✅ <b>Sesi 1 Selesai:</b> Silakan pilih kartu Sesi 2 untuk melanjutkan.";
        } else {
            btnAction.innerHTML = "Mulai Sesi 1: Kuesioner Awal &rarr;";
            infoBox.innerHTML = "📌 <b>Sesi 1 (Kuesioner Awal):</b> Jawablah 10 pernyataan singkat mengenai perasaanmu terhadap tubuhmu saat ini.";
        }
    } else if (sesi === 2) {
        fieldsSesi1.classList.add('hidden');
        if (statusSesiUser.sesi2Done && statusSesiUser.reopenSesi2) {
            btnAction.innerHTML = "🔄 Buka Kembali Sesi 2: 5 Aktivitas Refleksi &rarr;";
            infoBox.innerHTML = "🔄 <b>Sesi 2 Dibuka Kembali oleh Peneliti:</b> Kamu dapat membuka kembali dan mengedit 5 aktivitas refleksimu.";
        } else if (!statusSesiUser.verifikasiSesi2 && !isAdmin) {
            btnAction.innerHTML = "⏳ Menunggu Verifikasi Peneliti untuk Membuka Sesi 2";
            infoBox.innerHTML = "⏳ <b>Menunggu Verifikasi Sesi 2:</b> Tunggu peneliti membuka akses Sesi 2, lalu tekan tombol <b>🔄 Cek Bukaan Sesi</b>.";
        } else {
            btnAction.innerHTML = "Mulai Sesi 2: 5 Aktivitas Refleksi &rarr;";
            infoBox.innerHTML = "🌿 <b>Sesi 2 Terbuka!</b> Kamu akan mengikuti 5 aktivitas refleksi interaktif untuk mengenali dan mensyukuri fungsi tubuhmu.";
        }
    } else if (sesi === 3) {
        fieldsSesi1.classList.add('hidden');
        if (statusSesiUser.sesi3Done && statusSesiUser.reopenSesi3) {
            btnAction.innerHTML = "🔄 Buka Kembali Sesi 3 (Evaluasi & Rapor) &rarr;";
            infoBox.innerHTML = "🔄 <b>Sesi 3 Dibuka Kembali oleh Peneliti:</b> Kamu dapat mengisi ulang evaluasi akhir atau langsung melihat Rapor Hasilmu.";
        } else if (statusSesiUser.sesi3Done) {
            btnAction.innerHTML = "🎓 Buka Rapor Hasil Refleksiku &rarr;";
            infoBox.innerHTML = "🎉 <b>Seluruh 3 Sesi Selesai!</b> Klik tombol di bawah untuk melihat kembali atau mencetak PDF Rapor Hasil Refleksimu.";
        } else if (!statusSesiUser.verifikasiSesi3 && !isAdmin) {
            btnAction.innerHTML = "⏳ Menunggu Verifikasi Peneliti untuk Membuka Sesi 3";
            infoBox.innerHTML = "⏳ <b>Menunggu Verifikasi Sesi 3:</b> Tunggu peneliti membuka akses Sesi 3, lalu tekan tombol <b>🔄 Cek Bukaan Sesi</b>.";
        } else {
            btnAction.innerHTML = "Mulai Sesi 3: Evaluasi Akhir & Rapor &rarr;";
            infoBox.innerHTML = "📊 <b>Sesi 3 Terbuka!</b> Silakan isi evaluasi akhir untuk melihat Rapor Profil Apresiasi dan Peta Kekuatan Fungsi Tubuhmu.";
        }
    }
}

function handleTombolUtamaBeranda() {
    const isAdmin = akunSedangLogin && (akunSedangLogin.username === 'yoga' || akunSedangLogin.isAdmin);

    if (modeSesiAktif === 1) {
        if (statusSesiUser.sesi1Done && !statusSesiUser.reopenSesi1 && !isAdmin) {
            alert('Kamu sudah menyelesaikan Sesi 1.');
            return;
        }
        const usiaRaw = document.getElementById('usia-responden').value.trim();
        const usiaVal = Number(usiaRaw);
        if (!usiaRaw || !Number.isInteger(usiaVal) || usiaVal < 15 || usiaVal > 25) {
            alert('Usia tidak valid! Usia responden wajib berada di rentang 15 sampai 25 tahun (tidak boleh kurang dari 15 atau lebih dari 25).');
            return;
        }
        if (statusSesiUser.reopenSesi1) {
            showView('view-pretest', 'Sesi 1: Kuesioner Awal', 30);
        } else {
            document.getElementById('modal-consent').classList.remove('hidden');
        }
    } else if (modeSesiAktif === 2) {
        if (!isAdmin) {
            if (!statusSesiUser.sesi1Done) {
                alert('Selesaikan Sesi 1 terlebih dahulu.');
                return;
            }
            if (!statusSesiUser.verifikasiSesi2 && !statusSesiUser.reopenSesi2) {
                alert('⏳ Akses Sesi 2 belum dibuka oleh peneliti. Silakan klik tombol "🔄 Cek Bukaan Sesi".');
                return;
            }
            if (statusSesiUser.sesi2Done && !statusSesiUser.reopenSesi2) {
                alert('Kamu sudah menyelesaikan Sesi 2.');
                return;
            }
        }
        bukaModalBreathingSesi2();
    } else if (modeSesiAktif === 3) {
        if (statusSesiUser.sesi3Done && !statusSesiUser.reopenSesi3 && statusSesiUser.savedData) {
            tampilkanRaporDariDataTersimpan();
            return;
        }
        if (!isAdmin) {
            if (!statusSesiUser.sesi2Done) {
                alert('Selesaikan Sesi 2 terlebih dahulu.');
                return;
            }
            if (!statusSesiUser.verifikasiSesi3 && !statusSesiUser.reopenSesi3) {
                alert('⏳ Akses Sesi 3 belum dibuka oleh peneliti. Silakan klik tombol "🔄 Cek Bukaan Sesi".');
                return;
            }
        }
        const btnRaporLama = document.getElementById('btn-lihat-rapor-lama');
        if (statusSesiUser.sesi3Done) {
            btnRaporLama.classList.remove('hidden');
        } else {
            btnRaporLama.classList.add('hidden');
        }
        document.getElementById('posttest-wrapper').classList.remove('hidden');
        document.getElementById('closing-wrapper').classList.add('hidden');
        showView('view-posttest', 'Sesi 3: Evaluasi Akhir', 90);
    }
}

function kembaliKeBerandaDanCek() {
    showView('view-home', 'Beranda Utama', 15);
    sinkronisasiProgresDariServer(false);
}

// =========================================================================
// 3. DASHBOARD ADMIN PENELITI (INDEKS APRESIASI & MODAL RANGKUMAN LENGKAP)
// =========================================================================
function bukaDashboardAdmin() {
    showView('view-admin', 'Panel Peneliti', 100);
    muatDataDashboardAdmin();
}

async function muatDataDashboardAdmin() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">⏳ Memuat data terbaru dari Sheet <b>Data_3_Sesi</b>...</td></tr>`;

    try {
        const res = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ tipeSesi: "ADMIN_GET_ALL" })
        });
        const result = await res.json();

        if (result.status === "success" && Array.isArray(result.data)) {
            adminRespondenList = result.data;
            renderTabelAdmin(adminRespondenList);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-rose-500">Gagal memuat data. Pastikan Apps Script sudah di-deploy ke Versi Baru.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-rose-500">Gagal terhubung ke Google Sheets. Pastikan koneksi internet aktif.</td></tr>`;
    }
}

function renderTabelAdmin(list) {
    const tbody = document.getElementById('admin-table-body');
    document.getElementById('stat-total').innerText = list.length;
    document.getElementById('stat-s1').innerText = list.filter(x => x.sesi1Done).length;
    document.getElementById('stat-s2').innerText = list.filter(x => x.sesi2Done).length;
    document.getElementById('stat-s3').innerText = list.filter(x => x.sesi3Done).length;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">Belum ada responden yang terdaftar di Sheet <b>Data_3_Sesi</b>.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, idx) => {
        let colS1 = `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Belum</span>`;
        if (item.sesi1Done) {
            const kat1 = getKategoriApresiasi(item.meanPre);
            const btnReopen1 = item.reopenSesi1
                ? `<button onclick="toggleBukaUlangSesi(${idx}, 1, 'KUNCI_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">🔓 Sedang Dibuka (Kunci)</button>`
                : `<button onclick="toggleBukaUlangSesi(${idx}, 1, 'BUKA_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 text-[10px] font-bold transition-all">🔄 Buka Ulang</button>`;
            colS1 = `
                <div class="space-y-1">
                    <span class="font-extrabold text-slate-900 block">Indeks: ${item.meanPre} <span class="text-slate-400 font-normal">(${item.skorPre})</span></span>
                    <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${kat1.badgeClass}">${kat1.short}</span>
                    ${btnReopen1}
                </div>
            `;
        }

        const btnVerif2 = item.verifikasiSesi2
            ? `<button onclick="verifikasiSatuResponden(${idx}, 2, 'BATAL')" class="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-rose-100 text-emerald-800 hover:text-rose-700 font-bold transition-all">🔓 Terbuka</button>`
            : `<button onclick="verifikasiSatuResponden(${idx}, 2, 'SETUJUI')" class="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold shadow-sm transition-all">🔒 Buka Sesi 2</button>`;

        let colS2 = `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Belum</span>`;
        if (item.sesi2Done) {
            const btnReopen2 = item.reopenSesi2
                ? `<button onclick="toggleBukaUlangSesi(${idx}, 2, 'KUNCI_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">🔓 Sedang Dibuka (Kunci)</button>`
                : `<button onclick="toggleBukaUlangSesi(${idx}, 2, 'BUKA_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 text-[10px] font-bold transition-all">🔄 Buka Ulang</button>`;
            colS2 = `
                <div>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">✅ 5 Akt Selesai</span>
                    ${btnReopen2}
                </div>
            `;
        }

        const btnVerif3 = item.verifikasiSesi3
            ? `<button onclick="verifikasiSatuResponden(${idx}, 3, 'BATAL')" class="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-rose-100 text-emerald-800 hover:text-rose-700 font-bold transition-all">🔓 Terbuka</button>`
            : `<button onclick="verifikasiSatuResponden(${idx}, 3, 'SETUJUI')" class="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold shadow-sm transition-all">🔒 Buka Sesi 3</button>`;

        let colS3 = `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Belum</span>`;
        if (item.sesi3Done) {
            const kat3 = getKategoriApresiasi(item.meanPost);
            const deltaNum = Number(item.selisih);
            const deltaBadge = !isNaN(deltaNum)
                ? (deltaNum > 0 ? `<span class="text-emerald-700 font-extrabold">(+${deltaNum})</span>` : `<span class="text-slate-500">(${deltaNum})</span>`)
                : '';
            const btnReopen3 = item.reopenSesi3
                ? `<button onclick="toggleBukaUlangSesi(${idx}, 3, 'KUNCI_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">🔓 Sedang Dibuka (Kunci)</button>`
                : `<button onclick="toggleBukaUlangSesi(${idx}, 3, 'BUKA_ULANG')" class="mt-1.5 block mx-auto px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 text-[10px] font-bold transition-all">🔄 Buka Ulang</button>`;
            colS3 = `
                <div class="space-y-1">
                    <span class="font-extrabold text-slate-900 block">Indeks: ${item.meanPost} ${deltaBadge}</span>
                    <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${kat3.badgeClass}">${kat3.short}</span>
                    ${btnReopen3}
                </div>
            `;
        }

        return `
            <tr class="hover:bg-slate-50/80 align-top">
                <td class="p-3 space-y-1.5">
                    <div>
                        <span class="font-extrabold text-slate-900 block text-xs sm:text-sm">${item.nama}</span>
                        <span class="text-[11px] text-slate-400 block">@${item.username} &bull; ${item.usia} thn (${item.jk})</span>
                    </div>
                    <button type="button" onclick="bukaModalRangkumanAdmin(${idx})" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition-all">
                        👁️ Lihat Rangkuman
                    </button>
                </td>
                <td class="p-3 text-center">${colS1}</td>
                <td class="p-3 text-center">${btnVerif2}</td>
                <td class="p-3 text-center">${colS2}</td>
                <td class="p-3 text-center">${btnVerif3}</td>
                <td class="p-3 text-center">${colS3}</td>
            </tr>
        `;
    }).join('');
}

function bukaModalRangkumanAdmin(idx) {
    const item = adminRespondenList[idx];
    if (!item) return;

    document.getElementById('adm-sum-nama').innerText = item.nama;
    document.getElementById('adm-sum-meta').innerText = `@${item.username} • Usia ${item.usia} Tahun (${item.jk}) • Sosmed: ${item.durasi || '-'}`;

    const kat1 = getKategoriApresiasi(item.meanPre);
    document.getElementById('adm-sum-mean1').innerText = item.sesi1Done ? item.meanPre : "-";
    document.getElementById('adm-sum-skor1').innerText = item.sesi1Done ? `(${item.skorPre}/50)` : "(-/50)";
    const badge1 = document.getElementById('adm-sum-kat1');
    badge1.innerText = kat1.title;
    badge1.className = `inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${kat1.badgeClass}`;

    const kat3 = getKategoriApresiasi(item.meanPost);
    document.getElementById('adm-sum-mean3').innerText = item.sesi3Done ? item.meanPost : "-";
    document.getElementById('adm-sum-skor3').innerText = item.sesi3Done ? `(${item.skorPost}/50)` : "(-/50)";
    const badge3 = document.getElementById('adm-sum-kat3');
    badge3.innerText = kat3.title;
    badge3.className = `inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${kat3.badgeClass}`;

    const deltaEl = document.getElementById('adm-sum-delta');
    const deltaDescEl = document.getElementById('adm-sum-delta-desc');
    if (item.sesi1Done && item.sesi3Done) {
        const diffSkor = Number(item.skorPost) - Number(item.skorPre);
        const diffMean = (parseFloat(item.meanPost) - parseFloat(item.meanPre)).toFixed(2);
        if (diffSkor > 0) {
            deltaEl.innerText = `+${diffMean} Indeks (+${diffSkor} poin)`;
            deltaEl.className = "text-lg sm:text-xl font-extrabold text-emerald-400";
            deltaDescEl.innerText = `Meningkat dari ${kat1.short} menjadi ${kat3.short} setelah mengikuti refleksi fungsi tubuh.`;
        } else if (diffSkor === 0) {
            deltaEl.innerText = `0.00 (Stabil)`;
            deltaEl.className = "text-lg sm:text-xl font-extrabold text-slate-200";
            deltaDescEl.innerText = `Skor apresiasi tubuh tetap stabil pada level ${kat3.short}.`;
        } else {
            deltaEl.innerText = `${diffMean} Indeks (${diffSkor} poin)`;
            deltaEl.className = "text-lg sm:text-xl font-extrabold text-rose-400";
            deltaDescEl.innerText = `Terdapat penurunan skor pada evaluasi akhir. Cek catatan refleksi Sesi 2 di bawah untuk memahami faktornya.`;
        }
    } else {
        deltaEl.innerText = "Belum Lengkap";
        deltaEl.className = "text-lg font-extrabold text-slate-400";
        deltaDescEl.innerText = "Menunggu responden menyelesaikan Sesi 1 dan Sesi 3.";
    }

    const rawItemsStr = item.sesi3Done ? item.postItems : (item.sesi1Done ? item.preItems : "");
    const dimSourceBadge = document.getElementById('adm-sum-dim-source');
    const dimsGrid = document.getElementById('adm-sum-dims-grid');

    const sosmedList = item.act3YaTidak ? item.act3YaTidak.split(',').map(s => s.trim()) : [];
    const jumlahYaSosmed = sosmedList.filter(v => v === "Ya").length;
    const jumlahTidakSosmed = sosmedList.filter(v => v === "Tidak").length;
    const dim4Pct = sosmedList.length > 0 ? (60 + jumlahTidakSosmed * 10) : 0;

    if (rawItemsStr) {
        dimSourceBadge.innerText = item.sesi3Done ? "Sumber: Data Sesi 3 (Akhir)" : "Sumber: Data Sesi 1 (Awal)";
        const arr = rawItemsStr.split(',').map(x => parseInt(x.trim()) || 0);
        const d1Pct = Math.round(((arr[1] + arr[2] + arr[6] + arr[8]) / 20) * 100);
        const d2Pct = Math.round(((arr[0] + arr[3] + arr[4] + arr[5]) / 20) * 100);
        const d3Pct = Math.round(((arr[7] + arr[9]) / 10) * 100);

        dimsGrid.innerHTML = `
            <div class="p-2.5 rounded-xl bg-white border border-slate-200">
                <div class="flex justify-between font-bold text-slate-700 mb-1">
                    <span>1. Penerimaan & Kenyamanan Fisik</span>
                    <span class="text-teal-700">${d1Pct}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-teal-600" style="width:${d1Pct}%"></div></div>
            </div>
            <div class="p-2.5 rounded-xl bg-white border border-slate-200">
                <div class="flex justify-between font-bold text-slate-700 mb-1">
                    <span>2. Penghormatan & Kasih Sayang Tubuh</span>
                    <span class="text-emerald-700">${d2Pct}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-emerald-500" style="width:${d2Pct}%"></div></div>
            </div>
            <div class="p-2.5 rounded-xl bg-white border border-slate-200">
                <div class="flex justify-between font-bold text-slate-700 mb-1">
                    <span>3. Ketahanan Standar Penampilan Sosial</span>
                    <span class="text-cyan-700">${d3Pct}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-cyan-600" style="width:${d3Pct}%"></div></div>
            </div>
            <div class="p-2.5 rounded-xl bg-white border border-slate-200">
                <div class="flex justify-between font-bold text-slate-700 mb-1">
                    <span>4. Filter Realita Media Sosial (Sesi 2)</span>
                    <span class="text-amber-700">${sosmedList.length > 0 ? dim4Pct + '%' : 'Belum Isi'}</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-amber-500" style="width:${dim4Pct}%"></div></div>
            </div>
        `;

        const activeKat = item.sesi3Done ? kat3 : kat1;
        let alasanTeknis = `${activeKat.desc} `;
        if (d3Pct < d1Pct && d3Pct < d2Pct) {
            alasanTeknis += `Aspek terendah siswa ini berada pada <b>Ketahanan terhadap Standar Penampilan Sosial (${d3Pct}%)</b>, yang menunjukkan bahwa perbandingan visual dengan model/media sosial menjadi faktor utama yang memengaruhi persepsi tubuhnya. `;
        } else if (d1Pct <= d2Pct && d1Pct <= d3Pct) {
            alasanTeknis += `Aspek terendah berada pada <b>Penerimaan & Kenyamanan Fisik (${d1Pct}%)</b>, menandakan siswa masih dalam proses membangun rasa nyaman berada di dalam tubuhnya sendiri. `;
        } else {
            alasanTeknis += `Ketiga dimensi utama berada pada proporsi yang cukup seimbang (Penerimaan ${d1Pct}%, Penghormatan ${d2Pct}%, Ketahanan Sosial ${d3Pct}%). `;
        }

        if (sosmedList.length > 0) {
            alasanTeknis += `Pada refleksi media sosial, siswa menjawab <b>"Ya" pada ${jumlahYaSosmed} dari 4 indikator</b> perbandingan diri di media sosial.`;
        }
        document.getElementById('adm-sum-why-analysis').innerHTML = alasanTeknis;
    } else {
        dimSourceBadge.innerText = "Belum Ada Data";
        dimsGrid.innerHTML = `<p class="text-slate-400 italic col-span-2">Siswa belum mengisi kuesioner Sesi 1 maupun Sesi 3.</p>`;
        document.getElementById('adm-sum-why-analysis').innerText = "Belum tersedia karena responden belum mengisi kuesioner.";
    }

    const listFungsiEl = document.getElementById('adm-sum-act2-list');
    if (item.act2Fungsi) {
        listFungsiEl.innerHTML = item.act2Fungsi.split(' | ').map(f => `<li>${f}</li>`).join('');
    } else {
        listFungsiEl.innerHTML = `<li class="text-slate-400 font-normal">Belum diisi</li>`;
    }
    document.getElementById('adm-sum-act2-alasan').innerText = item.act2Alasan || "Belum diisi";

    if (sosmedList.length > 0) {
        document.getElementById('adm-sum-act3-yatidak').innerText =
            `1. Bandingkan penampilan: ${sosmedList[0] || '-'} | 2. Kurang menarik: ${sosmedList[1] || '-'} | 3. Tidak puas tubuh: ${sosmedList[2] || '-'} | 4. Ingin mirip orang lain: ${sosmedList[3] || '-'}`;
    } else {
        document.getElementById('adm-sum-act3-yatidak').innerText = "Belum mengisi pertanyaan refleksi media sosial.";
    }
    document.getElementById('adm-sum-act3-refleksi').innerText = item.act3Refleksi || "Belum diisi";
    document.getElementById('adm-sum-act4-surat').innerText = item.act4Surat || "Belum menulis surat untuk tubuh.";

    const listKomitmenEl = document.getElementById('adm-sum-act5-list');
    if (item.act5Komitmen) {
        listKomitmenEl.innerHTML = item.act5Komitmen.split(' | ').map(k => `<li>${k}</li>`).join('');
    } else {
        listKomitmenEl.innerHTML = `<li class="text-slate-400 font-normal">Belum diisi</li>`;
    }

    document.getElementById('adm-sum-act1').innerText = item.act1 ? item.act1.split(' | ').join(', ') : "Belum diisi";

    document.getElementById('modal-admin-summary').classList.remove('hidden');
}

function tutupModalRangkumanAdmin() {
    document.getElementById('modal-admin-summary').classList.add('hidden');
}

async function verifikasiSatuResponden(idx, targetSesi, aksi) {
    const item = adminRespondenList[idx];
    if (!item) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "ADMIN_VERIFIKASI",
                mode: "SINGLE",
                username: item.username,
                namaResponden: item.nama,
                targetSesi: targetSesi,
                aksi: aksi
            })
        });
        muatDataDashboardAdmin();
    } catch (e) {
        alert('Gagal mengubah status verifikasi.');
    }
}

async function toggleBukaUlangSesi(idx, targetSesi, aksi) {
    const item = adminRespondenList[idx];
    if (!item) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "ADMIN_VERIFIKASI",
                mode: "REOPEN_SINGLE",
                username: item.username,
                namaResponden: item.nama,
                targetSesi: targetSesi,
                aksi: aksi
            })
        });
        muatDataDashboardAdmin();
    } catch (e) {
        alert('Gagal membuka ulang sesi.');
    }
}

async function verifikasiMassalAdmin(targetSesi) {
    if (!confirm(`Buka akses Sesi ${targetSesi} untuk semua siswa yang sudah menyelesaikan Sesi ${targetSesi - 1}?`)) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "ADMIN_VERIFIKASI",
                mode: "ALL",
                targetSesi: targetSesi
            })
        });
        alert(`Akses Sesi ${targetSesi} berhasil dibuka!`);
        muatDataDashboardAdmin();
    } catch (e) {
        alert('Gagal melakukan verifikasi massal.');
    }
}

async function bukaSemuaSesiLanjutanMassal() {
    if (!confirm('Buka otomatis Sesi 2 (bagi yang selesai Sesi 1) dan Sesi 3 (bagi yang selesai Sesi 2) untuk seluruh kelas sekaligus?')) return;
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "ADMIN_VERIFIKASI",
                mode: "ALL_NEXT"
            })
        });
        alert('Seluruh sesi lanjutan berhasil dibuka!');
        muatDataDashboardAdmin();
    } catch (e) {
        alert('Gagal membuka sesi lanjutan.');
    }
}

async function bukaUlangSemuaSesiSelesaiMassal(buka) {
    const pesan = buka
        ? 'Buka kembali semua sesi yang sudah selesai (Sesi 1, 2, dan 3) agar siswa dapat masuk kembali?'
        : 'Kunci kembali semua sesi yang sudah selesai?';
    if (!confirm(pesan)) return;

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                tipeSesi: "ADMIN_VERIFIKASI",
                mode: buka ? "REOPEN_ALL_DONE" : "LOCK_ALL_DONE"
            })
        });
        alert(buka ? 'Semua sesi yang sudah selesai kini berhasil dibuka kembali!' : 'Semua sesi yang sudah selesai telah dikunci kembali!');
        muatDataDashboardAdmin();
    } catch (e) {
        alert('Gagal memproses aksi massal.');
    }
}

// =========================================================================
// 4. RENDER INSTRUMEN & PENYIMPANAN TIAP SESI (1, 2, DAN 3)
// =========================================================================
function renderKuesioner(containerId, prefix) {
    const container = document.getElementById(containerId);
    let html = '';
    butirKuesioner.forEach((teks, idx) => {
        const no = idx + 1;
        html += `
            <div class="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2.5 transition-all hover:border-teal-200">
                <p class="text-xs sm:text-sm font-bold text-slate-800">${no}. ${teks}</p>
                <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    ${skalaLikert.map(s => `
                        <label class="flex items-center sm:justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/30 cursor-pointer text-xs transition-all">
                            <input type="radio" name="${prefix}-bas-${no}" value="${s.nilai}" class="text-teal-600 focus:ring-teal-500">
                            <span class="ml-2 sm:ml-1.5 font-medium text-slate-700">${s.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderAktivitas1Inputs() {
    const container = document.getElementById('aktivitas1-inputs');
    let html = '';
    for (let i = 1; i <= 10; i++) {
        html += `
            <div class="relative">
                <input type="text" id="act1-item-${i}" oninput="updateAct1Progress()" placeholder="Fungsi/Aktivitas ${i}..." 
                    class="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:outline-none focus:border-teal-600 transition-all">
                <span id="act1-check-${i}" class="hidden absolute right-2.5 top-2.5 text-xs text-teal-600 font-bold">✓</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

function updateAct1Progress() {
    let terisi = 0;
    for (let i = 1; i <= 10; i++) {
        const val = document.getElementById(`act1-item-${i}`).value.trim();
        const checkIcon = document.getElementById(`act1-check-${i}`);
        if (val.length > 0) {
            terisi++;
            checkIcon.classList.remove('hidden');
        } else {
            checkIcon.classList.add('hidden');
        }
    }
    document.getElementById('act1-progress-bar').style.width = `${terisi * 10}%`;
    document.getElementById('act1-counter-badge').innerText = `${terisi} / 10 Terisi`;
}

function updateAct5Progress() {
    let count = 0;
    for (let i = 1; i <= 3; i++) {
        if (document.getElementById(`act5-komitmen-${i}`).value.trim().length > 0) count++;
    }
    document.getElementById('act5-badge-count').innerText = `${count} / 3 Siap`;
}

function showView(viewId, badgeText, progressPercent) {
    if (viewId !== 'view-login' && !akunSedangLogin) {
        viewId = 'view-login';
        badgeText = 'Akses Terkunci';
    }
    allViews.forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('page-transition');
    });
    const target = document.getElementById(viewId);
    target.classList.remove('hidden');
    void target.offsetWidth;
    target.classList.add('page-transition');

    document.getElementById('badge-step').innerText = badgeText;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bukaModalInfoSaja() {
    document.getElementById('modal-consent').classList.remove('hidden');
}

function tutupModalConsent() {
    document.getElementById('modal-consent').classList.add('hidden');
}

function konfirmasiConsentDanMulaiSesi1() {
    if (!document.getElementById('consent-check').checked) {
        alert('Silakan centang kotak persetujuan responden terlebih dahulu.');
        return;
    }
    tutupModalConsent();
    showView('view-pretest', 'Sesi 1: Kuesioner Awal', 30);
}

function bukaModalBreathingSesi2() {
    const modal = document.getElementById('modal-breathing');
    const label = document.getElementById('breath-instruction');
    modal.classList.remove('hidden');
    label.innerText = "Tarik Napas...";

    if (breathInterval) clearInterval(breathInterval);
    let fase = 0;
    breathInterval = setInterval(() => {
        fase = (fase + 1) % 2;
        label.innerText = fase === 0 ? "Tarik Napas..." : "Hembuskan...";
    }, 3000);
}

function lanjutKeAktivitas1SetelahNapas() {
    if (breathInterval) clearInterval(breathInterval);
    document.getElementById('modal-breathing').classList.add('hidden');
    showView('view-act-1', 'Sesi 2: Aktivitas 1 / 5', 40);
}

// SIMPAN SESI 1
async function submitPretestSesi1() {
    for (let i = 1; i <= 10; i++) {
        if (!document.querySelector(`input[name="pre-bas-${i}"]:checked`)) {
            alert(`Mohon pilih jawaban untuk pernyataan nomor ${i}.`);
            return;
        }
    }

    const usiaRaw = document.getElementById('usia-responden').value.trim();
    const usiaVal = Number(usiaRaw);
    if (!usiaRaw || !Number.isInteger(usiaVal) || usiaVal < 15 || usiaVal > 25) {
        alert('Usia tidak valid! Usia responden wajib berada di rentang 15 sampai 25 tahun.');
        return;
    }

    const btn = document.getElementById('btn-submit-pretest');
    btn.disabled = true;
    btn.innerText = 'Menyimpan Sesi 1...';

    let preItems = [];
    let preTotal = 0;
    for (let i = 1; i <= 10; i++) {
        const vPre = parseInt(document.querySelector(`input[name="pre-bas-${i}"]:checked`).value);
        preItems.push(vPre);
        preTotal += vPre;
    }

    const namaResp = document.getElementById('nama-responden').value.trim();

    const payload = {
        tipeSesi: "SIMPAN_SESI_1",
        tanggal: new Date().toLocaleString('id-ID'),
        username: akunSedangLogin.username,
        namaResponden: namaResp,
        usia: String(usiaVal),
        jenisKelamin: document.getElementById('jk-responden').value,
        durasiSosmed: document.getElementById('durasi-sosmed').value,
        pretestItems: preItems.join(', '),
        pretestTotal: preTotal
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
    } catch (e) {}

    statusSesiUser.sesi1Done = true;
    statusSesiUser.reopenSesi1 = false;
    localStorage.setItem(`bv_prog_${akunSedangLogin.username}`, JSON.stringify(statusSesiUser));

    btn.disabled = false;
    btn.innerText = 'Simpan Jawaban Sesi 1 ✓';
    document.getElementById('done-pretest-nama').innerText = namaResp;
    showView('view-pretest-done', 'Selesai Sesi 1', 100);
}

// VALIDASI 5 AKTIVITAS & SIMPAN SESI 2
function validateAktivitas1() {
    for (let i = 1; i <= 10; i++) {
        if (!document.getElementById(`act1-item-${i}`).value.trim()) {
            alert(`Mohon lengkapi isian Aktivitas ${i} (Minimal 10 aktivitas fungsi tubuh).`);
            return;
        }
    }
    showView('view-act-2', 'Sesi 2: Aktivitas 2 / 5', 50);
}

function validateAktivitas2() {
    const f1 = document.getElementById('act2-fungsi-1').value.trim();
    const f2 = document.getElementById('act2-fungsi-2').value.trim();
    const f3 = document.getElementById('act2-fungsi-3').value.trim();
    const alasan = document.getElementById('act2-alasan').value.trim();

    if (!f1 || !f2 || !f3 || !alasan) {
        alert('Mohon tuliskan 3 fungsi tubuh yang dihargai beserta alasannya.');
        return;
    }
    showView('view-act-3', 'Sesi 2: Aktivitas 3 / 5', 60);
}

function validateAktivitas3() {
    for (let i = 1; i <= 4; i++) {
        if (!document.querySelector(`input[name="sosmed-${i}"]:checked`)) {
            alert(`Mohon pilih Ya/Tidak pada pertanyaan refleksi nomor ${i}.`);
            return;
        }
    }
    if (!document.getElementById('act3-refleksi').value.trim()) {
        alert('Mohon isi jawaban pada pertanyaan refleksi lanjutan.');
        return;
    }
    showView('view-act-4', 'Sesi 2: Aktivitas 4 / 5', 70);
}

function validateAktivitas4() {
    if (!document.getElementById('act4-surat').value.trim()) {
        alert('Mohon tuliskan pesan atau ucapan terima kasih untuk tubuhmu terlebih dahulu.');
        return;
    }
    showView('view-act-5', 'Sesi 2: Aktivitas 5 / 5', 80);
}

async function submitIntervensiSesi2() {
    const k1 = document.getElementById('act5-komitmen-1').value.trim();
    const k2 = document.getElementById('act5-komitmen-2').value.trim();
    const k3 = document.getElementById('act5-komitmen-3').value.trim();

    if (!k1 || !k2 || !k3) {
        alert('Mohon tuliskan 3 komitmen tindakan nyata untuk menghargai tubuhmu.');
        return;
    }

    const btn = document.getElementById('btn-submit-sesi2');
    btn.disabled = true;
    btn.innerText = 'Menyimpan 5 Aktivitas Sesi 2...';

    let act1List = [];
    for (let i = 1; i <= 10; i++) {
        act1List.push(document.getElementById(`act1-item-${i}`).value.trim());
    }

    const f1 = document.getElementById('act2-fungsi-1').value.trim();
    const f2 = document.getElementById('act2-fungsi-2').value.trim();
    const f3 = document.getElementById('act2-fungsi-3').value.trim();
    const alasanFungsi = document.getElementById('act2-alasan').value.trim();

    const s1 = document.querySelector('input[name="sosmed-1"]:checked').value;
    const s2 = document.querySelector('input[name="sosmed-2"]:checked').value;
    const s3 = document.querySelector('input[name="sosmed-3"]:checked').value;
    const s4 = document.querySelector('input[name="sosmed-4"]:checked').value;
    const sosmedArr = [s1, s2, s3, s4];

    const refleksiSosmed = document.getElementById('act3-refleksi').value.trim();
    const suratTubuh = document.getElementById('act4-surat').value.trim();
    const namaResp = document.getElementById('nama-responden').value.trim();

    const payloadSesi2 = {
        tipeSesi: "SIMPAN_SESI_2",
        tanggal: new Date().toLocaleString('id-ID'),
        username: akunSedangLogin.username,
        namaResponden: namaResp,
        aktivitas1_10Fungsi: act1List.join(' | '),
        aktivitas2_3Fungsi: [f1, f2, f3].join(' | '),
        aktivitas2_Alasan: alasanFungsi,
        aktivitas3_YaTidak: sosmedArr.join(', '),
        aktivitas3_RefleksiSosmed: refleksiSosmed,
        aktivitas4_SuratTubuh: suratTubuh,
        aktivitas5_3Komitmen: [k1, k2, k3].join(' | ')
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadSesi2)
        });
    } catch (e) {}

    statusSesiUser.sesi2Done = true;
    statusSesiUser.reopenSesi2 = false;
    statusSesiUser.savedData = {
        act1: payloadSesi2.aktivitas1_10Fungsi,
        act2Fungsi: payloadSesi2.aktivitas2_3Fungsi,
        act2Alasan: alasanFungsi,
        act3YaTidak: payloadSesi2.aktivitas3_YaTidak,
        act3Refleksi: refleksiSosmed,
        act4Surat: suratTubuh,
        act5Komitmen: payloadSesi2.aktivitas5_3Komitmen
    };
    localStorage.setItem(`bv_prog_${akunSedangLogin.username}`, JSON.stringify(statusSesiUser));

    btn.disabled = false;
    btn.innerText = 'Simpan Refleksi Sesi 2 ✓';
    showView('view-sesi2-done', 'Selesai Sesi 2', 100);
}

// SIMPAN SESI 3 & TAMPILKAN RAPOR HASIL
async function submitPosttestSesi3() {
    for (let i = 1; i <= 10; i++) {
        if (!document.querySelector(`input[name="post-bas-${i}"]:checked`)) {
            alert(`Mohon pilih jawaban untuk pernyataan nomor ${i} pada Evaluasi Akhir.`);
            return;
        }
    }

    const btn = document.getElementById('btn-submit-posttest');
    btn.disabled = true;
    btn.innerText = 'Menyimpan Sesi 3 & Menyusun Rapor...';

    let postItems = [];
    let postTotal = 0;
    for (let i = 1; i <= 10; i++) {
        const vPost = parseInt(document.querySelector(`input[name="post-bas-${i}"]:checked`).value);
        postItems.push(vPost);
        postTotal += vPost;
    }

    const namaResp = document.getElementById('nama-responden').value.trim();

    const payloadSesi3 = {
        tipeSesi: "SIMPAN_SESI_3",
        tanggal: new Date().toLocaleString('id-ID'),
        username: akunSedangLogin.username,
        namaResponden: namaResp,
        posttestItems: postItems.join(', '),
        posttestTotal: postTotal
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadSesi3)
        });
    } catch (e) {}

    statusSesiUser.sesi3Done = true;
    statusSesiUser.reopenSesi3 = false;
    if (!statusSesiUser.savedData) statusSesiUser.savedData = {};
    statusSesiUser.savedData.postItems = postItems.join(', ');
    statusSesiUser.savedData.postTotal = postTotal;
    localStorage.setItem(`bv_prog_${akunSedangLogin.username}`, JSON.stringify(statusSesiUser));

    btn.disabled = false;
    btn.innerText = 'Simpan Sesi 3 & Lihat Rapor Hasil ✓';
    bangunDanTampilkanRapor(postItems, postTotal);
}

function tampilkanRaporDariDataTersimpan() {
    const sd = statusSesiUser.savedData || {};
    const itemsArr = sd.postItems
        ? sd.postItems.split(',').map(x => parseInt(x.trim()) || 4)
        : [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    const totalSkor = sd.postTotal || itemsArr.reduce((a, b) => a + b, 0);

    showView('view-posttest', 'Rapor Hasil Refleksi', 100);
    bangunDanTampilkanRapor(itemsArr, totalSkor);
}

function animasiCountUp(elementId, targetValue, duration, isDecimal = false, suffix = '') {
    const el = document.getElementById(elementId);
    const startTime = performance.now();

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = targetValue * easeOut;

        el.innerText = isDecimal
            ? currentVal.toFixed(2) + suffix
            : Math.round(currentVal) + suffix;

        if (progress < 1) requestAnimationFrame(updateNumber);
    }
    requestAnimationFrame(updateNumber);
}

function bangunDanTampilkanRapor(postItems, postTotal) {
    const postMeanNum = postTotal / 10;
    const postPercent = Math.round((postTotal / 50) * 100);

    const dim1Score = (postItems[1] || 4) + (postItems[2] || 4) + (postItems[6] || 4) + (postItems[8] || 4);
    const dim1Percent = Math.round((dim1Score / 20) * 100);

    const dim2Score = (postItems[0] || 4) + (postItems[3] || 4) + (postItems[4] || 4) + (postItems[5] || 4);
    const dim2Percent = Math.round((dim2Score / 20) * 100);

    const dim3Score = (postItems[7] || 4) + (postItems[9] || 4);
    const dim3Percent = Math.round((dim3Score / 10) * 100);

    const sd = statusSesiUser.savedData || {};
    const sosmedList = sd.act3YaTidak ? sd.act3YaTidak.split(',').map(s => s.trim()) : ["Tidak", "Tidak", "Tidak", "Tidak"];
    const jumlahTidakSosmed = sosmedList.filter(val => val === "Tidak").length;
    const jumlahYaSosmed = 4 - jumlahTidakSosmed;
    const dim4Percent = 60 + (jumlahTidakSosmed * 10);

    const katRes = getKategoriApresiasi(postMeanNum);
    const badgeTitle = katRes.title;
    const badgeDesc = katRes.desc;

    let narasiSosmed = "";
    if (jumlahYaSosmed >= 3) {
        narasiSosmed = `Berdasarkan refleksimu di Sesi 2 (${jumlahYaSosmed} dari 4 pengalaman), kamu menyadari cukup sering membandingkan diri saat melihat konten media sosial. Mengingat kembali fungsi tubuhmu akan membantumu menjaga rasa percaya diri.`;
    } else if (jumlahYaSosmed >= 1) {
        narasiSosmed = `Berdasarkan refleksimu di Sesi 2 (${jumlahYaSosmed} dari 4 pengalaman), kamu sesekali pernah membandingkan penampilan dengan konten di internet, namun kamu sudah memiliki kesadaran kritis bahwa foto/video di media sosial tidak menampilkan keseluruhan hidup seseorang.`;
    } else {
        narasiSosmed = `Kamu memiliki daya tahan digital yang sangat baik (tidak mudah membandingkan fisik dengan konten media sosial). Pertahankan cara pandang sehat ini sambil terus merawat fungsi tubuhmu.`;
    }

    const tigaFungsiArr = sd.act2Fungsi ? sd.act2Fungsi.split(' | ') : ["Fungsi Pancaindra", "Fungsi Gerak Tubuh", "Fungsi Organ Dalam"];
    const tigaKomitmenArr = sd.act5Komitmen ? sd.act5Komitmen.split(' | ') : ["Menjaga waktu istirahat tubuh", "Mensyukuri fungsi tubuh setiap pagi", "Menggunakan media sosial secara bijak"];

    document.getElementById('closing-nama').innerText = akunSedangLogin.nama;
    document.getElementById('score-total-display').innerText = `Skor ${postTotal}/50 (${postPercent}%)`;
    document.getElementById('score-badge-title').innerText = badgeTitle;
    document.getElementById('score-badge-desc').innerText = badgeDesc;
    document.getElementById('closing-analisis-sosmed').innerText = narasiSosmed;

    document.getElementById('closing-list-fungsi').innerHTML = tigaFungsiArr.map(f => `<li>${f}</li>`).join('');
    document.getElementById('closing-alasan-fungsi').innerText = sd.act2Alasan || "-";
    document.getElementById('closing-surat-tubuh').innerText = sd.act4Surat || "-";
    document.getElementById('closing-refleksi-sosmed').innerText = sd.act3Refleksi || "-";
    document.getElementById('closing-list-komitmen').innerHTML = tigaKomitmenArr.map(k => `<li>${k}</li>`).join('');

    document.getElementById('posttest-wrapper').classList.add('hidden');
    document.getElementById('closing-wrapper').classList.remove('hidden');
    document.getElementById('badge-step').innerText = 'Rapor Hasil Refleksi';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const dashOffset = 314 - Math.round((postPercent / 100) * 314);
    setTimeout(() => {
        document.getElementById('score-circle-bar').style.strokeDashoffset = dashOffset;
        animasiCountUp('score-mean-display', postMeanNum, 1200, true, '');

        document.getElementById('bar-fill-1').style.width = `${dim1Percent}%`;
        animasiCountUp('bar-label-1', dim1Percent, 1000, false, '%');

        document.getElementById('bar-fill-2').style.width = `${dim2Percent}%`;
        animasiCountUp('bar-label-2', dim2Percent, 1000, false, '%');

        document.getElementById('bar-fill-3').style.width = `${dim3Percent}%`;
        animasiCountUp('bar-label-3', dim3Percent, 1000, false, '%');

        document.getElementById('bar-fill-4').style.width = `${dim4Percent}%`;
        animasiCountUp('bar-label-4', dim4Percent, 1000, false, '%');
    }, 200);
}