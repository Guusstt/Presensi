import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/client";
import AuthForm from "../components/AuthForm";
import MessageAlert from "../components/MessageAlert";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import PresenceSection from "../components/PresenceSection";
import PresenceHistory from "../components/PresenceHistory";

// Koordinat lokasi yang diizinkan
const ALLOWED_LAT = -6.5695979;
const ALLOWED_LNG = 110.6871696;
const ALLOWED_RADIUS_METERS = 100; // Radius maksimum presensi (dalam meter)

// Fungsi menghitung jarak antara dua koordinat (dalam meter)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Login() {
  const [session, setSession] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [fetchingPresences, setFetchingPresences] = useState(false);
  const [presences, setPresences] = useState([]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const signIn = async () => {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const signUp = async () => {
    if (password !== confirmPassword) {
      setMessage("Password tidak cocok.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage("Cek email Anda untuk verifikasi.");
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const resendVerification = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setMessage(error.message);
    else setMessage("Email verifikasi telah dikirim ulang.");
    setLoading(false);
  };

  const markPresence = async () => {
    setPresenceLoading(true);
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Geolocation tidak didukung di perangkat ini.");
      setPresenceLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const distance = getDistanceFromLatLonInMeters(
          latitude,
          longitude,
          ALLOWED_LAT,
          ALLOWED_LNG
        );

        if (distance > ALLOWED_RADIUS_METERS) {
          setMessage("Anda berada di luar area yang diizinkan untuk presensi.");
          setPresenceLoading(false);
          return;
        }

        const { error } = await supabase.from("presences").insert({
          user_id: session.user.id,
          latitude,
          longitude,
        });

        if (error) setMessage(error.message);
        else fetchPresences();

        setPresenceLoading(false);
      },
      (error) => {
        setMessage("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.");
        setPresenceLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchPresences = async () => {
    setFetchingPresences(true);
    const { data, error } = await supabase
      .from("presences")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setPresences(data);
    setFetchingPresences(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      isSignUp ? signUp() : signIn();
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {isSignUp ? "Daftar Akun" : "Selamat Datang"}
              </h1>
              <p className="text-gray-600">
                {isSignUp ? "Buat akun baru untuk mulai menggunakan aplikasi" : "Masuk ke akun Anda untuk melanjutkan"}
              </p>
            </div>
            
            <AuthForm
              {...{
                isSignUp,
                setIsSignUp,
                email,
                setEmail,
                password,
                setPassword,
                confirmPassword,
                setConfirmPassword,
                loading,
                showPassword,
                setShowPassword,
                handleKeyPress,
                message,
                setMessage,
                onSubmit: isSignUp ? signUp : signIn,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard Presensi</h1>
                <p className="text-sm text-gray-600">Selamat datang, {session.user.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Email Verification Banner */}
        <EmailVerificationBanner
          session={session}
          emailVerified={emailVerified}
          onResend={resendVerification}
          loading={loading}
        />

        {/* Message Alert */}
        <MessageAlert message={message} />

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Presence Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tandai Kehadiran</h2>
                <p className="text-gray-600">Klik tombol di bawah untuk mencatat kehadiran Anda hari ini</p>
              </div>

              <PresenceSection
                session={session}
                emailVerified={emailVerified}
                onSignOut={signOut}
                onMarkPresence={markPresence}
                presenceLoading={presenceLoading}
              />
            </div>
          </div>

          {/* Presence History */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Riwayat Kehadiran</h2>
                  <p className="text-sm text-gray-600">Daftar kehadiran Anda</p>
                </div>
              </div>
              
              <button
                onClick={fetchPresences}
                disabled={fetchingPresences}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${fetchingPresences ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            <PresenceHistory
              presences={presences}
              emailVerified={emailVerified}
              onRefresh={fetchPresences}
              loading={fetchingPresences}
            />
          </div>
        </div>
      </div>
    </div>
  );
}