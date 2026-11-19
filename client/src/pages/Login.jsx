import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";
import { AuthShell, InputRow, SubmitBtn } from "../components/AuthShell";

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [form, setForm] = useState({ email:"", password:"" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    const r = await login(form);
    if (r.success) { toast.success("Welcome back!"); navigate("/rooms"); }
    else toast.error(r.message);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your rooms">
      <form onSubmit={onSubmit} className="space-y-4">
        <InputRow icon={Mail}  label="Email"    type="email"    value={form.email}    onChange={set("email")}    placeholder="you@example.com" required />
        <InputRow icon={Lock}  label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••"       required />
        <div className="pt-1">
          <SubmitBtn loading={loading}>
            <LogIn className="w-4.5 h-4.5" /> Sign In
          </SubmitBtn>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-white/35">
        No account?{" "}
        <Link to="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
