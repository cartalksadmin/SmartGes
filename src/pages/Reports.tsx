import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { downloadBlob } from '@/lib/utils';

const formatCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const Reports = () => {
  const [stats, setStats] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.getStats();
      const body = res?.data || res;
      setStats(body);
      const months = (body?.monthlyRevenueSeries || body?.data?.monthlyRevenueSeries || [])
        .map((m: any) => ({ month: m.month, total: Number(m.total || 0) }));
      setSeries(months);
    } catch (e) {
      console.error('Failed loading reports', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const exportExcel = async () => {
    // try dynamic import of xlsx; if missing, fallback to CSV
    const payload = {
      stats: stats?.data || stats,
      monthly: series
    };

    try {
      const XLSX = await import('xlsx');
      const ws1 = XLSX.utils.json_to_sheet([payload.stats.users || {}]);
      const ws2 = XLSX.utils.json_to_sheet(payload.monthly || series || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
      XLSX.utils.book_append_sheet(wb, ws2, 'MonthlyRevenue');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      downloadBlob(blob, `rapports-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      // fallback to CSV export
      try {
        const rows: string[] = [];
        rows.push('month;total');
        for (const m of series) rows.push(`${m.month};${m.total}`);
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `rapports-monthly-${new Date().toISOString().slice(0,10)}.csv`);
      } catch (e2) { console.error(e2); }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapports</h1>
        <div>
          <Button onClick={exportExcel} disabled={loading}>
            Exporter (Excel/CSV)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Chiffre d'affaires total</div>
          <div className="text-xl font-bold mt-2">{formatCurrency(stats?.data?.revenue?.total ?? stats?.revenue?.total ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Commandes</div>
          <div className="text-xl font-bold mt-2">{stats?.data?.orders?.total ?? stats?.orders?.total ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Utilisateurs</div>
          <div className="text-xl font-bold mt-2">{stats?.data?.users?.total ?? stats?.users?.total ?? 0}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm text-gray-600">Chiffre d'affaire - 12 derniers mois</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(m) => String(m)} />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
              <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
