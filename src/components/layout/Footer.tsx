import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

const quickLinks = [
  { href: '/loans', label: 'Loan Products' },
  { href: '/calculator', label: 'Loan Calculator' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

const memberLinks = [
  { href: '/login', label: 'Member Login' },
  { href: '/register', label: 'Become a Member' },
  { href: '/member/dashboard', label: 'Online Banking' },
  { href: '/member/applications', label: 'Apply for Loan' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/disclosures', label: 'Disclosures' },
  { href: '/accessibility', label: 'Accessibility' },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <span className="text-lg font-bold">Y12</span>
              </div>
              <div>
                <span className="text-lg font-semibold">Y-12 Federal</span>
                <span className="block text-xs text-primary-foreground/70">Credit Union</span>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/80 mb-4">
              Serving our members since 1948. Federally insured by NCUA.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a href="tel:+18659668000" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Phone className="h-4 w-4" />
                (865) 966-8000
              </a>
              <a href="mailto:info@y12fcu.org" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Mail className="h-4 w-4" />
                info@y12fcu.org
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>Oak Ridge, Tennessee</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Member Services</h3>
            <ul className="space-y-2">
              {memberLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/70">
              &copy; {new Date().getFullYear()} Y-12 Federal Credit Union. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <img
                src="https://www.ncua.gov/sites/default/files/ncua-logo.svg"
                alt="NCUA"
                className="h-8 opacity-70"
              />
              <span className="text-xs text-primary-foreground/60">
                Federally Insured by NCUA
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
