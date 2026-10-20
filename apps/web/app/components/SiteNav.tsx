import Link from 'next/link';

export function SiteNav() {
  return <nav className="nav container">
    <Link className="wordmark" href="/"><span className="prism" aria-hidden="true" />prismai</Link>
    <div className="nav-links"><Link href="/pricing">Tarifs</Link><Link href="/chat">Espace chat</Link><Link href="/dashboard">Dashboard</Link><Link className="btn btn-primary" href="/signup">Commencer</Link></div>
  </nav>;
}
