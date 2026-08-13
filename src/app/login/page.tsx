import { Suspense } from 'react';

import { LoginForm } from './login-form';

// useSearchParams() (for ?callbackUrl=...) wants a Suspense boundary —
// see Next's guidance on avoiding a full client-side bailout.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
