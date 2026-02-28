import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabase/client";

const formatToLocalDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminDashboard({ onLogout }) {
  const [presences, setPresences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    formatToLocalDateString(new Date()),
  );
  const [selectedType, setSelectedType] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: presencesData, error: presencesError } = await supabase
      .from("presences")
      .select("*")
      .order("created_at", { ascending: false });

    if (presencesError) {
      console.error("Error fetching presences:", presencesError);
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("user_details")
      .select("id, name, email, institution");

    if (profilesError) {
      console.error("Error fetching user details:", profilesError);
      setLoading(false);
      return;
    }

    if (presencesData && profilesData) {
      const profilesMap = new Map(
        profilesData.map((profile) => [profile.id, profile]),
      );
      const mergedData = presencesData.map((presence) => ({
        ...presence,
        profiles: profilesMap.get(presence.user_id) || null,
      }));
      setPresences(mergedData);
    } else {
      setPresences([]);
    }

    setUsers(profilesData || []);
    setLoading(false);
  };

  const formatDateTime = (d) =>
    new Date(d).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const isPresenceValid = (presence) => {
    const presenceDate = formatToLocalDateString(presence.created_at);
    const userId = presence.user_id;

    const sameDayPresences = presences.filter(
      (p) =>
        p.user_id === userId &&
        formatToLocalDateString(p.created_at) === presenceDate,
    );

    const hasMorning = sameDayPresences.some(
      (p) => p.presence_type === "morning",
    );
    const hasAfternoon = sameDayPresences.some(
      (p) => p.presence_type === "afternoon",
    );

    return hasMorning && hasAfternoon;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
    });

  const exportToExcel = () => {
    const filtered = getFilteredPresences();
    const exportData = filtered.map((p) => ({
      Tanggal: formatDate(p.created_at),
      Waktu: new Date(p.created_at).toLocaleTimeString("id-ID"),
      "Nama Guru": p.profiles?.name || "N/A",
      Email: p.profiles?.email || "N/A",
      "Jenis Presensi": p.presence_label,
      Latitude: p.latitude,
      Longitude: p.longitude,
      "Jarak (meter)": p.distance ?? "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presensi Guru");
    const fileName = `presensi-guru-${selectedDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportMonthlyRecapToPDF = async () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate(); //
    const institutions = ["KB", "TK", "TPA"]; //

    const principals = {
      TK: "Triyanto",
      KB: "Bunda Nur",
      TPA: "Bunda Wid",
    };

    const doc = new jsPDF("l", "mm", [215, 330]);
    const pageWidth = 330;
    const namaBulan = new Date(0, selectedMonth - 1).toLocaleString("id-ID", {
      month: "long",
    });

    for (let i = 0; i < institutions.length; i++) {
      const inst = institutions[i];
      const principalName = principals[inst];

      if (i > 0) doc.addPage("l", "mm", [215, 330]);

      const filteredUsers = users.filter((u) => u.institution === inst);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(
        `LAPORAN MATRIKS PRESENSI - LEMBAGA ${inst}`,
        pageWidth / 2,
        15,
        { align: "center" },
      );

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Periode: ${namaBulan} ${selectedYear}`, 14, 22);

      if (filteredUsers.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text(
          `(Tidak ada data guru untuk lembaga ${inst})`,
          pageWidth / 2,
          40,
          { align: "center" },
        );
        continue;
      }

      const headRow = ["Nama Guru"];
      for (let day = 1; day <= daysInMonth; day++) headRow.push(String(day));

      const tableBody = [];
      const qrMatrix = [];

      const presencesThisMonth = presences.filter((p) => {
        const d = new Date(p.created_at);
        return (
          d.getMonth() + 1 === Number(selectedMonth) &&
          d.getFullYear() === Number(selectedYear)
        );
      });

      for (const user of filteredUsers) {
        const row = [user.name || user.email];
        const qrRow = [null];

        for (let day = 1; day <= daysInMonth; day++) {
          const isPresent = presencesThisMonth.find(
            (p) =>
              p.user_id === user.id && new Date(p.created_at).getDate() === day,
          );

          if (isPresent) {
            const qrContent = `TTD|${user.name}|${day}/${selectedMonth}`;
            try {
              const qrDataUrl = await QRCode.toDataURL(qrContent, {
                margin: 0,
                width: 50,
                errorCorrectionLevel: "L",
              });
              qrRow.push(qrDataUrl);
              row.push("");
            } catch (e) {
              qrRow.push(null);
              row.push("Err");
            }
          } else {
            qrRow.push(null);
            row.push("-");
          }
        }
        tableBody.push(row);
        qrMatrix.push(qrRow);
      }

      autoTable(doc, {
        startY: 28,
        margin: { left: 10, right: 10 },
        head: [headRow],
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 7,
          halign: "center",
          valign: "middle",
          minCellHeight: 10,
          cellPadding: 0.5,
        },
        columnStyles: { 0: { cellWidth: 35, halign: "left" } },
        didDrawCell: function (data) {
          if (data.section === "body" && data.column.index > 0) {
            const qrBase64 = qrMatrix[data.row.index][data.column.index];
            if (qrBase64) {
              const dim = Math.min(data.cell.width, data.cell.height) - 1.5;
              const x = data.cell.x + (data.cell.width - dim) / 2;
              const y = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(qrBase64, "PNG", x, y, dim, dim);
            }
          }
        },
      });

      let finalY = doc.lastAutoTable.finalY + 12;
      const startX = 280;

      if (finalY + 45 > 200) {
        doc.addPage("l", "mm", [215, 330]);
        finalY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Jepara, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
        startX,
        finalY,
        { align: "center" },
      );
      doc.text("Kepala Sekolah,", startX, finalY + 5, { align: "center" });

      const principalQR = await QRCode.toDataURL(
        `SAH|${principalName}|${inst}|${selectedMonth}-${selectedYear}`,
        { width: 100 },
      );
      doc.addImage(principalQR, "PNG", startX - 11, finalY + 7, 22, 22);

      doc.setFont("helvetica", "bold");
      doc.text(principalName, startX, finalY + 35, { align: "center" });

      doc.line(startX - 20, finalY + 36, startX + 20, finalY + 36);
    }

    doc.save(`Laporan-Presensi-Lengkap-${namaBulan}-${selectedYear}.pdf`);
  };

  const getFilteredPresences = () =>
    presences.filter((p) => {
      const presenceDate = formatToLocalDateString(p.created_at);
      const matchDate = selectedDate === "" || presenceDate === selectedDate;
      const matchType =
        selectedType === "all" || p.presence_type === selectedType;
      const matchUser = selectedUser === "all" || p.user_id === selectedUser;

      const matchInstitution =
        selectedInstitution === "all" ||
        p.profiles?.institution === selectedInstitution;

      const userName = p.profiles?.name || "";
      const userEmail = p.profiles?.email || "";
      const matchSearch =
        searchTerm === "" ||
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userEmail.toLowerCase().includes(searchTerm.toLowerCase());

      return (
        matchDate && matchType && matchUser && matchSearch && matchInstitution
      );
    });

  const getStats = () => {
    const todayStr = formatToLocalDateString(new Date());
    const todayP = presences.filter(
      (p) => formatToLocalDateString(p.created_at) === todayStr,
    );
    const uniq = new Set(todayP.map((p) => p.user_id));
    return {
      totalToday: todayP.length,
      uniqueUsers: uniq.size,
      totalUsers: users.length,
    };
  };

  const getMonthlyRecap = () => {
    const recapMap = new Map();
    presences.forEach((p) => {
      const date = new Date(p.created_at);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      if (month === Number(selectedMonth) && year === Number(selectedYear)) {
        const userId = p.user_id;
        if (!recapMap.has(userId)) {
          recapMap.set(userId, { user: p.profiles, count: 1 });
        } else {
          recapMap.get(userId).count += 1;
        }
      }
    });
    return Array.from(recapMap.values()).sort((a, b) => b.count - a.count);
  };

  const stats = getStats();
  const filteredPresences = getFilteredPresences();
  const monthlyRecap = getMonthlyRecap();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2 md:p-3" />
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Sistem Presensi Guru
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto justify-center"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            title="Presensi Hari Ini"
            value={stats.totalToday}
            icon={<Clock />}
            color="blue"
          />
          <StatCard
            title="Guru Hadir Hari Ini"
            value={stats.uniqueUsers}
            icon={<Users />}
            color="green"
          />
          <StatCard
            title="Total Guru Terdaftar"
            value={stats.totalUsers}
            icon={<Users />}
            color="purple"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 w-full">
              <div className="relative w-full md:w-auto md:flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari nama / email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
                <div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Semua Lembaga</option>
                    <option value="KB">KB</option>
                    <option value="TK">TK</option>
                    <option value="TPA">TPA</option>
                  </select>
                </div>

                <div>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Semua Guru</option>
                    {users
                      .filter(
                        (u) =>
                          selectedInstitution === "all" ||
                          u.institution === selectedInstitution,
                      ) // Filter list guru sesuai lembaga
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Semua Guru</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 md:p-6 border-b">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Data Presensi ({filteredPresences.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex justify-center items-center gap-2">
                <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
                <span className="text-gray-600">Memuat data...</span>
              </div>
            ) : filteredPresences.length === 0 ? (
              <div className="py-12 text-center">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Tidak ada data presensi yang ditemukan.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guru
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lokasi & Jarak
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPresences.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">
                          {p.profiles?.name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[120px] md:max-w-none">
                          {p.profiles?.email || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-700">
                        {p.created_at ? (
                          <div className="flex flex-col">
                            <span>
                              {new Date(p.created_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                            <span className="text-xs text-gray-400 md:hidden">
                              {new Date(p.created_at).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short" },
                              )}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            p.presence_type === "morning"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {p.presence_label}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500">
                        <div>Lat: {p.latitude?.toFixed(5) || "N/A"}</div>
                        <div>Lng: {p.longitude?.toFixed(5) || "N/A"}</div>
                        {p.distance != null && (
                          <div className="text-xs text-blue-500 font-semibold">
                            Jarak: {p.distance}m
                          </div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        {isPresenceValid(p) ? (
                          <span className="flex items-center text-green-700">
                            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                            <span className="hidden sm:inline">Valid</span>
                          </span>
                        ) : (
                          <span className="flex items-center text-red-700">
                            <XCircle className="w-4 h-4 mr-1 text-red-500" />
                            <span className="hidden sm:inline">Invalid</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-6">
          <div className="p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Rekap Bulanan
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                Data periode terpilih
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Tahun"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Guru
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlyRecap.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  monthlyRecap.map((r, index) => (
                    <tr key={r.user?.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap font-bold text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 truncate max-w-[150px] md:max-w-none">
                          {r.user?.name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-none">
                          {r.user?.email || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap font-bold text-lg text-blue-600">
                        {r.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 md:p-6 border-t flex justify-end">
            <button
              onClick={exportMonthlyRecapToPDF}
              disabled={monthlyRecap.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:bg-gray-400 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Cetak Laporan PDF</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: {
      border: "border-blue-500",
      text: "text-blue-600",
      bg: "bg-blue-100",
    },
    green: {
      border: "border-green-500",
      text: "text-green-600",
      bg: "bg-green-100",
    },
    purple: {
      border: "border-purple-500",
      text: "text-purple-600",
      bg: "bg-purple-100",
    },
  };
  const c = colors[color] || colors.blue;

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-4 md:p-5 border-l-4 ${c.border}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs md:text-sm font-medium text-gray-600">
            {title}
          </p>
          <p className={`text-2xl md:text-3xl font-bold ${c.text}`}>{value}</p>
        </div>
        <div
          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl p-2 md:p-3 ${c.bg} ${c.text}`}
        >
          {React.cloneElement(icon, { className: "w-5 h-5 md:w-6 md:h-6" })}
        </div>
      </div>
    </div>
  );
};
