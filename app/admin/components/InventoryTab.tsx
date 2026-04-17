import { useState, useEffect, useMemo } from 'react';
import { Wine, InventoryLog, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PackagePlus, Search, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react';

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

  // Analytics states
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [salesFilter, setSalesFilter] = useState('30'); // '7', '30', '90', '180', '365'
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<InventoryLog | null>(null);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');

  const WINE_TYPES = ['Tinto', 'Branco', 'Fortificado', 'Rosé', 'Verde', 'Espumante', 'Champagne'];
  const REGIONS = ['Douro', 'Alentejo', 'Vinho Verde', 'Dão', 'Bairrada', 'Península de Setúbal', 'Borgonha', 'Bordéus', 'Champagne'];

  const filteredWines = useMemo(() => {
    let result = wines.filter(wine => {
      const matchesSearch = wine.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || wine.type === typeFilter;
      const matchesRegion = regionFilter === 'all' || wine.region === regionFilter;
      return matchesSearch && matchesType && matchesRegion;
    });

    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
      return 0;
    });

    return result;
  }, [wines, searchQuery, typeFilter, regionFilter, sortBy]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setLogs(data);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalStock = useMemo(() => wines.reduce((sum, wine) => sum + (wine.stock || 0), 0), [wines]);

  const filteredSalesData = useMemo(() => {
    if (!logs) return 0;
    const now = new Date();
    const daysToSubtract = parseInt(salesFilter, 10);
    const filterDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
    
    return logs
      .filter(log => log.transaction_type === 'venda')
      .filter(log => {
        const logDate = new Date(log.transaction_date || log.created_at);
        return logDate >= filterDate;
      })
      .reduce((sum, log) => sum + log.quantity, 0);
  }, [logs, salesFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'entrada': return <span className="text-blue-500 font-medium">Entrada</span>;
      case 'venda': return <span className="text-green-500 font-medium">Venda</span>;
      case 'perda': return <span className="text-red-500 font-medium">Perda/Quebra</span>;
      default: return <span>{type}</span>;
    }
  };

  const openAdjustStock = (wine: Wine, type: 'entrada' | 'venda' | 'perda') => {
    setSelectedWine(wine);
    setTransactionType(type);
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
      fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Erro ao ajustar stock');
      setIsConfirmDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total de Garrafas em Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-heading text-primary">{totalStock}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Garrafas Vendidas</CardTitle>
            <Select value={salesFilter} onValueChange={setSalesFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Neste Trimestre</SelectItem>
                <SelectItem value="180">Neste Semestre</SelectItem>
                <SelectItem value="365">Neste Ano</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-heading text-primary">{filteredSalesData}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6">
        <div className="relative flex-1 md:max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar vinho..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-primary/20 focus-visible:ring-primary rounded-full h-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
          <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10 w-full md:w-[200px]">
            <SelectValue>
              {typeFilter === 'all' ? 'Tipo de Vinho' : typeFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="text-primary dark:text-white">
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {WINE_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || 'all')}>
          <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10 w-full md:w-[200px]">
            <SelectValue>
              {regionFilter === 'all' ? 'Região' : regionFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="text-primary dark:text-white">
            <SelectItem value="all">Todas as Regiões</SelectItem>
            {REGIONS.map(region => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'name_asc')}>
          <SelectTrigger className="bg-background text-primary dark:text-white border-primary hover:bg-primary/5 transition-colors rounded-full font-semibold uppercase tracking-widest text-xs h-10 w-full md:w-[250px]">
            <SelectValue>
              {sortBy === 'name_asc' && 'Ordem Alfabética (A-Z)'}
              {sortBy === 'name_desc' && 'Ordem Alfabética (Z-A)'}
              {sortBy === 'stock_asc' && 'Stock (Menor para Maior)'}
              {sortBy === 'stock_desc' && 'Stock (Maior para Menor)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="text-primary dark:text-white">
            <SelectItem value="name_asc">Ordem Alfabética (A-Z)</SelectItem>
            <SelectItem value="name_desc">Ordem Alfabética (Z-A)</SelectItem>
            <SelectItem value="stock_asc">Stock (Menor para Maior)</SelectItem>
            <SelectItem value="stock_desc">Stock (Maior para Menor)</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            {filteredWines.map((wine) => (
              <TableRow key={wine.id} className="border-border">
                <TableCell>
                  <div className="w-10 h-14 relative bg-muted rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wine.image_url || 'https://picsum.photos/seed/wine/400/600'} alt={wine.name} className="object-cover w-full h-full" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{wine.name}</TableCell>
                <TableCell>{wine.type}</TableCell>
                <TableCell className="text-center font-bold text-lg text-primary dark:text-white">{wine.stock || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col xl:flex-row justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openAdjustStock(wine, 'venda')} className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white dark:text-green-500">
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      Venda
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openAdjustStock(wine, 'entrada')} className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:text-blue-500">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      Entrada
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openAdjustStock(wine, 'perda')} className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white dark:text-red-500">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Perda/Quebra
                    </Button>
                  </div>
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
              Registar {transactionType === 'entrada' ? 'Entrada' : transactionType === 'venda' ? 'Venda' : 'Perda/Quebra'}: {selectedWine?.name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
            {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

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

      {/* Recent Activity */}
      <Card className="bg-card border-border mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Vinho</TableHead>
                  <TableHead>Movimento</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllLogs ? logs : logs.slice(0, 10)).map((log) => {
                  const wine = wines.find(w => w.id === log.wine_id);
                  return (
                    <TableRow 
                      key={log.id} 
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedLog(log);
                        setIsLogDialogOpen(true);
                      }}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(log.transaction_date || log.created_at)}</TableCell>
                      <TableCell className="font-medium">{log.user_name || '-'}</TableCell>
                      <TableCell className="font-medium">{wine?.name || 'Vinho Removido'}</TableCell>
                      <TableCell>{getTransactionLabel(log.transaction_type)}</TableCell>
                      <TableCell className="text-right font-bold">{log.quantity}</TableCell>
                    </TableRow>
                  );
                })}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum movimento registado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {logs.length > 10 && (
              <div className="p-2 border-t border-border bg-muted/20 text-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="w-full text-xs text-muted-foreground hover:text-primary"
                >
                  {showAllLogs ? 'Ver Menos' : `Ver Mais (${logs.length - 10})`}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">
              Detalhes do Movimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium">{formatDate(selectedLog.transaction_date || selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{selectedLog.user_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vinho</p>
                  <p className="font-medium">{wines.find(w => w.id === selectedLog.wine_id)?.name || 'Vinho Removido'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Movimento</p>
                  <p>{getTransactionLabel(selectedLog.transaction_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="font-bold text-lg">{selectedLog.quantity}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Comentário/Motivo</p>
                <div className="p-3 bg-muted/30 rounded-md min-h-[80px] text-sm">
                  {selectedLog.comment || 'Nenhum comentário.'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
