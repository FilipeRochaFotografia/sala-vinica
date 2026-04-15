import { useState, useEffect } from 'react';
import { Wine, InventoryLog, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

export function AnalyticsTab({ wines }: { wines: Wine[] }) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<InventoryLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Fetch more to calculate stats, but show only 10 in table
      
      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }
    fetchLogs();
  }, []);

  // Calculate KPIs
  const totalStock = wines.reduce((sum, wine) => sum + (wine.stock || 0), 0);
  const totalSold = logs.filter(log => log.transaction_type === 'venda').reduce((sum, log) => sum + log.quantity, 0);

  // Calculate Chart Data (Sales by Wine Type)
  const salesByType: Record<string, number> = {};
  logs.filter(log => log.transaction_type === 'venda').forEach(log => {
    const wine = wines.find(w => w.id === log.wine_id);
    if (wine) {
      salesByType[wine.type] = (salesByType[wine.type] || 0) + log.quantity;
    }
  });

  const chartData = Object.keys(salesByType).map(type => ({
    name: type,
    vendas: salesByType[type]
  })).sort((a, b) => b.vendas - a.vendas);

  // Calculate Low Stock Wines
  const lowStockWines = wines.filter(w => (w.stock || 0) <= 3).sort((a, b) => (a.stock || 0) - (b.stock || 0));

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('branco')) return '#F5F5DC'; // Bege claro
    if (lowerType.includes('tinto')) return '#800020'; // Vinho
    if (lowerType.includes('champagne') || lowerType.includes('espumante')) return '#EEDC82'; // Bege
    if (lowerType.includes('verde')) return '#90EE90'; // Verde claro
    if (lowerType.includes('fortificado')) return '#4A0404'; // Vinho escuro
    if (lowerType.includes('rosé') || lowerType.includes('rose')) return '#FFB6C1'; // Rosa claro
    return '#cccccc'; // Default
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'entrada': return <span className="text-blue-500 font-medium">Entrada</span>;
      case 'venda': return <span className="text-green-500 font-medium">Venda</span>;
      case 'perda': return <span className="text-red-500 font-medium">Perda/Quebra</span>;
      default: return type;
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">A carregar dados...</div>;
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Garrafas Vendidas (Recentes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-heading text-primary">{totalSold}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">Vendas por Tipo de Vinho</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff' }}
                    />
                    <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTypeColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de vendas suficientes.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">Alertas de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockWines.length === 0 ? (
                <p className="text-muted-foreground text-sm">Todos os vinhos têm stock adequado.</p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Vinho</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllAlerts ? lowStockWines : lowStockWines.slice(0, 10)).map(wine => {
                        const stock = wine.stock || 0;
                        let statusLabel = '';
                        let statusColor = '';
                        if (stock === 0) {
                          statusLabel = 'Precisa';
                          statusColor = 'text-red-500 bg-red-500/10';
                        } else if (stock === 1) {
                          statusLabel = 'Urgente';
                          statusColor = 'text-orange-500 bg-orange-500/10';
                        } else {
                          statusLabel = 'Próximo';
                          statusColor = 'text-yellow-500 bg-yellow-500/10';
                        }

                        return (
                          <TableRow key={wine.id} className="border-border">
                            <TableCell className="font-medium">{wine.name}</TableCell>
                            <TableCell className="text-center font-bold">{stock}</TableCell>
                            <TableCell className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {lowStockWines.length > 10 && (
                    <div className="p-2 border-t border-border bg-muted/20 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAllAlerts(!showAllAlerts)}
                        className="w-full text-xs text-muted-foreground hover:text-primary"
                      >
                        {showAllAlerts ? 'Ver Menos' : `Ver Mais (${lowStockWines.length - 10})`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
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
                        setIsDialogOpen(true);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
