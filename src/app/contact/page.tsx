"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Menu, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { submitContactForm } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/#about" },
  { name: "Explore Property", href: "/investor/dashboard" },
  { name: "Contact", href: "/contact" },
  { name: "Login", href: "/login" },
];

function ContactForm() {
  const searchParams = useSearchParams();
  const prefilledMessage = searchParams?.get("message") ?? "";

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState(prefilledMessage);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setMessage(prefilledMessage);
  }, [prefilledMessage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName || !email || !message) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await submitContactForm({
        firstName,
        lastName,
        email,
        phone,
        message,
        submittedAt: new Date().toISOString(),
      });
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error("Error submitting form: ", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+91 12345 67890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Your message..."
          className="min-h-[100px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}

export default function ContactPage() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                <div className="grid gap-4 py-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section id="contact" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl md:text-5xl">
                  Contact Us
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Have questions? We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
                </p>
                <div className="space-y-4 text-muted-foreground">
                  <div className="flex items-start gap-4">
                    <MapPin className="h-6 w-6 text-primary mt-1 shrink-0" />
                    <span>
                      Shop no. 2, 1st floor, Shree Shahmal Pahalwan Complex, near Brahmma Mandir Opposite Gaurcity 14th Avenue, Gr.noida 201301
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="h-6 w-6 text-primary" />
                    <span>+91 88103 17477</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Mail className="h-6 w-6 text-primary" />
                    <span>uniqueinvestor@yahoo.com</span>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    <ContactForm />
                  </React.Suspense>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
 