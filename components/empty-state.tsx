import { WineOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onClear: () => void;
}

export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-border/50 rounded-2xl bg-card/30 backdrop-blur-sm">
      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 border border-border/50">
        <WineOff className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-heading text-2xl text-foreground mb-2 uppercase tracking-widest">
        Não encontramos vinhos com este perfil.
      </h3>
      <p className="text-muted-foreground mb-8 max-w-md font-light">
        Que tal explorar nossos destaques ou ajustar sua busca?
      </p>
      <Button 
        onClick={onClear}
        variant="outline" 
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-6 text-sm uppercase tracking-widest rounded-full transition-all"
      >
        Limpar Filtros
      </Button>
    </div>
  );
}
