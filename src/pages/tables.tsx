import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Edit3, Eye, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Badge, Button, Card, Empty, Input, Loading } from '../components/ui';

type TableRecord = {
  _id: string;
  number: string;
  displayName?: string;
  capacity: number;
  zone: string;
  active: boolean;
  state: string;
  qrTokenHint?: string;
};

type QrPreview = { table: string; url: string; image: string };

export function TablesManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<TableRecord> | null>(null);
  const [qr, setQr] = useState<QrPreview | null>(null);
  const [renderingQr, setRenderingQr] = useState(false);

  const tables = useQuery<TableRecord[]>({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables'),
  });

  async function showQr(tableId: string, tableNumber: string, token: string, url: string) {
    setRenderingQr(true);
    try {
      const rendered: { data: string } = await api.post(`/tables/${tableId}/qr/render`, {
        qrToken: token,
        type: 'png',
      });
      setQr({ table: tableNumber, url, image: rendered.data });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not render QR code');
    } finally {
      setRenderingQr(false);
    }
  }

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing?._id ? api.patch(`/tables/${editing._id}`, payload) : api.post('/tables', payload),
    onSuccess: async (result: any) => {
      toast.success(editing?._id ? 'Table updated' : 'Table created');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      if (result?.table && result?.qrToken && result?.qrUrl) {
        await showQr(result.table._id, result.table.number, result.qrToken, result.qrUrl);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      toast.success('Table deleted');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const regenerate = useMutation({
    mutationFn: (table: TableRecord) => api.post(`/tables/${table._id}/qr/regenerate`),
    onSuccess: async (result: any, table) => {
      toast.success('Old QR revoked and a new QR created');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      await showQr(table._id, table.number, result.qrToken, result.qrUrl);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const preview = useMutation({
    mutationFn: (table: TableRecord) => api.get(`/tables/${table._id}/qr`),
    onSuccess: (result: any, table) => {
      setQr({ table: table.number, url: result.qrUrl, image: result.data });
    },
    onError: (error: Error) => toast.error(error.message, { duration: 7000 }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate({
      number: String(form.get('number') || '').trim(),
      displayName: String(form.get('displayName') || '').trim(),
      capacity: Number(form.get('capacity')),
      zone: String(form.get('zone') || '').trim(),
      state: String(form.get('state')),
      active: form.get('active') === 'on',
    });
  }

  function downloadQr() {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr.image;
    link.download = `table-${qr.table}-qr.png`;
    link.click();
  }

  function printQr() {
    if (!qr) return;
    const popup = window.open('', '_blank', 'width=640,height=760');
    if (!popup) return toast.error('Allow popups to print the QR card');
    popup.document.write(`<!doctype html><html><head><title>Table ${qr.table} QR</title><style>body{font-family:Arial;text-align:center;padding:48px}img{width:420px;max-width:90%}h1{font-size:42px;margin-bottom:8px}p{color:#555}</style></head><body><h1>Table ${qr.table}</h1><p>Scan to view the menu and order</p><img src="${qr.image}"/><p>${qr.url}</p><script>onload=()=>print()</script></body></html>`);
    popup.document.close();
  }

  if (tables.isLoading) return <Loading />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink/50">Floor, capacity and secure ordering access</p>
          <h2 className="font-serif text-4xl">Table management</h2>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="mr-2 inline" size={17} /> Add table
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tables.data?.map((table) => (
          <Card className="p-5" key={table._id}>
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs text-ink/45">{table.zone}</p>
                <h3 className="font-serif text-3xl">{table.displayName || `Table ${table.number}`}</h3>
              </div>
              <Badge tone={table.state === 'available' ? 'good' : table.state === 'disabled' ? 'bad' : 'warn'}>
                {table.state}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-ink/55">Seats {table.capacity}</p>
            <p className="mt-1 text-xs text-ink/40">
              {table.qrTokenHint ? `QR secured · ending ${table.qrTokenHint}` : 'No QR token'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button title="Edit table" className="rounded-lg bg-black/5 p-2" onClick={() => setEditing(table)}>
                <Edit3 size={16} />
              </button>
              <button
                title="Preview and download QR"
                className="flex items-center gap-1.5 rounded-lg bg-clay/10 px-3 py-2 text-xs font-semibold text-clay"
                disabled={preview.isPending || renderingQr}
                onClick={() => preview.mutate(table)}
              >
                <Eye size={15} /> Preview QR
              </button>
              <button
                title="Change and revoke QR"
                className="flex items-center gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold"
                disabled={regenerate.isPending || renderingQr}
                onClick={() => confirm('Revoke the previous QR and generate a new one?') && regenerate.mutate(table)}
              >
                <RefreshCw size={15} /> Change QR
              </button>
              <button
                title="Delete table"
                className="rounded-lg bg-red-50 p-2 text-red-700"
                onClick={() => confirm(`Delete table ${table.number}?`) && remove.mutate(table._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {!tables.data?.length && <div className="mt-6"><Empty title="No tables" body="Add a table to generate its first QR code." /></div>}

      {editing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4">
          <Card className="w-full max-w-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="font-serif text-2xl">{editing._id ? 'Edit table' : 'Add table'}</h2>
              <button className="rounded-full bg-black/5 p-2" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={submit}>
              <label className="grid gap-1.5 text-sm font-medium">Table number<Input name="number" defaultValue={editing.number} required /></label>
              <label className="grid gap-1.5 text-sm font-medium">Display name<Input name="displayName" defaultValue={editing.displayName} /></label>
              <label className="grid gap-1.5 text-sm font-medium">Capacity<Input name="capacity" type="number" min="1" defaultValue={editing.capacity || 4} required /></label>
              <label className="grid gap-1.5 text-sm font-medium">Zone<Input name="zone" defaultValue={editing.zone || 'Dining Room'} required /></label>
              <label className="grid gap-1.5 text-sm font-medium">State<select name="state" defaultValue={editing.state || 'available'} className="rounded-xl border border-black/10 bg-paper px-4 py-3">{['available','occupied','reserved','cleaning','disabled'].map((state)=><option key={state}>{state}</option>)}</select></label>
              <label className="flex items-end gap-2 pb-3 text-sm"><input name="active" type="checkbox" defaultChecked={editing.active !== false} /> Active table</label>
              <div className="flex justify-end md:col-span-2"><Button disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save table'}</Button></div>
            </form>
          </Card>
        </div>
      )}

      {(qr || renderingQr) && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4">
          <Card className="w-full max-w-lg p-6 text-center">
            {renderingQr ? <Loading /> : qr && <>
              <div className="flex justify-end"><button className="rounded-full bg-black/5 p-2" onClick={() => setQr(null)}><X size={18} /></button></div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-clay">Scan to order</p>
              <h2 className="mt-2 font-serif text-4xl">Table {qr.table}</h2>
              <img className="mx-auto mt-5 w-72 rounded-2xl border bg-white p-3" src={qr.image} alt={`QR code for table ${qr.table}`} />
              <p className="mt-4 break-all text-xs text-ink/45">{qr.url}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={downloadQr}><Download className="mr-2 inline" size={17} />Download PNG</Button>
                <Button className="!bg-ink" onClick={printQr}><Printer className="mr-2 inline" size={17} />Print card</Button>
              </div>
            </>}
          </Card>
        </div>
      )}
    </div>
  );
}
