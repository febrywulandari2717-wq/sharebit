import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { donation, errText, qs } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, Empty, ErrorView, Loading, Screen } from '../components/ui';
import ReasonModal from '../components/ReasonModal';
import { C, fmtDate } from '../theme';

export default function DonationsScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  const load = useCallback(async (page = 1) => {
    try {
      const r = await donation('GET', `/donations${qs({ page, per_page: 10 })}`);
      setItems((o) => (page === 1 ? r.data : [...(o || []), ...r.data])); setMeta(r.meta); setError(null);
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { const u = navigation.addListener('focus', () => load(1)); return u; }, [navigation, load]);

  function confirmHandover(id) {
    Alert.alert('Konfirmasi serah terima', 'Pastikan makanan sudah diserahterimakan.', [{ text: 'Batal' }, { text: 'Konfirmasi', onPress: async () => {
      try {
        const d = (await donation('POST', `/donations/${id}/confirm`)).data;
        Alert.alert(d.status === 'completed' ? 'Donasi selesai 🎉' : 'Konfirmasi tercatat', d.status === 'completed' ? 'Terima kasih!' : 'Menunggu konfirmasi pihak lain.');
      } catch (e) { Alert.alert('Gagal', errText(e)); }
      load(1);
    } }]);
  }
  const cancel = (id) => setCancelId(id);
  async function doCancel(id, reason) {
    setCancelId(null);
    try { await donation('POST', `/donations/${id}/cancel`, { body: { reason } }); } catch (e) { Alert.alert('Gagal', errText(e)); }
    load(1);
  }

  if (error && !items) return <Screen><ErrorView error={error} onRetry={() => load(1)} /></Screen>;
  if (!items) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <ReasonModal visible={!!cancelId} title="Batalkan donasi" onCancel={() => setCancelId(null)} onSubmit={(r) => doCancel(cancelId, r)} />
      <FlatList data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} />}
        onEndReached={() => meta && meta.page < meta.total_pages && load(meta.page + 1)}
        ListEmptyComponent={<Empty icon="📦" title="Belum ada donasi" text="Donasi muncul setelah donor menjadwalkan pengambilan." />}
        renderItem={({ item: d }) => {
          const mine = d.donor_id === user.id ? d.donor_confirmed_at : d.recipient_confirmed_at;
          return (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: C.ink }}>{d.quantity} porsi</Text><Badge status={d.status} /></View>
              <Text style={{ marginTop: 6 }}>⏰ {fmtDate(d.pickup_time)}</Text><Text>📍 {d.pickup_location}</Text>
              {d.instructions ? <Text>📝 {d.instructions}</Text> : null}
              <Text style={{ color: C.muted, marginTop: 6 }}>Donor: {d.donor_confirmed_at ? '✅' : '⏳'}  ·  Penerima: {d.recipient_confirmed_at ? '✅' : '⏳'}</Text>
              {d.cancel_reason ? <Text style={{ color: C.danger }}>Dibatalkan: {d.cancel_reason}</Text> : null}
              {d.status === 'scheduled' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {mine ? <Text style={{ color: C.muted, alignSelf: 'center' }}>Menunggu pihak lain</Text> : <Button title="Konfirmasi" kind="green" small onPress={() => confirmHandover(d.id)} />}
                  <Button title="Batalkan" kind="danger" small onPress={() => cancel(d.id)} />
                </View>
              ) : null}
            </Card>
          );
        }} />
    </Screen>
  );
}
