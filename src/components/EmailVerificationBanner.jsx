export default function EmailVerificationBanner({ session, emailVerified, onResend, loading }) {
  if (!session || emailVerified) return null;

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-yellow-700">
          Email belum diverifikasi. Silakan cek inbox untuk link verifikasi.
        </p>
        <button
          onClick={onResend}
          disabled={loading}
          className="text-yellow-700 hover:text-yellow-800 text-sm font-medium underline disabled:opacity-50"
        >
          Kirim Ulang
        </button>
      </div>
    </div>
  );
}
