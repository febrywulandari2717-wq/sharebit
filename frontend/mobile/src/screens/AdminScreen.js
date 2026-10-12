import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { donation, food, requests } from '../api/client';
import { Card, Screen } from '../components/ui';
import { C } from '../theme';

export default function AdminScreen({ navigation }) {
  const [s, setS] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const [u, f, r, d] = await Promise.allSettled([
      donation('GET', '/users?per_page=1'), food('GET', '/foods/stats'), requests('GET', '/requests/stats'), donation('GET', '/donations/stats'),
    ]);
    const v = (x, fn) => (x.status === 'fulfilled' ? fn(x.value) : '–');
    setS([
      ['Pengguna', v(u, (x) => x.meta.total)], ['Makanan', v(f, (x) => x.data.total)], ['Stok tersedia', v(f, (x) => x.data.total_available_stock)],
      ['Permintaan', v(r, (x) => x.data.total)], ['Menunggu', v(r, (x) => x.data.by_status.pending || 0)], ['Donasi', v(d, (x) => x.data.total)],
      ['Donasi selesai', v(d, (x) => x.data.by_status.completed || 0)], ['Porsi tersalur', v(d, (x) => x.data.total_portions_delivered)],
    ]);
  }, []);
  useEffect(() => { load(); const u = navigation.addListener('focus', load); return u; }, [load, navigation]);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(s || []).map(([l, n]) => <Card key={l} style={{ width: '47%', marginBottom: 0 }}><Text style={{ fontSize: 28, fontWeight: '800', color: C.green }}>{n}</Text><Text style={{ color: C.muted }}>{l}</Text></Card>)}
        </View>
        <Text style={{ color: C.muted, marginTop: 18 }}>Pengelolaan pengguna, makanan, dan donasi tersedia lengkap di dashboard admin pada website.</Text>
      </ScrollView>
    </Screen>
  );
}
