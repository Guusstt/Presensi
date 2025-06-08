export default function PresenceSection({
  session,
  emailVerified,
  onSignOut,
  onMarkPresence,
  presenceLoading,
}) {
  if (!session || !session.user) {
    return null; // Atau tampilkan fallback UI jika session belum siap
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Halo!</h2>
          <p className="text-sm text-gray-600 break-all">
            {session.user.email}
          </p>
          <div className="flex items-center mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                emailVerified ? "bg-green-500" : "bg-red-500"
              }`}
              aria-label={
                emailVerified
                  ? "Email terverifikasi"
                  : "Email belum terverifikasi"
              }
              role="img"
            />
            <span className="text-xs text-gray-500">
              {emailVerified
                ? "Email terverifikasi"
                : "Email belum terverifikasi"}
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          type="button"
        >
          Logout
        </button>
      </div>

      <button
        onClick={onMarkPresence}
        disabled={presenceLoading}
        className="bg-green-600 text-white px-4 py-3 rounded-lg mb-6 hover:bg-green-700 disabled:opacity-50 w-full font-medium"
      >
        {presenceLoading ? "Mencatat..." : "Presensi Sekarang"}
      </button>
    </div>
  );
}
