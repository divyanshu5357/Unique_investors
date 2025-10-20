
"use client"
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from './ui/star-rating';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

interface Testimonial {
    id: string;
    name: string;
    message: string;
    rating: number;
    imageUrl?: string;
    imageHint?: string;
}

const testimonials: Testimonial[] = [
    {
        id: '1',
        name: 'Sushila',
        message: 'They made the whole process easy for us. We’re so happy with our new home!',
        rating: 5,
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHdvbWFufGVufDB8fHx8MTc1MzE3ODIwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'happy woman'
    },
    {
        id: '2',
        name: 'Durgesh',
        message: 'They explained everything clearly and made buying a home feel simple.',
        rating: 5,
        imageUrl: 'https://images.unsplash.com/photo-1629185752040-57f6fa9b4f53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxzbWlsaW5nJTIwbWFufGVufDB8fHx8MTc1MzEzMDA0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'smiling man'
    },
    {
        id: '3',
        name: 'Tripti',
        message: 'They explained everything clearly and made buying a home feel simple.',
        rating: 5,
        imageUrl: 'https://images.unsplash.com/photo-1572955995017-e769428eb228?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxzYXRpc2ZpZWQlMjBjbGllbnR8ZW58MHx8fHwxNzUzMTc4MjAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'satisfied client'
    },
    {
        id: '4',
        name: 'Umesh Singh',
        message: 'We always felt like they had our best interest in mind. We’re really happy we chose them.',
        rating: 5,
        imageUrl: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxwcm9mZXNzaW9uYWwlMjBwZXJzb258ZW58MHx8fHwxNzUzMTc4MjAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'professional person'
    },
    {
        id: '5',
        name: 'Ayush',
        message: 'We had no idea where to start, but they guided us every step of the way.',
        rating: 5,
        imageUrl: 'https://images.unsplash.com/photo-1528900403525-dc523d4f18d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHx5b3VuZyUyMG1hbnxlbnwwfHx8fDE3NTMxNzgyMDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
        imageHint: 'young man'
    },
];

export function Testimonials() {
    return (
        <section id="testimonials" className="py-12 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl text-accent">What Our Clients Say</h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mx-auto mt-4">
                        Read testimonials from our satisfied investors and partners.
                    </p>
                </div>
                
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    plugins={[
                        Autoplay({
                          delay: 5000,
                          stopOnInteraction: true,
                        }),
                      ]}
                    className="w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto"
                >
                    <CarouselContent>
                        {testimonials.map((testimonial) => (
                             <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                                 <div className="p-1 h-full">
                                    <Card className="h-full flex flex-col shadow-lg">
                                        <CardContent className="flex flex-col items-center justify-center text-center p-6 flex-grow">
                                            <Avatar className="w-20 h-20 mb-4 border-2 border-primary">
                                                <AvatarImage 
                                                    src={testimonial.imageUrl || `https://placehold.co/100x100.png?text=${testimonial.name.charAt(0)}`} 
                                                    alt={testimonial.name} 
                                                    data-ai-hint={testimonial.imageHint || 'person portrait'} 
                                                />
                                                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <h3 className="text-lg font-semibold font-headline">{testimonial.name}</h3>
                                            <div className="my-2">
                                                <StarRating rating={testimonial.rating} />
                                            </div>
                                            <p className="text-sm text-muted-foreground italic">"{testimonial.message}"</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
            </div>
        </section>
    );
}
