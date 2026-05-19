import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPaymentOrder, verifyPayment } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const plans = [
  {
    id: "plan_10",
    name: "Basic",
    price: 10,
    slots: 5,
    desc: "Essential tracking for individuals.",
    features: [
      "5 Secure tracking links",
      "Live GPS updates",
      "24h link expiration",
      "Standard map overlay",
      "Email support",
    ],
    color: "from-blue-600/20 to-blue-400/5",
    accent: "blue",
    border: "border-blue-500/20 hover:border-blue-500/50",
    btnColor: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20",
  },
  {
    id: "plan_20",
    name: "Professional",
    price: 20,
    slots: 15,
    desc: "Advanced features for power users.",
    features: [
      "15 Secure tracking links",
      "Priority Socket.IO sync",
      "Custom link labels",
      "Extended path history",
      "Satellite view mode",
      "Real-time alerts",
    ],
    color: "from-indigo-600/20 to-purple-600/5",
    accent: "indigo",
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    btnColor: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20",
    popular: true,
  },
  {
    id: "plan_30",
    name: "Enterprise",
    price: 30,
    slots: 25,
    desc: "Maximum capacity for high-volume tracking.",
    features: [
      "25 Secure tracking links",
      "Ultra-low latency updates",
      "Advanced accuracy overlay",
      "Priority 24/7 support",
      "API Access (Coming Soon)",
      "Multi-device sync",
    ],
    color: "from-emerald-600/20 to-teal-600/5",
    accent: "emerald",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    btnColor: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20",
  },
];

