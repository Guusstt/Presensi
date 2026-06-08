import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import AuthForm from "../components/AuthForm";
import MessageAlert from "../components/MessageAlert";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import AdminDashboard from "../pages/admin/AdminDashboard";

const ALLOWED_LAT = -6.569399;
const ALLOWED_LNG = 110.686943;
const ALLOWED_RADIUS_METERS = 50;

const PRESENCE_CONFIG = {
  morning: {
    start: { hour: 6, minute: 30 },
    end: { hour: 7, minute: 15 },
    label: "Pagi",
  },
  afternoon: {
    start: { hour: 12, minute: 15 },
    end: { hour: 13, minute: 0 },
    label: "Siang",
  },
};

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getValidPresenceType(userId = null) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  const SPECIAL_USER_ID = "95977478-69a5-49bd-8080-4cc59f7106f6";

  const morningStart =
    PRESENCE_CONFIG.morning.start.hour * 60 + PRESENCE_CONFIG.morning.start.minute;
  const morningEnd =
    userId === SPECIAL_USER_ID
      ? 10 * 60
      : PRESENCE_CONFIG.morning.end.hour * 60 + PRESENCE_CONFIG.morning.end.minute;

  let afternoonConfig;
  if (currentDay === 5) {
    afternoonConfig = { start: { hour: 11, minute: 0 }, end: { hour: 11, minute: 15 } };
  } else {
    afternoonConfig = PRESENCE_CONFIG.afternoon;
  }

  const afternoonStart = afternoonConfig.start.hour * 60 + afternoonConfig.start.minute;
  const afternoonEnd = afternoonConfig.end.hour * 60 + afternoonConfig.end.minute;

  if (currentTime >= morningStart && currentTime <= morningEnd)
    return { type: "morning", label: PRESENCE_CONFIG.morning.label };
  if (currentTime >= afternoonStart && currentTime <= afternoonEnd)
    return { type: "afternoon", label: PRESENCE_CONFIG.afternoon.label };
  return null;
}

