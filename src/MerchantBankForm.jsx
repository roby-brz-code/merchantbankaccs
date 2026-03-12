import { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LOGO_URL, COUNTRIES, CURRENCIES, US_STATES, PAYMENT_METHODS } from './constants';
import { supabase } from './supabase';

const DATA_ENDPOINT = import.meta.env.VITE_DATA_ENDPOINT || '';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isDomestic(method) {
  return method === 'ACH' || method === 'FEDWIRE';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateIBAN(iban) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(iban.replace(/\s/g, ''));
}

function isUSCountry(country) {
  return country === 'United States';
}

// ─── Reusable UI ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div className="border-b border-gray-200 pb-3 mb-6 mt-10 first:mt-0">
      <h2 className="text-sm font-semibold text-emerald-primary">
        {children}
      </h2>
    </div>
  );
}

function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-red-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-danger mt-1">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-primary/20 focus:border-emerald-primary/40 transition-colors ${
        error ? 'border-red-danger bg-red-50' : 'border-gray-200 bg-white'
      } ${props.disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-900'}`}
    />
  );
}

function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-primary/20 focus:border-emerald-primary/40 transition-colors ${
        error ? 'border-red-danger bg-red-50' : 'border-gray-200 bg-white'
      } ${props.disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-900'}`}
    >
      {children}
    </select>
  );
}

function Callout({ color, children }) {
  const styles = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`${styles[color] || styles.blue} border rounded-xl p-3.5 text-sm my-4 leading-relaxed`}>
      {children}
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────

function Logo() {
  const [imgFailed, setImgFailed] = useState(false);
  if (imgFailed) {
    return (
      <div className="flex items-center gap-2.5 mb-6 justify-center">
        <div className="w-8 h-8 rounded-lg bg-emerald-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">B</span>
        </div>
        <span className="text-lg font-semibold text-gray-900">Breeze Finance</span>
      </div>
    );
  }
  return (
    <img
      src={LOGO_URL}
      alt="Breeze Labs"
      className="h-10 mb-6 mx-auto"
      onError={() => setImgFailed(true)}
    />
  );
}

// ─── Main Form ──────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  merchantName: '',
  entityName: '',
  contactName: '',
  contactEmail: '',
  paymentMethod: '',
  // ACH / Fedwire
  routingNumber: '',
  accountNumber: '',
  accountType: 'checking',
  // Intl Wire
  swiftCode: '',
  intlAccountNumber: '',
  iban: '',
  intermediaryBank: '',
  intermediarySwift: '',
  // Bank info
  beneficiaryName: '',
  bankName: '',
  bankCountry: 'United States',
  currency: 'USD',
  bankAddress: '',
  bankCity: '',
  bankState: '',
  bankZip: '',
  // Beneficiary address
  benefStreet: '',
  benefCity: '',
  benefState: '',
  benefZip: '',
  benefCountry: 'United States',
  // Additional
  reference: '',
  notes: '',
};

