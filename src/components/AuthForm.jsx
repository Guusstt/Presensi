export default function AuthForm({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  loading,
  onSubmit,
  message,
  setMessage,
  showPassword,
  setShowPassword,
  handleKeyPress,
}) {
  return (
    // Anda menggunakan div di sini, bukan form, jadi onClick pada button sudah cukup
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
        {isSignUp ? "Daftar Akun" : "Login"}
      </h2>

      <input
        type="email"
        placeholder="Email"
        className="text-gray-800 text-base border border-gray-300 p-3 rounded-lg w-full mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
      />

      <div className="relative mb-4">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="text-gray-800 text-base border border-gray-300 p-3 rounded-lg w-full pr-10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
        >
          {/* Menggunakan emoji yang lebih konsisten antar platform */}
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>

      {isSignUp && (
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Konfirmasi Password"
          className="text-gray-800 text-base border border-gray-300 p-3 rounded-lg w-full mb-4"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      )}

      {/* =================================================== */}
      {/* TAMBAHKAN KODE INI UNTUK MENAMPILKAN PESAN ERROR */}
      {message && (
        <div className="p-3 my-3 text-center text-sm font-medium text-red-800 bg-red-100 rounded-lg">
          {message}
        </div>
      )}
      {/* =================================================== */}

      <button
        onClick={onSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-3 rounded-lg w-full hover:bg-blue-700 disabled:opacity-50"
      >
        {loading
          ? isSignUp
            ? "Mendaftar..."
            : "Login..."
          : isSignUp
          ? "Daftar"
          : "Login"}
      </button>
    </div>
  );
}