// Botanical-style SVG food illustrations
// Bold outline + natural color fills, each on a circular disc background

export const FOOD_ITEMS = [
  { id: "miso",        label: "Miso",        Component: MisoSvg },
  { id: "garlic",      label: "Garlic",       Component: GarlicSvg },
  { id: "ginger",      label: "Ginger",       Component: GingerSvg },
  { id: "avocado",     label: "Avocado",      Component: AvocadoSvg },
  { id: "blueberries", label: "Blueberries",  Component: BlueberriesSvg },
  { id: "mangosteen",  label: "Mangosteen",   Component: MangosteenSvg },
  { id: "turmeric",    label: "Turmeric",     Component: TurmericSvg },
  { id: "kale",        label: "Kale",         Component: KaleSvg },
];

export function SuperfoodsSection() {
  return (
    <section className="superfoods-section">
      <p className="superfoods-eyebrow">whole food intelligence</p>
      <h2 className="superfoods-heading">
        superfoods, built in.
      </h2>
      <p className="superfoods-sub">
        From fermented miso to anti-inflammatory turmeric — our swaps draw from
        the world&apos;s most nutrient-dense ingredients.
      </p>
      <div className="superfoods-grid">
        {FOOD_ITEMS.map(({ id, label, Component }) => (
          <div key={id} className="superfood-tile">
            <div className="superfood-tile-img">
              <Component />
            </div>
            <span className="superfood-tile-label">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── individual SVGs ───────────────────────────────────── */

function MisoSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#faf0e0" />
      {/* bowl body */}
      <path
        d="M 20 46 Q 20 78 50 80 Q 80 78 80 46 Z"
        fill="#c07830"
        stroke="#6a3c10"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* bowl interior shadow */}
      <path
        d="M 24 46 Q 24 74 50 76 Q 76 74 76 46 Z"
        fill="#a86020"
      />
      {/* miso paste surface */}
      <ellipse cx="50" cy="46" rx="30" ry="9" fill="#7a2c10" stroke="#6a3c10" strokeWidth="1.4" />
      {/* paste texture */}
      <path d="M 30 44 C 36 41 44 42 50 44 C 56 46 64 44 70 42" stroke="#5a1c08" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M 34 47 C 40 44 48 45 54 47 C 60 49 64 47 68 46" stroke="#5a1c08" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* rim highlight */}
      <ellipse cx="50" cy="46" rx="30" ry="9" stroke="#e0a060" strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* bowl shine */}
      <path d="M 24 54 Q 22 60 22 68" stroke="#e8aa60" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* steam wisps */}
      <path d="M 38 34 Q 35 26 39 19" stroke="#c8bca8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M 50 32 Q 47 22 51 16" stroke="#c8bca8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M 62 34 Q 63 24 61 18" stroke="#c8bca8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

function GarlicSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#faf5ea" />
      {/* main bulb */}
      <path
        d="M 50 22 C 35 22 22 32 21 46 C 19 60 27 74 40 80 C 43 81 47 83 50 83 C 53 83 57 81 60 80 C 73 74 81 60 79 46 C 78 32 65 22 50 22 Z"
        fill="#f4eedd"
        stroke="#2a1f10"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* clove division lines */}
      <path d="M 50 24 L 50 81" stroke="#c8ad88" strokeWidth="1.1" />
      <path d="M 38 32 C 39 50 39 66 41 79" stroke="#c8ad88" strokeWidth="1" />
      <path d="M 62 32 C 61 50 61 66 59 79" stroke="#c8ad88" strokeWidth="1" />
      <path d="M 30 50 C 31 60 33 70 37 77" stroke="#c8ad88" strokeWidth="0.9" />
      <path d="M 70 50 C 69 60 67 70 63 77" stroke="#c8ad88" strokeWidth="0.9" />
      {/* root base */}
      <path d="M 38 81 Q 50 88 62 81" stroke="#a88860" strokeWidth="1.4" fill="none" />
      {/* tiny roots */}
      <path d="M 44 85 L 43 90" stroke="#a88860" strokeWidth="0.8" />
      <path d="M 50 87 L 50 93" stroke="#a88860" strokeWidth="0.8" />
      <path d="M 56 85 L 57 90" stroke="#a88860" strokeWidth="0.8" />
      {/* stem */}
      <path
        d="M 48 22 C 47 16 48 10 50 8 C 52 10 53 16 52 22 Z"
        fill="#8a7a40"
        stroke="#2a1f10"
        strokeWidth="1.2"
      />
      {/* papery skin highlight */}
      <path d="M 33 48 C 36 40 42 30 48 25" stroke="#e8dcc0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* skin fold */}
      <path d="M 56 26 C 62 30 66 36 68 44" stroke="#ddd0b0" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function GingerSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#faf5ea" />
      {/* main root body */}
      <path
        d="M 18 54 C 18 45 25 38 35 37 C 40 36 45 38 50 40 C 54 36 62 32 70 34 C 78 36 84 45 82 54 C 80 62 72 66 64 64 C 59 68 52 70 44 69 C 32 68 18 64 18 54 Z"
        fill="#d4a040"
        stroke="#2a1808"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* upper knob */}
      <path
        d="M 62 34 C 63 26 65 18 62 14 C 60 12 56 14 55 18 C 54 23 55 30 57 36"
        fill="#d4a040"
        stroke="#2a1808"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* left lower knob */}
      <path
        d="M 32 66 C 29 73 26 80 28 84 C 30 87 36 85 38 81 C 40 77 40 71 38 67"
        fill="#d4a040"
        stroke="#2a1808"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* right lower knob */}
      <path
        d="M 66 63 C 68 70 68 78 66 82 C 64 84 60 83 59 79 C 58 75 60 69 63 65"
        fill="#d4a040"
        stroke="#2a1808"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* skin ring lines */}
      <path d="M 24 52 C 28 49 34 49 38 52" stroke="#a87828" strokeWidth="0.95" fill="none" />
      <path d="M 44 45 C 49 42 55 42 60 45" stroke="#a87828" strokeWidth="0.95" fill="none" />
      <path d="M 64 48 C 68 46 72 47 75 50" stroke="#a87828" strokeWidth="0.95" fill="none" />
      <path d="M 57 38 C 59 36 62 34 62 32" stroke="#a87828" strokeWidth="0.8" fill="none" />
      <path d="M 30 62 C 28 66 28 70 30 74" stroke="#a87828" strokeWidth="0.8" fill="none" />
      {/* cut section highlight */}
      <path d="M 20 52 C 22 47 24 44 26 46" stroke="#f0c060" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function AvocadoSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#f0f8e8" />
      {/* outer skin */}
      <path
        d="M 50 16 C 50 16 35 22 28 38 C 22 52 24 70 36 80 C 40 83 45 85 50 85 C 55 85 60 83 64 80 C 76 70 78 52 72 38 C 65 22 50 16 50 16 Z"
        fill="#285c14"
        stroke="#162e0a"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* inner flesh */}
      <path
        d="M 50 22 C 50 22 38 28 32 42 C 27 55 29 70 38 78 C 41 80 46 82 50 82 C 54 82 59 80 62 78 C 71 70 73 55 68 42 C 62 28 50 22 50 22 Z"
        fill="#c8de58"
      />
      {/* flesh highlight — lighter near top */}
      <path d="M 44 26 C 40 34 37 44 36 54" stroke="#daf070" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* pit */}
      <ellipse cx="50" cy="60" rx="14" ry="15" fill="#7a3c10" stroke="#4a2008" strokeWidth="1.4" />
      {/* pit sheen */}
      <ellipse cx="45" cy="55" rx="4.5" ry="3.5" fill="#9a5828" opacity="0.5" />
      {/* stem */}
      <path
        d="M 48 16 C 47 11 49 7 51 7 C 53 7 53 11 52 16 Z"
        fill="#4a3010"
        stroke="#2a1808"
        strokeWidth="1.1"
      />
      {/* skin texture */}
      <path d="M 38 34 C 40 30 44 26 48 24" stroke="#3a7020" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 60 68 C 64 63 66 56 66 50" stroke="#3a7020" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function BlueberriesSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#f4f0ff" />
      {/* stems */}
      <path d="M 50 26 C 46 24 38 25 34 28" stroke="#3a6018" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M 50 26 C 54 24 62 25 66 28" stroke="#3a6018" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M 50 26 C 50 22 50 18 50 16" stroke="#3a6018" strokeWidth="1.2" fill="none" />
      {/* small leaf */}
      <path d="M 50 20 C 46 16 40 16 40 20 C 44 18 48 20 50 20 Z" fill="#3a7020" />
      <path d="M 50 20 C 54 16 60 16 60 20 C 56 18 52 20 50 20 Z" fill="#3a7020" />
      {/* back berries */}
      <circle cx="50" cy="40" r="12" fill="#3c4898" stroke="#20206a" strokeWidth="1.3" />
      {/* crown on back berry */}
      <path d="M 46 32 C 47 30 50 29 53 30 C 51 30 50 31 49 31 C 48 31 47 31 46 32 Z" fill="#20206a" />
      <circle cx="45.5" cy="38" r="3" fill="#6070c8" opacity="0.45" />
      {/* main berries */}
      <circle cx="36" cy="58" r="14" fill="#4a50aa" stroke="#20206a" strokeWidth="1.4" />
      <path d="M 31 49 C 33 47 37 46 40 47 C 37 47 34 48 31 49 Z" fill="#20206a" />
      <circle cx="31.5" cy="55.5" r="3.5" fill="#7078d0" opacity="0.48" />

      <circle cx="64" cy="58" r="14" fill="#4a50aa" stroke="#20206a" strokeWidth="1.4" />
      <path d="M 59 49 C 61 47 65 46 68 47 C 65 47 62 48 59 49 Z" fill="#20206a" />
      <circle cx="59.5" cy="55.5" r="3.5" fill="#7078d0" opacity="0.48" />

      <circle cx="50" cy="68" r="13" fill="#5450b0" stroke="#20206a" strokeWidth="1.4" />
      <path d="M 45 59 C 47 57 51 57 54 58 C 51 57 48 58 45 59 Z" fill="#20206a" />
      <circle cx="45.5" cy="65.5" r="3" fill="#7878d0" opacity="0.45" />
    </svg>
  );
}

function MangosteenSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#f8f0ff" />
      {/* main fruit */}
      <circle cx="50" cy="56" r="31" fill="#3e0a5a" stroke="#220440" strokeWidth="1.7" />
      {/* surface sheen */}
      <path d="M 34 42 C 38 36 46 34 52 36" stroke="#6a1888" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.65" />
      {/* bottom crown (stigma) — 5-6 rounded lobes */}
      <path
        d="M 36 80 Q 38 86 42 84 Q 45 88 50 86 Q 55 88 58 84 Q 62 86 64 80"
        fill="#30085a"
        stroke="#220440"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* top sepals — 5 leaves */}
      <path d="M 50 25 C 46 20 38 18 38 24 C 42 20 48 23 50 25 Z" fill="#225012" stroke="#142e08" strokeWidth="1.1" />
      <path d="M 50 25 C 54 20 62 18 62 24 C 58 20 52 23 50 25 Z" fill="#225012" stroke="#142e08" strokeWidth="1.1" />
      <path d="M 50 25 C 44 18 40 10 44 10 C 44 14 48 20 50 25 Z" fill="#2a6018" stroke="#142e08" strokeWidth="1.1" />
      <path d="M 50 25 C 56 18 60 10 56 10 C 56 14 52 20 50 25 Z" fill="#2a6018" stroke="#142e08" strokeWidth="1.1" />
      <path d="M 50 25 C 50 16 50 10 50 8 C 50 12 50 20 50 25 Z" fill="#2a6018" stroke="#142e08" strokeWidth="1.1" />
      {/* sepal base disc */}
      <circle cx="50" cy="26" r="7" fill="#2a6018" stroke="#142e08" strokeWidth="1.2" />
      {/* fruit highlight dot */}
      <circle cx="42" cy="46" r="4" fill="#6a1890" opacity="0.35" />
    </svg>
  );
}

function TurmericSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#fdf8e0" />
      {/* main root body */}
      <path
        d="M 16 55 C 16 46 23 38 34 37 C 40 36 48 38 55 41 C 60 36 68 31 76 34 C 84 37 86 48 83 57 C 80 64 72 67 64 65 C 59 69 51 72 42 70 C 28 68 16 64 16 55 Z"
        fill="#e09010"
        stroke="#2a1808"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* upper knob */}
      <path
        d="M 60 41 C 61 32 63 23 60 18 C 58 15 54 17 53 21 C 52 26 53 34 56 40"
        fill="#e09010"
        stroke="#2a1808"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* lower knob */}
      <path
        d="M 34 68 C 31 76 28 83 31 87 C 33 90 38 88 40 84 C 42 80 42 73 40 68"
        fill="#e09010"
        stroke="#2a1808"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* cut cross-section showing bright interior */}
      <ellipse cx="22" cy="55" rx="7.5" ry="9.5" fill="#f8d020" stroke="#2a1808" strokeWidth="1.4" />
      <circle cx="22" cy="55" r="3.5" fill="#fce840" />
      {/* ring textures */}
      <path d="M 28 50 C 33 47 40 47 45 50" stroke="#b07008" strokeWidth="0.95" fill="none" />
      <path d="M 50 44 C 55 41 62 41 66 44" stroke="#b07008" strokeWidth="0.95" fill="none" />
      <path d="M 68 50 C 72 48 76 49 80 52" stroke="#b07008" strokeWidth="0.95" fill="none" />
      <path d="M 54 34 C 57 31 60 28 60 24" stroke="#b07008" strokeWidth="0.85" fill="none" />
      {/* highlight */}
      <path d="M 18 53 C 20 48 22 45 24 47" stroke="#f8e050" strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function KaleSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#eef8ec" />
      {/* outer ruffled edges — left */}
      <path d="M 27 68 C 20 60 20 50 22 42 C 22 48 24 56 28 62 Z" fill="#245c14" stroke="#142e08" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M 22 42 C 20 34 24 24 28 20 C 24 26 24 34 24 40 Z" fill="#2c6818" stroke="#142e08" strokeWidth="1.1" strokeLinejoin="round" />
      {/* outer ruffled edges — right */}
      <path d="M 73 68 C 80 60 80 50 78 42 C 78 48 76 56 72 62 Z" fill="#245c14" stroke="#142e08" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M 78 42 C 80 34 76 24 72 20 C 76 26 76 34 76 40 Z" fill="#2c6818" stroke="#142e08" strokeWidth="1.1" strokeLinejoin="round" />
      {/* main leaf body */}
      <path
        d="M 50 84 C 44 76 30 60 26 46 C 22 32 30 18 42 16 C 46 15 50 16 50 16 C 50 16 54 15 58 16 C 70 18 78 32 74 46 C 70 60 56 76 50 84 Z"
        fill="#2e6c1a"
        stroke="#142e08"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* midrib */}
      <path d="M 50 82 L 50 18" stroke="#142e08" strokeWidth="1.8" />
      {/* veins left */}
      <path d="M 50 32 C 44 30 38 30 33 32" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 42 C 43 40 36 40 31 43" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 52 C 44 50 37 51 32 54" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 62 C 45 61 40 62 36 66" stroke="#142e08" strokeWidth="0.95" />
      {/* veins right */}
      <path d="M 50 32 C 56 30 62 30 67 32" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 42 C 57 40 64 40 69 43" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 52 C 56 50 63 51 68 54" stroke="#142e08" strokeWidth="0.95" />
      <path d="M 50 62 C 55 61 60 62 64 66" stroke="#142e08" strokeWidth="0.95" />
      {/* highlight along midrib */}
      <path d="M 48 20 C 46 30 44 42 42 52" stroke="#4a9030" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* stem */}
      <path
        d="M 48 84 C 46 90 47 96 50 96 C 53 96 54 90 52 84 Z"
        fill="#3a6820"
        stroke="#142e08"
        strokeWidth="1.2"
      />
    </svg>
  );
}
