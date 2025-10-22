
import Link from "next/link";
import { Logo } from "./Logo";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/#about' },
  { name: 'Explore Property', href: '/explore' },
  { name: 'Contact', href: '/contact' },
  { name: 'Login', href: '/login' },
];

export function Footer() {
  return (
    <footer className="bg-black text-amber-100">
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo className="text-white" />
            <p className="text-sm text-amber-200/70 font-medium">
              Unique Investor is the fastest growing company in the field of real estate, dedicated to fulfilling commitments and customer satisfaction.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-amber-200/70 hover:text-white transition-colors font-medium">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold mb-4 text-white">Contact Us</h3>
            <div className="space-y-3 text-sm text-amber-200/70 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-1 text-primary shrink-0" />
                <span>Shop no. 2, 1st floor, Shree Shahmal Pahalwan Complex, <br/>near Brahmma Mandir  Opposite Gaurcity 14th Avenue, Gr.noida 201301</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span>+91 88103 17477</span>
              </div>
               <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>uniqueinvestor@yahoo.com</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold mb-4 text-white">Our Location</h3>
            <div className="aspect-video bg-muted-foreground/20 rounded-lg">
              {/* Map will go here */}
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3500.469798394236!2d77.4137033150893!3d28.619923682400913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDM3JzExLjciTiA3N8KwMjQnNTguNiJF!5e0!3m2!1sen!2sus!4v1620921869815!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
                title="Google Maps Location for Unique Investor"
              ></iframe>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-amber-200/20 flex flex-col sm:flex-row items-center justify-between">
           <p className="text-sm text-amber-200/70 font-medium">&copy; {new Date().getFullYear()} Unique Investor. All Rights Reserved.</p>
           <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <Link href="#" aria-label="Visit our Facebook page" className="text-amber-200/70 hover:text-white"><Facebook className="h-5 w-5" /></Link>
                <Link href="#" aria-label="Visit our Twitter profile" className="text-amber-200/70 hover:text-white"><Twitter className="h-5 w-5" /></Link>
                <Link href="#" aria-label="Check out our Instagram" className="text-amber-200/70 hover:text-white"><Instagram className="h-5 w-5" /></Link>
                <Link href="#" aria-label="Connect with us on LinkedIn" className="text-amber-200/70 hover:text-white"><Linkedin className="h-5 w-5" /></Link>
           </div>
        </div>
      </div>
    </footer>
  );
}
