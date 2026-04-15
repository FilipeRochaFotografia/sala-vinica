import Image from 'next/image';
import Link from 'next/link';
import { Wine } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';

interface WineCardProps {
  wine: Wine;
  searchParams?: string;
}

export function WineCard({ wine, searchParams = '' }: WineCardProps) {
  const href = searchParams ? `/wine/${wine.id}?${searchParams}` : `/wine/${wine.id}`;
  
  return (
    <Link href={href}>
      <Card className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col cursor-pointer">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative w-full aspect-[3/4] bg-muted/20 overflow-hidden">
            <Image
              src={wine.image_url || 'https://picsum.photos/seed/wine/400/600'}
              alt={wine.name}
              fill
              className="object-contain object-center group-hover:scale-105 transition-transform duration-500 p-4"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="bg-background px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-primary dark:text-white border border-primary/20 dark:border-primary shadow-sm">
                {wine.type}
              </div>
              <div className="text-sm font-semibold text-foreground bg-background px-3 py-1.5 rounded shadow-sm">
                {wine.year}
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-col flex-grow">
            <h3 className="font-heading text-xl font-medium text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {wine.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
              {wine.producer} • {wine.region}
            </p>
            <div className="mt-auto flex justify-between items-center">
              {wine.is_available !== false ? (
                <span className="text-lg font-medium text-primary dark:text-white">
                  {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(wine.price)}
                </span>
              ) : (
                <span className="text-sm font-semibold text-primary dark:text-white uppercase tracking-widest">
                  Indisponível
                </span>
              )}
              <span className="text-xs uppercase tracking-widest text-primary dark:text-white font-semibold group-hover:bg-primary/5 px-4 py-2 rounded-full border border-transparent group-hover:border-primary/20 transition-all">
                Ver Detalhes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
