import { Suspense } from 'react';
import ComposeForm from './compose-form';

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <ComposeForm />
    </Suspense>
  );
}
