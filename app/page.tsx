'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, SlidersHorizontal, X, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { supabase, Wine } from '@/lib/supabase';
import { WineCard } from '@/components/wine-card';
import { EmptyState } from '@/components/empty-state';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const router = useRouter();
  const [wines, setWines] = useState<Wine[]>([]);
  const [featuredWines, setFeaturedWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial theme
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    async function fetchWines() {
      setIsLoading(true);
      const { data, error } = await supabase.from('wines').select('*');
      if (error) {
        console.error('Error fetching wines:', error);
      } else if (data) {
        setWines(data);
        setFeaturedWines(data.filter(w => w.is_featured));
      }
      setIsLoading(false);
    }
    fetchWines();

    // Check auth status for admin controls
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  // Apply filters, search and sorting
  const filteredWines = useMemo(() => {
    return wines
      .filter(w => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.producer.toLowerCase().includes(q) ||
          w.castas?.toLowerCase().includes(q) ||
          w.region.toLowerCase().includes(q)
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
  }, [wines, searchQuery, typeFilter, regionFilter, sortBy]);

  const uniqueTypes = Array.from(new Set(wines.map(w => w.type)));
  const uniqueRegions = Array.from(new Set(wines.map(w => w.region)));

  const currentSearchParams = new URLSearchParams({
    q: searchQuery,
    type: typeFilter,
    region: regionFilter,
    sort: sortBy
  }).toString();

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setRegionFilter('all');
    setSortBy('name_asc');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 w-1/4">
            <button className="p-2 text-foreground hover:text-primary transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')} className="hidden md:flex border-primary text-primary dark:text-white hover:bg-primary/5 hover:text-primary dark:hover:text-white rounded-full font-semibold uppercase tracking-widest text-xs px-6">
                <Settings className="w-4 h-4 mr-2 text-primary" />
                Gestão
              </Button>
            )}
          </div>
          
          {!isSearchOpen ? (
            <div className="flex-1 flex justify-center">
              <h1 className="font-heading text-2xl md:text-3xl tracking-widest text-primary uppercase text-center">
                Sala Vínica
              </h1>
            </div>
          ) : (
            <div className="flex-1 max-w-md mx-auto flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input 
                autoFocus
                placeholder="Pesquisar por nome, produtor, casta..." 
                className="border-none bg-transparent focus-visible:ring-0 text-lg px-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 w-1/4">
            <button onClick={toggleTheme} className="p-2 text-foreground hover:text-primary transition-colors" title="Alternar Tema">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex text-muted-foreground hover:text-destructive" title="Sair do Admin">
                <LogOut className="w-4 h-4" />
              </Button>
            )}
            {!isSearchOpen && (
              <button onClick={() => setIsSearchOpen(true)} className="p-2 text-foreground hover:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-16">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground uppercase tracking-widest text-sm">A carregar vinhos...</p>
          </div>
        ) : (
          <>
            {/* Featured Section */}
            {featuredWines.length > 0 && !searchQuery && typeFilter === 'all' && regionFilter === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-heading text-xl md:text-2xl text-primary dark:text-white uppercase tracking-wider">
                    Produtos em Destaque
                  </h2>
                </div>
                
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {featuredWines.map((wine) => (
                      <CarouselItem key={wine.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <div className="h-[450px]">
                          <WineCard wine={wine} searchParams={currentSearchParams} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="hidden md:block">
                    <CarouselPrevious className="-left-12 bg-background border-border text-foreground hover:bg-primary hover:text-primary-foreground" />
                    <CarouselNext className="-right-12 bg-background border-border text-foreground hover:bg-primary hover:text-primary-foreground" />
                  </div>
                </Carousel>
              </section>
            )}

            {/* Catalog Section */}
            <section>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-t border-border pt-12">
                <div className="flex-1 space-y-4">
                  <h2 className="font-heading text-xl md:text-2xl text-primary dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                    Catálogo
                  </h2>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4">
                    <div className="w-full sm:w-[200px]">
                      <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
                        <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10">
                          <SelectValue>
                            {typeFilter === 'all' ? 'Tipo' : typeFilter}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          {uniqueTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full sm:w-[200px]">
                      <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || 'all')}>
                        <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10">
                          <SelectValue>
                            {regionFilter === 'all' ? 'Regiões' : regionFilter}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Regiões</SelectItem>
                          {uniqueRegions.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Sorting */}
                <div className="w-full md:w-[250px]">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    Ordenar por
                  </label>
                  <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'name_asc')}>
                    <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10">
                      <SelectValue>
                        {sortBy === 'name_asc' && 'Ordem Alfabética (A-Z)'}
                        {sortBy === 'name_desc' && 'Ordem Alfabética (Z-A)'}
                        {sortBy === 'price_asc' && 'Valor (Menor para Maior)'}
                        {sortBy === 'price_desc' && 'Valor (Maior para Menor)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Ordem Alfabética (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Ordem Alfabética (Z-A)</SelectItem>
                      <SelectItem value="price_asc">Valor (Menor para Maior)</SelectItem>
                      <SelectItem value="price_desc">Valor (Maior para Menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Wine Grid or Empty State */}
              {filteredWines.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredWines.map(wine => (
                      <div key={wine.id} className="h-[450px]">
                        <WineCard wine={wine} searchParams={currentSearchParams} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Load More */}
                  <div className="mt-12 flex justify-center">
                    <Button variant="outline" className="border-primary text-primary dark:text-white hover:bg-primary/5 hover:text-primary dark:hover:text-white px-10 py-6 text-sm font-semibold uppercase tracking-widest rounded-full transition-all">
                      Ver Mais
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState onClear={clearFilters} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
