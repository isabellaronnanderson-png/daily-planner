import { useAuth } from './hooks/useAuth';
import AuthScreen from './components/AuthScreen';
import CheckEmailScreen from './components/CheckEmailScreen';
import PlannerApp from './PlannerApp';
import './App.css';

export default function App() {
  const { user, loading, justSignedUpEmail, clearJustSignedUp, signUp, signIn, signOut } = useAuth();

  if (loading) {
    return <div className="auth-loading-screen">Loading…</div>;
  }

  if (justSignedUpEmail) {
    return <CheckEmailScreen email={justSignedUpEmail} onBackToSignIn={clearJustSignedUp} />;
  }

  if (!user) {
    return <AuthScreen signIn={signIn} signUp={signUp} />;
  }

  return <PlannerApp user={user} signOut={signOut} />;
}