function formatTime(hour, minute) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconHome = ({ active }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M3 12L12 3l9 9" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 10v11h14V10" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconHistory = ({ active }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2"/>
    <path d="M12 7v5l3 3" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconQR = () => (
  <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2"/>
    <path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h2v3h-2zM18 18h3v3h-3z" fill="white"/>
  </svg>
);
const IconLeave = ({ active }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUser = ({ active }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? "#6C63FF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconLocation = () => (
  <svg width="80" height="80" fill="none" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#6C63FF" opacity="0.2"/>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6C63FF" strokeWidth="2"/>
    <circle cx="12" cy="9" r="2.5" fill="#6C63FF"/>
  </svg>
);
const IconChevron = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = ({ size = 20 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Leave Form ───────────────────────────────────────────────────────────────
function MenuCutiGuru({ userId }) {
  const [activeTab, setActiveTab] = useState("form");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => { fetchMyRequests(); }, []);

  const fetchMyRequests = async () => {
    setFetchLoading(true);
    const { data } = await supabase
      .from("leave_requests").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setFetchLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setMessage({ type: "error", text: "Semua field wajib diisi." }); return;
    }
    if (form.end_date < form.start_date) {
      setMessage({ type: "error", text: "Tanggal selesai tidak boleh sebelum tanggal mulai." }); return;
    }
    setLoading(true); setMessage({ type: "", text: "" });
    const { error } = await supabase.from("leave_requests").insert({
      user_id: userId, start_date: form.start_date, end_date: form.end_date,
      reason: form.reason, status: "pending",
    });
    if (error) {
      setMessage({ type: "error", text: "Gagal mengajukan cuti: " + error.message });
    } else {
      setMessage({ type: "success", text: "Permohonan cuti berhasil diajukan!" });
      setForm({ start_date: "", end_date: "", reason: "" });
      fetchMyRequests();
      setTimeout(() => setActiveTab("riwayat"), 1500);
    }
    setLoading(false);
  };

  const statusConfig = {
    pending: { label: "Menunggu", cls: "bg-amber-100 text-amber-700", dot: "#F59E0B" },
    approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-700", dot: "#10B981" },
    rejected: { label: "Ditolak", cls: "bg-red-100 text-red-600", dot: "#EF4444" },
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="w-full min-h-full">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)" }} className="pt-12 pb-5 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}/>
        <h1 className="text-xl font-bold text-white relative">Permohonan Cuti</h1>
        <p className="text-white/70 text-xs mt-0.5 relative">Ajukan dan pantau status cuti Anda</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 rounded-2xl p-1.5">
          {[["form", "Ajukan Cuti"], ["riwayat", "Riwayat"]].map(([id, label]) => (
            <button key={id} onClick={() => { setActiveTab(id); if (id === "riwayat") fetchMyRequests(); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === id ? "text-white shadow-sm" : "text-gray-400"
              }`}
              style={activeTab === id ? { background: "linear-gradient(135deg, #6C63FF, #5B54E8)" } : {}}>
              {label}
              {id === "riwayat" && pendingCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white text-xs rounded-full inline-flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 pt-4 space-y-3">
        {activeTab === "form" && (
          <>
            {message.text && (
              <div className={`p-4 rounded-2xl text-sm font-medium flex items-start gap-2.5 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"}`}>
                <span className="text-base mt-0.5">{message.type === "success" ? "✅" : "⚠️"}</span>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Date range card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Periode Cuti</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mulai</label>
                    <input type="date" required value={form.start_date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-gray-800 bg-gray-50 outline-none focus:border-violet-400 text-xs font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Selesai</label>
                    <input type="date" required value={form.end_date}
                      min={form.start_date || new Date().toISOString().split("T")[0]}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-gray-800 bg-gray-50 outline-none focus:border-violet-400 text-xs font-medium"/>
                  </div>
                </div>

                {form.start_date && form.end_date && form.end_date >= form.start_date && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-violet-700" style={{ background: "rgba(108,99,255,0.08)" }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Durasi: {Math.round((new Date(form.end_date) - new Date(form.start_date)) / (1000*60*60*24)) + 1} hari kerja
                  </div>
                )}
              </div>

              {/* Reason card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Alasan Cuti</p>
                <textarea required rows={4} value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Tuliskan alasan pengajuan cuti secara lengkap..."
                  className="w-full px-3 py-3 border border-gray-100 rounded-xl text-gray-800 bg-gray-50 outline-none focus:border-violet-400 resize-none text-sm leading-relaxed"/>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-300">Min. 10 karakter</span>
                  <span className={`text-xs font-semibold ${form.reason.length >= 10 ? "text-emerald-500" : "text-gray-400"}`}>
                    {form.reason.length} karakter
                  </span>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 text-white rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)", boxShadow: "0 8px 24px rgba(108,99,255,0.30)" }}>
                {loading ? (
                  <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengajukan...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Kirim Permohonan</>
                )}
              </button>
            </form>
          </>
        )}

        {activeTab === "riwayat" && (
          fetchLoading ? (
            <div className="py-16 flex justify-center"><svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-violet-300" fill="none" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-bold text-gray-500 text-sm">Belum ada pengajuan cuti</p>
              <p className="text-xs text-gray-400 mt-1">Ajukan cuti pertama Anda melalui tab "Ajukan Cuti"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary pill */}
              <div className="flex gap-2">
                {Object.entries({
                  pending: requests.filter(r=>r.status==="pending").length,
                  approved: requests.filter(r=>r.status==="approved").length,
                  rejected: requests.filter(r=>r.status==="rejected").length,
                }).map(([key, count]) => count > 0 && (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${statusConfig[key].cls}`}>
                    <span>{count}</span>
                    <span>{statusConfig[key].label}</span>
                  </div>
                ))}
              </div>

              {requests.map(r => {
                const sc = statusConfig[r.status] || statusConfig.pending;
                const startDate = new Date(r.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                const endDate = new Date(r.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                const isSameDay = r.start_date === r.end_date;
                const diffDays = Math.round((new Date(r.end_date) - new Date(r.start_date)) / (1000*60*60*24)) + 1;
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: sc.dot }}/>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{isSameDay ? startDate : `${startDate} — ${endDate}`}</p>
                        <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{diffDays} Hari</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 leading-relaxed">{r.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Presence Page ────────────────────────────────────────────────────────────
function PresencePage({ session, presences, currentPresenceType, presenceLoading, emailVerified, message, onMark }) {
  const today = new Date().toDateString();

  const getTimeBadge = (p) => {
    const h = new Date(p.created_at).getHours();
    const m = new Date(p.created_at).getMinutes();
    const totalMin = h * 60 + m;
    if (p.presence_type === "morning") {
      return totalMin <= 7 * 60 + 15 ? "Tepat Waktu" : "Terlambat";
    }
    const isFriday = new Date(p.created_at).getDay() === 5;
    const cutoff = isFriday ? 11 * 60 + 15 : 13 * 60 + 0;
    return totalMin <= cutoff ? "Tepat Waktu" : "Terlambat";
  };

  const grouped = {};
  presences.slice(0, 10).forEach(p => {
    const d = new Date(p.created_at).toDateString();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(p);
  });

  return (
    <div className="w-full min-h-full">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)" }} className="pt-12 pb-5 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}/>
        <h1 className="text-xl font-bold text-white relative">Tandai Kehadiran</h1>
        <p className="text-white/70 text-xs mt-0.5 relative">
          {currentPresenceType ? `Waktu presensi ${currentPresenceType.label} sedang berlangsung` : "Di luar jam operasional presensi"}
        </p>
      </div>

      <div className="pb-4">
        {/* Presence Button Card */}
        <div className="mx-4 mt-4 bg-white rounded-3xl shadow-md p-6 mb-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center ${currentPresenceType ? "bg-violet-50" : "bg-gray-50"}`}>
              <IconLocation/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {currentPresenceType ? `Presensi ${currentPresenceType.label}` : "Lokasi Tidak Aktif"}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {currentPresenceType ? "Ketuk tombol di bawah untuk mencatat kehadiran" : "Anda berada di luar jam operasional saat ini."}
              </p>
            </div>
            {message && (
              <div className={`w-full p-3 rounded-xl text-sm font-medium text-center ${
                message.includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>{message}</div>
            )}
            <button onClick={onMark}
              disabled={presenceLoading || !currentPresenceType || !emailVerified}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
              style={currentPresenceType && emailVerified && !presenceLoading ? {
                background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)",
                color: "white",
                boxShadow: "0 8px 24px rgba(108,99,255,0.35)"
              } : { background: "#E5E7EB", color: "#9CA3AF" }}>
              {presenceLoading ? "Memproses..." : currentPresenceType ? "Catat Kehadiran" : "Tombol Tidak Aktif"}
            </button>
          </div>
        </div>

        {/* Recent presences */}
        <div className="px-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Riwayat Terbaru</h3>
          <div className="space-y-2">
            {Object.entries(grouped).map(([dateStr, items]) => (
              <div key={dateStr}>
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  {new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {items.map(p => {
                  const badge = getTimeBadge(p);
                  const timeStr = new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  return (
                    <div key={p.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Sesi {p.presence_label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeStr}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                          badge === "Tepat Waktu" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>{badge}</span>
                        <IconChevron/>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="#6C63FF" strokeWidth="2"/>
                  <path d="M12 8v4m0 4h.01" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-800">Jam Operasional</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-gray-500">Pagi</span>
                <span className="text-xs font-bold text-gray-700">{formatTime(PRESENCE_CONFIG.morning.start.hour, PRESENCE_CONFIG.morning.start.minute)} – {formatTime(PRESENCE_CONFIG.morning.end.hour, PRESENCE_CONFIG.morning.end.minute)}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-gray-500">Siang</span>
                <span className="text-xs font-bold text-gray-700">{formatTime(PRESENCE_CONFIG.afternoon.start.hour, PRESENCE_CONFIG.afternoon.start.minute)} – {formatTime(PRESENCE_CONFIG.afternoon.end.hour, PRESENCE_CONFIG.afternoon.end.minute)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Riwayat Tab ─────────────────────────────────────────────────────────────
function RiwayatTab({ presences, getTimeBadge }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  // Kumpulkan bulan-bulan yang punya data
  const availableMonths = [...new Set(
    presences.map(p => {
      const d = new Date(p.created_at);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  )].map(s => {
    const [y, m] = s.split("-").map(Number);
    return { year: y, month: m };
  }).sort((a, b) => b.year - a.year || b.month - a.month);

  // Filter presensi berdasarkan bulan & tahun yang dipilih
  const filtered = presences.filter(p => {
    const d = new Date(p.created_at);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  // Cek apakah bisa navigasi prev/next
  const currentIdx = availableMonths.findIndex(m => m.year === selectedYear && m.month === selectedMonth);
  const hasPrev = currentIdx < availableMonths.length - 1;
  const hasNext = currentIdx > 0;

  const goPrev = () => {
    const target = availableMonths[currentIdx + 1];
    if (target) { setSelectedYear(target.year); setSelectedMonth(target.month); }
  };
  const goNext = () => {
    const target = availableMonths[currentIdx - 1];
    if (target) { setSelectedYear(target.year); setSelectedMonth(target.month); }
  };

  // Group by date
  const grouped = {};
  filtered.forEach(p => {
    const d = new Date(p.created_at).toDateString();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(p);
  });

  const totalSesi = filtered.length;
  const totalHari = Object.keys(grouped).length;
  const tepat = filtered.filter(p => {
    const h = new Date(p.created_at).getHours();
    const m = new Date(p.created_at).getMinutes();
    const totalMin = h * 60 + m;
    if (p.presence_type === "morning") return totalMin <= 7 * 60 + 15;
    const isFri = new Date(p.created_at).getDay() === 5;
    return totalMin <= (isFri ? 11 * 60 + 15 : 13 * 60);
  }).length;

  const monthLabel = new Date(selectedYear, selectedMonth, 1)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="w-full">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)" }} className="pt-12 pb-5 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}/>
        <h1 className="text-xl font-bold text-white relative">Riwayat Presensi</h1>
        <p className="text-white/70 text-xs mt-0.5 relative">Data kehadiran per bulan</p>

        {/* Month navigator */}
        <div className="flex items-center justify-between mt-4 relative">
          <button onClick={goPrev} disabled={!hasPrev}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${hasPrev ? "bg-white/20 active:bg-white/30" : "opacity-30 cursor-not-allowed"}`}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-white font-extrabold text-base capitalize">{monthLabel}</span>
          <button onClick={goNext} disabled={!hasNext}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${hasNext ? "bg-white/20 active:bg-white/30" : "opacity-30 cursor-not-allowed"}`}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Summary chips */}
        {filtered.length > 0 && (
          <div className="flex gap-2 mt-3 relative">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
              <span className="text-white text-xs font-bold">{totalSesi}</span>
              <span className="text-white/70 text-xs">Sesi</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
              <span className="text-white text-xs font-bold">{totalHari}</span>
              <span className="text-white/70 text-xs">Hari</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
              <span className="text-white text-xs font-bold">{tepat}</span>
              <span className="text-white/70 text-xs">Tepat Waktu</span>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-4 pb-4 pt-5 space-y-4">
        {Object.entries(grouped).map(([dateStr, items]) => (
          <div key={dateStr}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              {items.some(p => p.presence_type === "morning") && items.some(p => p.presence_type === "afternoon") && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Lengkap</span>
              )}
            </div>
            {items.map(p => {
              const badge = getTimeBadge(p);
              const timeStr = new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              return (
                <div key={p.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badge === "Tepat Waktu" ? "bg-emerald-50" : "bg-amber-50"}`}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" stroke={badge === "Tepat Waktu" ? "#10B981" : "#F59E0B"} strokeWidth="2"/>
                        <path d="M12 7v5l3 3" stroke={badge === "Tepat Waktu" ? "#10B981" : "#F59E0B"} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Sesi {p.presence_label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeStr}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                    badge === "Tepat Waktu" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{badge}</span>
                </div>
              );
            })}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-violet-300" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-bold text-gray-500 text-sm">Tidak ada presensi di bulan ini</p>
            <p className="text-xs text-gray-400 mt-1">Coba navigasi ke bulan lain</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Login() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("beranda");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presences, setPresences] = useState([]);
  const [currentPresenceType, setCurrentPresenceType] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || null);
  const [mottoIndex, setMottoIndex] = useState(0);

  const mottos = [
    { text: "Disiplin hari ini, prestasi esok hari!", sub: "Terus jaga kehadiran Anda" },
    { text: "Konsistensi adalah kunci kesuksesan!", sub: "Hadir tepat waktu setiap hari" },
    { text: "Kehadiran Anda menginspirasi semua!", sub: "Jadilah teladan bagi rekan Anda" },
  ];

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      setEmailVerified(session.user.email_confirmed_at !== null);
      fetchPresences();
    }
  }, [session]);

  useEffect(() => {
    const updatePresenceType = () => setCurrentPresenceType(getValidPresenceType(session?.user?.id));
    updatePresenceType();
    const interval = setInterval(updatePresenceType, 60000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const interval = setInterval(() => setMottoIndex(i => (i + 1) % mottos.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const signIn = async () => {
    setLoading(true); setMessage("");
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
      setLoading(false); return;
    }
    if (authData.user) {
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
      const role = profileData?.role || "guru";
      localStorage.setItem("userRole", role);
      setUserRole(role);
    }
    setLoading(false);
  };

  const signUp = async () => {
    if (password !== confirmPassword) { setMessage("Password tidak cocok."); return; }
    setLoading(true); setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage("Cek email Anda untuk verifikasi.");
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setEmail(""); setPassword(""); setConfirmPassword("");
    localStorage.removeItem("userRole"); setUserRole(null);
  };

  const resendVerification = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setMessage(error.message);
    else setMessage("Email verifikasi telah dikirim ulang.");
    setLoading(false);
  };

  const markPresence = async () => {
    setPresenceLoading(true); setMessage("");
    const presenceType = getValidPresenceType(session?.user?.id);
    if (!presenceType) {
      const isFriday = new Date().getDay() === 5;
      const afternoonConfig = isFriday
        ? { start: { hour: 11, minute: 0 }, end: { hour: 11, minute: 15 } }
        : PRESENCE_CONFIG.afternoon;
      const morningTime = `${formatTime(PRESENCE_CONFIG.morning.start.hour, PRESENCE_CONFIG.morning.start.minute)} - ${formatTime(PRESENCE_CONFIG.morning.end.hour, PRESENCE_CONFIG.morning.end.minute)}`;
      const afternoonTime = `${formatTime(afternoonConfig.start.hour, afternoonConfig.start.minute)} - ${formatTime(afternoonConfig.end.hour, afternoonConfig.end.minute)}`;
      setMessage(`Presensi hanya pada:\nPagi: ${morningTime}\nSiang: ${afternoonTime}`);
      setPresenceLoading(false); return;
    }
    const today = new Date().toDateString();
    const alreadyPresent = presences.filter(p => new Date(p.created_at).toDateString() === today)
      .some(p => p.presence_type === presenceType.type);
    if (alreadyPresent) {
      setMessage(`Anda sudah presensi ${presenceType.label.toLowerCase()} hari ini.`);
      setPresenceLoading(false); return;
    }
    if (!navigator.geolocation) {
      setMessage("Geolocation tidak didukung.");
      setPresenceLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistanceFromLatLonInMeters(latitude, longitude, ALLOWED_LAT, ALLOWED_LNG);
        const SPECIAL_USER_ID = "95977478-69a5-49bd-8080-4cc59f7106f6";
        if (distance > ALLOWED_RADIUS_METERS && session.user.id !== SPECIAL_USER_ID) {
          const d = Math.round(distance);
          window.alert(`Presensi Gagal! Anda di luar jangkauan.\n\nJarak Anda: ~${d}m\nRadius Izin: ${ALLOWED_RADIUS_METERS}m`);
          setMessage(`Anda berada di luar jangkauan (${d}m dari lokasi).`);
          setPresenceLoading(false); return;
        }
        const { error } = await supabase.from("presences").insert({
          user_id: session.user.id, latitude, longitude,
          presence_type: presenceType.type, presence_label: presenceType.label,
        });
        if (error) setMessage(error.message);
        else { setMessage(`Presensi ${presenceType.label.toLowerCase()} berhasil dicatat!`); fetchPresences(); }
        setPresenceLoading(false);
      },
      () => { setMessage("Gagal mendapatkan lokasi."); setPresenceLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const fetchPresences = async () => {
    const { data, error } = await supabase.from("presences").select("*")
      .eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (!error) setPresences(data);
  };

  const handleKeyPress = (e) => { if (e.key === "Enter") isSignUp ? signUp() : signIn(); };

  const getCurrentGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    if (h < 21) return "Selamat sore";
    return "Selamat malam";
  };

  const getTodayPresenceStatus = () => {
    const today = new Date().toDateString();
    const todayP = presences.filter(p => new Date(p.created_at).toDateString() === today);
    return {
      morning: todayP.some(p => p.presence_type === "morning"),
      afternoon: todayP.some(p => p.presence_type === "afternoon"),
      count: todayP.length,
      isComplete: todayP.some(p => p.presence_type === "morning") && todayP.some(p => p.presence_type === "afternoon"),
    };
  };

  const getAttendanceSummary = () => {
    const dates = {};
    presences.forEach(p => {
      const date = new Date(p.created_at).toDateString();
      if (!dates[date]) dates[date] = { morning: false, afternoon: false };
      dates[date][p.presence_type] = true;
    });
    const completeDays = Object.values(dates).filter(d => d.morning && d.afternoon).length;
    return { totalDays: Object.keys(dates).length, completeDays };
  };

  const getTimeBadge = (p) => {
    const h = new Date(p.created_at).getHours();
    const m = new Date(p.created_at).getMinutes();
    const totalMin = h * 60 + m;
    if (p.presence_type === "morning") return totalMin <= 7 * 60 + 15 ? "Tepat Waktu" : "Terlambat";
    const isFriday = new Date(p.created_at).getDay() === 5;
    return totalMin <= (isFriday ? 11 * 60 + 15 : 13 * 60) ? "Tepat Waktu" : "Terlambat";
  };

  // ── LOGIN PAGE ──
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans"
        style={{ background: "linear-gradient(160deg, #EEF0FF 0%, #F5F3FF 50%, #EDE9FE 100%)" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-violet-100 p-8 space-y-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)", boxShadow: "0 8px 20px rgba(108,99,255,0.35)" }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {isSignUp ? "Buat Akun Baru" : "Selamat Datang"}
              </h1>
              <p className="text-violet-500 font-medium text-sm">
                {isSignUp ? "Daftar untuk mengakses sistem presensi" : "Masuk ke akun Anda untuk melanjutkan"}
              </p>
            </div>
            <AuthForm {...{
              isSignUp, setIsSignUp, email, setEmail, password, setPassword,
              confirmPassword, setConfirmPassword, loading, showPassword, setShowPassword,
              handleKeyPress, message, setMessage, onSubmit: isSignUp ? signUp : signIn
            }}/>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === "admin") return <AdminDashboard onLogout={signOut}/>;

  const todayStatus = getTodayPresenceStatus();
  const attendanceSummary = getAttendanceSummary();
  const isFriday = new Date().getDay() === 5;
  const afternoonDisplayConfig = isFriday
    ? { start: { hour: 11, minute: 0 }, end: { hour: 11, minute: 15 } }
    : PRESENCE_CONFIG.afternoon;

  const username = session.user.email.split("@")[0];

  // ── MAIN APP (with persistent bottom nav) ──
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col w-full max-w-md mx-auto relative"
      style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 w-full">

        {/* ── BERANDA ── */}
        {activeTab === "beranda" && (
          <>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)" }} className="pt-12 pb-16 px-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}/>
              <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10" style={{ background: "white", transform: "translate(-30%, 30%)" }}/>
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-white/70 text-sm font-medium">Dashboard</p>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">Pegawai</h1>
                  <p className="text-white/80 text-sm mt-1 font-medium">
                    {getCurrentGreeting()}, <span className="font-bold text-white">{username}</span> 👋
                  </p>
                </div>
                <button onClick={signOut} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="px-4 -mt-8 grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-white rounded-2xl p-4 shadow-md">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">Kehadiran Hari Ini</p>
                <p className="text-3xl font-extrabold text-blue-900">{todayStatus.count}<span className="text-lg text-gray-400 font-bold">/2</span></p>
                <p className="text-xs text-blue-400 font-semibold mt-1">{todayStatus.isComplete ? "Lengkap ✓" : "Belum Lengkap"}</p>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mt-3">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="#3B82F6" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 14l2 2 4-4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-md">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">Hari Lengkap</p>
                <p className="text-3xl font-extrabold text-emerald-900">{attendanceSummary.completeDays}</p>
                <p className="text-xs text-emerald-400 font-semibold mt-1">Total hari penuh</p>
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mt-3">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2"/>
                    <path d="M8 12l3 3 5-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-md col-span-2">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-2">Total Presensi</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-extrabold text-amber-900">{presences.length}</p>
                    <p className="text-xs text-amber-400 font-semibold mt-1">Semua sesi tercatat</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <rect x="3" y="12" width="4" height="9" rx="1" fill="#F59E0B" opacity="0.6"/>
                      <rect x="10" y="7" width="4" height="14" rx="1" fill="#F59E0B" opacity="0.8"/>
                      <rect x="17" y="3" width="4" height="18" rx="1" fill="#F59E0B"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Hari Ini */}
            <div className="px-4 mt-5">
              <h3 className="text-base font-bold text-gray-900 mb-3">Status Hari Ini</h3>
              <div className="space-y-3">
                {[
                  { key: "morning", label: "Sesi Pagi", done: todayStatus.morning,
                    time: `${formatTime(PRESENCE_CONFIG.morning.start.hour, PRESENCE_CONFIG.morning.start.minute)} - ${formatTime(PRESENCE_CONFIG.morning.end.hour, PRESENCE_CONFIG.morning.end.minute)}` },
                  { key: "afternoon", label: "Sesi Siang", done: todayStatus.afternoon,
                    time: `${formatTime(afternoonDisplayConfig.start.hour, afternoonDisplayConfig.start.minute)} - ${formatTime(afternoonDisplayConfig.end.hour, afternoonDisplayConfig.end.minute)}${isFriday ? " (Jumat)" : ""}` },
                ].map(item => (
                  <div key={item.key} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.done ? "" : "bg-gray-100"}`}
                        style={item.done ? { background: "linear-gradient(135deg, #10B981, #059669)" } : {}}>
                        {item.done ? <IconCheck size={18}/> : <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#D1D5DB" strokeWidth="2"/></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                        <p className={`text-xs font-bold mt-0.5 ${item.done ? "text-emerald-600" : "text-gray-400"}`}>
                          {item.done ? "Sudah Presensi" : "Belum Presensi"}
                        </p>
                      </div>
                    </div>
                    <IconChevron/>
                  </div>
                ))}
              </div>
            </div>

            {/* Akses Cepat */}
            <div className="px-4 mt-5">
              <h3 className="text-base font-bold text-gray-900 mb-3">Akses Cepat</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "📍", label: "Tandai\nKehadiran", sub: "Absen sekarang", color: "#EEF0FF", iconBg: "#6C63FF", action: () => setActiveTab("presensi") },
                  { icon: "🕐", label: "Riwayat\nPresensi", sub: "Lihat riwayat", color: "#FFF3E0", iconBg: "#F97316", action: () => setActiveTab("riwayat") },
                  { icon: "📋", label: "Ajukan\nCuti", sub: "Buat permohonan", color: "#F0FDF4", iconBg: "#10B981", action: () => setActiveTab("cuti") },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: item.color }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: item.iconBg }}>
                        <span className="text-sm">{item.icon}</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-tight whitespace-pre-line">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Motto Banner */}
            <div className="px-4 mt-5">
              <div className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 60%, #7C3AED 100%)" }}>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                  <svg width="80" height="80" fill="none" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="3"/>
                    <path d="M50 20v30l20 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M30 70l10-10m20 0l10 10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="relative">
                  <p className="text-white font-extrabold text-base leading-snug">{mottos[mottoIndex].text}</p>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">{mottos[mottoIndex].sub}</p>
                  <div className="flex gap-1.5 mt-3">
                    {mottos.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === mottoIndex ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Terbaru */}
            <div className="px-4 mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">Riwayat Terbaru</h3>
                <button onClick={() => setActiveTab("riwayat")} className="text-xs font-bold text-violet-600">Lihat semua</button>
              </div>
              {presences.length === 0 ? (
                <div className="py-8 text-center text-gray-400 bg-white rounded-2xl shadow-sm">
                  <p className="text-sm font-semibold">Belum ada riwayat presensi.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const grouped = {};
                    presences.slice(0, 6).forEach(p => {
                      const d = new Date(p.created_at).toDateString();
                      if (!grouped[d]) grouped[d] = [];
                      grouped[d].push(p);
                    });
                    return Object.entries(grouped).slice(0, 3).map(([dateStr, items]) => (
                      <div key={dateStr}>
                        <p className="text-xs font-semibold text-gray-400 mb-2">
                          {new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {items.map(p => {
                          const badge = getTimeBadge(p);
                          const timeStr = new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div key={p.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between mb-1.5">
                              <div>
                                <p className="text-sm font-bold text-gray-900">Sesi {p.presence_label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{timeStr}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${badge === "Tepat Waktu" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{badge}</span>
                                <IconChevron/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {!emailVerified && (
              <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-700">⚠️ Email belum terverifikasi</p>
                <p className="text-xs text-amber-600 mt-1">Verifikasi email diperlukan untuk presensi.</p>
                <button onClick={resendVerification} disabled={loading}
                  className="mt-2 text-xs font-bold text-amber-700 underline">
                  Kirim ulang email verifikasi
                </button>
              </div>
            )}
            <div className="h-4"/>
          </>
        )}

        {/* ── PRESENSI TAB ── */}
        {activeTab === "presensi" && (
          <PresencePage
            session={session} presences={presences} currentPresenceType={currentPresenceType}
            presenceLoading={presenceLoading} emailVerified={emailVerified} message={message}
            onMark={markPresence}
          />
        )}

        {/* ── RIWAYAT TAB ── */}
        {activeTab === "riwayat" && <RiwayatTab presences={presences} getTimeBadge={getTimeBadge}/>}

        {/* ── CUTI TAB ── */}
        {activeTab === "cuti" && (
          <MenuCutiGuru userId={session.user.id}/>
        )}

        {/* ── AKUN TAB ── */}
        {activeTab === "akun" && (
          <div className="w-full">
            {/* Header with avatar */}
            <div style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)" }} className="pt-12 pb-20 px-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}/>
              <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10" style={{ background: "white", transform: "translate(-30%, 30%)" }}/>
              <h1 className="text-xl font-bold text-white relative">Profil Saya</h1>
              <p className="text-white/70 text-xs mt-0.5 relative">Informasi akun Anda</p>
            </div>

            {/* Avatar card (overlapping header) */}
            <div className="px-4 -mt-12 relative z-10 mb-4">
              <div className="bg-white rounded-2xl p-5 shadow-md flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6C63FF, #5B54E8)", boxShadow: "0 4px 16px rgba(108,99,255,0.35)" }}>
                  {username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-gray-900 text-base truncate">{username}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                      emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      <span>{emailVerified ? "✓" : "⚠"}</span>
                      <span>{emailVerified ? "Terverifikasi" : "Belum Verifikasi"}</span>
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700">Guru</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="px-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Statistik Kehadiran</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Sesi", value: presences.length, unit: "sesi", color: "#6C63FF", bg: "#EEF0FF",
                    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9" rx="1" fill="#6C63FF" opacity="0.6"/><rect x="10" y="7" width="4" height="14" rx="1" fill="#6C63FF" opacity="0.8"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#6C63FF"/></svg> },
                  { label: "Hari Lengkap", value: attendanceSummary.completeDays, unit: "hari", color: "#10B981", bg: "#ECFDF5",
                    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                  { label: "Total Hadir", value: attendanceSummary.totalDays, unit: "hari", color: "#F59E0B", bg: "#FFFBEB",
                    icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#F59E0B" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/></svg> },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm text-center">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: item.bg }}>
                      {item.icon}
                    </div>
                    <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Aksi Cepat</p>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                <button onClick={() => setActiveTab("riwayat")} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                      <IconHistory active={true}/>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Lihat Riwayat Presensi</span>
                  </div>
                  <IconChevron/>
                </button>
                <button onClick={() => setActiveTab("cuti")} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <IconLeave active={false}/>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Permohonan Cuti</span>
                  </div>
                  <IconChevron/>
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="px-4 mb-4">
              <button onClick={signOut}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-red-500 bg-red-50 border border-red-100 active:scale-95 transition-all">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Keluar dari Akun
              </button>
            </div>
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-gray-400 font-medium">
                © {new Date().getFullYear()} Akadix · by Levora
              </p>
              <p className="text-xs text-gray-300 mt-0.5">All rights reserved</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION (always visible) ── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 z-50"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}>
        <div className="flex items-end px-2 pt-2 pb-4">
          {[
            { id: "beranda", label: "Beranda", Icon: IconHome },
            { id: "riwayat", label: "Riwayat", Icon: IconHistory },
            { id: "presensi", label: "Presensi", Icon: null, isQR: true },
            { id: "cuti", label: "Cuti", Icon: IconLeave },
            { id: "akun", label: "Akun", Icon: IconUser },
          ].map(({ id, label, Icon, isQR }) => {
            const isActive = activeTab === id;
            return isQR ? (
              <button key={id} onClick={() => setActiveTab("presensi")}
                className="flex-1 flex flex-col items-center -mt-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, #6C63FF 0%, #5B54E8 100%)", boxShadow: "0 4px 16px rgba(108,99,255,0.45)" }}>
                  <IconQR/>
                </div>
                <span className="text-xs font-bold mt-1.5 text-violet-600">{label}</span>
              </button>
            ) : (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex-1 flex flex-col items-center gap-1 py-1">
                <Icon active={isActive}/>
                <span className={`text-xs font-bold ${isActive ? "text-violet-600" : "text-gray-400"}`}>{label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-violet-600"/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}