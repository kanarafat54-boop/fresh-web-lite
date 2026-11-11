import "./FreshGlobalMoneyPass.css";

export function FreshGlobalMoneyPass() {
  return (
    <section className="fresh-global-pass" aria-labelledby="fresh-pass-title">
      <div className="fresh-global-pass__card">
        <div className="fresh-global-pass__top">
          <div className="fresh-global-pass__brand">
            <span className="fresh-global-pass__emblem" aria-hidden="true">F</span>
            <span><strong>FRESH</strong><small>One World. One Fresh.</small></span>
          </div>
          <div className="fresh-global-pass__global"><span aria-hidden="true">◎</span><strong>GLOBAL</strong><small>Use Anywhere, Anytime</small></div>
        </div>
        <div className="fresh-global-pass__middle">
          <div className="fresh-global-pass__identity">
            <div className="fresh-global-pass__chip" aria-hidden="true"><i/><i/><i/><i/></div>
            <span className="fresh-global-pass__contactless" aria-label="Contactless design mark">)))</span>
            <p className="fresh-global-pass__eyebrow">DIGITAL MONEY PASS</p>
            <h2 id="fresh-pass-title">Memphis Arafat</h2>
            <p className="fresh-global-pass__member">FRESH MEMBER</p>
          </div>
          <div className="fresh-global-pass__globe" aria-hidden="true"><span>🌐</span><i/><i/><i/></div>
          <div className="fresh-global-pass__coin"><span className="fresh-global-pass__coin-emblem">F</span><strong>FRESH</strong></div>
        </div>
        <div className="fresh-global-pass__currency">
          <span><small>CURRENCY</small><strong>FRESH COIN</strong></span>
          <b>1 = $100</b>
        </div>
        <div className="fresh-global-pass__features">
          <span>◈<small>Fresh Wallet</small></span><span>▣<small>Mobile Money</small></span><span>▤<small>Bank Payments</small></span><span>▰<small>Card Payments</small></span><span>▦<small>QR Payments</small></span><span>◎<small>Global Transfers</small></span>
        </div>
        <div className="fresh-global-pass__footer"><span>♙ Secure · Fast · Universal</span><span>◎ FRESH DIGITAL MONEY PASS</span></div>
      </div>
      <p className="fresh-global-pass__notice"><strong>Concept rate:</strong> 1 FRESH = $100 USD is a proposed display value only. It is not a live exchange rate, redeemable balance, reserve guarantee, or activated payment credential.</p>
    </section>
  );
}