const SpotlightCard = ({ children, className, borderClassName, glowColor }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative transition-all duration-500 ${className}`}
    >
      {/* Spotlight effect layer with overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
        <div
          className="absolute -inset-px transition duration-300"
          style={{
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
            opacity,
          }}
        />
      </div>
      {children}
    </div>
  );
};

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState(0);

  const faqs = [
    {
      q: "How do tracking slots work?",
      a: "Each slot allows you to create one unique tracking link. Once the link expires or is deleted, the slot becomes available again. You can recharge anytime to add more slots to your balance.",
    },
    {
      q: "Can I use NexTrack globally?",
      a: "Yes, our GPS engine works across all borders with high precision and low latency. It leverages global satellite networks to provide real-time updates anywhere in the world.",
    },
    {
      q: "Is my tracking data secure?",
      a: "Absolutely. All tracking links are encrypted and feature automatic expiration. We use bank-grade SSL encryption to ensure your location data remains private and accessible only by you.",
    },
    {
      q: "What happens if a link expires?",
      a: "Once a link expires, it becomes inactive and the associated tracking slot is returned to your account balance, allowing you to create a new link.",
    },
  ];

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentInitiate = (planId) => {
    if (!isAuthenticated) {
      toast.error("Please login to purchase a plan");
      return;
    }
    const plan = plans.find((p) => p.id === planId);
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const processCheckout = async () => {
    if (!selectedPlan) return;
    const planId = selectedPlan.id;

    setLoading(planId);
    setShowModal(false);

    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setLoading(null);
        return;
      }

      const { data } = await createPaymentOrder({ planId });

      if (!data.success) {
        toast.error(data.message || "Something went wrong");
        setLoading(null);
        return;
      }

      const { order, key_id } = data;

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "NexTrack Location",
        description: `Recharge for ${selectedPlan.slots} locations`,
        image: "/location.png",
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment(response);
            if (verifyRes.data.success) {
              toast.success("Payment successful! Balance updated.");
              window.location.href = "/dashboard";
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error(err.response?.data?.message || "Verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Payment initialization failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 relative overflow-hidden bg-[#030307]">
      {/* Premium Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-20 bg-indigo-600/30 blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full opacity-20 bg-purple-600/20 blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Diagonal Light Streak */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rotate-12 scale-150" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Flexible Plans
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tighter leading-tight">
            Elevate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
              Tracking Experience
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg font-light leading-relaxed">
            Choose a precision-engineered plan tailored for your needs. No
            hidden fees, just pure performance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center max-w-6xl mx-auto">
          {plans.map((plan) => (
            <SpotlightCard
              key={plan.id}
              glowColor={
                plan.accent === "blue"
                  ? "rgba(59, 130, 246, 0.15)"
                  : plan.accent === "indigo"
                    ? "rgba(99, 102, 241, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
              }
              className={`group relative rounded-[2rem] border bg-white/[0.01] backdrop-blur-3xl transition-all duration-500 ${plan.border} ${plan.popular ? "lg:scale-105 z-20 shadow-2xl shadow-indigo-500/10" : "z-10"} hover:-translate-y-2`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(99,102,241,0.3)] border border-white/20 animate-bounce-subtle">
                    Most Selected
                  </div>
                </div>
              )}

              <div className="p-8 flex flex-col h-full">
                <div className="mb-8">
                  <h3 className="text-white font-black text-2xl mb-2 tracking-tight group-hover:text-indigo-400 transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    {plan.desc}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-black text-white tracking-tighter">
                      ₹{plan.price}
                    </span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      INR
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {plan.slots} High-Precision Slots
                  </div>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-slate-300 text-xs group/feat"
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${plan.accent === "indigo" ? "bg-indigo-500/10 group-hover/feat:bg-indigo-500/20" : plan.accent === "blue" ? "bg-blue-500/10 group-hover/feat:bg-blue-500/20" : "bg-emerald-500/10 group-hover/feat:bg-emerald-500/20"}`}
                      >
                        <svg
                          className={`w-2.5 h-2.5 ${plan.accent === "indigo" ? "text-indigo-400" : plan.accent === "blue" ? "text-blue-400" : "text-emerald-400"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={4}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="group-hover/feat:text-white transition-colors leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePaymentInitiate(plan.id)}
                  disabled={loading !== null}
                  className={`relative group/btn w-full py-4 rounded-xl font-black text-white overflow-hidden transition-all duration-300 active:scale-[0.97] disabled:opacity-50 ${plan.btnColor}`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300" />
                  <div className="relative flex items-center justify-center gap-2">
                    {loading === plan.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px]">Initializing...</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-widest text-[10px]">
                          Secure Purchase
                        </span>
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-24 pt-12 border-t border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                label: "Bank-Grade",
                sub: "Security",
                icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
              },
              {
                label: "Global",
                sub: "Coverage",
                icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
              },
              {
                label: "Instant",
                sub: "Activation",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
              {
                label: "Priority",
                sub: "Support",
                icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
              },
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all duration-300">
                  <svg
                    className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                </div>
                <h4 className="text-white font-bold text-xs tracking-tight">
                  {item.label}
                </h4>
                <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest mt-1">
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section Preview */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-black text-white mb-8 tracking-tight uppercase">
            Common Questions
          </h2>
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                onClick={() => setActiveFAQ(activeFAQ === i ? -1 : i)}
                className={`p-1 rounded-2xl transition-all duration-300 cursor-pointer ${activeFAQ === i ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20" : "bg-white/[0.02] hover:bg-white/[0.04]"}`}
              >
                <div
                  className={`p-5 rounded-[0.9rem] border transition-all duration-300 ${activeFAQ === i ? "bg-[#0a0a14] border-indigo-500/30" : "bg-transparent border-white/5"}`}
                >
                  <h4 className="text-white font-bold text-sm flex items-center justify-between">
                    {faq.q}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${activeFAQ === i ? "bg-indigo-500 text-white rotate-180" : "bg-white/5 text-slate-500"}`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </h4>
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${activeFAQ === i ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-slate-400 text-xs leading-relaxed text-left pb-2 pr-4 border-l-2 border-indigo-500/30 pl-4 ml-1">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Confirmation Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full max-w-md rounded-[2.5rem] p-1 shadow-[0_0_100px_rgba(99,102,241,0.2)] border border-white/10 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,20,30,0.9), rgba(10,10,20,0.95))",
            }}
          >
            {/* Modal Inner Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full" />

            <div className="relative z-10 p-6 sm:p-10">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative group">
                <div className="absolute inset-0 bg-indigo-500/30 blur-xl opacity-50 group-hover:opacity-100 transition-opacity rounded-full" />
                <svg
                  className="w-8 h-8 text-indigo-400 relative z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>

              <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tighter uppercase">
                Order Summary
              </h2>
              <p className="text-slate-400 text-center mb-8 text-xs font-medium tracking-wide">
                Review your order before proceeding to secure payment.
              </p>

              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                    Package
                  </span>
                  <span className="text-white font-black tracking-tight text-sm">
                    {selectedPlan.name} Plan
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                    Total Credits
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
                    +{selectedPlan.slots} Slots
                  </span>
                </div>
                <div className="h-px bg-white/5 my-4" />
                <div className="flex justify-between items-end">
                  <div>
                    <span className="block text-slate-500 font-bold uppercase tracking-widest text-[9px] mb-0.5">
                      Final Amount
                    </span>
                    <span className="text-indigo-400 font-black text-2xl tracking-tighter">
                      ₹{selectedPlan.price}
                    </span>
                  </div>
                  <span className="text-slate-600 text-[9px] font-bold mb-1">
                    GST INCLUDED
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={processCheckout}
                  className="w-full py-4 rounded-xl font-black bg-white text-black hover:bg-indigo-50 transition-all duration-300 active:scale-[0.98] shadow-[0_15px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[11px]"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Complete Payment
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-all duration-300 uppercase tracking-widest"
                >
                  Cancel Order
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 opacity-40">
                <div className="h-px flex-1 bg-white/10" />
                <p className="text-[8px] text-white uppercase tracking-[0.3em] font-black whitespace-nowrap">
                  Protected by SSL
                </p>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes gradient-x {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        .animate-gradient-x {
          animation: gradient-x 15s ease infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-5px) translateX(-50%); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `,
        }}
      />
    </div>
  );
};

export default Pricing;
