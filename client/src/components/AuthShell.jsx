/* Shared auth page shell */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export const AuthShell = ({ children, title, subtitle }) => (
  <div className="min-h-screen flex items-center justify-center px-4 py-12">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
      className="w-full max-w-md">

      {/* Logo */}
      <div className="mb-8">
        <Link to="/" className="font-display text-2xl text-white/80 hover:text-white/95 transition-colors">
          ← Hangout
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-7 shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        style={{ background:"rgba(16,24,38,0.95)", border:"1px solid rgba(255,255,255,0.09)" }}>
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-white/92">{title}</h1>
          <p className="mt-1 text-sm text-white/45">{subtitle}</p>
        </div>
        {children}
      </div>
    </motion.div>
  </div>
);

export const InputRow = ({ icon: Icon, label, ...props }) => (
  <div>
    {label && <label className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 pointer-events-none" />
      <input
        {...props}
        className="w-full pl-11 pr-4 py-3 rounded-xl text-[14px] text-white/85 placeholder:text-white/25 focus:outline-none transition-colors"
        style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)" }}
        onFocus={e => { e.target.style.borderColor="#c46b4a"; e.target.style.background="rgba(255,255,255,0.07)"; }}
        onBlur={e =>  { e.target.style.borderColor="rgba(255,255,255,0.09)"; e.target.style.background="rgba(255,255,255,0.05)"; }}
      />
    </div>
  </div>
);

export const SubmitBtn = ({ loading, children }) => (
  <button type="submit" disabled={loading}
    className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_20px_rgba(196,107,74,0.3)]">
    {loading
      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      : children}
  </button>
);
