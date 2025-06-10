import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/client";
import AuthForm from "../components/AuthForm";
import MessageAlert from "../components/MessageAlert";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import PresenceHistory from "../components/PresenceHistory";

// Koordinat lokasi yang diizinkan
const ALLOWED_LAT = -6.5695979;
const ALLOWED_LNG = 110.6871696;
const ALLOWED_RADIUS_METERS = 30; // Radius maksimum presensi (dalam meter)

// Konfigurasi waktu presensi
const PRESENCE_CONFIG = {
  morning: {
    start: { hour: 7, minute: 0 },
    end: { hour: 8, minute: 0 },
    label: "Pagi",
  },
  afternoon: {
    start: { hour: 12, minute: 0 },
    end: { hour: 14, minute: 0 },
    label: "Siang",
  },
};

// Fungsi menghitung jarak antara dua koordinat (dalam meter)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fungsi untuk mengecek waktu presensi yang valid
function getValidPresenceType() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Cek waktu pagi
  const morningStart =
    PRESENCE_CONFIG.morning.start.hour * 60 +
    PRESENCE_CONFIG.morning.start.minute;
  const morningEnd =
    PRESENCE_CONFIG.morning.end.hour * 60 + PRESENCE_CONFIG.morning.end.minute;

  // Cek waktu siang
  const afternoonStart =
    PRESENCE_CONFIG.afternoon.start.hour * 60 +
    PRESENCE_CONFIG.afternoon.start.minute;
  const afternoonEnd =
    PRESENCE_CONFIG.afternoon.end.hour * 60 +
    PRESENCE_CONFIG.afternoon.end.minute;

  if (currentTime >= morningStart && currentTime <= morningEnd) {
    return { type: "morning", label: PRESENCE_CONFIG.morning.label };
  } else if (currentTime >= afternoonStart && currentTime <= afternoonEnd) {
    return { type: "afternoon", label: PRESENCE_CONFIG.afternoon.label };
  }

  return null;
}

