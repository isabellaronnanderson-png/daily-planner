import { MailCheck } from 'lucide-react';

export default function CheckEmailScreen({ email, onBackToSignIn }) {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-icon-circle">
          <MailCheck size={22} />
        </div>
        <h1 className="auth-title" style={{ fontSize: 24 }}>Check your email</h1>
        <p className="auth-subtitle">
          We've sent a confirmation link to<br />
          <strong style={{ color: 'var(--text)' }}>{email}</strong>
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '16px 0 24px' }}>
          Click the link in that email to confirm your account, then come back here and sign in.
        </p>
        <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={onBackToSignIn}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}
