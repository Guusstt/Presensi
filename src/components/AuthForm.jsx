export default function AuthForm({
  isSignUp, setIsSignUp,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  loading, onSubmit,
  message, setMessage,
  showPassword, setShowPassword,
  handleKeyPress
}) {
  return (
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
          {showPassword ? "👁️" : "👁️‍🗨️"}
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

      <button
        onClick={onSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-3 rounded-lg w-full hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (isSignUp ? "Mendaftar..." : "Login...") : (isSignUp ? "Daftar" : "Login")}
      </button>

      <div className="text-center mt-4">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setMessage({ text: "", type: "" });
          }}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          disabled={loading}
        >
          {isSignUp ? "Sudah punya akun? Login di sini" : "Belum punya akun? Daftar di sini"}
        </button>
      </div>
    </div>
  );
}
