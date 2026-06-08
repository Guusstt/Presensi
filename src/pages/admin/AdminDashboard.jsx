import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import {
  Calendar,
  Download,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  LogOut,
  CreditCard,
  FileText,
  Menu,
  X,
  Maximize,
  Minimize,
  UserCog,
  Plus,
  Edit,
  Trash2,
  Check,
  Ban,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabase/client";

const formatToLocalDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Portal Modal (render ke document.body agar tidak terkurung parent) ──
function ModalPortal({ children }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>,
    document.body
  );
}

// ==========================================
// MAIN LAYOUT
// ==========================================
export default function AdminDashboard({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState("presensi");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navigation = [
    { id: "presensi", label: "Presensi Guru", icon: <Users className="w-5 h-5" /> },
    { id: "spp", label: "Pembayaran SPP", icon: <CreditCard className="w-5 h-5" /> },
    { id: "cuti", label: "Permohonan Cuti", icon: <FileText className="w-5 h-5" /> },
    { id: "pegawai", label: "Manajemen Pegawai", icon: <UserCog className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 bg-white w-64 shadow-xl z-30 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-2 text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-800">SIAKAD</span>
          </div>
          <button className="md:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveMenu(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeMenu === item.id ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-white shadow-sm z-10 p-4 sm:px-6 lg:px-8 flex items-center justify-between border-b">
          <div className="flex items-center">
            <button className="md:hidden text-gray-500 hover:text-gray-700 mr-4" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 hidden md:block capitalize">
              {navigation.find((n) => n.id === activeMenu)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={toggleFullScreen} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors hidden md:flex items-center justify-center">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-3 md:border-l md:pl-4 border-gray-200">
              <span className="text-sm font-medium text-gray-600 hidden sm:block">Admin Sistem</span>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">AD</div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {activeMenu === "presensi" && <MenuPresensi />}
          {activeMenu === "spp" && <MenuSPP />}
          {activeMenu === "cuti" && <MenuCuti />}
          {activeMenu === "pegawai" && <MenuPegawai />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// MENU PRESENSI
// ==========================================
function MenuPresensi() {
  const [presences, setPresences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatToLocalDateString(new Date()));
  const [selectedType, setSelectedType] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: presencesData } = await supabase.from("presences").select("*").order("created_at", { ascending: false });
    const { data: profilesData } = await supabase.from("user_details").select("id, name, email, institution");
    if (presencesData && profilesData) {
      const map = new Map(profilesData.map((p) => [p.id, p]));
      setPresences(presencesData.map((p) => ({ ...p, profiles: map.get(p.user_id) || null })));
    }
    setUsers(profilesData || []);
    setLoading(false);
  };

  const isPresenceValid = (presence) => {
    const date = formatToLocalDateString(presence.created_at);
    const same = presences.filter((p) => p.user_id === presence.user_id && formatToLocalDateString(p.created_at) === date);
    return same.some((p) => p.presence_type === "morning") && same.some((p) => p.presence_type === "afternoon");
  };

  const getFilteredPresences = () =>
    presences.filter((p) => {
      const matchDate = selectedDate === "" || formatToLocalDateString(p.created_at) === selectedDate;
      const matchType = selectedType === "all" || p.presence_type === selectedType;
      const matchUser = selectedUser === "all" || p.user_id === selectedUser;
      const matchInst = selectedInstitution === "all" || p.profiles?.institution === selectedInstitution;
      const matchSearch = searchTerm === "" || (p.profiles?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.profiles?.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchType && matchUser && matchSearch && matchInst;
    });

  const getStats = () => {
    const todayStr = formatToLocalDateString(new Date());
    const todayP = presences.filter((p) => formatToLocalDateString(p.created_at) === todayStr);
    return { totalToday: todayP.length, uniqueUsers: new Set(todayP.map((p) => p.user_id)).size, totalUsers: users.length };
  };

  const getMonthlyRecap = () => {
    const map = new Map();
    presences.forEach((p) => {
      const d = new Date(p.created_at);
      if (d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear)) {
        const uid = p.user_id;
        if (!map.has(uid)) map.set(uid, { user: p.profiles, count: 1 });
        else map.get(uid).count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  };

  const exportToExcel = () => {
    const data = getFilteredPresences().map((p) => ({
      Tanggal: new Date(p.created_at).toLocaleDateString("id-ID"),
      Waktu: new Date(p.created_at).toLocaleTimeString("id-ID"),
      "Nama Guru": p.profiles?.name || "N/A",
      Email: p.profiles?.email || "N/A",
      "Jenis Presensi": p.presence_label,
      Latitude: p.latitude,
      Longitude: p.longitude,
      "Jarak (meter)": p.distance ?? "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presensi Guru");
    XLSX.writeFile(wb, `presensi-guru-${selectedDate}.xlsx`);
  };

  const exportMonthlyRecapToPDF = async () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const institutions = ["KB", "TK", "TPA"];
    const principals = { TK: "Triyanto", KB: "Bunda Nur", TPA: "Bunda Wid" };
    const doc = new jsPDF("l", "mm", [215, 330]);
    const pageWidth = 330;
    const namaBulan = new Date(0, selectedMonth - 1).toLocaleString("id-ID", { month: "long" });

    for (let i = 0; i < institutions.length; i++) {
      const inst = institutions[i];
      if (i > 0) doc.addPage("l", "mm", [215, 330]);
      const filteredUsers = users.filter((u) => u.institution === inst);
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text(`LAPORAN MATRIKS PRESENSI - LEMBAGA ${inst}`, pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Periode: ${namaBulan} ${selectedYear}`, 14, 22);
      if (filteredUsers.length === 0) { doc.text(`(Tidak ada data guru untuk lembaga ${inst})`, pageWidth / 2, 40, { align: "center" }); continue; }
      const headRow = ["Nama Guru"];
      for (let day = 1; day <= daysInMonth; day++) headRow.push(String(day));
      const tableBody = [], qrMatrix = [];
      const presencesThisMonth = presences.filter((p) => { const d = new Date(p.created_at); return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear); });
      for (const user of filteredUsers) {
        const row = [user.name || user.email], qrRow = [null];
        for (let day = 1; day <= daysInMonth; day++) {
          const isPresent = presencesThisMonth.find((p) => p.user_id === user.id && new Date(p.created_at).getDate() === day);
          if (isPresent) {
            try { const qr = await QRCode.toDataURL(`TTD|${user.name}|${day}/${selectedMonth}`, { margin: 0, width: 50, errorCorrectionLevel: "L" }); qrRow.push(qr); row.push(""); }
            catch { qrRow.push(null); row.push("Err"); }
          } else { qrRow.push(null); row.push("-"); }
        }
        tableBody.push(row); qrMatrix.push(qrRow);
      }
      autoTable(doc, {
        startY: 28, margin: { left: 10, right: 10 }, head: [headRow], body: tableBody, theme: "grid",
        styles: { fontSize: 7, halign: "center", valign: "middle", minCellHeight: 10, cellPadding: 0.5 },
        columnStyles: { 0: { cellWidth: 35, halign: "left" } },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index > 0) {
            const qr = qrMatrix[data.row.index][data.column.index];
            if (qr) { const dim = Math.min(data.cell.width, data.cell.height) - 1.5; doc.addImage(qr, "PNG", data.cell.x + (data.cell.width - dim) / 2, data.cell.y + (data.cell.height - dim) / 2, dim, dim); }
          }
        },
      });
      let finalY = doc.lastAutoTable.finalY + 12;
      const startX = 280;
      if (finalY + 45 > 200) { doc.addPage("l", "mm", [215, 330]); finalY = 20; }
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Jepara, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, startX, finalY, { align: "center" });
      doc.text("Kepala Sekolah,", startX, finalY + 5, { align: "center" });
      const pqr = await QRCode.toDataURL(`SAH|${principals[inst]}|${inst}|${selectedMonth}-${selectedYear}`, { width: 100 });
      doc.addImage(pqr, "PNG", startX - 11, finalY + 7, 22, 22);
      doc.setFont("helvetica", "bold");
      doc.text(principals[inst], startX, finalY + 35, { align: "center" });
      doc.line(startX - 20, finalY + 36, startX + 20, finalY + 36);
    }
    doc.save(`Laporan-Presensi-Lengkap-${namaBulan}-${selectedYear}.pdf`);
  };

  const stats = getStats();
  const filteredPresences = getFilteredPresences();
  const monthlyRecap = getMonthlyRecap();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Presensi Hari Ini" value={stats.totalToday} icon={<Clock />} color="blue" />
        <StatCard title="Guru Hadir Hari Ini" value={stats.uniqueUsers} icon={<Users />} color="green" />
        <StatCard title="Total Guru Terdaftar" value={stats.totalUsers} icon={<Users />} color="purple" />
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 w-full">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Cari nama / email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="all">Semua Lembaga</option>
                <option value="KB">KB</option>
                <option value="TK">TK</option>
                <option value="TPA">TPA</option>
              </select>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="all">Semua Guru</option>
                {users.filter((u) => selectedInstitution === "all" || u.institution === selectedInstitution).map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <button onClick={fetchData} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /><span>Refresh</span>
            </button>
            <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
              <Download className="w-4 h-4" /><span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Data Presensi ({filteredPresences.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2"><RefreshCw className="animate-spin text-blue-500 w-8 h-8" /><span className="text-gray-600">Memuat data...</span></div>
          ) : filteredPresences.length === 0 ? (
            <div className="py-12 text-center"><XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">Tidak ada data presensi.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Guru", "Waktu", "Jenis", "Lokasi", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 uppercase">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPresences.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4"><div className="font-medium text-gray-900">{p.profiles?.name || "N/A"}</div><div className="text-xs text-gray-500">{p.profiles?.email || "N/A"}</div></td>
                    <td className="px-4 py-4 text-gray-700">{p.created_at ? new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                    <td className="px-4 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.presence_type === "morning" ? "bg-orange-100 text-orange-800" : "bg-purple-100 text-purple-800"}`}>{p.presence_label}</span></td>
                    <td className="hidden md:table-cell px-4 py-4 text-gray-500 text-xs"><div>Lat: {p.latitude?.toFixed(5) || "N/A"}</div><div>Lng: {p.longitude?.toFixed(5) || "N/A"}</div>{p.distance != null && <div className="text-blue-500 font-semibold">Jarak: {p.distance}m</div>}</td>
                    <td className="px-4 py-4">{isPresenceValid(p) ? <span className="flex items-center text-green-700"><CheckCircle className="w-4 h-4 mr-1 text-green-500" />Valid</span> : <span className="flex items-center text-red-700"><XCircle className="w-4 h-4 mr-1 text-red-500" />Invalid</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Rekap Bulanan</h2>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("id-ID", { month: "long" })}</option>)}
            </select>
            <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{["Rank", "Guru", "Total"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-200">
              {monthlyRecap.length === 0 ? <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500">Tidak ada data.</td></tr> :
                monthlyRecap.map((r, i) => <tr key={r.user?.id} className="hover:bg-gray-50"><td className="px-4 py-4 font-bold text-gray-700">{i + 1}</td><td className="px-4 py-4">{r.user?.name || "N/A"}</td><td className="px-4 py-4 font-bold text-blue-600">{r.count}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="p-4 md:p-6 border-t flex justify-end">
          <button onClick={exportMonthlyRecapToPDF} disabled={monthlyRecap.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm">
            <Download className="w-4 h-4" /><span>Cetak Laporan PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU SPP
// ==========================================
function MenuSPP() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
        <h2 className="text-xl font-bold text-gray-800">Manajemen Pembayaran SPP</h2>
      </div>
      <div className="mt-8 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-400 font-medium">-- Area Pengembangan Form/Tabel SPP --</p>
      </div>
    </div>
  );
}

// ==========================================
// MENU PERMOHONAN CUTI
// ==========================================
function MenuCuti() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*, user_details(name, email, institution)")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setRequests(data || []);
    setLoading(false);
  };

  const handleAction = async (id, status) => {
    setActionLoading(id + status);
    const { error } = await supabase.from("leave_requests").update({ status }).eq("id", id);
    if (!error) setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setActionLoading(null);
  };

  const filtered = requests.filter((r) => filterStatus === "all" || r.status === filterStatus);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const statusConfig = {
    pending: { label: "Menunggu", cls: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
    approved: { label: "Disetujui", cls: "bg-green-100 text-green-700 border border-green-200" },
    rejected: { label: "Ditolak", cls: "bg-red-100 text-red-600 border border-red-200" },
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><FileText className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Permohonan Cuti Guru</h2>
              <p className="text-sm text-gray-500">{pendingCount > 0 ? `${pendingCount} permohonan menunggu persetujuan` : "Semua permohonan telah ditangani"}</p>
            </div>
          </div>
          <button onClick={fetchRequests} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>

        {/* Tab Filter */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {[
            { val: "all", label: "Semua", count: requests.length },
            { val: "pending", label: "Menunggu", count: pendingCount },
            { val: "approved", label: "Disetujui", count: requests.filter((r) => r.status === "approved").length },
            { val: "rejected", label: "Ditolak", count: requests.filter((r) => r.status === "rejected").length },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setFilterStatus(tab.val)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === tab.val ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filterStatus === tab.val ? "bg-white/20 text-white" : "bg-white text-gray-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg py-16 flex justify-center items-center gap-2">
          <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
          <span className="text-gray-600">Memuat data...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg py-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Tidak ada permohonan cuti.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sc = statusConfig[r.status] || statusConfig.pending;
            const startDate = new Date(r.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
            const endDate = new Date(r.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
            const isSameDay = r.start_date === r.end_date;
            const diffDays = Math.round((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24)) + 1;
            const initial = (r.user_details?.name || "?")[0].toUpperCase();

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Info Guru */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{r.user_details?.name || "N/A"}</span>
                        {r.user_details?.institution && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-100">{r.user_details.institution}</span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{r.user_details?.email || ""}</p>

                      {/* Tanggal */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          {isSameDay ? startDate : `${startDate} — ${endDate}`}
                          <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {diffDays} hari
                          </span>
                        </span>
                      </div>

                      {/* Alasan */}
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-700 leading-relaxed">
                        <span className="text-xs font-semibold text-gray-400 block mb-1 uppercase tracking-wide">Alasan</span>
                        {r.reason}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Diajukan: {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  {r.status === "pending" && (
                    <div className="flex sm:flex-col gap-2 sm:min-w-[110px]">
                      <button
                        onClick={() => handleAction(r.id, "approved")}
                        disabled={actionLoading === r.id + "approved"}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-60 transition-colors shadow-sm"
                      >
                        {actionLoading === r.id + "approved" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Setujui
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "rejected")}
                        disabled={actionLoading === r.id + "rejected"}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm"
                      >
                        {actionLoading === r.id + "rejected" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MENU MANAJEMEN PEGAWAI
// ==========================================
function MenuPegawai() {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({ id: "", name: "", username: "", password: "", role: "user", institution: "TK" });

  useEffect(() => { fetchPegawai(); }, []);

  const fetchPegawai = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("name", { ascending: true });
    if (error) { console.error(error); alert("Gagal memuat data pegawai!"); }
    else setPegawaiList(data || []);
    setLoading(false);
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: newName,
      ...(modalMode === "add" ? { username: newName.toLowerCase().replace(/[^a-z0-9]/g, "") } : {}),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (modalMode === "add") {
      const fullEmail = `${formData.username}@paudbintang.com`;
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: fullEmail, password: formData.password });
      if (authError) { alert(`Gagal membuat akun: ${authError.message}`); setLoading(false); return; }
      const userId = authData.user?.id;
      if (userId) {
        const { error: profileError } = await supabase
        .from("profiles")
        .upsert([{ 
          id: userId,
          name: formData.name,
          email: fullEmail,
          role: formData.role, 
          institution: formData.institution === "NULL" ? null : formData.institution 
        }], { onConflict: "id" });
        if (profileError) alert("Akun dibuat, namun gagal menyimpan profil.");
        else { alert(`Pegawai berhasil ditambahkan!\nEmail login: ${fullEmail}`); setIsModalOpen(false); fetchPegawai(); }
      }
    } else {
      const { error } = await supabase.from("profiles").update({ name: formData.name, role: formData.role, institution: formData.institution === "NULL" ? null : formData.institution }).eq("id", formData.id);
      if (error) alert("Gagal memperbarui profil pegawai!");
      else { setIsModalOpen(false); fetchPegawai(); }
    }
    setLoading(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus data profil "${name}"?`)) return;
    setLoading(true);
    
    // Hapus dari auth.users dulu (akan cascade ke profiles otomatis)
    const { error } = await supabase.auth.admin.deleteUser(id);
    
    if (error) {
      // Fallback: hapus profiles langsung jika admin API tidak tersedia
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (profileError) {
        alert("Gagal menghapus data pegawai!");
        setLoading(false);
        return;
      }
    }
    
    fetchPegawai();
    setLoading(false);
  };

  const openEditModal = (p) => {
    setFormData({ id: p.id, name: p.name, username: "", password: "", role: p.role, institution: p.institution || "NULL" });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({ id: "", name: "", username: "", password: "", role: "user", institution: "TK" });
    setModalMode("add");
    setIsModalOpen(true);
  };

  const filtered = pegawaiList.filter((p) => (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><UserCog className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Manajemen Pegawai</h2>
            <p className="text-sm text-gray-500">Kelola data akun dan penugasan lembaga</p>
          </div>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Cari nama pegawai..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Tambah Akun Guru</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading && !isModalOpen ? (
            <div className="py-12 flex justify-center items-center gap-2"><RefreshCw className="animate-spin text-blue-500 w-8 h-8" /><span className="text-gray-600">Memuat data...</span></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Tidak ada data pegawai.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>{["Nama Pegawai", "Role", "Lembaga", "Aksi"].map((h, i) => <th key={h} className={`px-6 py-4 font-medium uppercase ${i === 3 ? "text-center" : ""}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{p.name || "-"}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.role === "admin" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{p.role}</span></td>
                    <td className="px-6 py-4">{p.institution ? <span className="font-semibold text-gray-700">{p.institution}</span> : <span className="text-gray-400 italic">Pusat/Semua</span>}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditModal(p)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal via Portal — muncul di atas seluruh halaman */}
      {isModalOpen && (
        <ModalPortal>
          <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {modalMode === "add" ? <Plus className="w-5 h-5 text-gray-600" /> : <Edit className="w-5 h-5 text-gray-600" />}
                {modalMode === "add" ? "Buat Akun Pegawai" : "Edit Data Pegawai"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input type="text" required value={formData.name} onChange={handleNameChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Bunda Nurul" />
              </div>

              {modalMode === "add" && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Login Guru</label>
                    <div className="flex shadow-sm">
                      <input
                        type="text" required value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                        className="flex-1 px-3 py-2 rounded-l-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="bundanurul"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-200 text-gray-600 text-sm font-medium">@paudbintang.com</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                    <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Minimal 6 karakter" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Akses</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="user">User (Guru)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lembaga</label>
                  <select value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="TK">TK</option>
                    <option value="KB">KB</option>
                    <option value="TPA">TPA</option>
                    <option value="NULL">Tidak Ada (Pusat)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2">
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {modalMode === "add" ? "Simpan" : "Perbarui Data"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: { border: "border-blue-500", text: "text-blue-600", bg: "bg-blue-100" },
    green: { border: "border-green-500", text: "text-green-600", bg: "bg-green-100" },
    purple: { border: "border-purple-500", text: "text-purple-600", bg: "bg-purple-100" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-4 md:p-5 border-l-4 ${c.border} hover:shadow-xl transition-all`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs md:text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl md:text-3xl font-bold ${c.text}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl p-2 md:p-3 ${c.bg} ${c.text}`}>
          {React.cloneElement(icon, { className: "w-5 h-5 md:w-6 md:h-6" })}
        </div>
      </div>
    </div>
  );
};