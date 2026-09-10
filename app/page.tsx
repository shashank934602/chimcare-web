import { redirect } from 'next/navigation';

// The homepage is out of scope for this slice; send visitors to the locations hub.
export default function Home() {
  redirect('/locations/');
}
