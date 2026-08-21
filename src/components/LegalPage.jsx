import {
  ArrowLeft,
  BookOpen,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../constants";

const LAST_UPDATED = "20 August 2026";
const CONTACT_EMAIL = "ocegik@gmail.com";

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border p-5 sm:p-6 ${className}`}
      style={{
        background: COLORS.surface,
        borderColor: COLORS.border,
        boxShadow: SHADOW.card,
      }}
    >
      {children}
    </section>
  );
}

function Section({ title, children }) {
  return (
    <section
      className="scroll-mt-6"
      aria-labelledby={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
    >
      <h2
        id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
        className="text-lg font-bold tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }}
      >
        {title}
      </h2>
      <div
        className="mt-2.5 space-y-3 text-sm leading-6"
        style={{ color: COLORS.inkMuted }}
      >
        {children}
      </div>
    </section>
  );
}

function BulletList({ children }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function ContactNotice() {
  return (
    <p>
      OdysseyPrep is operated by an individual developer. For privacy requests,
      account issues, or questions about these terms, contact{" "}
      <a
        className="font-semibold underline underline-offset-2"
        style={{ color: COLORS.primary }}
        href={`mailto:${CONTACT_EMAIL}`}
      >
        {CONTACT_EMAIL}
      </a>
      . We aim to respond to privacy and data requests within 14 days.
    </p>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ color: COLORS.primary, background: `${COLORS.primary}18` }}
          >
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 style={TYPE.panelTitle}>The short version</h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: COLORS.inkMuted }}
            >
              OdysseyPrep stores the study information you enter so it can show your
              preparation history. We store your data with Supabase and use it
              only to operate the service — never for advertising or to train AI
              models. Community accounts share a limited set of leaderboard
              fields with other signed-in users. You can export or permanently
              delete your data at any time.
            </p>
          </div>
        </div>
      </Card>

      <Section title="1. Scope">
        <p>
          This policy explains how OdysseyPrep collects, uses, and protects your
          information across the app's account, preparation-tracking,
          cloud-sync, backup, and community features.
        </p>
        <p>
          It does not cover services you use alongside OdysseyPrep, such as Google
          or Supabase. Those providers handle information under their own
          privacy notices.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <BulletList>
          <li>
            <strong style={{ color: COLORS.ink }}>Account data:</strong> your
            email address, authentication identifier, and sign-in method.
            Passwords are handled entirely by Supabase Authentication — we never
            receive or store a readable copy of your password.
          </li>
          <li>
            <strong style={{ color: COLORS.ink }}>
              Profile and planning data:
            </strong>{" "}
            your display name, age (if supplied), CAT target year, preparation
            start date, current-status and gender selections, chosen test
            series, targets, schedules, and app preferences.
          </li>
          <li>
            <strong style={{ color: COLORS.ink }}>Study data:</strong> mock
            results, percentiles, attempts, question analysis, notes, syllabus
            progress, revision history, and Quick Math progress that you enter
            or import.
          </li>
          <li>
            <strong style={{ color: COLORS.ink }}>Local browser data:</strong>{" "}
            theme and view preferences, performance caches, and your sign-in
            session.
          </li>
        </BulletList>
        <p>
          We do not use advertising, behavioural analytics, or location
          tracking, and there is no payment flow.
        </p>
      </Section>

      <Section title="3. How we use your information">
        <BulletList>
          <li>
            to create and secure your account and restore your signed-in
            session;
          </li>
          <li>
            to save, synchronise, calculate, and display your preparation
            dashboard;
          </li>
          <li>to provide the backup import and export features you request;</li>
          <li>to show aggregate community statistics; and</li>
          <li>
            to maintain, troubleshoot, and protect the service, including
            responding to abuse.
          </li>
        </BulletList>
        <p>
          We do not sell personal information, serve targeted advertising, or
          use your study entries to train an AI model.
        </p>
      </Section>

      <Section title="4. Storage and access">
        <p>
          Account and study data are stored in Supabase under row-level
          security, so each signed-in user can access only their own private
          records.
        </p>
        <p>
          OdysseyPrep is operated by its developer, and — if the team grows — other
          members of that team. As operator, we can access account and study
          data in the ordinary course of running, maintaining, and securing the
          service. This is not a special "admin" access tier; it is what
          operating the underlying infrastructure involves. We use this access
          to maintain the service and, where necessary, to act on suspicious or
          abusive activity — including suspending or removing an account. We do
          not use this access to review your study data for any other purpose.
        </p>
        <p>
          Google Sign-In is optional. If you use it, Google and Supabase handle
          the authentication flow directly; we never receive your Google
          password.
        </p>
        <p>
          We may disclose information where required by law, to protect people
          or the service, or in response to valid legal process. If the service
          is transferred, your data may transfer with it, subject to applicable
          law.
        </p>
      </Section>

      <Section title="5. Community visibility">
        <p>
          New accounts start in{" "}
          <strong style={{ color: COLORS.ink }}>Community</strong> mode. In this
          mode, the leaderboard shows your display name, the number of mocks
          you've logged in the last 30 days, and your latest score to other
          signed-in users. The community dashboard also shows platform-wide
          aggregate counts.
        </p>
        <p>
          You can switch to{" "}
          <strong style={{ color: COLORS.ink }}>Personal</strong> mode at any
          time in Account → Account type to exclude your account from future
          leaderboard results. We recommend choosing a display name that does
          not reveal information you'd prefer to keep private.
        </p>
      </Section>

      <Section title="6. Retention, export, and deletion">
        <p>
          We retain your cloud data for as long as your account is active. Local
          browser data is cleared when you clear browser storage, use the app's
          import flow, or sign out.
        </p>
        <p>You control your data at every stage:</p>
        <BulletList>
          <li>review and update your profile and preferences in Account;</li>
          <li>edit or delete individual mock entries at any time;</li>
          <li>
            export a full JSON backup of your study data whenever you like; and
          </li>
          <li>
            permanently delete your account from Account → Danger zone. We
            recommend exporting a backup first — the deletion flow offers this
            as a built-in step. Deleting your account removes your cloud-synced
            study records and removes you from the community leaderboard.
          </li>
        </BulletList>
        <p>
          Clearing local browser storage does not delete your cloud-synced
          records — use account deletion for that.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We use authentication and database access controls to protect your
          data, in line with standard industry practice. No online service can
          guarantee absolute security, so we recommend keeping your credentials
          private, signing out on shared devices, and storing any exported
          backups securely.
        </p>
        <p>
          Supabase and Google may process data outside your country of
          residence. Where required, we rely on the safeguards those providers
          offer for cross-border data transfer.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          OdysseyPrep is intended for CAT aspirants and is not directed to children.
          Please do not use the service, or provide personal information, if you
          are not of legal age to do so in your jurisdiction without a parent or
          guardian's consent.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this policy as the service evolves. Material changes
          will be reflected here with a new "last updated" date and, where
          required by law, additional notice.
        </p>
      </Section>

      <Section title="10. Contact">
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
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ color: COLORS.primary, background: `${COLORS.primary}18` }}
          >
            <FileText size={20} />
          </span>
          <div>
            <h2 style={TYPE.panelTitle}>
              OdysseyPrep is a preparation tool, not an exam authority
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: COLORS.inkMuted }}
            >
              Use it to organise and understand your own mock-test data. It does
              not provide admissions decisions, official CAT results, or a
              promise of a particular score or outcome.
            </p>
          </div>
        </div>
      </Card>

      <Section title="1. Acceptance">
        <p>
          By creating an account or using OdysseyPrep, you agree to these Terms and
          our Privacy Policy. If you do not agree, please do not use the
          service.
        </p>
      </Section>

      <Section title="2. The service">
        <p>
          OdysseyPrep is a CAT mock-tracking application that lets you record and
          analyse preparation information, maintain a syllabus and schedule, and
          — with a signed-in account — access that information from any device.
        </p>
        <p>
          References to CAT, IIM, or specific test-series names reflect study
          context or labels you enter yourself. OdysseyPrep is an independent tool
          and is not affiliated with, or an official service of, any
          examination, admissions, or coaching body.
        </p>
      </Section>

      <Section title="3. Your account and data">
        <BulletList>
          <li>
            Provide accurate information and keep your sign-in credentials
            confidential.
          </li>
          <li>
            You're responsible for activity on your account and for the data,
            notes, and files you add.
          </li>
          <li>
            Only upload data you have the right to use, and do not upload
            another person's personal information without their permission.
          </li>
          <li>
            Keep independent backups. Our export feature is provided for this
            purpose, but you're responsible for protecting any files you export.
          </li>
        </BulletList>
      </Section>

      <Section title="4. Community feature">
        <p>
          The Community account type shares your display name, recent mock
          count, and latest score on a leaderboard visible to other signed-in
          users. New accounts start in Community mode; switch to Personal mode
          at any time in Account → Account type to exclude yourself from future
          leaderboard results.
        </p>
        <p>
          Don't use the community feature to harass others, impersonate someone,
          disclose sensitive information, or manipulate rankings. We may
          suspend, limit, or remove an account's access — including its
          community visibility — to protect the service or its users.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>
          You agree not to misuse OdysseyPrep, interfere with its operation, attempt
          to bypass account or security controls, scrape or harvest other users'
          data, upload malicious content, reverse-engineer the service beyond
          what the law permits, or use the service in violation of applicable
          law.
        </p>
      </Section>

      <Section title="6. Your content and our rights">
        <p>
          You retain ownership of the information you enter. You grant us a
          limited right to store, process, transmit, and display that
          information solely to operate and improve the service, provide the
          features you use, and meet legal obligations. This does not give us
          any right to sell your personal data or use it for advertising, and it
          ends when you delete the corresponding data or your account.
        </p>
        <p>
          The OdysseyPrep name, interface, software, and non-user content are
          protected by applicable intellectual-property law. These Terms grant
          you a limited, personal, revocable right to use the service — they do
          not transfer ownership of it to you.
        </p>
      </Section>

      <Section title="7. Availability and disclaimers">
        <p>
          The service may change, be temporarily unavailable, or contain errors.
          All calculations and insights depend on the data you enter and are
          intended for study support only — always verify scores, percentiles,
          deadlines, eligibility rules, cutoffs, or admissions information
          against the relevant official source.
        </p>
        <p>
          To the extent permitted by law, the service is provided "as is" and
          "as available," without warranty that it will be uninterrupted,
          error-free, or suitable for any particular outcome.
        </p>
      </Section>

      <Section title="8. Liability">
        <p>
          To the extent permitted by law, we are not liable for indirect,
          incidental, special, consequential, or punitive damages, or for loss
          of data, preparation time, opportunities, or profits arising from your
          use of — or inability to use — the service. Nothing in these Terms
          limits liability that cannot lawfully be limited.
        </p>
      </Section>

      <Section title="9. Changes, suspension, and governing law">
        <p>
          We may modify, suspend, or discontinue features, and may update these
          Terms as the service evolves. Continued use after an update takes
          effect means you accept the revised Terms, where permitted by law.
          Material changes will be identified with a new "last updated" date and
          additional notice where required.
        </p>
      </Section>

      <Section title="10. Contact">
        <ContactNotice />
      </Section>
    </>
  );
}

export function LegalLinks({ compact = false }) {
  return (
    <div
      className={`flex items-center ${compact ? "gap-3" : "gap-4"} text-xs`}
      style={{ color: COLORS.inkMuted }}
    >
      <a
        className="underline underline-offset-2 hover:opacity-75"
        href="#/privacy"
      >
        Privacy
      </a>
      <a
        className="underline underline-offset-2 hover:opacity-75"
        href="#/terms"
      >
        Terms
      </a>
    </div>
  );
}

export default function LegalPage({ page, theme, onToggleTheme }) {
  const isPrivacy = page === "privacy";
  const Icon = isPrivacy ? LockKeyhole : BookOpen;
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const description = isPrivacy
    ? "How OdysseyPrep collects, uses, and protects your information."
    : "The rules for using OdysseyPrep and its preparation features.";

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-10"
      style={{
        background: COLORS.bg,
        color: COLORS.ink,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <a
            href="#/overview"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-75"
            style={{ color: COLORS.ink }}
          >
            <ArrowLeft size={16} /> OdysseyPrep
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-75"
            style={{
              borderColor: COLORS.border,
              background: COLORS.surface,
              color: COLORS.ink,
            }}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>

        <div className="mt-12 flex items-start gap-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
            style={{ background: COLORS.primary, color: COLORS.onPrimary }}
          >
            <Icon size={23} />
          </span>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.16em]"
              style={{ color: COLORS.primary }}
            >
              OdysseyPrep legal
            </p>
            <h1 className="mt-2" style={TYPE.pageTitle}>
              {title}
            </h1>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: COLORS.inkMuted }}
            >
              {description}
            </p>
            <p className="mt-3 text-xs" style={{ color: COLORS.inkMuted }}>
              Last updated {LAST_UPDATED}
            </p>
          </div>
        </div>

        <nav
          className="mt-8 flex items-center gap-3 border-b pb-4 text-sm"
          style={{ borderColor: COLORS.border }}
          aria-label="Legal pages"
        >
          <a
            href="#/privacy"
            className="font-semibold"
            style={{ color: isPrivacy ? COLORS.primary : COLORS.inkMuted }}
          >
            Privacy Policy
          </a>
          <span aria-hidden="true" style={{ color: COLORS.border }}>
            •
          </span>
          <a
            href="#/terms"
            className="font-semibold"
            style={{ color: !isPrivacy ? COLORS.primary : COLORS.inkMuted }}
          >
            Terms of Service
          </a>
        </nav>

        <div className="mt-8 space-y-8">
          {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
        </div>

        <footer
          className="mt-12 flex items-center justify-between gap-4 border-t py-6"
          style={{ borderColor: COLORS.border }}
        >
          <span className="text-xs" style={{ color: COLORS.inkMuted }}>
            © {new Date().getFullYear()} OdysseyPrep
          </span>
          <LegalLinks compact />
        </footer>
      </div>
    </main>
  );
}
