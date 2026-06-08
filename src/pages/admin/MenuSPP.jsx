import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CreditCard, Plus, Edit, Trash2, Download, RefreshCw,
  Search, X, ScanLine, CheckCircle, XCircle, Settings,
  QrCode, Users, Calendar, AlertCircle, Printer,
} from "lucide-react";
import { supabase } from "../../supabase/client";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const INSTITUTIONS = ["TK", "KB", "TPA"];

// ── Portal Modal ──────────────────────────────────────────────────────────────
function ModalPortal({ children }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>,
    document.body
  );
}

// ── Tab Navigation ────────────────────────────────────────────────────────────
function Tab({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center whitespace-nowrap ${
            active === t.id
              ? "bg-white text-blue-600 shadow font-semibold"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — default export (dipakai di AdminDashboard)
// ══════════════════════════════════════════════════════════════════════════════
export default function MenuSPP() {
  const [activeTab, setActiveTab]       = useState("scan");
  const [students, setStudents]         = useState([]);
  const [payments, setPayments]         = useState([]);
  const [sppSettings, setSppSettings]   = useState({ TK: 0, KB: 0, TPA: 0 });
  const [loading, setLoading]           = useState(true);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }, { data: cfg }] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("spp_payments").select("*"),
      supabase.from("spp_settings").select("*"),
    ]);
    setStudents(s || []);
    setPayments(p || []);
    if (cfg) {
      const map = {};
      cfg.forEach((r) => { map[r.institution] = r.amount; });
      setSppSettings((prev) => ({ ...prev, ...map }));
    }
    setLoading(false);
  };

  const isPaid = useCallback(
    (studentId, month, year) =>
      payments.some(
        (p) => p.student_id === studentId && p.month === month && p.year === year
      ),
    [payments]
  );

  const tabs = [
    { id: "scan",    label: "Scan Bayar",  icon: <ScanLine className="w-4 h-4" /> },
    { id: "rekap",   label: "Rekap Bulan", icon: <Calendar className="w-4 h-4" /> },
    { id: "siswa",   label: "Data Siswa",  icon: <Users className="w-4 h-4" /> },
    { id: "setting", label: "Pengaturan",  icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Pembayaran SPP</h2>
              <p className="text-sm text-gray-500">{students.length} siswa terdaftar</p>
            </div>
          </div>
          <Tab tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg py-16 flex justify-center items-center gap-2">
          <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
          <span className="text-gray-600">Memuat data...</span>
        </div>
      ) : (
        <>
          {activeTab === "scan" && (
            <TabScan
              students={students}
              payments={payments}
              setPayments={setPayments}
              isPaid={isPaid}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          )}
          {activeTab === "rekap" && (
            <TabRekap
              students={students}
              payments={payments}
              isPaid={isPaid}
              sppSettings={sppSettings}
            />
          )}
          {activeTab === "siswa" && (
            <TabSiswa
              students={students}
              setStudents={setStudents}
              fetchAll={fetchAll}
            />
          )}
          {activeTab === "setting" && (
            <TabSetting
              sppSettings={sppSettings}
              setSppSettings={setSppSettings}
            />
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SCAN BAYAR
// ══════════════════════════════════════════════════════════════════════════════
function TabScan({
  students, payments, setPayments, isPaid,
  selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
}) {
  const [scanInput, setScanInput]   = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleScan = async (nisn) => {
    if (!nisn.trim() || processing) return;
    setProcessing(true);
    const student = students.find((s) => s.nisn === nisn.trim());
    if (!student) {
      setLastResult({ status: "notfound", nisn });
      setScanInput("");
      setProcessing(false);
      inputRef.current?.focus();
      return;
    }
    if (isPaid(student.id, selectedMonth, selectedYear)) {
      setLastResult({ student, status: "already" });
      setScanInput("");
      setProcessing(false);
      inputRef.current?.focus();
      return;
    }
    const { data, error } = await supabase
      .from("spp_payments")
      .insert([{ student_id: student.id, month: selectedMonth, year: selectedYear }])
      .select()
      .single();
    if (!error && data) {
      setPayments((prev) => [...prev, data]);
      setLastResult({ student, status: "success" });
    } else {
      setLastResult({ student, status: "error" });
    }
    setScanInput("");
    setProcessing(false);
    inputRef.current?.focus();
  };

  const paidCount   = students.filter((s) => isPaid(s.id, selectedMonth, selectedYear)).length;
  const unpaidCount = students.length - paidCount;

  return (
    <div className="space-y-4">
      {/* Pilih Periode */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
          Periode Pembayaran
        </h3>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          />
        </div>

        {/* Stat mini */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{paidCount}</p>
            <p className="text-xs text-green-700 font-medium">Lunas</p>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{unpaidCount}</p>
            <p className="text-xs text-red-600 font-medium">Belum Bayar</p>
          </div>
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{students.length}</p>
            <p className="text-xs text-blue-700 font-medium">Total Siswa</p>
          </div>
        </div>
      </div>

      {/* Area Scan */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide flex items-center gap-2">
          <ScanLine className="w-4 h-4" /> Area Scan Barcode
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Arahkan scanner barcode ke field di bawah, atau ketik NISN lalu tekan Enter.
        </p>
        <div className="relative">
          <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan(scanInput)}
            placeholder="Scan barcode NISN di sini..."
            className="w-full pl-12 pr-4 py-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono outline-none"
            autoFocus
          />
        </div>
        <button
          onClick={() => handleScan(scanInput)}
          disabled={processing || !scanInput.trim()}
          className="mt-3 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          {processing
            ? <><RefreshCw className="w-4 h-4 animate-spin" />Memproses...</>
            : <><ScanLine className="w-4 h-4" />Catat Pembayaran (Enter)</>}
        </button>
      </div>

      {/* Hasil Scan */}
      {lastResult && (
        <div className={`rounded-2xl shadow-lg p-5 border-2 transition-all ${
          lastResult.status === "success"  ? "bg-green-50 border-green-400" :
          lastResult.status === "already"  ? "bg-yellow-50 border-yellow-400" :
          lastResult.status === "notfound" ? "bg-red-50 border-red-400" :
                                             "bg-gray-50 border-gray-300"
        }`}>
          {lastResult.status === "success" && (
            <div className="flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 text-lg">{lastResult.student.name}</p>
                <p className="text-sm text-green-700">NISN: {lastResult.student.nisn} · {lastResult.student.institution}</p>
                <p className="text-sm font-semibold text-green-600 mt-1">
                  ✓ Pembayaran {MONTHS[selectedMonth - 1]} {selectedYear} berhasil dicatat!
                </p>
              </div>
            </div>
          )}
          {lastResult.status === "already" && (
            <div className="flex items-center gap-4">
              <AlertCircle className="w-10 h-10 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-yellow-800 text-lg">{lastResult.student.name}</p>
                <p className="text-sm text-yellow-700">NISN: {lastResult.student.nisn} · {lastResult.student.institution}</p>
                <p className="text-sm font-semibold text-yellow-600 mt-1">
                  ⚠ Sudah lunas untuk {MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
            </div>
          )}
          {lastResult.status === "notfound" && (
            <div className="flex items-center gap-4">
              <XCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800 text-lg">Siswa Tidak Ditemukan</p>
                <p className="text-sm text-red-700">NISN: <span className="font-mono font-bold">{lastResult.nisn}</span></p>
                <p className="text-sm text-red-600 mt-1">Pastikan NISN terdaftar di sistem.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabel status */}
      <ScanStatusTable
        students={students}
        isPaid={isPaid}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  );
}

// ── Tabel Status di Tab Scan ──────────────────────────────────────────────────
function ScanStatusTable({ students, isPaid, selectedMonth, selectedYear }) {
  const [search, setSearch]           = useState("");
  const [filterInst, setFilterInst]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = students.filter((s) => {
    const matchSearch = (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search)
    );
    const matchInst   = filterInst === "all" || s.institution === filterInst;
    const paid        = isPaid(s.id, selectedMonth, selectedYear);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "paid" ? paid : !paid);
    return matchSearch && matchInst && matchStatus;
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari nama / NISN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterInst}
          onChange={(e) => setFilterInst(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">Semua Lembaga</option>
          {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="paid">Lunas</option>
          <option value="unpaid">Belum Bayar</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Nama Siswa", "NISN", "Lembaga", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada data.
                </td>
              </tr>
            ) : filtered.map((s) => {
              const paid = isPaid(s.id, selectedMonth, selectedYear);
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{s.nisn}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                      {s.institution}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {paid
                      ? <span className="flex items-center gap-1 text-green-600 font-semibold text-xs"><CheckCircle className="w-3.5 h-3.5" />Lunas</span>
                      : <span className="flex items-center gap-1 text-red-500 font-semibold text-xs"><XCircle className="w-3.5 h-3.5" />Belum Bayar</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: REKAP BULANAN
// ══════════════════════════════════════════════════════════════════════════════
function TabRekap({ students, payments, isPaid, sppSettings }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());
  const [filterInst, setFilterInst]       = useState("all");

  const filtered     = students.filter((s) => filterInst === "all" || s.institution === filterInst);
  const paidStudents = filtered.filter((s) => isPaid(s.id, selectedMonth, selectedYear));
  const totalIncome  = paidStudents.reduce((acc, s) => acc + (sppSettings[s.institution] || 0), 0);

  const exportExcel = () => {
    const rows = filtered.map((s) => ({
      "Nama Siswa":  s.name,
      "NISN":        s.nisn,
      "Lembaga":     s.institution,
      "Nominal SPP": sppSettings[s.institution] || 0,
      "Status":      isPaid(s.id, selectedMonth, selectedYear) ? "Lunas" : "Belum Bayar",
      "Bulan":       MONTHS[selectedMonth - 1],
      "Tahun":       selectedYear,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap SPP");
    XLSX.writeFile(wb, `rekap-spp-${MONTHS[selectedMonth - 1]}-${selectedYear}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("REKAP PEMBAYARAN SPP", 105, 15, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${MONTHS[selectedMonth - 1]} ${selectedYear}`, 105, 22, { align: "center" });

    const tableData = filtered.map((s, i) => [
      i + 1,
      s.name,
      s.nisn,
      s.institution,
      `Rp ${(sppSettings[s.institution] || 0).toLocaleString("id-ID")}`,
      isPaid(s.id, selectedMonth, selectedYear) ? "Lunas" : "Belum Bayar",
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["#", "Nama Siswa", "NISN", "Lembaga", "Nominal", "Status"]],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === "body") {
          data.cell.styles.textColor =
            data.cell.raw === "Lunas" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Pemasukan: Rp ${totalIncome.toLocaleString("id-ID")}`, 14, finalY);
    doc.save(`rekap-spp-${MONTHS[selectedMonth - 1]}-${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={filterInst}
              onChange={(e) => setFilterInst(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Semua Lembaga</option>
              {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
            >
              <Download className="w-4 h-4" />Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
            >
              <Download className="w-4 h-4" />PDF
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Total Siswa",   value: filtered.length,                                      cls: "blue" },
            { label: "Lunas",         value: paidStudents.length,                                  cls: "green" },
            { label: "Belum Bayar",   value: filtered.length - paidStudents.length,                cls: "red" },
            { label: "Terkumpul",     value: `Rp ${totalIncome.toLocaleString("id-ID")}`,          cls: "purple" },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`bg-${cls}-50 border border-${cls}-100 rounded-xl p-3 text-center`}>
              <p className={`text-xl font-bold text-${cls}-600 truncate`}>{value}</p>
              <p className={`text-xs text-${cls}-700`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nama Siswa", "NISN", "Lembaga", "Nominal SPP", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const paid = isPaid(s.id, selectedMonth, selectedYear);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{s.nisn}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                        {s.institution}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      Rp {(sppSettings[s.institution] || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      {paid
                        ? <span className="flex items-center gap-1 text-green-600 font-semibold text-xs"><CheckCircle className="w-3.5 h-3.5" />Lunas</span>
                        : <span className="flex items-center gap-1 text-red-500 font-semibold text-xs"><XCircle className="w-3.5 h-3.5" />Belum Bayar</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DATA SISWA
// ══════════════════════════════════════════════════════════════════════════════
function TabSiswa({ students, setStudents, fetchAll }) {
  const [search, setSearch]           = useState("");
  const [filterInst, setFilterInst]   = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode]     = useState("add");
  const [formData, setFormData]       = useState({ id: "", nisn: "", name: "", institution: "TK" });
  const [saving, setSaving]           = useState(false);
  const [qrModal, setQrModal]         = useState(null);

  const filtered = students.filter((s) => {
    const matchSearch = (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search)
    );
    return matchSearch && (filterInst === "all" || s.institution === filterInst);
  });

  const openAdd = () => {
    setFormData({ id: "", nisn: "", name: "", institution: "TK" });
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEdit = (s) => {
    setFormData({ id: s.id, nisn: s.nisn, name: s.name, institution: s.institution });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (modalMode === "add") {
      const { error } = await supabase
        .from("students")
        .insert([{ nisn: formData.nisn, name: formData.name, institution: formData.institution }]);
      if (error) { alert("Gagal: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from("students")
        .update({ nisn: formData.nisn, name: formData.name, institution: formData.institution })
        .eq("id", formData.id);
      if (error) { alert("Gagal: " + error.message); setSaving(false); return; }
    }
    await fetchAll();
    setIsModalOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus siswa "${name}"?`)) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { alert("Gagal menghapus."); return; }
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const exportBarcodesAllPDF = async () => {
    if (filtered.length === 0) return;
    
    // Setup PDF (A4, Potrait)
    const doc = new jsPDF("p", "mm", "a4");
    
    // Pengaturan Tata Letak Grid (3 Kolom, 5 Baris = 15 kartu per halaman)
    const cols = 3;
    const cardW = 62; // Lebar kartu
    const cardH = 50; // Tinggi kartu (sedikit dikurangi agar pas 5 baris)
    const marginX = 10;
    const marginY = 15;
    const gapX = 3;
    const gapY = 3;
    
    const rowsPerPage = 5;
    const itemsPerPage = cols * rowsPerPage; // 15

    for (let idx = 0; idx < filtered.length; idx++) {
      const student = filtered[idx];
      
      // Hitung posisi
      const col = idx % cols;
      const rowOnPage = Math.floor((idx % itemsPerPage) / cols);
      
      // Tambah halaman baru jika perlu
      if (idx > 0 && idx % itemsPerPage === 0) doc.addPage();
      
      const x = marginX + col * (cardW + gapX);
      const y = marginY + rowOnPage * (cardH + gapY);

      // 1. Gambar Bingkai Kartu
      doc.setDrawColor(200, 200, 200); // Abu-abu terang
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, cardW, cardH, 2, 2);

      // 2. BAGIAN ATAS: Data Siswa (Rata Tengah)
      const centerX = x + (cardW / 2);
      
      // Nama Siswa
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      // Potong nama jika terlalu panjang agar tidak merusak layout
      const nama = student.name.length > 25 ? student.name.slice(0, 25) + "…" : student.name;
      doc.text(nama, centerX, y + 8, { align: "center", maxWidth: cardW - 5 });
      
      // NISN (Teks biasa)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80); // Abu-abu gelap
      doc.text(`NISN: ${student.nisn}`, centerX, y + 13, { align: "center" });

      // Lembaga
      doc.text(`Lembaga: ${student.institution}`, centerX, y + 17, { align: "center" });

      // Garis Pemisah tipis
      doc.setDrawColor(230, 230, 230);
      doc.line(x + 5, y + 20, x + cardW - 5, y + 20);

      // 3. BAGIAN BAWAH: Barcode (Dimulai setelah data siswa)
      try {
        // Buat elemen canvas sementara di memori
        const canvas = document.createElement("canvas");
        
        // Render barcode ke canvas (Setting resolusi tinggi agar tidak pecah di PDF)
        JsBarcode(canvas, student.nisn, {
          format: "CODE128",
          displayValue: false, // Kita cetak manual angkanya di bawah
          margin: 0,
          width: 3, // Tebal garis barcode
          height: 70, // Tinggi barcode asli di canvas
        });

        const barcodeDataUrl = canvas.toDataURL("image/png");
        
        // Masukkan Barcode ke PDF (Posisikan di tengah bawah)
        // Ukuran di PDF: Lebar 52mm, Tinggi 15mm
        const barcodeWidthPDF = 52;
        const barcodeHeightPDF = 15;
        const barcodeX = x + (cardW - barcodeWidthPDF) / 2; // Hitung center x
        const barcodeY = y + 23; // Posisi Y setelah garis pemisah
        
        doc.addImage(barcodeDataUrl, "PNG", barcodeX, barcodeY, barcodeWidthPDF, barcodeHeightPDF);

        // 4. Angka NISN di bawah Barcode (Font Monospace agar mudah dibaca scannner)
        doc.setFontSize(8);
        doc.setFont("courier", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(student.nisn, centerX, barcodeY + barcodeHeightPDF + 5, { align: "center", charSpace: 1 });

      } catch (err) {
        console.error("Gagal render barcode untuk PDF:", err);
        doc.setFontSize(8);
        doc.setTextColor(255, 0, 0);
        doc.text("Gagal Load Barcode", centerX, y + 30, { align: "center" });
      }
    }
    
    // Save PDF
    const filenameInst = filterInst !== "all" ? `-${filterInst}` : "";
    doc.save(`barcode-siswa${filenameInst}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari nama / NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterInst}
            onChange={(e) => setFilterInst(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Semua</option>
            {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportBarcodesAllPDF}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak Barcode</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Nama Siswa", "NISN", "Lembaga", "Barcode", "Aksi"].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs ${i >= 3 ? "text-center" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Tidak ada data siswa.
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{s.nisn}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                      {s.institution}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setQrModal(s)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-xs font-medium"
                    >
                      <QrCode className="w-3.5 h-3.5" />Lihat
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <ModalPortal>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                {modalMode === "add" ? "Tambah Siswa" : "Edit Siswa"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Nama siswa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NISN</label>
                <input
                  type="text" required
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, "") })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  placeholder="10 digit NISN"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lembaga</label>
                <select
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {modalMode === "add" ? "Simpan" : "Perbarui"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Modal QR Code */}
      {qrModal && <QRModal student={qrModal} onClose={() => setQrModal(null)} />}
    </div>
  );
}

// ── Modal QR Code ─────────────────────────────────────────────────────────────
function QRModal({ student, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && student.nisn) {
      try {
        JsBarcode(canvasRef.current, student.nisn, {
          format: "CODE128",
          displayValue: false,
          width: 2,
          height: 60,
          margin: 10,
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("Gagal render barcode di modal:", err);
      }
    }
  }, [student.nisn]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `barcode-${student.nisn}-${student.name}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <ModalPortal>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">Barcode Siswa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <canvas ref={canvasRef} className="border border-gray-200 rounded-xl" />
          <div className="text-center">
            <p className="font-bold text-gray-800 text-lg">{student.name}</p>
            <p className="text-sm text-gray-500">NISN: <span className="font-mono font-bold">{student.nisn}</span></p>
            <p className="text-sm text-gray-500">Lembaga: {student.institution}</p>
          </div>
          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm"
          >
            <Download className="w-4 h-4" />Download PNG
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PENGATURAN SPP
// ══════════════════════════════════════════════════════════════════════════════
function TabSetting({ sppSettings, setSppSettings }) {
  const [localSettings, setLocalSettings] = useState({ ...sppSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const upserts = INSTITUTIONS.map((inst) => ({
      institution: inst,
      amount: Number(localSettings[inst]) || 0,
    }));
    const { error } = await supabase
      .from("spp_settings")
      .upsert(upserts, { onConflict: "institution" });
    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      setSppSettings({ ...localSettings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Pengaturan Nominal SPP</h3>
          <p className="text-xs text-gray-500">Atur nominal SPP per lembaga</p>
        </div>
      </div>

      <div className="space-y-4">
        {INSTITUTIONS.map((inst) => (
          <div key={inst}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SPP Lembaga {inst}
            </label>
            <div className="flex shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-sm font-medium">
                Rp
              </span>
              <input
                type="number" min={0} step={1000}
                value={localSettings[inst] || 0}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, [inst]: e.target.value }))
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
          saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {saving  ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
        {saved   ? <CheckCircle className="w-4 h-4" /> : null}
        {saving  ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Pengaturan"}
      </button>
    </div>
  );
}