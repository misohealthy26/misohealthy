import Converter from "./components/Converter";
import Waitlist from "./components/Waitlist";

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="logo-nav">
          <span className="logo-miso">miso</span>
          <span className="logo-healthy"> healthy</span>
        </div>
        <div className="nav-links">
          <a className="nav-link" href="#how">how it works</a>
          <a className="nav-link" href="#features">features</a>
          <a href="#waitlist">
            <button className="nav-cta">get early access</button>
          </a>
        </div>
      </nav>

      <Converter />

      <div className="trust-row">
        <div className="trust-item"><div className="trust-dot" /> science-backed recipes</div>
        <div className="trust-item"><div className="trust-dot" /> side-by-side nutrition</div>
        <div className="trust-item"><div className="trust-dot" /> real ingredients</div>
        <div className="trust-item"><div className="trust-dot" /> vegetarian options</div>
        <div className="trust-item"><div className="trust-dot" /> superfood upgrades</div>
      </div>

      <section id="how" className="how-section">
        <p className="section-eyebrow">HOW IT WORKS</p>
        <h2 className="section-h2">three steps to a healthier dish</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-title">Enter any dish</div>
            <div className="step-desc">Type any craving — from pad thai to lasagna. Our AI finds the most common recipe baseline.</div>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-title">We transform it</div>
            <div className="step-desc">We swap ingredients for smarter, more nutritious alternatives without losing the dish you love.</div>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-title">See the proof</div>
            <div className="step-desc">Compare calories, protein, fiber, and more — original vs. miso healthy, side by side.</div>
          </div>
          <div className="step-card">
            <div className="step-num">04</div>
            <div className="step-title">Make it yours</div>
            <div className="step-desc">Swap specific ingredients, add a superfood, or convert to vegetarian — your recipe, your way.</div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <p className="section-eyebrow">FEATURES</p>
        <h2 className="section-h2">everything your dish needs</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-chart-bar" aria-hidden /></div>
            <div className="feature-title">Nutrition comparison</div>
            <div className="feature-desc">Original vs. healthy version, calories to micronutrients, per serving.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-leaf" aria-hidden /></div>
            <div className="feature-title">Vegetarian conversion</div>
            <div className="feature-desc">Any dish, plant-based — without sacrificing flavor or nutrition.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-star" aria-hidden /></div>
            <div className="feature-title">Superfood upgrades</div>
            <div className="feature-desc">Add anti-inflammatory, gut, heart, or brain-boosting superfoods to any recipe.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-replace" aria-hidden /></div>
            <div className="feature-title">Smart ingredient swaps</div>
            <div className="feature-desc">Swap any ingredient for a convenient, healthy store-bought alternative.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-download" aria-hidden /></div>
            <div className="feature-title">Download &amp; shop</div>
            <div className="feature-desc">Save your recipe and generate a smart shopping list instantly.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="ti ti-file" aria-hidden /></div>
            <div className="feature-title">Nutrition label</div>
            <div className="feature-desc">Generate an FDA-style nutrition label for any recipe you create.</div>
          </div>
        </div>
      </section>

      <section className="quote-section">
        <p className="quote-text">
          &ldquo;The healthy choice is the easy choice. You just have to make it.&rdquo;
        </p>
        <p className="quote-attr">— DR. FELICIA STOLER</p>
      </section>

      <section id="waitlist" className="cta-section">
        <h2 className="cta-h2">be first to go miso healthy.</h2>
        <p className="cta-sub">Join the waitlist — early access coming soon.</p>
        <Waitlist />
      </section>

      <footer className="footer">
        <div className="footer-logo">
          <span style={{ color: "#0d9e92" }}>miso</span> healthy
        </div>
        <div className="footer-copy">© 2026 Miso Healthy · misohealthy.app</div>
        <div className="footer-links">
          <span>privacy</span>
          <span>terms</span>
          <span>about</span>
        </div>
      </footer>
    </>
  );
}
