export default function PresenceHistory({ presences, emailVerified, onRefresh, loading }) {
  const formatDateTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return "Format tidak valid";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Riwayat Presensi</h3>
        <button
          onClick={onRefresh}
          disabled={loading || !emailVerified}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {!emailVerified ? (
        <p className="text-yellow-600 text-center py-4 text-sm">
          Verifikasi email untuk melihat riwayat presensi
        </p>
      ) : presences.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Belum ada riwayat presensi</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {presences.map((p) => (
            <div
              key={`${p.user_id}-${p.created_at}`}
              className="bg-gray-50 p-3 rounded-lg"
            >
              <p className="text-sm text-gray-700">{formatDateTime(p.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
