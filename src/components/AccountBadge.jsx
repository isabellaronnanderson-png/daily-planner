import { LogOut } from 'lucide-react';

export default function AccountBadge({ user, signOut }) {
  if (!user) return null;
  const initial = (user.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <span className="account-avatar" title={user.email}>{initial}</span>
      <button
        className="header-icon-btn"
        onClick={() => {
          if (confirm('Sign out of isabella\'s planner?')) signOut();
        }}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={14} />
      </button>
    </>
  );
}
