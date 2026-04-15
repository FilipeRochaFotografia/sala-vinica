'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Wine } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Image as ImageIcon, X, ChevronLeft, LogOut, Wine as WineIcon, Package, BarChart3 } from 'lucide-react';
import { InventoryTab } from './components/InventoryTab';
import { AnalyticsTab } from './components/AnalyticsTab';

export default function AdminPage() {
  const router = useRouter();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<Partial<Wine> | null>(null);
  const [castasList, setCastasList] = useState<string[]>([]);
  const [castaInput, setCastaInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [wineToDelete, setWineToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const WINE_TYPES = ['Tinto', 'Branco', 'Fortificado', 'Rosé', 'Verde', 'Espumante', 'Champagne'];
  const COUNTRIES = ['Portugal', 'França', 'Itália', 'Espanha', 'Chile', 'Argentina'];
  const REGIONS = ['Douro', 'Alentejo', 'Vinho Verde', 'Dão', 'Bairrada', 'Península de Setúbal', 'Borgonha', 'Bordéus', 'Champagne'];

  const fetchWines = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase.from('wines').select('*').order('name');
    if (error) {
      console.error('Error fetching wines:', error);
      setWines([]);
    } else {
      setWines(data || []);
    }
    if (showLoading) setLoading(false);
  }, []);

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        fetchWines();
      } else {
        setLoading(false);
      }
    }
    checkUser();
  }, [fetchWines]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url') {
      setIsAuthenticated(true);
      setWines([]);
      setLoading(false);
      router.push('/');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      setIsAuthenticated(true);
      fetchWines();
      router.push('/');
    }
  }

  async function handleDeleteConfirm() {
    if (!wineToDelete) return;
    
    const { error } = await supabase.from('wines').delete().eq('id', wineToDelete);
    if (error) {
      setErrorMessage('Erro ao eliminar: ' + error.message);
    } else {
      setWineToDelete(null);
      fetchWines();
    }
  }

  const handleAddCasta = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (castaInput.trim() && !castasList.includes(castaInput.trim())) {
        setCastasList([...castasList, castaInput.trim()]);
        setCastaInput('');
      }
    }
  };

  const handleRemoveCasta = (casta: string) => {
    setCastasList(castasList.filter(c => c !== casta));
  };

  const openDialog = (wine?: Wine) => {
    if (wine) {
      setEditingWine(wine);
      setCastasList(wine.castas ? wine.castas.split(',').map(c => c.trim()).filter(Boolean) : []);
    } else {
      setEditingWine({
        name: '', type: '', year: new Date().getFullYear().toString(), producer: '',
        country: 'Portugal', region: '', castas: '', serve_temp: '', capacity: '750ml',
        abv: '', description: '', price: 0, image_url: '', is_featured: false, is_available: true
      });
      setCastasList([]);
    }
    setCastaInput('');
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      const url = URL.createObjectURL(e.target.files[0]);
      setEditingWine(prev => prev ? { ...prev, image_url: url } : null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWine) return;

    setIsUploading(true);
    let finalImageUrl = editingWine.image_url;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('wine-labels')
        .upload(filePath, imageFile);

      if (uploadError) {
        setErrorMessage('Erro ao fazer upload da imagem: ' + uploadError.message);
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('wine-labels')
        .getPublicUrl(filePath);

      finalImageUrl = publicUrl;
    }

    let finalCastasList = [...castasList];
    if (castaInput.trim() && !finalCastasList.includes(castaInput.trim())) {
      finalCastasList.push(castaInput.trim());
    }

    // Explicitly construct wineData to avoid sending removed columns like 'grapes'
    const wineData = {
      name: editingWine.name,
      type: editingWine.type,
      year: editingWine.year,
      producer: editingWine.producer,
      country: editingWine.country,
      region: editingWine.region,
      castas: finalCastasList.join(', '),
      serve_temp: editingWine.serve_temp,
      capacity: editingWine.capacity,
      abv: editingWine.abv,
      description: editingWine.description,
      price: editingWine.price,
      image_url: finalImageUrl,
      is_featured: editingWine.is_featured,
      is_available: editingWine.is_available !== undefined ? editingWine.is_available : true
    };

    if (editingWine.id) {
      // Update
      const { error } = await supabase.from('wines').update(wineData).eq('id', editingWine.id);
      if (error) setErrorMessage('Erro ao atualizar: ' + error.message);
      else {
        setIsDialogOpen(false);
        setErrorMessage(null);
        fetchWines();
      }
    } else {
      // Create
      const { error } = await supabase.from('wines').insert([wineData]);
      if (error) setErrorMessage('Erro ao criar: ' + error.message);
      else {
        setIsDialogOpen(false);
        setErrorMessage(null);
        fetchWines();
      }
    }
    setIsUploading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-xl">
          <h1 className="font-heading text-2xl text-center mb-6 uppercase tracking-widest text-secondary">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white">
              Entrar
            </Button>
          </form>
          <div className="mt-4 text-xs text-center text-muted-foreground">
            * Se o Supabase não estiver configurado, qualquer login entrará em Modo Demo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Ir para a Carta Digital
            </Button>
            <h1 className="font-heading text-2xl md:text-3xl uppercase tracking-widest text-primary hidden md:block">Sistema de Gestão</h1>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button variant="destructive" onClick={() => supabase.auth.signOut().then(() => { setIsAuthenticated(false); router.push('/'); })}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="vinhos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="vinhos" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <WineIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gestão de Vinhos</span>
              <span className="sm:hidden">Vinhos</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Package className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Controlo de Stock</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dashboard & Análises</span>
              <span className="sm:hidden">Análises</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vinhos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-xl uppercase tracking-widest text-primary dark:text-white">Catálogo de Vinhos</h2>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vinho
              </Button>
            </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl uppercase tracking-widest text-primary dark:text-white">
                {editingWine?.id ? 'Editar Vinho' : 'Adicionar Vinho'}
              </DialogTitle>
            </DialogHeader>
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome do Vinho</Label>
                  <Input 
                    value={editingWine?.name || ''} 
                    onChange={e => setEditingWine({...editingWine, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produtor</Label>
                  <Input 
                    value={editingWine?.producer || ''} 
                    onChange={e => setEditingWine({...editingWine, producer: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editingWine?.type || ''} onValueChange={v => setEditingWine({...editingWine, type: v || ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {WINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input 
                    value={editingWine?.year || ''} 
                    onChange={e => setEditingWine({...editingWine, year: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input 
                    value={editingWine?.country || ''} 
                    onChange={e => setEditingWine({...editingWine, country: e.target.value})} 
                    placeholder="Ex: Portugal"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input 
                    value={editingWine?.region || ''} 
                    onChange={e => setEditingWine({...editingWine, region: e.target.value})} 
                    placeholder="Ex: Douro"
                    required 
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Castas (Pressione Enter para adicionar)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {castasList.map(casta => (
                      <span key={casta} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {casta}
                        <button type="button" onClick={() => handleRemoveCasta(casta)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input 
                    value={castaInput}
                    onChange={e => setCastaInput(e.target.value)}
                    onKeyDown={handleAddCasta}
                    placeholder="Ex: Touriga Nacional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={editingWine?.price || 0} 
                    onChange={e => setEditingWine({...editingWine, price: parseFloat(e.target.value)})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teor Alcoólico</Label>
                  <Input 
                    value={editingWine?.abv || ''} 
                    onChange={e => setEditingWine({...editingWine, abv: e.target.value})} 
                    placeholder="Ex: 13.5%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperatura de Serviço</Label>
                  <Input 
                    value={editingWine?.serve_temp || ''} 
                    onChange={e => setEditingWine({...editingWine, serve_temp: e.target.value})} 
                    placeholder="Ex: 16-18ºC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input 
                    value={editingWine?.capacity || ''} 
                    onChange={e => setEditingWine({...editingWine, capacity: e.target.value})} 
                    placeholder="Ex: 750ml"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Imagem do Vinho</Label>
                  <div className="flex items-center gap-4">
                    {editingWine?.image_url && (
                      <div className="w-16 h-24 relative bg-muted rounded overflow-hidden flex-shrink-0 border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editingWine.image_url} alt="Preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Selecione uma imagem para fazer upload para o Supabase Storage (wine-labels).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingWine?.description || ''} 
                    onChange={e => setEditingWine({...editingWine, description: e.target.value})} 
                    required 
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input 
                    type="checkbox" 
                    id="is_featured"
                    checked={editingWine?.is_featured || false}
                    onChange={e => setEditingWine({...editingWine, is_featured: e.target.checked})}
                    className="w-4 h-4 accent-primary"
                  />
                  <Label htmlFor="is_featured">Destacar na página inicial</Label>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input 
                    type="checkbox" 
                    id="is_available"
                    checked={editingWine?.is_available !== false}
                    onChange={e => setEditingWine({...editingWine, is_available: e.target.checked})}
                    className="w-4 h-4 accent-primary"
                  />
                  <Label htmlFor="is_available">Disponível para venda</Label>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isUploading}>
                  {isUploading ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!wineToDelete} onOpenChange={(open) => !open && setWineToDelete(null)}>
          <DialogContent className="max-w-md bg-background border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase tracking-widest text-secondary">
                Confirmar Eliminação
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">Tem a certeza que deseja eliminar este vinho? Esta ação não pode ser desfeita.</p>
              {errorMessage && (
                <div className="mt-4 bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setWineToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-center">Stock Físico</TableHead>
                <TableHead className="text-center">Destaque</TableHead>
                <TableHead className="text-center">Disponível</TableHead>
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
                  <TableCell>{wine.year}</TableCell>
                  <TableCell className="text-primary dark:text-white font-medium">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(wine.price)}</TableCell>
                  <TableCell className="text-center font-bold">{wine.stock || 0}</TableCell>
                  <TableCell className="text-center">
                    {wine.is_featured ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="Em Destaque" />
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-full bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {wine.is_available !== false ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="Disponível" />
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Pausado / Indisponível" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => openDialog(wine)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setWineToDelete(wine.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
          </TabsContent>

          <TabsContent value="stock">
            <InventoryTab wines={wines} fetchWines={fetchWines} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab wines={wines} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
