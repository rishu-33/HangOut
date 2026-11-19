import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, User } from "lucide-react";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";
import { AuthShell, InputRow, SubmitBtn } from "../components/AuthShell";

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({ username:"", email:"", password:"", confirmPassword:"" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const r = await register({ username: form.username, email: form.email, password: form.password });
    if (r.success) { toast.success("Account created!"); navigate("/rooms"); }
    else toast.error(r.message);
  };

  return (
    <AuthShell title="Create account" subtitle="Join Hangout and create your first room">
      <form onSubmit={onSubmit} className="space-y-4">
        <InputRow icon={User}  label="Username"         type="text"     value={form.username}        onChange={set("username")}        placeholder="johndoe"            required minLength={3} maxLength={30} />
        <InputRow icon={Mail}  label="Email"            type="email"    value={form.email}           onChange={set("email")}           placeholder="you@example.com"    required />
        <InputRow icon={Lock}  label="Password"         type="password" value={form.password}        onChange={set("password")}        placeholder="Min. 6 characters"  required minLength={6} />
        <InputRow icon={Lock}  label="Confirm password" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••"           required />
        <div className="pt-1">
          <SubmitBtn loading={loading}>
            <UserPlus className="w-4.5 h-4.5" /> Create Account
          </SubmitBtn>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-white/35">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
