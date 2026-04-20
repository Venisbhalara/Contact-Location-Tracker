import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const useCounter = (end, duration = 1000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const easeOut = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(easeOut * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration]);
  return count;
};

const NumberAnimated = ({ value, color }) => {
  const n = useCounter(value);
  return (
    <div
      className="text-[40px] font-[800] leading-none"
      style={{ letterSpacing: "-2px", color }}
    >
      {n}
    </div>
  );
};

export const UserJourney = ({ journeyData }) => {
  if (!journeyData || journeyData.length === 0) return null;

  const first = journeyData[0].count;
  const last = journeyData[journeyData.length - 1].count;
  const conversionRate = first > 0 ? (last / first * 100).toFixed(1) : "0.0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full flex flex-col"
      style={{
        background: "#0d1424",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "16px",
        padding: "28px",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>User Journey</div>
        <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>At a glance — who made it through</div>
      </div>

      <div className="flex flex-col sm:flex-row w-full gap-y-6 sm:gap-y-0">
        {journeyData.map((item, index) => {
          const isLast = index === journeyData.length - 1;
          const isFirst = index === 0;
          return (
            <div
              key={item.step}
              className={`flex-1 flex flex-col ${
                !isLast ? "border-b sm:border-b-0 sm:border-r pb-4 sm:pb-0" : ""
              } border-white/[0.04]`}
              style={{
                paddingLeft: isFirst ? "0" : "16px",
                paddingRight: isLast ? "0" : "16px",
              }}
            >
              <NumberAnimated value={item.count} color={item.color} />
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                {item.step}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  marginTop: "4px",
                  color: item.drop ? "#f87171" : (item.positive ? "#34d399" : "#34d399")
                }}
              >
                {item.drop ? item.drop : item.status}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          paddingTop: "20px",
          marginTop: "24px",
        }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-2 sm:gap-y-0"
      >
        <div style={{ fontSize: "11px", color: "#334155" }}>Overall conversion · Visited → Returned</div>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#7C6FFF" }}>{conversionRate}% conversion rate</div>
      </div>
    </motion.div>
  );
};
