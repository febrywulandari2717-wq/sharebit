import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { errText, qs, requests } from '../api/client';
import { Badge, Button, Card, Empty, ErrorView, Loading, Screen } from '../components/ui';
import { C, fmtDate, STATUS } from '../theme';

export default function MyRequestsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (page = 1) => {
    try {
      const r = await requests('GET', `/requests${qs({ page, per_page: 10 })}`);
      setItems((o) => (page === 1 ? r.data : [...(o || []), ...r.data])); setMeta(r.meta); setError(null);
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { const u = navigation.addListener('focus', () => load(1)); return u; }, [navigation, load]);

  function cancel(id) {
    Alert.alert('Batalkan permintaan?', 'Stok akan dikembalikan.', [{ text: 'Tidak' }, { text: 'Ya, batalkan', style: 'destructive', onPress: async () => {
      try { await requests('POST', `/requests/${id}/cancel`, { body: {} }); load(1); } catch (e) { Alert.alert('Gagal', errText(e)); load(1); }
    } }]);
  }
  async function detail(id) {
    try {
      const d = (await requests('GET', `/requests/${id}`)).data;
      Alert.alert('Riwayat status', d.history.map((h) => `• ${(STATUS[h.to_status] || [h.to_status])[0]} — ${fmtDate(h.at)}${h.reason ? `\n   ${h.reason}` : ''}`).join('\n'));
    } catch (e) { Alert.alert('Gagal', errText(e)); }
  }

  if (error && !items) return <Screen><ErrorView error={error} onRetry={() => load(1)} /></Screen>;
  if (!items) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <FlatList data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} />}
        onEndReached={() => meta && meta.page < meta.total_pages && load(meta.page + 1)}
        ListEmptyComponent={<Empty icon="🧺" title="Belum ada permintaan" text="Pilih makanan di tab Katalog." />}
        renderItem={({ item: x }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', fontSize: 16, color: C.ink, flex: 1 }}>{x.food_title}</Text><Badge status={x.status} /></View>
            <Text style={{ color: C.muted }}>{x.quantity} porsi · {fmtDate(x.created_at)}</Text>
            {x.note ? <Text style={{ marginTop: 4 }}>“{x.note}”</Text> : null}
            {x.rejection_reason ? <Text style={{ color: C.danger, marginTop: 4 }}>Ditolak: {x.rejection_reason}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button title="Riwayat" kind="outline" small onPress={() => detail(x.id)} />
              {['pending', 'approved'].includes(x.status) ? <Button title="Batalkan" kind="danger" small onPress={() => cancel(x.id)} /> : null}
              {x.status === 'scheduled' ? <Button title="Lihat jadwal" kind="green" small onPress={() => navigation.navigate('Donations')} /> : null}
            </View>
          </Card>
        )} />
    </Screen>
  );
}
