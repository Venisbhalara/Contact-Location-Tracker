const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
      <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500 inline-block" />
      {title}
    </h2>
    <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

const Terms = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-700/10 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-xs text-purple-400 uppercase tracking-widest mb-5">
            Legal Document
          </span>
          <h1 className="text-4xl font-bold text-white mb-3">Terms &amp; Conditions</h1>
          <p className="text-slate-500 text-sm">
            Effective Date: <span className="text-slate-400">March 19, 2026</span> &nbsp;·&nbsp; Last Updated:{" "}
            <span className="text-slate-400">March 19, 2026</span>
          </p>
        </div>

        <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5 mb-10 flex gap-4 items-start">
          <span className="text-2xl mt-0.5">⚖️</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm mb-1">Please Read Carefully</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              By accessing or using Location Tracker, you agree to be bound by these Terms & Conditions. If you do not
              agree, do not use the Service.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-md">

          <Section title="1. Acceptance of Terms">
            <p>
              These Terms & Conditions ("Terms") govern your use of Location Tracker (the "Service"), operated by
              Location Tracker ("we", "us", "our"). By creating an account or using any part of the Service, you agree
              to these Terms in full.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Location Tracker is a web-based platform that allows registered users to generate secure tracking links
              and share them with contacts. When a contact opens the link and grants permission through their browser,
              their real-time location is transmitted to the link creator via WebSocket.
            </p>
            <p>
              The Service is designed for lawful purposes including: family safety, friend meet-ups, and personal
              coordination.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <ul className="list-disc pl-5 space-y-2">
              <li>You must be at least <strong className="text-white">13 years of age</strong> to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must provide accurate and truthful information when registering.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </Section>

          <Section title="4. Consent Obligations — Critical">
            <p>
              This is the most important section of these Terms. By using the tracking feature, you agree to the
              following consent obligations:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong className="text-white">You MUST obtain informed consent</strong> from any person whose location
                you wish to track before sending them a tracking link.
              </li>
              <li>
                You must not deceive, mislead, or pressure any person into clicking a tracking link or granting location
                permission.
              </li>
              <li>
                You acknowledge that the browser natively requests location permission — the person must click "Allow"
                for any tracking to begin. <strong className="text-white">We cannot and do not override browser
                permissions.</strong>
              </li>
              <li>
                Sending tracking links to people without their knowledge or for surveillance, stalking, or harassment
                purposes is a <strong className="text-white">violation of these Terms and may be illegal</strong> in
                your jurisdiction.
              </li>
            </ol>
            <div className="mt-3 border border-red-500/30 bg-red-500/5 rounded-xl p-4 text-xs text-red-400">
              ❌ <strong>Prohibited:</strong> Using Location Tracker to track anyone without their explicit consent.
              Violations may result in immediate account termination and may be reported to relevant authorities.
            </div>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Stalk, harass, or harm any person</li>
              <li>Track minors without parental consent</li>
              <li>Circumvent browser location permission dialogs</li>
              <li>Scrape, reverse-engineer, or exploit the Service</li>
              <li>Violate any applicable local, national, or international law</li>
              <li>Impersonate Location Tracker or any other entity</li>
              <li>Attempt unauthorized access to any part of the Service or its infrastructure</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              All content, design, code, and branding associated with Location Tracker are owned by us and protected
              by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative
              works without our written permission.
            </p>
          </Section>

          <Section title="7. Disclaimer of Warranties">
            <p>
              The Service is provided on an <strong className="text-white">"as is" and "as available" basis</strong>{" "}
              without warranties of any kind, either express or implied. We do not warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service will be uninterrupted, error-free, or secure</li>
              <li>Location data will be 100% accurate at all times (GPS accuracy depends on device)</li>
              <li>The Service will meet your specific requirements</li>
            </ul>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Location Tracker shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to loss of data,
              loss of privacy, or personal harm arising from misuse of the Service.
            </p>
            <p>
              You use the Service at your own risk. You are solely responsible for ensuring your use complies with all
              applicable laws, especially those relating to privacy and surveillance in your jurisdiction.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without
              notice, for any violation of these Terms. You may also delete your account at any time from the
              dashboard settings.
            </p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Material changes will be communicated via email or a
              prominent notice on the Service. Continued use after changes go into effect constitutes acceptance of the
              updated Terms.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws of India. Any disputes arising
              from these Terms shall be subject to the exclusive jurisdiction of the courts of India.
            </p>
          </Section>

          <Section title="12. Contact">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm">
              <p className="text-white font-medium">Location Tracker Legal Team</p>
              <p className="text-indigo-400 mt-1">📧 legal@locationtracker.app</p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
};

export default Terms;
