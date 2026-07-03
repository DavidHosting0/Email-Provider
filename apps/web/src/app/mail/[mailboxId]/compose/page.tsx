import { Suspense } from 'react';
import ComposeForm from './compose-form';

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-mail-bg p-6 text-sm text-mail-muted">Loading...</div>}>
      <ComposeForm />
    </Suspense>
  );
}
