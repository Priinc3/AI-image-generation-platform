'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

const FEATURES = [
  {
    icon: '📦',
    title: 'Amazon PDP Generator',
    description: 'Generate 6 professional product images optimized for Amazon listings in one click.',
    features: [
      'Hero product shot',
      'Ingredients visualization',
      'Benefits infographic',
      'Trust & certifications',
      'Usage/lifestyle imagery',
      'Brand promise closer'
    ],
    link: '/amazon-pdp',
    cta: 'Generate PDP Images'
  },
  {
    icon: '🎨',
    title: 'Single Image Generator',
    description: 'Create stunning product images with custom prompts and style presets.',
    features: [
      '6 style presets',
      'Custom prompts',
      'Reference image support',
      'Multiple variations',
      'Creativity control',
      'Instant download'
    ],
    link: '/single-image',
    cta: 'Generate Single Image'
  }
];

const STEPS = [
  {
    number: '01',
    title: 'Upload Your Product',
    description: 'Drop your product image and paste the raw description or features.'
  },
  {
    number: '02',
    title: 'AI Generates Images',
    description: 'Our AI analyzes your product and creates professional, e-commerce ready images.'
  },
  {
    number: '03',
    title: 'Download & Use',
    description: 'Preview, download individual images or the full set as a ZIP file.'
  }
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <div className="hero-badge">
              <div className="hero-badge-dot"></div>
              <span>Powered by Google Gemini AI</span>
            </div>
            <h1 className="hero-title">
              Generate Professional
              <br />
              <span className="hero-title-accent">Product Images with AI</span>
            </h1>
            <p className="hero-description">
              Create stunning Amazon PDP listings and e-commerce product images in seconds.
              No design skills required. Just upload, describe, and download.
            </p>
            <div className="hero-buttons">
              <Link href="/amazon-pdp" className="btn btn-primary btn-lg">
                📦 Amazon PDP Generator
              </Link>
              <Link href="/single-image" className="btn btn-secondary btn-lg">
                🎨 Single Image Generator
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Choose Your Generator</h2>
              <p className="section-subtitle">
                Two powerful tools for all your product image needs
              </p>
            </div>
            <div className="features-grid">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <ul className="feature-list">
                    {feature.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link href={feature.link} className="btn btn-primary">
                    {feature.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="features" style={{ background: 'var(--bg-secondary)', padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">How It Works</h2>
              <p className="section-subtitle">
                Three simple steps to professional product images
              </p>
            </div>
            <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {STEPS.map((step) => (
                <div key={step.number} className="feature-card" style={{ textAlign: 'center' }}>
                  <div
                    className="feature-icon"
                    style={{
                      margin: '0 auto var(--spacing-lg)',
                      fontSize: '1.5rem',
                      fontWeight: '800',
                    }}
                  >
                    {step.number}
                  </div>
                  <h3 className="feature-title">{step.title}</h3>
                  <p className="feature-description">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="features">
          <div className="container">
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-3xl)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)'
            }}>
              <h2 className="section-title">Ready to Create Amazing Product Images?</h2>
              <p className="section-subtitle" style={{ marginBottom: 'var(--spacing-xl)' }}>
                Start generating professional e-commerce images in seconds
              </p>
              <div className="hero-buttons">
                <Link href="/amazon-pdp" className="btn btn-primary btn-lg">
                  Get Started Free →
                </Link>
                <Link href="/gallery" className="btn btn-secondary btn-lg">
                  View Your Gallery
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <p>© 2024 ImageGen AI. Powered by Google Gemini.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
