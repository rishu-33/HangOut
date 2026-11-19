import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Lock, MessageSquare, Gamepad2, Zap, Shield } from "lucide-react";

const features = [
  { icon: Lock,         title: "Private Rooms",    desc: "Password-protected spaces only your circle can access." },
  { icon: MessageSquare,title: "Real-time Chat",   desc: "Instant messages, reactions, GIFs, file sharing and @mentions." },
  { icon: Gamepad2,     title: "Play Together",    desc: "Built-in Tic-Tac-Toe and Rock Paper Scissors." },
  { icon: Zap,          title: "Voice Chat",       desc: "Crystal-clear peer-to-peer voice calls inside any room." },
  { icon: Shield,       title: "Safe & Simple",    desc: "No tracking, no ads — just your people." },
  { icon: Users,        title: "Members Panel",    desc: "See who's online, copy the room code and invite friends." },
];

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen text-primary overflow-x-hidden">

      {/* NAV */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto"
        style={{ backdropFilter:"blur(20px)" }}>
        <motion.span initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}}
          className="font-display text-2xl text-white/90">
          Hangout
        </motion.span>
        <motion.div initial={{opacity:0,x:16}} animate={{opacity:1,x:0}}
          className="flex items-center gap-3">
          <button onClick={() => navigate("/login")}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
            Sign in
          </button>
          <button onClick={() => navigate("/register")}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-colors">
            Get started
          </button>
        </motion.div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background:"rgba(196,107,74,0.12)", border:"1px solid rgba(196,107,74,0.25)", color:"#d4845e" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live now — real-time messaging
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-medium leading-[1.08] tracking-tight mb-6">
            Your private space<br />
            <span style={{ color:"rgba(255,255,255,0.35)" }}>to connect</span>
          </h1>

          <p className="text-lg leading-relaxed max-w-xl mx-auto mb-10"
            style={{ color:"rgba(255,255,255,0.50)" }}>
            Create intimate rooms for your closest friends — chat, share files,
            react with emojis, and play games together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-[0_8px_24px_rgba(196,107,74,0.35)]">
              <Users className="w-5 h-5" />
              Create your room
            </button>
            <button onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-8 py-3.5 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.80)" }}>
              <Lock className="w-5 h-5" />
              Join a room
            </button>
          </div>
        </motion.div>
      </section>

      {/* PREVIEW CARD */}
      <motion.section initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{delay:0.3,duration:0.7}}
        className="max-w-3xl mx-auto px-6 mb-28">
        <div className="rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
          style={{ background:"#0e1a2e", border:"1px solid rgba(255,255,255,0.08)" }}>
          {/* Fake header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]"
            style={{ background:"rgba(16,25,42,0.9)" }}>
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 text-center text-[12px] font-medium text-white/40">hangout — friends room</div>
          </div>
          {/* Fake messages */}
          <div className="px-6 py-5 space-y-4">
            {[
              { own:false, name:"alex",  msg:"hey everyone! 👋",    time:"2m ago" },
              { own:false, name:"priya", msg:"omg finally you're here 🔥", time:"1m ago" },
              { own:true,  name:"you",   msg:"let's play a game?",  time:"just now" },
            ].map((m,i) => (
              <div key={i} className={`flex items-end gap-2.5 ${m.own ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: m.own ? "#c46b4a" : "rgba(255,255,255,0.1)" }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  {!m.own && <p className="text-[11px] font-semibold mb-0.5 ml-0.5" style={{color:"rgba(255,255,255,0.7)"}}>{m.name}</p>}
                  <div className={`px-4 py-2 rounded-[16px] text-[13px] leading-relaxed ${
                    m.own
                      ? "rounded-br-[4px] text-white"
                      : "rounded-bl-[4px] text-white/85"
                    }`}
                    style={{ background: m.own ? "#c46b4a" : "rgba(255,255,255,0.08)", border: m.own ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                    {m.msg}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Fake input */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px]"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)" }}>
              Message your friends…
            </div>
          </div>
        </div>
      </motion.section>

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
          className="text-center mb-14">
          <h2 className="font-display text-4xl mb-3">Everything you need</h2>
          <p className="text-white/45 text-base max-w-md mx-auto">Built for small groups who value privacy and simplicity.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.5+i*0.07}}
              className="p-5 rounded-2xl"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background:"rgba(196,107,74,0.12)", border:"1px solid rgba(196,107,74,0.2)" }}>
                <f.icon className="w-5 h-5" style={{ color:"#c46b4a" }} />
              </div>
              <h3 className="font-semibold text-white/90 mb-1.5">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/45">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-6 py-8" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <span>© 2026 Hangout. Built for real connections.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
