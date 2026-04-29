import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Milestone } from "@/types";

interface Props {
  milestone: Milestone;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["#10D9A0", "#3D7FFF", "#FFB84D", "#B04DFF", "#FF4D6B"];

function Confetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random(),
    size: 4 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "-10vh", rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", rotate: p.rotate + 720, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            top: 0,
          }}
        />
      ))}
    </div>
  );
}

export default function MilestoneCelebration({ milestone, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <Confetti />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 500);
            }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="relative z-10 glass-card border border-fp-primary/40 p-8 text-center max-w-sm mx-4 glow-green"
            >
              {/* Pulsing icon */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>

              <h2 className="text-2xl font-bold text-fp-primary mb-2">
                {milestone.title}
              </h2>
              <p className="text-fp-text-2 text-sm mb-6">{milestone.message}</p>

              {/* Progress stars */}
              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="text-xl"
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>

              <button
                onClick={() => {
                  setVisible(false);
                  setTimeout(onDismiss, 500);
                }}
                className="px-6 py-2.5 bg-fp-primary text-fp-bg font-semibold rounded-xl text-sm hover:bg-fp-primary/90 transition-all"
              >
                Keep Going! 🚀
              </button>

              <p className="text-fp-text-3 text-xs mt-3">
                Auto-dismisses in a moment...
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
