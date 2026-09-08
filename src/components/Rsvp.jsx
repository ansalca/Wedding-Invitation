import { useEffect, useMemo, useRef, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { dates, couple, rsvp as rsvpConfig } from '../data.js';
import { useLocalStorage } from '../lib/hooks.js';
import {
  isSupabaseConfigured,
  saveRsvp,
  checkRsvpSubmitted,
  normalizeContact,
} from '../lib/supabase.js';

const BLANK = {
  name: '',
  contact: '',
  guests: 2,
  attend: '',
  message: '',
};

const ATTENDING = 'Joyfully Attending';
const DECLINING = 'Regretfully Declining';
const MAX_GUESTS = 99;

function Petals() {
  return (
    <div className="rsvp-petals" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="rsvp-petal" style={{ '--i': i }} />
      ))}
    </div>
  );
}

function DrawnCheck() {
  return (
    <svg className="rsvp-check" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle className="rsvp-check__ring" cx="32" cy="32" r="29" />
      <path className="rsvp-check__mark" d="M20 33.5 28.5 42 44 24" />
    </svg>
  );
}

function ResultCard({ kind, record }) {
  const attending = record?.attend === ATTENDING;
  const count = Number(record?.guests) || 1;
  return (
    <div className={`rsvp-result ${kind === 'already' ? 'rsvp-result--already' : ''}`} role="status">
      <Petals />
      <DrawnCheck />
      <h3 className="rsvp-result__title">Thank you, {record?.name || 'friend'}.</h3>
      <p className="rsvp-result__lead">
        {kind === 'already'
          ? 'Your RSVP has already been received.'
          : attending
            ? "We can\u2019t wait to celebrate with you."
            : 'We will miss you \u2014 you will be kept in our prayers.'}
      </p>
      <p className="rsvp-result__meta">
        {kind === 'already' ? 'Thank you for celebrating with us \u00b7 ' : ''}
        {attending ? `${count} guest${count > 1 ? 's' : ''} \u00b7 ` : ''}
        {record?.attend}
      </p>
      <p className="rsvp-result__note">
        {kind === 'already'
          ? 'Nothing more is needed \u2014 this contact has already replied.'
          : isSupabaseConfigured
            ? 'Your reply is safely with the couple.'
            : 'Saved privately on this device.'}
      </p>
    </div>
  );
}

