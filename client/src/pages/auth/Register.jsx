import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerUser, googleLogin } from "../../services/api";
import { useGoogleLogin } from '@react-oauth/google';
import toast from "react-hot-toast";

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    setLoading(true);
    try {
      const res = await registerUser(form);
      login(res.data.user, res.data.token);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const customGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await googleLogin({ access_token: tokenResponse.access_token });
        login(res.data.user, res.data.token);
        toast.success("Signed in with Google successfully!");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Google registration failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Sign-In failed.");
    }
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📍</div>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Start tracking in seconds
          </p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">Full name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="vasu"
                className="input"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                name="email"
                type="email"
                required
                placeholder="vasu@gmail.com"
                className="input"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">
                Password{" "}
                <span className="text-slate-500 font-normal">
                  (min. 6 chars)
                </span>
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="input"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">or</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>
            <button
              type="button"
              onClick={() => customGoogleLogin()}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 
                         bg-slate-800 hover:bg-slate-700 active:bg-slate-600 outline-none
                         border border-slate-700/50 hover:border-slate-500
                         rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.05)]
                         transition-all duration-300 ease-out group"
            >
              <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="font-semibold text-slate-200 tracking-wide">Continue with Google</span>
            </button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
