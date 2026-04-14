import { Calendar, Wine as WineIcon, Building2, Globe2, Map, Grape, Cylinder, FlaskConical, Thermometer } from 'lucide-react';
import { Wine } from '@/lib/supabase';

interface TechnicalGridProps {
  wine: Wine;
}

export function TechnicalGrid({ wine }: TechnicalGridProps) {
  const items = [
    { label: 'Colheita', value: wine.year, icon: Calendar },
    { label: 'Tipo de Vinho', value: wine.type, icon: WineIcon },
    { label: 'Produtor', value: wine.producer, icon: Building2 },
    { label: 'País', value: wine.country, icon: Globe2 },
    { label: 'Região', value: wine.region, icon: Map },
    { label: 'Castas', value: wine.castas, icon: Grape },
    { label: 'Capacidade', value: wine.capacity, icon: Cylinder },
    { label: 'Teor Alcoólico (%)', value: wine.abv, icon: FlaskConical },
    { label: 'Servir a', value: wine.serve_temp, icon: Thermometer },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-muted/50 text-primary border border-primary/10">
              <Icon className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {item.label}
              </h4>
              <p className="text-base font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