export default function Rsvp() {
  const { read, write } = useLocalStorage('wedding:rsvp');
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [shake, setShake] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let saved = null;
      if (rsvpConfig.saveLocally) {
        const local = read();
        if (local) { setForm({ ...BLANK, ...local }); saved = local; }
      }
      if (isSupabaseConfigured && saved && saved.contact) {
        try {
          const already = await checkRsvpSubmitted(saved.contact);
          if (!cancelled && already) setResult('already');
        } catch { /* offline */ }
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  const set = (key) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
  };
  const guests = (delta) => setForm((f) => ({ ...f, guests: Math.min(MAX_GUESTS, Math.max(1, (Number(f.guests) || 1) + delta)) }));
  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = 'Please enter your name.';
    if (!normalizeContact(form.contact)) er.contact = 'Please provide a valid email address or phone number.';
    if (!form.attend) er.attend = 'Please let us know if you can join us.';
    if (form.attend === ATTENDING) {
      const g = Number(form.guests);
      if (!Number.isFinite(g) || g < 1 || g > MAX_GUESTS) er.guests = `Please choose between 1 and ${MAX_GUESTS} guests.`;
    }
    if (form.message && form.message.length > 600) er.message = 'Please keep your message under 600 characters.';
    return er;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const er = validate();
    setErrors(er);
    setTouched({ name: true, contact: true, attend: true, guests: true, message: true });
    if (Object.keys(er).length) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      const first = formRef.current?.querySelector('[data-invalid="true"]');
      if (first && first.focus) first.focus();
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      if (isSupabaseConfigured) {
        const already = await checkRsvpSubmitted(form.contact);
        if (already) { setResult('already'); return; }
      }
      const record = { ...form, guests: form.attend === ATTENDING ? Number(form.guests) || 1 : 1, submittedAt: new Date().toISOString() };
      if (rsvpConfig.saveLocally) write(record);
      if (isSupabaseConfigured) {
        try {
          await saveRsvp({ name: record.name, guests: record.guests, attend: record.attend, message: record.message, contact: record.contact });
          setResult('sent');
        } catch (err) {
          setResult(err && err.code === '23505' ? 'already' : 'sent');
        }
      } else { setResult('sent'); }
    } finally { setSubmitting(false); }
  };

  const showResult = Boolean(result);
  const resultRecord = useMemo(() => {
    if (!showResult) return null;
    return { name: form.name.trim(), attend: form.attend, guests: form.attend === ATTENDING ? Number(form.guests) || 1 : 1 };
  }, [showResult, form]);

  return (
    <section className="section section--deep" aria-labelledby="rsvp-title">
      <Arabesque />
      <div className="section__inner section__inner--narrow">
        <SectionHead
          id="rsvp-title"
          eyebrow="Kindly Respond"
          title="Will You Be Joining Us?"
          sub={`We would love to know if you can celebrate with us. Please respond by ${dates.rsvpBy}.`}
        />

        {showResult ? (
          <ResultCard kind={result} record={resultRecord} />
        ) : (
          <form ref={formRef} className={`rsvp reveal ${shake ? 'rsvp--shake' : ''}`} onSubmit={onSubmit} noValidate>
            <div className={`field ${touched.name && errors.name ? 'field--error' : ''}`}>
              <label htmlFor="r-name">Your Name</label>
              <input id="r-name" type="text" required autoComplete="name" placeholder="Your name"
                value={form.name} onChange={set('name')} onBlur={() => markTouched('name')}
                data-invalid={Boolean(touched.name && errors.name)} aria-invalid={Boolean(touched.name && errors.name)}
                aria-describedby={errors.name ? 'r-name-err' : undefined} />
              {errors.name && <p className="field__error" id="r-name-err" role="alert">{errors.name}</p>}
            </div>

            <fieldset className={`field__group ${touched.attend && errors.attend ? 'field--error' : ''}`}>
              <legend className="field__legend">Will you be joining us?</legend>
              <div className="rsvp-choice" role="radiogroup" aria-describedby={errors.attend ? 'r-attend-err' : undefined}>
                {[ATTENDING, DECLINING].map((option) => {
                  const selected = form.attend === option;
                  const isAttend = option === ATTENDING;
                  return (
                    <label className={`rsvp-choice__opt ${selected ? 'is-selected' : ''} ${isAttend ? 'is-attend' : 'is-decline'}`} key={option}>
                      <input type="radio" name="attend" value={option} checked={selected}
                        onChange={set('attend')} onBlur={() => markTouched('attend')} className="rsvp-choice__input" />
                      <span className="rsvp-choice__check" aria-hidden="true"><span className="rsvp-choice__dot" /></span>
                      <span className="rsvp-choice__label">{option}</span>
                    </label>
                  );
                })}
              </div>
              {errors.attend && <p className="field__error" id="r-attend-err" role="alert">{errors.attend}</p>}
            </fieldset>

            {form.attend === ATTENDING && (
              <div className={`field rsvp-guests ${touched.guests && errors.guests ? 'field--error' : ''}`}>
                <label htmlFor="r-guests">Number of Guests (including you)</label>
                <div className="stepper" role="group" aria-label="Number of guests">
                  <button type="button" className="stepper__btn" onClick={() => guests(-1)}
                    disabled={form.guests <= 1} aria-label="Fewer guests">−</button>
                  <input id="r-guests" type="number" min={1} max={MAX_GUESTS} value={form.guests}
                    onChange={(e) => { const v = e.target.value; if (v === '') return set('guests')(''); set('guests')(Math.min(MAX_GUESTS, Math.max(1, parseInt(v, 10) || 1))); }}
                    onBlur={() => markTouched('guests')} data-invalid={Boolean(touched.guests && errors.guests)}
                    aria-invalid={Boolean(touched.guests && errors.guests)} />
                  <button type="button" className="stepper__btn" onClick={() => guests(1)}
                    disabled={form.guests >= MAX_GUESTS} aria-label="More guests">+</button>
                </div>
                {errors.guests && <p className="field__error" role="alert">{errors.guests}</p>}
              </div>
            )}

            <div className={`field ${touched.contact && errors.contact ? 'field--error' : ''}`}>
              <label htmlFor="r-contact">Email or Phone</label>
              <input id="r-contact" type="text" required autoComplete="email" inputMode="email"
                placeholder="you@example.com or 98765 43210" value={form.contact} onChange={set('contact')}
                onBlur={() => markTouched('contact')} data-invalid={Boolean(touched.contact && errors.contact)}
                aria-invalid={Boolean(touched.contact && errors.contact)} aria-describedby={errors.contact ? 'r-contact-err' : 'r-contact-hint'} />
              <small className="field__hint" id="r-contact-hint">Helps us recognise your reply — one response per guest.</small>
              {errors.contact && <p className="field__error" id="r-contact-err" role="alert">{errors.contact}</p>}
            </div>

            <div className={`field ${touched.message && errors.message ? 'field--error' : ''}`}>
              <label htmlFor="r-msg">Message for the Couple (optional)</label>
              <textarea id="r-msg" rows={4} placeholder="Your wishes…" value={form.message} onChange={set('message')}
                onBlur={() => markTouched('message')} maxLength={600} data-invalid={Boolean(touched.message && errors.message)}
                aria-invalid={Boolean(touched.message && errors.message)} aria-describedby="r-msg-count" />
              <small className="field__hint field__hint--count" id="r-msg-count">{form.message.length}/600</small>
              {errors.message && <p className="field__error" role="alert">{errors.message}</p>}
            </div>

            <button type="submit" className="btn btn--gold rsvp__submit" disabled={submitting}>
              {submitting ? (
                <span className="rsvp__submitting"><span className="rsvp__spinner" aria-hidden="true" />Saving your RSVP…</span>
              ) : 'Confirm My RSVP'}
            </button>

            <p className="rsvp__note">
              {isSupabaseConfigured
                ? 'Your reply is sent to the couple — and a copy is kept in this browser.'
                : 'Saved privately in this browser — nothing is sent anywhere.'}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}