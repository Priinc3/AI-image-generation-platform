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
    cta: 'Generate PDP Images',
    accent: '#4F46E5'
  },
  {
    icon: '🎨',
    title: 'Image Editor',
    description: 'Create stunning product images with up to 3 reference images and custom prompts.',
    features: [
      'Up to 3 reference images',
      '8 style presets',
      'Custom prompts',
      'Multiple variations',
      'Creativity control',
      'Instant download'
    ],
    link: '/single-image',
    cta: 'Open Image Editor',
    accent: '#7C3AED'
  }
];

const STEPS = [
  {
    number: '01',
    title: 'Upload Your Product',
    description: 'Drop your product image and paste the raw description or features.',
    icon: '📤'
  },
  {
    number: '02',
    title: 'AI Generates Images',
    description: 'Our AI analyzes your product and creates professional, e-commerce ready images.',
    icon: '✨'
  },
  {
    number: '03',
    title: 'Download & Use',
    description: 'Preview, download individual images or the full set as a ZIP file.',
    icon: '⬇️'
  }
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        {/* Hero Section */}
        <section style={{
          padding: 'var(--spacing-3xl) 0',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'var(--bg-card)',
              borderRadius: '50px',
              border: '1px solid var(--border-color)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
              Powered by Google Gemini AI
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: '700',
              lineHeight: '1.2',
              marginBottom: 'var(--spacing-lg)',
              color: 'var(--text-primary)',
            }}>
              Generate Professional<br />
              <span style={{ color: 'var(--accent-primary)' }}>Product Images with AI</span>
            </h1>

            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-xl)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-xl)',
            }}>
              Create stunning Amazon PDP listings and e-commerce product images in seconds.
              No design skills required. Just upload, describe, and download.
            </p>

            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Link href="/amazon-pdp" className="btn btn-primary btn-lg">
                📦 Amazon PDP Generator
              </Link>
              <Link href="/single-image" className="btn btn-secondary btn-lg">
                🎨 Image Editor
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)',
              }}>
                Choose Your Generator
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Two powerful tools for all your product image needs
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--spacing-xl)',
              maxWidth: '900px',
              margin: '0 auto',
            }}>
              {FEATURES.map((feature) => (
                <div key={feature.title} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: 'var(--spacing-xl)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    marginBottom: 'var(--spacing-md)',
                  }}>
                    {feature.icon}
                  </div>

                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--text-primary)',
                  }}>
                    {feature.title}
                  </h3>

                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.95rem',
                    marginBottom: 'var(--spacing-lg)',
                    lineHeight: '1.6',
                  }}>
                    {feature.description}
                  </p>

                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 var(--spacing-xl) 0',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-xs)',
                    flex: 1,
                  }}>
                    {feature.features.map((item) => (
                      <li key={item} style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{ color: '#10B981' }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={feature.link}
                    className="btn btn-primary"
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    {feature.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{
          padding: 'var(--spacing-3xl) 0',
          background: 'var(--bg-secondary)',
        }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)',
              }}>
                How It Works
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Three simple steps to professional product images
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'var(--spacing-xl)',
              maxWidth: '900px',
              margin: '0 auto',
            }}>
              {STEPS.map((step, index) => (
                <div key={step.number} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: 'var(--spacing-xl)',
                  textAlign: 'center',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}>
                    {index + 1}
                  </div>

                  <div style={{
                    fontSize: '2rem',
                    marginBottom: 'var(--spacing-md)',
                    marginTop: 'var(--spacing-sm)',
                  }}>
                    {step.icon}
                  </div>

                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--text-primary)',
                  }}>
                    {step.title}
                  </h3>

                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                  }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-3xl)',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              borderRadius: 'var(--radius-xl)',
              color: 'white',
            }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                marginBottom: 'var(--spacing-md)',
              }}>
                Ready to Create Amazing Product Images?
              </h2>
              <p style={{
                opacity: 0.9,
                marginBottom: 'var(--spacing-xl)',
                fontSize: '1rem',
              }}>
                Start generating professional e-commerce images in seconds
              </p>
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                <Link
                  href="/amazon-pdp"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'white',
                    color: '#4F46E5',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Get Started Free →
                </Link>
                <Link
                  href="/gallery"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  View Your Gallery
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: 'var(--spacing-xl) 0',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
        }}>
          <div className="container">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              © 2024 ImageGen AI. Powered by Google Gemini.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
