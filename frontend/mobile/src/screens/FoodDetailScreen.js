import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { donation, food, imageUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, ErrorView, Loading, Screen } from '../components/ui';
import { C, fmtDate } from '../theme';

export default function FoodDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const [f, setF] = useState(null);
  const [donor, setDonor] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await food('GET', `/foods/${route.params.id}`);
      setF(r.data);
      donation('GET', `/users/${r.data.donor_id}/public`).then((d) => setDonor(d.data.name)).catch(() => setDonor(`Donor #${r.data.donor_id}`));
    } catch (e) { setError(e); }
  }, [route.params.id]);
  useEffect(() => { load(); const u = navigation.addListener('focus', load); return u; }, [load, navigation]);

  if (error) return <Screen><ErrorView error={error} onRetry={load} /></Screen>;
  if (!f) return <Screen><Loading /></Screen>;
  const expired = new Date(f.expires_at) <= new Date();
  const canRequest = user.role === 'recipient' && f.status === 'available' && !expired && f.quantity_available > 0;
  const Row = ({ k, v }) => (v ? <View style={{ flexDirection: 'row', marginBottom: 6 }}><Text style={{ width: 110, color: C.muted }}>{k}</Text><Text style={{ flex: 1, color: C.ink }}>{v}</Text></View> : null);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        {imageUrl(f.image_url) ? <Image source={{ uri: imageUrl(f.image_url) }} style={{ height: 210, borderRadius: 14, backgroundColor: C.greenSoft, marginBottom: 12 }} /> : null}
        <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>{f.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 8 }}><Badge status={f.status} /><Text style={{ color: C.muted }}>{f.category ? f.category.name : ''}</Text></View>
        <Text style={{ color: C.ink, marginBottom: 12 }}>{f.description || 'Tidak ada deskripsi.'}</Text>
        <Card>
          <Row k="Donor" v={donor} /><Row k="Lokasi" v={f.pickup_location} />
          <Row k="Waktu ambil" v={`${fmtDate(f.pickup_start)} – ${fmtDate(f.pickup_end)}`} /><Row k="Layak hingga" v={fmtDate(f.expires_at)} />
          <Row k="Stok" v={`${f.quantity_available} dari ${f.quantity_total} ${f.unit}`} /><Row k="Maks/permintaan" v={f.max_per_request ? String(f.max_per_request) : ''} />
          <Row k="Alergen" v={f.allergens} /><Row k="Penyimpanan" v={f.storage_info} />
        </Card>
        {canRequest ? <Button title="Ajukan permintaan" onPress={() => navigation.navigate('CreateRequest', { food: f })} />
          : <Text style={{ color: C.muted, textAlign: 'center' }}>{user.role === 'recipient' ? 'Makanan ini tidak dapat diajukan (habis, ditutup, atau kedaluwarsa).' : 'Hanya akun penerima yang dapat mengajukan permintaan.'}</Text>}
      </ScrollView>
    </Screen>
  );
}
