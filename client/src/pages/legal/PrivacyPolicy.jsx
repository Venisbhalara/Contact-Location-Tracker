const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
      <span className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 inline-block" />
      {title}
    </h2>
    <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-indigo-700/10 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs text-indigo-400 uppercase tracking-widest mb-5">
            Legal Document
          </span>
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">
            Effective Date: <span className="text-slate-400">March 19, 2026</span> &nbsp;·&nbsp; Last Updated:{" "}
            <span className="text-slate-400">March 19, 2026</span>
          </p>
        </div>

        {/* Alert box */}
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-5 mb-10 flex gap-4 items-start">
          <span className="text-2xl mt-0.5">🔒</span>
          <div>
            <p className="text-emerald-400 font-semibold text-sm mb-1">Your Privacy Comes First</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Location Tracker <strong className="text-white">only accesses your location with your explicit, informed
              consent.</strong> You are in full control at all times. We never track you silently or without permission.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-md">

          <Section title="1. Introduction">
            <p>
              Welcome to <strong className="text-white">Location Tracker</strong> ("we", "our", "us"). This Privacy
              Policy explains how we collect, use, store, and protect your information when you use our platform at{" "}
              <span className="text-indigo-400">locationtracker.app</span> (the "Service").
            </p>
            <p>
              By using our Service, you agree to the practices described in this Privacy Policy. If you do not agree,
              please do not use the Service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-slate-300">a) Account Information:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and email address (when you register)</li>
              <li>Hashed password (never stored in plain text)</li>
            </ul>
            <p className="mt-3"><strong className="text-slate-300">b) Location Data (CONSENT-BASED ONLY):</strong></p>
            <p>
              This is the most sensitive data we handle. Location Tracker accesses your geographic location{" "}
              <strong className="text-white">ONLY when:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You receive a tracking link and <strong className="text-white">voluntarily open it</strong></li>
              <li>Your browser/device asks you to <strong className="text-white">"Allow" location access</strong> and you grant it</li>
              <li>You are actively sharing — sharing stops the moment you close the page or deny permission</li>
            </ul>
            <p className="mt-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-400">
              ⚠️ <strong className="text-white">We never access background location.</strong> Location is only streamed
              in real time while the tracking page is open and permission is granted. We do not store precise location
              history.
            </p>
            <p className="mt-3"><strong className="text-slate-300">c) Usage & Technical Data:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Browser type, operating system, and device type</li>
              <li>IP address (for security and fraud prevention)</li>
              <li>Pages visited and feature interactions (aggregate analytics only)</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-2">
              <li>To create and manage your account</li>
              <li>To generate and verify secure tracking links</li>
              <li>To stream your real-time location to the requesting party (with your consent)</li>
              <li>To send you service-related emails (account verification, password reset)</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To improve and optimize our Service</li>
            </ul>
            <p>
              We <strong className="text-white">do not sell, rent, or trade</strong> your personal information or
              location data to any third party for commercial purposes.
            </p>
          </Section>

          <Section title="4. Consent & Location Tracking — In Detail">
            <p>
              The core of our Service is <strong className="text-white">consent-first location sharing.</strong> Here is
              exactly how it works:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                A registered user generates a tracking link from their dashboard and sends it to another person.
              </li>
              <li>
                The recipient (you) opens the link in their browser. A clear notice explains that location sharing is
                being requested.
              </li>
              <li>
                The browser natively prompts: <em>"Allow [site] to access your location?"</em> — you must click{" "}
                <strong className="text-white">Allow</strong> for any sharing to begin.
              </li>
              <li>
                If you click <strong className="text-white">Block</strong> or close the page, no location is ever
                transmitted. The process ends immediately.
              </li>
              <li>
                Sharing is <strong className="text-white">real-time only</strong>. Once you close the tab or revoke
                browser permission, tracking ends instantly.
              </li>
            </ol>
          </Section>

          <Section title="5. Data Retention">
            <ul className="list-disc pl-5 space-y-2">
              <li>Account data is retained until you delete your account.</li>
              <li>Tracking requests (links) auto-expire and are purged from our database after expiry.</li>
              <li>Real-time location coordinates are <strong className="text-white">not permanently stored</strong> — they are only transmitted live via WebSocket.</li>
              <li>You may request deletion of your account and all associated data at any time by emailing us.</li>
            </ul>
          </Section>

          <Section title="6. Data Security">
            <p>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>Passwords are hashed using bcrypt before storage</li>
              <li>Tracking tokens are UUID-based and unpredictable</li>
              <li>WebSocket connections are authenticated and session-scoped</li>
            </ul>
          </Section>

          <Section title="7. Your Rights">
            <p>You have the following rights regarding your data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-slate-300">Access:</strong> Request a copy of data we hold about you</li>
              <li><strong className="text-slate-300">Correction:</strong> Ask us to correct inaccurate data</li>
              <li><strong className="text-slate-300">Deletion:</strong> Request deletion of your account and all data</li>
              <li><strong className="text-slate-300">Withdraw Consent:</strong> Stop location sharing at any time by closing the tracking page or revoking browser permission</li>
              <li><strong className="text-slate-300">Portability:</strong> Request your data in a portable format</li>
            </ul>
          </Section>

          <Section title="8. Third-Party Services">
            <p>We use the following trusted third-party services that may process limited data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-slate-300">Leaflet.js</strong> — Open-source mapping library (no data sent to Leaflet)</li>
              <li><strong className="text-slate-300">OpenStreetMap</strong> — Map tile provider (your IP may be visible when loading tiles)</li>
              <li><strong className="text-slate-300">Socket.IO</strong> — Real-time communication library</li>
            </ul>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Our Service is not directed to children under the age of 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal information, please
              contact us immediately.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by updating
              the "Last Updated" date at the top of this page. Continued use of the Service after changes constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:
            </p>
            <div className="mt-2 bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm">
              <p className="text-white font-medium">Location Tracker Support</p>
              <p className="text-indigo-400 mt-1">📧 privacy@locationtracker.app</p>
              <p className="text-slate-400 mt-1">We respond to all privacy requests within 72 hours.</p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
