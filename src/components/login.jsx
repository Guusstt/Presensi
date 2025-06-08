import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eyueihzugmafojphrfuz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dWVpaHp1Z21hZm9qcGhyZnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDY2MDAsImV4cCI6MjA2NDk4MjYwMH0.OCbtGc_GBzYF2NEnsSLUPKBSb-RZEgxctJELmWIpeMU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [presences, setPresences] = useState([]);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [fetchingPresences, setFetchingPresences] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Show message with auto-hide
  const showMessage = useCallback((text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        showMessage("Terjadi kesalahan saat mengambil sesi", "error");
      } else {
        setSession(data.session);
        if (data.session?.user) {
          setEmailVerified(data.session.user.email_confirmed_at !== null);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setEmailVerified(session.user.email_confirmed_at !== null);
      }
    });

    return () => subscription.unsubscribe();
  }, [showMessage]);

  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      showMessage("Mohon masukkan email dan password", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });
      
      if (error) {
        showMessage(`Gagal login: ${error.message}`, "error");
      } else {
        showMessage("Login berhasil!", "success");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      showMessage("Terjadi kesalahan yang tidak terduga", "error");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      showMessage("Mohon lengkapi semua field", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Password dan konfirmasi password tidak sama", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("Password minimal 6 karakter", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password
      });
      
      if (error) {
        showMessage(`Gagal mendaftar: ${error.message}`, "error");
      } else {
        showMessage("Pendaftaran berhasil! Silakan cek email untuk verifikasi akun.", "success");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setIsSignUp(false);
      }
    } catch (err) {
      showMessage("Terjadi kesalahan yang tidak terduga", "error");
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!session?.user?.email) {
      showMessage("Tidak ada email yang perlu diverifikasi", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email
      });

      if (error) {
        showMessage(`Gagal mengirim ulang verifikasi: ${error.message}`, "error");
      } else {
        showMessage("Email verifikasi telah dikirim ulang", "success");
      }
    } catch (err) {
      showMessage("Terjadi kesalahan saat mengirim ulang verifikasi", "error");
      console.error("Resend verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showMessage(`Gagal logout: ${error.message}`, "error");
      } else {
        setSession(null);
        setPresences([]);
        setEmailVerified(false);
        showMessage("Berhasil logout", "success");
      }
    } catch (err) {
      showMessage("Terjadi kesalahan saat logout", "error");
      console.error("Sign out error:", err);
    }
  };

  const markPresence = async () => {
    if (!session) {
      showMessage("Login dulu ya", "error");
      return;
    }

    if (!emailVerified) {
      showMessage("Verifikasi email terlebih dahulu untuk melakukan presensi", "error");
      return;
    }

    setPresenceLoading(true);
    try {
      const { error } = await supabase
        .from("presences")
        .insert([{ 
          user_email: session.user.email, 
          timestamp: new Date().toISOString() 
        }]);

      if (error) {
        showMessage(`Gagal mencatat presensi: ${error.message}`, "error");
      } else {
        showMessage("Presensi berhasil dicatat!", "success");
        await fetchPresences();
      }
    } catch (err) {
      showMessage("Terjadi kesalahan saat mencatat presensi", "error");
      console.error("Mark presence error:", err);
    } finally {
      setPresenceLoading(false);
    }
  };

  const fetchPresences = async () => {
    if (!session || !emailVerified) return;
    
    setFetchingPresences(true);
    try {
      const { data, error } = await supabase
        .from("presences")
        .select("*")
        .eq("user_email", session.user.email)
        .order("timestamp", { ascending: false })
        .limit(10);

      if (error) {
        showMessage(`Gagal mengambil riwayat presensi: ${error.message}`, "error");
      } else {
        setPresences(data || []);
      }
    } catch (err) {
      showMessage("Terjadi kesalahan saat mengambil riwayat", "error");
      console.error("Fetch presences error:", err);
    } finally {
      setFetchingPresences(false);
    }
  };

  useEffect(() => {
    if (session && emailVerified) {
      fetchPresences();
    } else {
      setPresences([]);
    }
  }, [session, emailVerified]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      if (isSignUp) {
        signUp();
      } else {
        signIn();
      }
    }
  };

  const formatDateTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (err) {
      return "Format tanggal tidak valid";
    }
  };

  // Message component
  const MessageAlert = ({ message, type }) => {
    if (!message.text) return null;
    
    const bgColor = {
      success: "bg-green-100 border-green-400 text-green-700",
      error: "bg-red-100 border-red-400 text-red-700",
      info: "bg-blue-100 border-blue-400 text-blue-700"
    }[type] || "bg-gray-100 border-gray-400 text-gray-700";

    return (
      <div className={`border-l-4 p-4 mb-4 ${bgColor}`}>
        <p className="text-sm">{message.text}</p>
      </div>
    );
  };

  // Email verification banner
  const EmailVerificationBanner = () => {
    if (!session || emailVerified) return null;

    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-700">
              Email belum diverifikasi. Silakan cek inbox untuk link verifikasi.
            </p>
          </div>
          <button
            onClick={resendVerification}
            disabled={loading}
            className="text-yellow-700 hover:text-yellow-800 text-sm font-medium underline disabled:opacity-50"
          >
            Kirim Ulang
          </button>
        </div>
      </div>
    );
  };

  if (!session) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
          {isSignUp ? "Daftar Akun" : "Login"}
        </h2>
        
        <MessageAlert message={message} type={message.type} />
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {isSignUp && (
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Konfirmasi Password"
              className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          )}
          
          <button
            onClick={isSignUp ? signUp : signIn}
            disabled={loading || !email.trim() || !password.trim() || (isSignUp && !confirmPassword.trim())}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full font-medium transition-colors"
          >
            {loading ? (isSignUp ? "Mendaftar..." : "Login...") : (isSignUp ? "Daftar" : "Login")}
          </button>

          <div className="text-center">
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
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Halo!</h2>
          <p className="text-sm text-gray-600">{session.user.email}</p>
          <div className="flex items-center mt-1">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${emailVerified ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-500">
              {emailVerified ? 'Email terverifikasi' : 'Email belum terverifikasi'}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>

      <EmailVerificationBanner />
      <MessageAlert message={message} type={message.type} />
      
      <button
        onClick={markPresence}
        disabled={presenceLoading || !emailVerified}
        className="bg-green-600 text-white px-4 py-3 rounded-lg mb-6 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-full font-medium transition-colors"
      >
        {presenceLoading ? "Mencatat..." : "Presensi Sekarang"}
      </button>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Riwayat Presensi</h3>
          <button
            onClick={fetchPresences}
            disabled={fetchingPresences || !emailVerified}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {fetchingPresences ? "..." : "Refresh"}
          </button>
        </div>
        
        {!emailVerified ? (
          <p className="text-yellow-600 text-center py-4 text-sm">Verifikasi email untuk melihat riwayat presensi</p>
        ) : presences.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Belum ada riwayat presensi</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {presences.map((p) => (
              <div key={p.id} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{formatDateTime(p.timestamp)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}