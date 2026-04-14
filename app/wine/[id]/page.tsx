'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Menu, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, Wine } from '@/lib/supabase';
import { TechnicalGrid } from '@/components/technical-grid';
import { Button } from '@/components/ui/button';

export default function WineDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  const [allWines, setAllWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWines() {
      setIsLoading(true);
      const { data, error } = await supabase.from('wines').select('*');
      if (error) {
        console.error('Error fetching wines:', error);
      } else if (data) {
        setAllWines(data);
      }
      setIsLoading(false);
    }
    fetchWines();
  }, []);
  
  // Reconstruct filtered list based on searchParams
  const q = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type') || 'all';
  const regionFilter = searchParams.get('region') || 'all';
  const sortBy = searchParams.get('sort') || 'name_asc';

  const filteredWines = allWines
    .filter(w => {
      if (!q) return true;
      const query = q.toLowerCase();
      return (
        w.name.toLowerCase().includes(query) ||
        w.producer.toLowerCase().includes(query) ||
        w.castas?.toLowerCase().includes(query) ||
        w.region.toLowerCase().includes(query)
      );
    })
    .filter(w => typeFilter === 'all' || w.type.toLowerCase() === typeFilter.toLowerCase())
    .filter(w => regionFilter === 'all' || w.region.toLowerCase() === regionFilter.toLowerCase())
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });

  const wine = allWines.find(w => w.id === id) || null;
  const currentIndex = filteredWines.findIndex(w => w.id === id);
  
  const nextWineId = currentIndex !== -1 
    ? (currentIndex < filteredWines.length - 1 ? filteredWines[currentIndex + 1].id : filteredWines[0].id)
    : null;
    
  const prevWineId = currentIndex !== -1 
    ? (currentIndex > 0 ? filteredWines[currentIndex - 1].id : filteredWines[filteredWines.length - 1].id)
    : null;

  const currentSearchParamsString = searchParams.toString();
  const backUrl = currentSearchParamsString ? `/?${currentSearchParamsString}` : '/';

  if (isLoading || !wine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground uppercase tracking-widest text-sm">A decantar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <button onClick={() => router.push(backUrl)} className="p-2 text-foreground hover:text-primary transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading text-2xl md:text-3xl tracking-widest text-primary uppercase text-center cursor-pointer" onClick={() => router.push('/')}>
            Sala Vínica
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-2 text-foreground hover:text-primary transition-colors hidden sm:block">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-foreground hover:text-primary transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
          
          {/* Left Column: Image */}
          <div className="w-full lg:w-5/12 flex justify-center">
            <div className="relative w-full max-w-md aspect-[1/2] lg:aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10 border border-border/50 p-8 flex items-center justify-center">
              {/* Decorative background blur */}
              <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full" />
              
              <div className="relative w-full h-full drop-shadow-2xl">
                <Image
                  src={wine.image_url || 'https://picsum.photos/seed/wine/400/600'}
                  alt={wine.name}
                  fill
                  className="object-contain object-center"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="w-full lg:w-7/12 space-y-12">
            
            {/* Title & Price */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-widest">
                  {wine.type} • {wine.year}
                </div>
                {wine.is_available === false && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-widest shadow-sm">
                    Indisponível no momento
                  </div>
                )}
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight">
                {wine.name}
              </h1>
              <p className="text-2xl md:text-3xl font-light text-secondary">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(wine.price)}
              </p>
              
              <div className="w-24 h-px bg-border my-8" />
              
              <p className="text-lg text-muted-foreground leading-relaxed font-light">
                {wine.description}
              </p>
            </div>

            {/* Technical Grid */}
            <div className="pt-8 border-t border-border">
              <h3 className="font-heading text-xl uppercase tracking-widest text-foreground mb-8">
                Informação Técnica
              </h3>
              <TechnicalGrid wine={wine} />
            </div>
            
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border p-4 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push(backUrl)}
            className="text-muted-foreground hover:text-foreground uppercase tracking-widest text-xs sm:text-sm hidden md:flex"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar ao Menu
          </Button>
          
          <div className="flex gap-2 w-full md:w-auto justify-between md:justify-end">
            {prevWineId && (
              <Button 
                variant="outline" 
                onClick={() => router.push(`/wine/${prevWineId}${currentSearchParamsString ? `?${currentSearchParamsString}` : ''}`)}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest text-xs sm:text-sm rounded-full px-6"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
            {nextWineId && (
              <Button 
                variant="default" 
                onClick={() => router.push(`/wine/${nextWineId}${currentSearchParamsString ? `?${currentSearchParamsString}` : ''}`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-widest text-xs sm:text-sm rounded-full px-6"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
