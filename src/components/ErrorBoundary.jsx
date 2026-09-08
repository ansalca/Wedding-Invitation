import { Component } from 'react';

/* Catches any runtime error inside the invitation so a single section
   (e.g. the WebGL ambient layer on a device without WebGL) can never
   blank the whole white page.

   The fallback surfaces the error message itself (not just a generic
   note) so a crashed section is immediately diagnosable on the very
   device it failed on — no console required. In production the message
   is still shown: it contains no secrets, only the error text. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('WeddingInvitation section crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      /* A custom fallback wins; otherwise show the diagnostic card. */
      if (this.props.fallback) return this.props.fallback;

      const message =
        (this.state.error && (this.state.error.message || String(this.state.error))) ||
        'Unknown error';

      return (
        <section className="section section--light" aria-label="Section unavailable">
          <div className="section__inner" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--muted-on-light)' }}>
              This part of the invitation could not be shown on your device —
              everything else is still here.
            </p>
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--muted-on-light)',
                opacity: 0.75,
                wordBreak: 'break-word',
              }}
            >
              {message}
            </p>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}