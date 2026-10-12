import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { food, imageUrl, qs } from '../api/client';
import { Badge, Card, Empty, ErrorView, Field, Loading, Screen } from '../components/ui';
import { C, fmtDate } from '../theme';

export default function CatalogScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [q, setQ] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async (page = 1, query = q) => {
    try {
      const r = await food('GET', `/foods${qs({ q: query.trim(), page, per_page: 10 })}`);
      setItems((old) => (page === 1 ? r.data : [...old, ...r.data]));
      setMeta(r.meta); setState('ok');
    } catch (e) { setError(e); setState('error'); }
  }, [q]);

  useEffect(() => { const unsub = navigation.addListener('focus', () => load(1)); return unsub; }, [navigation, load]);
  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(() => load(1, q), 400); return () => clearTimeout(timer.current); }, [q]); // eslint-disable-line

  async function refresh() { setRefreshing(true); await load(1); setRefreshing(false); }
  async function loadMore() {
    if (more || !meta || meta.page >= meta.total_pages) return;
    setMore(true); await load(meta.page + 1); setMore(false);
  }

  const header = <View style={{ padding: 14, paddingBottom: 0 }}><Field placeholder="Cari makanan atau lokasi…" value={q} onChangeText={setQ} /></View>;
  if (state === 'loading') return <Screen>{header}<Loading /></Screen>;
  if (state === 'error') return <Screen>{header}<ErrorView error={error} onRetry={() => { setState('loading'); load(1); }} /></Screen>;
  return (
    <Screen>
      <FlatList data={items} keyExtractor={(i) => String(i.id)} ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore} onEndReachedThreshold={0.4}
        ListEmptyComponent={<Empty icon="🔍" title="Tidak ada makanan" text="Coba kata kunci lain atau tarik untuk memuat ulang." />}
        renderItem={({ item: f }) => (
          <Pressable onPress={() => navigation.navigate('FoodDetail', { id: f.id })} style={{ paddingHorizontal: 14 }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {imageUrl(f.image_url) ? <Image source={{ uri: imageUrl(f.image_url) }} style={{ height: 150, backgroundColor: C.greenSoft }} /> : <View style={{ height: 80, backgroundColor: C.greenSoft, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 34 }}>🍽️</Text></View>}
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, flex: 1 }}>{f.title}</Text><Badge status={f.status} /></View>
                <Text style={{ color: C.muted, marginTop: 2 }}>📍 {f.pickup_location}</Text>
                <Text style={{ color: C.muted }}>⏰ Layak hingga {fmtDate(f.expires_at)}</Text>
                <Text style={{ color: C.green, fontWeight: '700', marginTop: 6 }}>{f.quantity_available} {f.unit} tersisa</Text>
              </View>
            </Card>
          </Pressable>
        )} />
    </Screen>
  );
}
