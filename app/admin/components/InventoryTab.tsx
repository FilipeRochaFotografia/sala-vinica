import { useState } from 'react';
import { Wine, InventoryLog, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackagePlus } from 'lucide-react';

export function InventoryTab({ wines, fetchWines }: { wines: Wine[], fetchWines: (showLoading?: boolean) => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [transactionType, setTransactionType] = useState<'entrada' | 'venda' | 'perda'>('entrada');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdjustStock = (wine: Wine) => {
    setSelectedWine(wine);
    setTransactionType('entrada');
    setQuantity('');
    setComment('');
    setUserName('');
    const now = new Date();
    setTransactionDate(now.toISOString().slice(0, 16));
    setError(null);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWine || !quantity || quantity <= 0 || !userName || !transactionDate) return;
    setIsConfirmDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedWine || !quantity || quantity <= 0 || !userName || !transactionDate) return;

    setIsSubmitting(true);
    setError(null);

    const qty = Number(quantity);
    const currentStock = selectedWine.stock || 0;
    
    let newStock = currentStock;
    if (transactionType === 'entrada') {
      newStock += qty;
    } else {
      newStock -= qty;
      if (newStock < 0) newStock = 0; // Prevent negative stock
    }

    try {
      // 1. Insert into inventory_logs
      const { error: logError } = await supabase.from('inventory_logs').insert([{
        wine_id: selectedWine.id,
        transaction_type: transactionType,
        quantity: qty,
        comment: comment,
        user_name: userName,
        transaction_date: new Date(transactionDate).toISOString()
      }]);

      if (logError) throw logError;

      // 2. Update wines table
      const updateData: any = { stock: newStock };
      if (newStock === 0) {
        updateData.is_available = false;
      } else if (currentStock === 0 && newStock > 0) {
        updateData.is_available = true;
      }

      const { error: updateError } = await supabase.from('wines').update(updateData).eq('id', selectedWine.id);

      if (updateError) throw updateError;

      setIsConfirmDialogOpen(false);
      setIsDialogOpen(false);
      fetchWines(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao ajustar stock');
      setIsConfirmDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[80px]">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Stock Atual</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wines.map((wine) => (
              <TableRow key={wine.id} className="border-border">
                <TableCell>
                  <div className="w-10 h-14 relative bg-muted rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wine.image_url || 'https://picsum.photos/seed/wine/400/600'} alt={wine.name} className="object-cover w-full h-full" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{wine.name}</TableCell>
                <TableCell>{wine.type}</TableCell>
                <TableCell className="text-center font-bold text-lg">{wine.stock || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openAdjustStock(wine)} className="border-primary text-primary hover:bg-primary hover:text-white">
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Ajustar Stock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">
              Ajustar Stock: {selectedWine?.name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
            {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}
            
            <div className="space-y-2">
              <Label>Tipo de Movimento</Label>
              <Select value={transactionType} onValueChange={(val: any) => setTransactionType(val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Adicionar)</SelectItem>
                  <SelectItem value="venda">Venda (Subtrair)</SelectItem>
                  <SelectItem value="perda">Perda/Quebra (Subtrair)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input 
                type="number" 
                min="1" 
                required 
                value={quantity} 
                onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input 
                  type="text" 
                  required 
                  value={userName} 
                  onChange={e => setUserName(e.target.value)}
                  className="bg-background"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input 
                  type="datetime-local" 
                  required 
                  value={transactionDate} 
                  onChange={e => setTransactionDate(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comentário/Motivo (Opcional)</Label>
              <Textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)}
                className="bg-background min-h-[100px]"
                placeholder="Ex: Quebra de garrafa, oferta, etc."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white">
                Confirmar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">
              Confirmar Ajuste
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground">Tem a certeza que deseja ajustar o stock?</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAdjustStock} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white">
              {isSubmitting ? 'A Guardar...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
