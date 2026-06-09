import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

const display = { fontFamily: '"Bricolage Grotesque", system-ui, sans-serif' };

/**
 * Plain-English terms. The load-bearing clause: Gigly connects people;
 * payment happens off-platform and Gigly is not a party to the transaction.
 * Replace with counsel-reviewed terms before charging money on-platform.
 */
function Terms() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900" style={display}>
            Gig<span className="text-blue-600">ly</span>
          </span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900">← Back</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2" style={display}>Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: June 2026 · Beta terms</p>

        <div className="space-y-8 text-slate-600 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-2">
          <section>
            <h2 style={display}>1. What Gigly is (and isn't)</h2>
            <p>
              Gigly is a marketplace that connects people who post gigs ("clients") with people
              who offer to do them ("freelancers"). Gigly is a venue only. We are <strong>not</strong> a
              party to any agreement between clients and freelancers, we do not employ freelancers,
              and we do not guarantee the quality, safety, legality, or completion of any gig.
            </p>
          </section>

          <section>
            <h2 style={display}>2. Payments happen off-platform</h2>
            <p>
              Gigly does not process, hold, or escrow payments between clients and freelancers.
              When a bid is accepted, the price, payment method, and timing are agreed and settled
              <strong> directly between the parties</strong>. Gigly has no obligation or liability for
              non-payment, partial payment, refunds, or disputes. Agree on payment terms in chat
              before starting work, and keep records.
            </p>
          </section>

          <section>
            <h2 style={display}>3. Your account</h2>
            <p>
              You must be at least 18 and provide accurate information. You are responsible for
              activity on your account and for keeping your credentials secure. One person per
              account.
            </p>
          </section>

          <section>
            <h2 style={display}>4. Acceptable use</h2>
            <p>
              Don't post gigs that are illegal, deceptive, or harmful. Don't spam, scrape, harass,
              or impersonate. Don't post gigs you don't intend to pay for, or bid on work you don't
              intend to do. We may remove content or suspend accounts that break these rules, at
              our discretion, especially during beta.
            </p>
          </section>

          <section>
            <h2 style={display}>5. Content</h2>
            <p>
              You own what you post. By posting, you give Gigly a non-exclusive license to display
              that content on the platform so the service can function. Don't post content you
              don't have rights to.
            </p>
          </section>

          <section>
            <h2 style={display}>6. Disputes between users</h2>
            <p>
              Disagreements about scope, quality, or payment are between client and freelancer. We
              encourage clear scopes, milestones, and written agreement in the chat. We may, but
              are not obligated to, review reported conduct and take account-level action.
            </p>
          </section>

          <section>
            <h2 style={display}>7. No warranties; limitation of liability</h2>
            <p>
              Gigly is provided "as is", in beta, without warranties of any kind. To the maximum
              extent permitted by law, Gigly's total liability for any claim related to the service
              is limited to $100 or the amount you paid us in the past 12 months, whichever is
              greater.
            </p>
          </section>

          <section>
            <h2 style={display}>8. Changes</h2>
            <p>
              We may update these terms as the product evolves; material changes will be announced
              in-app. Continuing to use Gigly after changes take effect means you accept them.
            </p>
          </section>

          <section>
            <h2 style={display}>9. Contact</h2>
            <p>
              Questions about these terms: message us through the in-app feedback link.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Terms;