// Fungsi untuk format waktu
function formatTime(hour, minute) {
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
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
  const [currentPresenceType, setCurrentPresenceType] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  // Update current presence type setiap menit
  useEffect(() => {
    const updatePresenceType = () => {
      setCurrentPresenceType(getValidPresenceType());
    };

    updatePresenceType();
    const interval = setInterval(updatePresenceType, 60000); // Update setiap menit

    return () => clearInterval(interval);
  }, []);

  const signIn = async () => {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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

    // Cek apakah saat ini dalam waktu presensi yang valid
    const presenceType = getValidPresenceType();
    if (!presenceType) {
      const morningTime = `${formatTime(
        PRESENCE_CONFIG.morning.start.hour,
        PRESENCE_CONFIG.morning.start.minute
      )} - ${formatTime(
        PRESENCE_CONFIG.morning.end.hour,
        PRESENCE_CONFIG.morning.end.minute
      )}`;
      const afternoonTime = `${formatTime(
        PRESENCE_CONFIG.afternoon.start.hour,
        PRESENCE_CONFIG.afternoon.start.minute
      )} - ${formatTime(
        PRESENCE_CONFIG.afternoon.end.hour,
        PRESENCE_CONFIG.afternoon.end.minute
      )}`;

      setMessage(
        `Presensi hanya dapat dilakukan pada waktu yang ditentukan:\nPagi: ${morningTime}\nSiang: ${afternoonTime}`
      );
      setPresenceLoading(false);
      return;
    }

    // Cek apakah sudah presensi untuk tipe ini hari ini
    const today = new Date().toDateString();
    const todayPresences = presences.filter(
      (p) => new Date(p.created_at).toDateString() === today
    );

    const alreadyPresent = todayPresences.some(
      (p) => p.presence_type === presenceType.type
    );
    if (alreadyPresent) {
      setMessage(
        `Anda sudah melakukan presensi ${presenceType.label.toLowerCase()} hari ini.`
      );
      setPresenceLoading(false);
      return;
    }

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
          presence_type: presenceType.type, // 'morning' atau 'afternoon'
          presence_label: presenceType.label,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            `Presensi ${presenceType.label.toLowerCase()} berhasil dicatat!`
          );
          fetchPresences();
        }

        setPresenceLoading(false);
      },
      (error) => {
        setMessage(
          "Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan."
        );
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

  // Get current time and greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    if (hour < 21) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Get today's presence status
  const getTodayPresenceStatus = () => {
    const today = new Date().toDateString();
    const todayPresences = presences.filter(
      (p) => new Date(p.created_at).toDateString() === today
    );

    const morningPresence = todayPresences.find(
      (p) => p.presence_type === "morning"
    );
    const afternoonPresence = todayPresences.find(
      (p) => p.presence_type === "afternoon"
    );

    return {
      morning: !!morningPresence,
      afternoon: !!afternoonPresence,
      count: todayPresences.length,
      isComplete: morningPresence && afternoonPresence,
    };
  };

  // Get attendance summary
  const getAttendanceSummary = () => {
    const dates = {};
    presences.forEach((p) => {
      const date = new Date(p.created_at).toDateString();
      if (!dates[date]) {
        dates[date] = { morning: false, afternoon: false };
      }
      dates[date][p.presence_type] = true;
    });

    const completeDays = Object.values(dates).filter(
      (day) => day.morning && day.afternoon
    ).length;
    return { totalDays: Object.keys(dates).length, completeDays };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 space-y-6 transform hover:scale-105 transition-all duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {isSignUp ? "Daftar Akun" : "Selamat Datang"}
                </h1>
                <p className="text-gray-600 leading-relaxed">
                  {isSignUp
                    ? "Buat akun baru untuk mulai menggunakan sistem presensi"
                    : "Masuk ke akun Anda untuk melanjutkan presensi"}
                </p>
              </div>
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

  const todayStatus = getTodayPresenceStatus();
  const attendanceSummary = getAttendanceSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-white/30 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                  Dashboard Presensi
                </h1>
                <p className="text-gray-600">
                  {getCurrentGreeting()},{" "}
                  <span className="font-medium">
                    {session.user.email.split("@")[0]}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-medium">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Email Verification Banner */}
        <EmailVerificationBanner
          session={session}
          emailVerified={emailVerified}
          onResend={resendVerification}
          loading={loading}
        />

        {/* Message Alert */}
        <MessageAlert message={message} />

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Hari Ini</p>
                <p className="text-2xl font-bold">{todayStatus.count}/2</p>
                <p className="text-xs text-blue-200 mt-1">
                  {todayStatus.isComplete ? "Lengkap ✓" : "Belum Lengkap"}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Kehadiran Lengkap
                </p>
                <p className="text-2xl font-bold">
                  {attendanceSummary.completeDays}
                </p>
                <p className="text-xs text-green-200 mt-1">Hari penuh</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Total Presensi
                </p>
                <p className="text-2xl font-bold">{presences.length}</p>
                <p className="text-xs text-orange-200 mt-1">Semua catatan</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Status</p>
                <p className="text-lg font-bold">
                  {emailVerified ? "Terverifikasi" : "Pending"}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      emailVerified
                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Status Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Status Presensi Hari Ini
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-2xl border-2 ${
                todayStatus.morning
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    todayStatus.morning ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${
                      todayStatus.morning ? "text-green-600" : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Presensi Pagi</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(
                      PRESENCE_CONFIG.morning.start.hour,
                      PRESENCE_CONFIG.morning.start.minute
                    )}{" "}
                    -{" "}
                    {formatTime(
                      PRESENCE_CONFIG.morning.end.hour,
                      PRESENCE_CONFIG.morning.end.minute
                    )}
                  </p>
                  <p
                    className={`text-sm font-medium mt-1 ${
                      todayStatus.morning ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {todayStatus.morning
                      ? "✓ Sudah Presensi"
                      : "Belum Presensi"}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border-2 ${
                todayStatus.afternoon
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    todayStatus.afternoon ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${
                      todayStatus.afternoon ? "text-green-600" : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Presensi Siang</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(
                      PRESENCE_CONFIG.afternoon.start.hour,
                      PRESENCE_CONFIG.afternoon.start.minute
                    )}{" "}
                    -{" "}
                    {formatTime(
                      PRESENCE_CONFIG.afternoon.end.hour,
                      PRESENCE_CONFIG.afternoon.end.minute
                    )}
                  </p>
                  <p
                    className={`text-sm font-medium mt-1 ${
                      todayStatus.afternoon ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {todayStatus.afternoon
                      ? "✓ Sudah Presensi"
                      : "Belum Presensi"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Enhanced Presence Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-center space-y-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-2xl transform hover:rotate-12 transition-transform duration-300">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                {currentPresenceType && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                    <svg
                      className="w-3 h-3 text-yellow-800"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  Tandai Kehadiran
                </h2>
                {currentPresenceType ? (
                  <div className="space-y-2">
                    <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                      Waktu presensi{" "}
                      <strong>{currentPresenceType.label}</strong> sedang
                      berlangsung
                    </p>
                    <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {currentPresenceType.type === "morning"
                        ? `${formatTime(
                            PRESENCE_CONFIG.morning.start.hour,
                            PRESENCE_CONFIG.morning.start.minute
                          )} - ${formatTime(
                            PRESENCE_CONFIG.morning.end.hour,
                            PRESENCE_CONFIG.morning.end.minute
                          )}`
                        : `${formatTime(
                            PRESENCE_CONFIG.afternoon.start.hour,
                            PRESENCE_CONFIG.afternoon.start.minute
                          )} - ${formatTime(
                            PRESENCE_CONFIG.afternoon.end.hour,
                            PRESENCE_CONFIG.afternoon.end.minute
                          )}`}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                      Presensi hanya dapat dilakukan pada waktu yang ditentukan
                    </p>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-medium">Pagi:</span>
                        <span>
                          {formatTime(
                            PRESENCE_CONFIG.morning.start.hour,
                            PRESENCE_CONFIG.morning.start.minute
                          )}{" "}
                          -{" "}
                          {formatTime(
                            PRESENCE_CONFIG.morning.end.hour,
                            PRESENCE_CONFIG.morning.end.minute
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-medium">Siang:</span>
                        <span>
                          {formatTime(
                            PRESENCE_CONFIG.afternoon.start.hour,
                            PRESENCE_CONFIG.afternoon.start.minute
                          )}{" "}
                          -{" "}
                          {formatTime(
                            PRESENCE_CONFIG.afternoon.end.hour,
                            PRESENCE_CONFIG.afternoon.end.minute
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {emailVerified ? (
                <button
                  onClick={markPresence}
                  disabled={presenceLoading || !currentPresenceType}
                  className={`w-full py-4 px-8 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 ${
                    currentPresenceType && !presenceLoading
                      ? "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600"
                      : "bg-gradient-to-r from-gray-400 to-gray-500"
                  }`}
                >
                  {presenceLoading ? (
                    <>
                      <svg
                        className="animate-spin w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Memproses...</span>
                    </>
                  ) : currentPresenceType ? (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Catat Presensi {currentPresenceType.label}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Diluar Waktu Presensi</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <div className="flex items-center justify-center space-x-3 text-yellow-700">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">
                      Verifikasi email diperlukan untuk presensi
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Presence History */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                    Riwayat Kehadiran
                  </h2>
                  <p className="text-gray-600">Daftar lengkap presensi Anda</p>
                </div>
              </div>
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
