import { ArrowLeft, BookOpen, ExternalLink, FileText, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../constants";

const LAST_UPDATED = "19 August 2026";
const legalEntity = import.meta.env.VITE_LEGAL_ENTITY_NAME?.trim();
const legalEmail = import.meta.env.VITE_LEGAL_CONTACT_EMAIL?.trim();

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border p-5 sm:p-6 ${className}`}
      style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: SHADOW.card }}
    >
      {children}
    </section>
  );
}

function Section({ title, children }) {
  return (
    <section className="scroll-mt-6" aria-labelledby={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
      <h2 id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }}>
        {title}
      </h2>
      <div className="mt-2.5 space-y-3 text-sm leading-6" style={{ color: COLORS.inkMuted }}>
        {children}
      </div>
    </section>
  );
}

function BulletList({ children }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function ContactNotice() {
  if (legalEntity && legalEmail) {
    return (
      <p>
        {legalEntity} is responsible for this service. For privacy questions or requests, email{" "}
        <a className="font-semibold underline underline-offset-2" style={{ color: COLORS.primary }} href={`mailto:${legalEmail}`}>{legalEmail}</a>.
      </p>
    );
  }

  return (
    <div className="rounded-lg border px-4 py-3 text-sm leading-6" style={{ background: COLORS.warnSoft, borderColor: COLORS.warn, color: COLORS.ink }}>
      <strong>Launch requirement:</strong> this build has no configured operator name or privacy contact. Before publishing it, set <code>VITE_LEGAL_ENTITY_NAME</code> and <code>VITE_LEGAL_CONTACT_EMAIL</code> to real, monitored details. Until then, the app cannot receive privacy or legal requests through this page.
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ color: COLORS.primary, background: `${COLORS.primary}18` }}><ShieldCheck size={20} /></span>
          <div>
            <h2 style={TYPE.panelTitle}>The short version</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              Odyssey stores the study information you enter so it can show your preparation history. It does not include advertising, payments, or analytics code. Signed-in data is stored with Supabase; a local browser cache keeps the app responsive. Community accounts make a limited set of leaderboard fields visible to other signed-in users.
            </p>
          </div>
        </div>
      </Card>

      <Section title="1. What this policy covers">
        <p>This policy describes the data handling implemented by the Odyssey CAT Mock Tracker web app. It applies to the app’s account, preparation tracking, cloud-sync, backup, and community features.</p>
        <p>It does not replace the privacy notices of services you use to sign in or host the app, such as Google or Supabase. Those providers may process information under their own terms and notices.</p>
      </Section>

      <Section title="2. Information the app handles">
        <BulletList>
          <li><strong style={{ color: COLORS.ink }}>Account data:</strong> email address, authentication identifier, and the sign-in method you use. Passwords are handled by Supabase Authentication; Odyssey does not receive a readable copy of your password.</li>
          <li><strong style={{ color: COLORS.ink }}>Profile and planning data:</strong> your display name, age if supplied, CAT target year, preparation start date, current-status and gender selections, chosen test series, targets, schedules, and app preferences.</li>
          <li><strong style={{ color: COLORS.ink }}>Study data:</strong> mock results, percentiles, attempts, question analysis, notes, syllabus progress, revision history, and Quick Math progress that you enter or import.</li>
          <li><strong style={{ color: COLORS.ink }}>Browser data:</strong> local storage used for theme and view preferences, local caches, and—where configured—your sign-in session. Importing or exporting a JSON backup is initiated by you in the browser.</li>
        </BulletList>
        <p>The current app has no payment flow, advertising SDK, behavioural analytics SDK, location collection, or marketing-cookie implementation.</p>
      </Section>

      <Section title="3. Why data is used">
        <BulletList>
          <li>to create and secure your account and restore a signed-in session;</li>
          <li>to save, synchronise, calculate, and display your preparation dashboard;</li>
          <li>to provide the backup import and export features you request;</li>
          <li>to show aggregate community statistics; and</li>
          <li>to maintain, troubleshoot, and protect the service.</li>
        </BulletList>
        <p>Odyssey does not sell personal information, serve targeted ads, or use your study entries to train an AI model.</p>
      </Section>

      <Section title="4. Storage, access, and sharing">
        <p>When cloud sync is configured, Odyssey stores account and study data in Supabase. The database schema uses row-level security so normal signed-in users can access their own private records. Administrators can read profile and mock metadata needed for the administration dashboard; detailed analyses, settings, and syllabus records remain owner-only in the schema.</p>
        <p>Google Sign-In is optional. If you choose it, Google and Supabase handle the authentication flow. We do not receive your Google password.</p>
        <p>We may disclose information where required to comply with applicable law, protect people or the service, or respond to a valid legal process. A transfer of the service may also involve its data, subject to applicable law.</p>
      </Section>

      <Section title="5. Community visibility">
        <p>New accounts currently start in <strong style={{ color: COLORS.ink }}>Community</strong> mode. In that mode, the community leaderboard can show your display name, count of mocks logged in the last 30 days, and latest score. The community dashboard also shows platform-wide aggregate counts.</p>
        <p>You can change to <strong style={{ color: COLORS.ink }}>Personal</strong> in Account → Account type. Personal accounts are excluded from future leaderboard results. Do not use a display name that reveals information you do not want other signed-in Odyssey users to see.</p>
      </Section>

      <Section title="6. Retention and your choices">
        <p>Cloud records remain in the account until they are changed or deleted under the service’s retention practices. Local browser data remains until you clear browser storage, use the app’s replacement/import flows, or sign out; signing out clears account-scoped in-memory and local cached data from that browser.</p>
        <p>You can review and update many fields in Account, edit or delete mock entries, choose Personal mode, and export a JSON backup of your study data. You can also use Account → Danger zone to download a backup and permanently delete your account and cloud-synced study records. Do not treat a local browser clear as deletion of cloud-synced records.</p>
      </Section>

      <Section title="7. Security and international processing">
        <p>We use account authentication and database access controls, but no internet service can promise absolute security. Keep your credentials private, sign out of shared devices, and retain backups only where you can protect them.</p>
        <p>Supabase and Google may process data in locations outside your state or country. The deployment owner should confirm provider locations and transfer safeguards for the deployment before making jurisdiction-specific commitments.</p>
      </Section>

      <Section title="8. Children and changes">
        <p>Odyssey is a CAT preparation tool and is not directed to children. Do not provide personal information if you cannot lawfully use the service or if you need a parent or guardian’s permission and do not have it.</p>
        <p>We may update this policy when the service or its data practices change. Material changes should be shown here with an updated date and, where required, additional notice or consent.</p>
      </Section>

      <Section title="9. Contact">
        <ContactNotice />
      </Section>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ color: COLORS.primary, background: `${COLORS.primary}18` }}><FileText size={20} /></span>
          <div>
            <h2 style={TYPE.panelTitle}>Odyssey is a preparation tool, not an exam authority</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>Use it to organise and understand your own mock-test data. It does not provide admissions decisions, official CAT results, or a promise of a particular score or outcome.</p>
          </div>
        </div>
      </Card>

      <Section title="1. Acceptance">
        <p>By creating an account or using Odyssey, you agree to these Terms and the Privacy Policy. If you do not agree, do not use the service.</p>
      </Section>

      <Section title="2. The service">
        <p>Odyssey is a personal CAT mock-tracking application. It lets you record and analyse preparation information, maintain a syllabus and schedule, and, if cloud sync is configured, access the same information from a signed-in account.</p>
        <p>CAT, IIM, and test-series names may appear only as study context or user-entered source labels. This independent tool is not an official examination, admissions, coaching, or test-series service.</p>
      </Section>

      <Section title="3. Your account and data">
        <BulletList>
          <li>Provide accurate information and keep your sign-in credentials confidential.</li>
          <li>You are responsible for activity through your account and for the study data, notes, and files you add.</li>
          <li>Only upload data you have the right to use. Do not upload another person’s personal information without a lawful basis and their appropriate permission.</li>
          <li>Keep independent backups. The export feature is provided for that purpose, but you remain responsible for protecting exported files.</li>
        </BulletList>
      </Section>

      <Section title="4. Community feature">
        <p>The Community account type makes your display name, recent mock count, and latest score available on a leaderboard to other signed-in users. Accounts start in Community mode in the current build. You can select Personal mode in Account → Account type to exclude your account from future leaderboard results.</p>
        <p>Do not use the community feature to harass others, impersonate someone, disclose sensitive information, or manipulate rankings. We may limit or remove community access needed to protect the service or its users.</p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You may not misuse Odyssey, interfere with its operation, attempt to bypass account or database controls, scrape or harvest other users’ data, upload malicious material, reverse engineer the service except where law permits it, or use the service in violation of applicable law.</p>
      </Section>

      <Section title="6. Your content and service rights">
        <p>You retain any rights you have in the information you enter. You grant the service a limited right to store, process, transmit, and display that information solely to operate and improve the service, provide requested features, and meet legal obligations. This does not grant a right to sell your personal data or use it for advertising.</p>
        <p>The Odyssey name, interface, software, and non-user content are protected by applicable intellectual-property laws. These Terms give you a limited, personal, revocable right to use the service; they do not transfer ownership of it to you.</p>
      </Section>

      <Section title="7. Availability and disclaimers">
        <p>The service may change, be unavailable, or contain errors. Calculations and insights depend on the data you enter and are for study support only. Verify any score, percentile, deadline, eligibility rule, college cutoff, or admissions information against the relevant official source.</p>
        <p>To the extent permitted by applicable law, the service is provided “as is” and “as available,” without warranties that it will be uninterrupted, error-free, secure, or suitable for a particular outcome.</p>
      </Section>

      <Section title="8. Liability">
        <p>To the extent permitted by applicable law, the service operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, preparation time, opportunities, or profits arising from use of—or inability to use—the service. Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>
      </Section>

      <Section title="9. Changes, suspension, and governing law">
        <p>We may modify, suspend, or discontinue features, and may update these Terms when the service changes. Continuing to use the service after an effective update means you accept the revised Terms, where permitted by law. Material changes should be identified with a new update date and additional notice when required.</p>
        <p>The current project does not identify an operator’s legal entity or governing jurisdiction. Those details must be completed before a production launch; mandatory consumer-protection laws that apply to you remain unaffected.</p>
      </Section>

      <Section title="10. Contact">
        <ContactNotice />
      </Section>
    </>
  );
}

export function LegalLinks({ compact = false }) {
  return (
    <div className={`flex items-center ${compact ? "gap-3" : "gap-4"} text-xs`} style={{ color: COLORS.inkMuted }}>
      <a className="underline underline-offset-2 hover:opacity-75" href="#/privacy">Privacy</a>
      <a className="underline underline-offset-2 hover:opacity-75" href="#/terms">Terms</a>
    </div>
  );
}

export default function LegalPage({ page, theme, onToggleTheme }) {
  const isPrivacy = page === "privacy";
  const Icon = isPrivacy ? LockKeyhole : BookOpen;
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const description = isPrivacy
    ? "A plain-language record of the data this app actually handles."
    : "The rules for using Odyssey and its preparation features.";

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <a href="#/overview" className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-75" style={{ color: COLORS.ink }}>
            <ArrowLeft size={16} /> Odyssey
          </a>
          <button type="button" onClick={onToggleTheme} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-75" style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.ink }}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>

        <div className="mt-12 flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: COLORS.primary, color: COLORS.onPrimary }}><Icon size={23} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: COLORS.primary }}>Odyssey legal</p>
            <h1 className="mt-2" style={TYPE.pageTitle}>{title}</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>{description}</p>
            <p className="mt-3 text-xs" style={{ color: COLORS.inkMuted }}>Last updated {LAST_UPDATED}</p>
          </div>
        </div>

        <nav className="mt-8 flex items-center gap-3 border-b pb-4 text-sm" style={{ borderColor: COLORS.border }} aria-label="Legal pages">
          <a href="#/privacy" className="font-semibold" style={{ color: isPrivacy ? COLORS.primary : COLORS.inkMuted }}>Privacy Policy</a>
          <span aria-hidden="true" style={{ color: COLORS.border }}>•</span>
          <a href="#/terms" className="font-semibold" style={{ color: !isPrivacy ? COLORS.primary : COLORS.inkMuted }}>Terms of Service</a>
        </nav>

        <div className="mt-8 space-y-8">
          {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
        </div>

        <footer className="mt-12 flex items-center justify-between gap-4 border-t py-6" style={{ borderColor: COLORS.border }}>
          <span className="text-xs" style={{ color: COLORS.inkMuted }}>© {new Date().getFullYear()} Odyssey</span>
          <LegalLinks compact />
        </footer>
      </div>
    </main>
  );
}
