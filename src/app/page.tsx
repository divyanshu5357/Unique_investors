
"use client"

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { HomeIcon, Menu, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Testimonials } from "@/components/Testimonials";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay"


const navItems = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '#about' },
  { name: 'Explore Property', href: '/investor/dashboard' },
  { name: 'Contact', href: '/contact' },
  { name: 'Login', href: '/login' },
];

const heroImages = [
    { src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573952/Flux_Dev_Photorealistic_3D_render_of_a_miniature_model_house_p_3_pq64wl.jpg", alt: "Miniature model house", hint: "model house" },
    { src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573944/Flux_Dev_Ultrarealistic_render_of_a_modern_residential_apartme_2_w8khqj.jpg", alt: "Modern apartment complex", hint: "modern apartment" },
    { src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573952/Flux_Dev_Highresolution_realistic_image_of_a_luxury_suburban_h_3_z5viaj.jpg", alt: "Luxury suburban home", hint: "suburban house" }
];

const galleryImages = [
    {
      src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752748764/3f511b4d-efd4-4536-93b5-c0496b7c8a52.png",
      alt: "Modern house property available through Unique Investor",
      hint: "modern house exterior",
    },
    {
      src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573945/Flux_Dev_Realistic_front_view_of_a_newly_built_twostory_Indian_1_brw2lq.jpg",
      alt: "Affordable plot for sale in Greater Noida",
      hint: "indian house modern",
    },
    {
      src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573944/Flux_Dev_Ultrarealistic_render_of_a_modern_residential_apartme_2_w8khqj.jpg",
      alt: "Modern apartment complex view",
      hint: "modern apartment"
    },
    {
      src: "https://res.cloudinary.com/dze0vnyip/image/upload/v1752573952/Flux_Dev_Highresolution_realistic_image_of_a_luxury_suburban_h_3_z5viaj.jpg",
      alt: "Spacious suburban family home",
      hint: "suburban house"
    }
];

const heroContent = { title: "UNIQUE INVESTOR", subtitle: "Where Dreams Come True" };

export default function HomePage() {
  const [open, setOpen] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + galleryImages.length) % galleryImages.length);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Logo className="text-white" />
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} className="text-sm font-bold text-white hover:text-primary-foreground/80 transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="md:hidden">
             <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="text-white bg-transparent hover:bg-white/20 hover:text-white border-white">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background">
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
        <section className="relative w-full h-[85vh]">
            <Carousel
                className="w-full h-full"
                plugins={[
                    Autoplay({
                      delay: 5000,
                      stopOnInteraction: true,
                    }),
                  ]}
                  opts={{
                    loop: true,
                  }}
            >
                <CarouselContent>
                    {heroImages.map((image, index) => (
                         <CarouselItem key={index}>
                            <div className="relative h-[85vh] w-full">
                               <Image
                                src={image.src}
                                alt={image.alt}
                                fill
                                priority={index === 0}
                                sizes="100vw"
                                className="z-0 brightness-50 object-cover object-center"
                                data-ai-hint={image.hint}
                              />
                            </div>
                         </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center h-full text-center text-white p-4 pointer-events-none">
                <p className="text-lg md:text-xl max-w-2xl mb-2">
                  {heroContent.subtitle}
                </p>
                <h1 className="text-5xl md:text-7xl font-bold font-headline">{heroContent.title}</h1>
            </div>
        </section>
        <section id="about" className="py-12 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl text-accent">ABOUT UNIQUE INVESTOR</h2>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="w-16 h-px bg-border"></div>
                <HomeIcon className="h-6 w-6 text-accent" />
                <div className="w-16 h-px bg-border"></div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4">
                <p className="text-lg font-bold">
                  UNIQUE INVESTOR is the fastest growing company in the field of real estate.
                </p>
                <p className="text-muted-foreground">
                  The company has been formed with the desire of perfection and dedication to fulfill the commitments, with the aspiration of customer satisfaction. Clear vision, expertise, honesty and good corporate governance experience is behind the success of the company. The innovative approach of the company has given new dimensions to the real estate market.
                </p>
                <p className="text-muted-foreground">
                  It takes a lot to dream, have a vision and like a guiding parent, hand hold it and take it to a bright future. Unique Investor began with a long term thinking by a group of entrepreneurs, who dreamt big and stuck to their vision relentlessly.
                </p>
              </div>
              <div>
                <Image 
                  src="https://res.cloudinary.com/dze0vnyip/image/upload/v1752577691/Key_Exchange_with_Miniature_House_skpuf9.png"
                  alt="Hands holding a model house and keys"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                  data-ai-hint="house keys"
                />
              </div>
            </div>
          </div>
        </section>
        <section id="gallery" className="py-12 md:py-24 bg-muted">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl text-accent">PROPERTY GALLERY</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mx-auto mt-4">
                Explore a selection of our finest properties. Each one is a unique investment opportunity.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <div key={index} className="overflow-hidden rounded-lg cursor-pointer" onClick={() => handleImageClick(index)}>
                  <Image 
                    src={image.src}
                    alt={image.alt}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    data-ai-hint={image.hint}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
        <Testimonials />

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-5xl h-[90vh] flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                src={galleryImages[selectedImageIndex].src}
                alt={galleryImages[selectedImageIndex].alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/75 hover:text-white rounded-full z-50"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
               <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/75 hover:text-white rounded-full z-50"
                onClick={handlePrevImage}
              >
                <ArrowLeft className="h-6 w-6" />
                 <span className="sr-only">Previous Image</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/75 hover:text-white rounded-full z-50"
                onClick={handleNextImage}
              >
                <ArrowRight className="h-6 w-6" />
                 <span className="sr-only">Next Image</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
      <Footer />
    </div>
  )
}
