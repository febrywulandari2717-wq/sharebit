import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { errText, food, imageUrl, qs } from '../api/client';
import { Badge, Button, Card, Empty, ErrorView, Loading, Screen } from '../components/ui';
import { C, fmtDate } from '../theme';

export default function MyFoodsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (page = 1) => {
    try {
      const r = await food('GET', `/foods${qs({ mine: 'true', page, per_page: 10 })}`);
      setItems((o) => (page === 1 ? r.data : [...(o || []), ...r.data])); setMeta(r.meta); setError(null);
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { const u = navigation.addListener('focus', () => load(1)); return u; }, [navigation, load]);

  async function toggle(f) {
    try { await food('PATCH', `/foods/${f.id}`, { body: { status: f.status === 'closed' ? 'available' : 'closed' } }); } catch (e) { Alert.alert('Gagal', errText(e)); }
    load(1);
  }
  function remove(f) {
    Alert.alert('Hapus makanan?', f.title, [{ text: 'Batal' }, { text: 'Hapus', style: 'destructive', onPress: async () => {
      try { await food('DELETE', `/foods/${f.id}`); } catch (e) { Alert.alert('Gagal', errText(e)); }
      load(1);
    } }]);
  }

  if (error && !items) return <Screen><ErrorView error={error} onRetry={() => load(1)} /></Screen>;
  if (!items) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <FlatList data={items} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 14 }}
        ListHeaderComponent={<Button title="+ Bagikan makanan" onPress={() => navigation.navigate('FoodForm', {})} style={{ marginBottom: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} />}
        onEndReached={() => meta && meta.page < meta.total_pages && load(meta.page + 1)}
        ListEmptyComponent={<Empty icon="🍱" title="Belum ada makanan" text="Ketuk tombol di atas untuk mulai berbagi." />}
        renderItem={({ item: f }) => (
          <Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {imageUrl(f.image_url) ? <Image source={{ uri: imageUrl(f.image_url) }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: C.greenSoft }} /> : <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>🍽️</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{f.title}</Text>
                <Text style={{ color: C.muted }}>{f.quantity_available}/{f.quantity_total} {f.unit} · hingga {fmtDate(f.expires_at)}</Text>
                <View style={{ marginTop: 4 }}><Badge status={f.status} /></View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button title="Ubah" kind="outline" small onPress={() => navigation.navigate('FoodForm', { food: f })} />
              <Button title={f.status === 'closed' ? 'Buka' : 'Tutup'} kind="outline" small onPress={() => toggle(f)} />
              <Button title="Hapus" kind="danger" small onPress={() => remove(f)} />
            </View>
          </Card>
        )} />
    </Screen>
  );
}
