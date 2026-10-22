import { ResendVerificationForm } from '../components/ResendVerificationForm';

export default function VerifyEmailPage({ searchParams }: { searchParams?: { email?: string } }) {
  return <ResendVerificationForm initialEmail={searchParams?.email ?? ''} />;
}