export default function MerchantBankForm() {
  const [searchParams] = useSearchParams();
  const urlMchId = searchParams.get('mchID') || '';
  const urlName = searchParams.get('name') || '';

  const [form, setForm] = useState({ ...INITIAL_STATE, ...(urlName ? { merchantName: urlName } : {}) });
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(''); // 'saved' | 'error' | 'no-endpoint'
  const [jsonOutput, setJsonOutput] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy JSON');
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null); // null = loading/not checked, false = none found, object = existing
  const [checkingExisting, setCheckingExisting] = useState(!!urlMchId);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check if merchant already has bank details on file
  useEffect(() => {
    if (!urlMchId || !supabase) {
      setCheckingExisting(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('merchant_bank_submissions')
          .select('id, merchant_name, payment_method, bank_name, created_at')
          .eq('mch_id', urlMchId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setExistingSubmission(data[0]);
        } else {
          setExistingSubmission(false);
        }
      } catch {
        setExistingSubmission(false);
      }
      setCheckingExisting(false);
    })();
  }, [urlMchId]);

  const domestic = isDomestic(form.paymentMethod);
  const methodSelected = !!form.paymentMethod;

  // When payment method changes, lock fields for domestic
  function setPaymentMethod(method) {
    const updates = { paymentMethod: method };
    if (isDomestic(method)) {
      updates.currency = 'USD';
      updates.bankCountry = 'United States';
      updates.benefCountry = 'United States';
    }
    setForm(prev => ({ ...prev, ...updates }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.paymentMethod;
      return next;
    });
  }

  function set(field) {
    return (e) => {
      const val = e.target.value;
      setForm(prev => ({ ...prev, [field]: val }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };
  }

  function setUpper(field) {
    return (e) => {
      const val = e.target.value.toUpperCase();
      setForm(prev => ({ ...prev, [field]: val }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };
  }

  // ── File handling ─────────────────────────────────────────────────────
  function handleFile(f) {
    if (!f) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(f.type)) {
      setErrors(prev => ({ ...prev, file: 'Only PDF, PNG, or JPG files are accepted.' }));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, file: 'File must be under 10 MB.' }));
      return;
    }
    setFile(f);
    setErrors(prev => { const n = { ...prev }; delete n.file; return n; });
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result);
    reader.readAsDataURL(f);
  }

  function removeFile() {
    setFile(null);
    setFileBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Validation ────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.merchantName.trim()) e.merchantName = 'Required';
    if (!form.entityName.trim()) e.entityName = 'Required';
    if (!form.contactEmail.trim()) e.contactEmail = 'Required';
    else if (!validateEmail(form.contactEmail)) e.contactEmail = 'Invalid email';
    if (!form.paymentMethod) e.paymentMethod = 'Select a payment method';

    if (form.paymentMethod === 'ACH' || form.paymentMethod === 'FEDWIRE') {
      if (!form.routingNumber.trim()) e.routingNumber = 'Required';
      else if (!/^\d{9}$/.test(form.routingNumber)) e.routingNumber = 'Must be exactly 9 digits';
      if (!form.accountNumber.trim()) e.accountNumber = 'Required';
      else if (!/^\d{4,17}$/.test(form.accountNumber)) e.accountNumber = 'Must be 4-17 digits';
    }

    if (form.paymentMethod === 'INTERNATIONAL WIRE') {
      if (!form.swiftCode.trim()) e.swiftCode = 'Required';
      else if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/.test(form.swiftCode)) e.swiftCode = 'Must be 8 or 11 alphanumeric characters';
      if (!form.intlAccountNumber.trim() && !form.iban.trim()) {
        e.intlAccountNumber = 'Provide account number or IBAN';
        e.iban = 'Provide IBAN or account number';
      }
      if (form.iban.trim() && !validateIBAN(form.iban)) e.iban = 'Invalid IBAN format';
    }

    if (methodSelected) {
      if (!form.beneficiaryName.trim()) e.beneficiaryName = 'Required';
      if (!form.bankName.trim()) e.bankName = 'Required';
      if (!form.bankCountry) e.bankCountry = 'Required';
      if (!form.currency) e.currency = 'Required';
      if (!form.benefStreet.trim()) e.benefStreet = 'Required';
      if (!form.benefCity.trim()) e.benefCity = 'Required';
      if (!form.benefCountry) e.benefCountry = 'Required';
      if (!file) e.file = 'Proof of bank account is required';
    }

    return e;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const bankDetails = { beneficiaryName: form.beneficiaryName, bankName: form.bankName, bankCountry: form.bankCountry, currency: form.currency };
    if (form.bankAddress) bankDetails.bankAddress = form.bankAddress;

    if (form.paymentMethod === 'ACH' || form.paymentMethod === 'FEDWIRE') {
      bankDetails.routingNumber = form.routingNumber;
      bankDetails.accountNumber = form.accountNumber;
      bankDetails.accountType = form.accountType;
    }
    if (form.paymentMethod === 'INTERNATIONAL WIRE') {
      bankDetails.swiftCode = form.swiftCode;
      if (form.intlAccountNumber) bankDetails.accountNumber = form.intlAccountNumber;
      if (form.iban) bankDetails.iban = form.iban;
      if (form.intermediaryBank) bankDetails.intermediaryBank = form.intermediaryBank;
      if (form.intermediarySwift) bankDetails.intermediarySwift = form.intermediarySwift;
    }

    const benefParts = [form.benefStreet, form.benefCity, form.benefState, form.benefZip, form.benefCountry].filter(Boolean);

    const payload = {
      merchant: {
        mchID: urlMchId || null,
        merchantName: form.merchantName,
        entityName: form.entityName,
        contact: { name: form.contactName, email: form.contactEmail },
      },
      paymentMethod: form.paymentMethod,
      bankDetails,
      beneficiaryAddress: benefParts.join(', '),
      reference: form.reference,
      notes: form.notes,
      submittedAt: new Date().toISOString(),
    };

    if (file && fileBase64) {
      payload.proofDocument = {
        fileName: file.name,
        fileSize: file.size,
        base64: fileBase64,
      };
    }

    const json = JSON.stringify(payload, null, 2);
    setJsonOutput(json);

    let proofDocumentUrl = '';

    // Upload file to Supabase Storage
    if (supabase && file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}-${form.merchantName.replace(/\s+/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('proof-documents')
        .upload(filePath, file, { contentType: file.type });
      if (!uploadError) {
        proofDocumentUrl = filePath;
      }
    }

    // Save to Supabase DB
    if (supabase) {
      try {
        const { error: dbError } = await supabase
          .from('merchant_bank_submissions')
          .insert({
            mch_id: urlMchId || null,
            merchant_name: form.merchantName,
            entity_name: form.entityName,
            contact_name: form.contactName || null,
            contact_email: form.contactEmail,
            payment_method: form.paymentMethod,
            beneficiary_name: form.beneficiaryName,
            bank_name: form.bankName,
            bank_country: form.bankCountry,
            bank_address: form.bankAddress || null,
            currency: form.currency,
            routing_number: bankDetails.routingNumber || null,
            account_number: bankDetails.accountNumber || null,
            account_type: bankDetails.accountType || null,
            swift_code: bankDetails.swiftCode || null,
            iban: bankDetails.iban || null,
            intermediary_bank: bankDetails.intermediaryBank || null,
            intermediary_swift: bankDetails.intermediarySwift || null,
            beneficiary_address: benefParts.join(', '),
            payment_reference: form.reference || null,
            notes: form.notes || null,
            proof_document_url: proofDocumentUrl || null,
            proof_document_filename: file?.name || null,
            raw_payload: payload,
          });
        if (!dbError) {
          setSubmitStatus('saved');
        } else {
          console.error('Supabase insert error:', dbError);
          setSubmitStatus('error');
        }
      } catch (err) {
        console.error('Supabase exception:', err);
        setSubmitStatus('error');
      }
    } else if (DATA_ENDPOINT) {
      try {
        await fetch(DATA_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: json,
        });
        setSubmitStatus('saved');
      } catch {
        setSubmitStatus('error');
      }
    } else {
      setSubmitStatus('no-endpoint');
    }

    setSubmitting(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm({ ...INITIAL_STATE });
    setErrors({});
    setFile(null);
    setFileBase64('');
    setSubmitted(false);
    setSubmitStatus('');
    setJsonOutput('');
    setCopyLabel('Copy JSON');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function copyJson() {
    navigator.clipboard.writeText(jsonOutput).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy JSON'), 2000);
    });
  }

  // Bank state helper: show US state dropdown or freetext
  function stateField(field, countryField, error) {
    const showDropdown = isUSCountry(form[countryField]);
    if (showDropdown) {
      return (
        <Field label="State" error={error}>
          <Select value={form[field]} onChange={set(field)} error={error}>
            <option value="">Select...</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      );
    }
    return (
      <Field label="State / Province" error={error}>
        <Input value={form[field]} onChange={set(field)} placeholder="State / Province" error={error} />
      </Field>
    );
  }

  // ── Loading check ──────────────────────────────────────────────────
  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Checking merchant details...</p>
        </div>
      </div>
    );
  }

  // ── Already on file screen ────────────────────────────────────────
  if (existingSubmission) {
    const sub = existingSubmission;
    const submittedDate = new Date(sub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
            <Logo />

            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-warn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Bank details already on file
            </h1>

            <p className="text-gray-500 text-sm mb-6">
              We already have bank account information for <span className="font-semibold text-gray-900">{sub.merchant_name || urlName}</span>.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-left">
              <div className="space-y-0">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Payment Method</span>
                  <span className="text-sm font-semibold text-gray-900">{sub.payment_method}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Bank</span>
                  <span className="text-sm font-semibold text-gray-900">{sub.bank_name}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm text-gray-500">Submitted</span>
                  <span className="text-sm font-semibold text-gray-900">{submittedDate}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-left">
              If your bank details need to be changed, please reach out to <a href="mailto:roby@breeze.com" className="font-semibold underline">roby@breeze.com</a> to request an update.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Thank You Screen ─────────────────────────────────────────────────
  if (submitted) {
    const isError = submitStatus === 'error';

    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
            <Logo />

            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              isError ? 'bg-amber-50' : 'bg-emerald-50'
            }`}>
              <svg className={`w-8 h-8 ${isError ? 'text-amber-warn' : 'text-emerald-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isError
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
              </svg>
            </div>

            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              {isError ? 'Something went wrong' : 'Thank you for submitting!'}
            </h1>

            <p className="text-gray-500 text-sm mb-1">
              {isError
                ? 'There was an issue saving your details. Please try again or contact support.'
                : 'Your bank details have been securely received.'}
            </p>

            {!isError && (
              <p className="text-gray-400 text-sm mb-6">
                We'll review your information and reach out if we need anything else.
              </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-left">
              <div className="space-y-0">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Merchant</span>
                  <span className="text-sm font-semibold text-gray-900">{form.merchantName}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Entity</span>
                  <span className="text-sm font-semibold text-gray-900">{form.entityName}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Payment Method</span>
                  <span className="text-sm font-semibold text-gray-900">{form.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Beneficiary</span>
                  <span className="text-sm font-semibold text-gray-900">{form.beneficiaryName}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm text-gray-500">Bank</span>
                  <span className="text-sm font-semibold text-gray-900">{form.bankName}</span>
                </div>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="bg-emerald-primary text-white px-8 py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-light transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <Logo />
        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          Settlement Bank Details
        </h1>
        <p className="text-gray-500 text-sm">Please provide your banking information for settlement payouts.</p>
      </div>

      {/* Form Card */}
      <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8">

        {/* 1. Merchant Information */}
        <SectionTitle>Merchant Information</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Merchant / Brand Name" required error={errors.merchantName}>
            <Input value={form.merchantName} onChange={set('merchantName')} placeholder="e.g. Breeze Gaming" error={errors.merchantName} disabled={!!urlName} />
            {urlMchId && <p className="text-xs text-gray-400 mt-1">ID: {urlMchId}</p>}
          </Field>
          <Field label="Legal Entity Name" required error={errors.entityName}>
            <Input value={form.entityName} onChange={set('entityName')} placeholder="e.g. Breeze Labs Inc." error={errors.entityName} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Contact Name">
            <Input value={form.contactName} onChange={set('contactName')} placeholder="Full name" />
          </Field>
          <Field label="Contact Email" required error={errors.contactEmail}>
            <Input value={form.contactEmail} onChange={set('contactEmail')} placeholder="email@example.com" type="email" error={errors.contactEmail} />
          </Field>
        </div>

        {/* 2. Payment Method */}
        <SectionTitle>Payment Method</SectionTitle>
        {errors.paymentMethod && <p className="text-xs text-red-danger mb-3">{errors.paymentMethod}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setPaymentMethod(m.key)}
              className={`p-4 rounded-xl border text-left transition-colors ${
                form.paymentMethod === m.key
                  ? 'border-emerald-primary bg-emerald-50 ring-1 ring-emerald-primary/20'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`font-semibold text-sm ${form.paymentMethod === m.key ? 'text-emerald-700' : 'text-gray-900'}`}>{m.label}</div>
              <div className={`text-xs mt-1 ${form.paymentMethod === m.key ? 'text-emerald-600' : 'text-gray-400'}`}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* 3. ACH Details */}
        {form.paymentMethod === 'ACH' && (
          <>
            <SectionTitle>ACH Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="ABA Routing Number" required error={errors.routingNumber}>
                <Input value={form.routingNumber} onChange={set('routingNumber')} placeholder="9 digits" maxLength={9} error={errors.routingNumber} />
              </Field>
              <Field label="Account Number" required error={errors.accountNumber}>
                <Input value={form.accountNumber} onChange={set('accountNumber')} placeholder="4-17 digits" error={errors.accountNumber} />
              </Field>
            </div>
            <Field label="Account Type" className="mb-4 max-w-xs">
              <Select value={form.accountType} onChange={set('accountType')}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </Select>
            </Field>
            <Callout color="blue">
              Some banks have separate routing numbers for ACH vs. wire. Please confirm this is your ACH routing number.
            </Callout>
          </>
        )}

        {/* 4. Fedwire Details */}
        {form.paymentMethod === 'FEDWIRE' && (
          <>
            <SectionTitle>Fedwire Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="Fedwire Routing Number" required error={errors.routingNumber}>
                <Input value={form.routingNumber} onChange={set('routingNumber')} placeholder="9 digits" maxLength={9} error={errors.routingNumber} />
              </Field>
              <Field label="Account Number" required error={errors.accountNumber}>
                <Input value={form.accountNumber} onChange={set('accountNumber')} placeholder="4-17 digits" error={errors.accountNumber} />
              </Field>
            </div>
            <Field label="Account Type" className="mb-4 max-w-xs">
              <Select value={form.accountType} onChange={set('accountType')}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </Select>
            </Field>
            <Callout color="yellow">
              Fedwire routing numbers can differ from ACH routing numbers at the same bank. Please confirm this is your Fedwire routing number. If unsure, check with your bank.
            </Callout>
          </>
        )}

        {/* 5. International Wire Details */}
        {form.paymentMethod === 'INTERNATIONAL WIRE' && (
          <>
            <SectionTitle>International Wire Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="SWIFT / BIC Code" required error={errors.swiftCode}>
                <Input value={form.swiftCode} onChange={setUpper('swiftCode')} placeholder="8 or 11 characters" maxLength={11} error={errors.swiftCode} />
              </Field>
              <Field label="Account Number" error={errors.intlAccountNumber} hint="Required if no IBAN">
                <Input value={form.intlAccountNumber} onChange={set('intlAccountNumber')} error={errors.intlAccountNumber} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="IBAN" error={errors.iban} hint="Required if no account number">
                <Input value={form.iban} onChange={setUpper('iban')} error={errors.iban} />
              </Field>
              <Field label="Intermediary Bank" hint="If required for your bank">
                <Input value={form.intermediaryBank} onChange={set('intermediaryBank')} />
              </Field>
            </div>
            <Field label="Intermediary SWIFT" className="max-w-xs mb-4">
              <Input value={form.intermediarySwift} onChange={setUpper('intermediarySwift')} maxLength={11} />
            </Field>
          </>
        )}

        {/* 6. Bank Information */}
        {methodSelected && (
          <>
            <SectionTitle>Bank Information</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="Beneficiary Name" required error={errors.beneficiaryName} hint="Name on the bank account">
                <Input value={form.beneficiaryName} onChange={set('beneficiaryName')} error={errors.beneficiaryName} />
              </Field>
              <Field label="Bank Name" required error={errors.bankName}>
                <Input value={form.bankName} onChange={set('bankName')} error={errors.bankName} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="Bank Country" required error={errors.bankCountry}>
                {domestic ? (
                  <Input value="United States" disabled error={errors.bankCountry} />
                ) : (
                  <Select value={form.bankCountry} onChange={set('bankCountry')} error={errors.bankCountry}>
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Currency" required error={errors.currency}>
                {domestic ? (
                  <Input value="USD" disabled error={errors.currency} />
                ) : (
                  <Select value={form.currency} onChange={set('currency')} error={errors.currency}>
                    <option value="">Select...</option>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Bank Address" className="mb-4">
              <Input value={form.bankAddress} onChange={set('bankAddress')} />
            </Field>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="City">
                <Input value={form.bankCity} onChange={set('bankCity')} />
              </Field>
              {stateField('bankState', 'bankCountry', errors.bankState)}
              <Field label="Zip">
                <Input value={form.bankZip} onChange={set('bankZip')} />
              </Field>
            </div>
          </>
        )}

        {/* 7. Beneficiary Address */}
        {methodSelected && (
          <>
            <SectionTitle>Beneficiary Address</SectionTitle>
            <p className="text-xs text-gray-400 -mt-4 mb-4">Registered address of the account holder</p>
            <Field label="Street Address" required error={errors.benefStreet} className="mb-4">
              <Input value={form.benefStreet} onChange={set('benefStreet')} error={errors.benefStreet} />
            </Field>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="City" required error={errors.benefCity}>
                <Input value={form.benefCity} onChange={set('benefCity')} error={errors.benefCity} />
              </Field>
              {stateField('benefState', 'benefCountry', errors.benefState)}
              <Field label="Zip">
                <Input value={form.benefZip} onChange={set('benefZip')} />
              </Field>
            </div>
            <Field label="Country" required error={errors.benefCountry} className="max-w-xs mb-4">
              {domestic ? (
                <Input value="United States" disabled error={errors.benefCountry} />
              ) : (
                <Select value={form.benefCountry} onChange={set('benefCountry')} error={errors.benefCountry}>
                  <option value="">Select...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}
            </Field>
          </>
        )}

        {/* 8. Additional Information */}
        {methodSelected && (
          <>
            <SectionTitle>Additional Information</SectionTitle>

            {/* File Upload */}
            <Field label="Proof of Bank Account" required error={errors.file} hint="Upload a bank statement, voided check, or bank letter (PDF, PNG, JPG — max 10MB)" className="mb-4">
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-primary/40 hover:bg-emerald-50/30 transition-colors"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-400">Drag & drop or <span className="text-emerald-primary font-medium">click to browse</span></p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between border border-gray-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-emerald-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeFile} className="text-red-danger text-sm font-medium hover:opacity-70 transition-colors">
                    Remove
                  </button>
                </div>
              )}
            </Field>

            <Field label="Payment Reference" hint="Any reference to include with settlements" className="mb-4">
              <Input value={form.reference} onChange={set('reference')} />
            </Field>
            <Field label="Notes" className="mb-4">
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-primary/20 focus:border-emerald-primary/40 transition-colors"
              />
            </Field>
          </>
        )}

        {/* Submit */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Bank Details'}
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">Your information is transmitted securely.</p>
    </div>
  );
}
