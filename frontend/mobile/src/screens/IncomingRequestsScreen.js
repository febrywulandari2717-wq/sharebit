import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { donation, errText, food, qs, requests } from '../api/client';
import { Badge, Button, Card, Empty, ErrorView, Field, Loading, Screen } from '../components/ui';
import ReasonModal from '../components/ReasonModal';
import { C, fmtDate, textToIso, toLocalText } from '../theme';

export default function IncomingRequestsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [sched, setSched] = useState(null);
  const [form, setForm] = useState({ time: '', place: '', note: '' });
  const [formErr, setFormErr] = useState('');
  const [names, setNames] = useState({});

  const load = useCallback(async (page = 1) => {
    try {
      const r = await requests('GET', `/requests${qs({ page, per_page: 10 })}`);
      setItems((o) => (page === 1 ? r.data : [...(o || []), ...r.data])); setMeta(r.meta); setError(null);
      r.data.forEach((x) => {
        donation('GET', `/users/${x.recipient_id}/public`).then((u) => setNames((n) => ({ ...n, [x.recipient_id]: u.data.name }))).catch(() => {});
      });
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { const u = navigation.addListener('focus', () => load(1)); return u; }, [navigation, load]);

  const run = async (fn) => { try { await fn(); } catch (e) { Alert.alert('Gagal', errText(e)); } load(1); };
  const approve = (id) => run(() => requests('POST', `/requests/${id}/approve`));
  const reject = (reason) => { const id = rejectId; setRejectId(null); run(() => requests('POST', `/requests/${id}/reject`, { body: { reason } })); };
  const cancel = (id) => Alert.alert('Batalkan permintaan?', 'Stok dikembalikan.', [{ text: 'Tidak' }, { text: 'Ya', style: 'destructive', onPress: () => run(() => requests('POST', `/requests/${id}/cancel`, { body: { reason: 'Dibatalkan donor' } })) }]);

  async function openSchedule(x) {
    let place = '', time = toLocalText(new Date(Date.now() + 24 * 3600e3));
    try { const d = (await food('GET', `/foods/${x.food_id}`)).data; place = d.pickup_location; time = toLocalText(new Date(d.pickup_start)); } catch (_) { /* isi manual */ }
    setForm({ time, place, note: '' }); setFormErr(''); setSched(x);
  }
  async function submitSchedule() {
    const iso = textToIso(form.time);
    if (!iso) { setFormErr('Format waktu: 2026-10-12 14:30'); return; }
    if (form.place.trim().length < 5) { setFormErr('Lokasi minimal 5 karakter.'); return; }
    try {
      await donation('POST', '/donations', { body: { request_id: sched.id, pickup_time: iso, pickup_location: form.place.trim(), instructions: form.note || null } });
      setSched(null); load(1);
    } catch (e) { setFormErr(errText(e)); }
  }

  if (error && !items) return <Screen><ErrorView error={error} onRetry={() => load(1)} /></Screen>;
  if (!items) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <ReasonModal visible={!!rejectId} title="Tolak permintaan" onCancel={() => setRejectId(null)} onSubmit={reject} />
      <Modal visible={!!sched} transparent animationType="slide" onRequestClose={() => setSched(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
          <ScrollView style={{ maxHeight: '85%', backgroundColor: C.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12, color: C.ink }}>Jadwalkan pengambilan</Text>
            <Field label="Waktu (YYYY-MM-DD HH:mm)" value={form.time} onChangeText={(v) => setForm((o) => ({ ...o, time: v }))} />
            <Field label="Lokasi" value={form.place} onChangeText={(v) => setForm((o) => ({ ...o, place: v }))} />
            <Field label="Catatan (opsional)" value={form.note} onChangeText={(v) => setForm((o) => ({ ...o, note: v }))} multiline />
            {formErr ? <Text style={{ color: C.danger, marginBottom: 10 }}>{formErr}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}><Button title="Batal" kind="outline" small onPress={() => setSched(null)} /><Button title="Jadwalkan" small onPress={submitSchedule} /></View>
          </ScrollView>
        </View>
      </Modal>
      <FlatList data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} />}
        onEndReached={() => meta && meta.page < meta.total_pages && load(meta.page + 1)}
        ListEmptyComponent={<Empty icon="📭" title="Belum ada permintaan masuk" text="Permintaan dari penerima muncul di sini." />}
        renderItem={({ item: x }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', fontSize: 16, color: C.ink, flex: 1 }}>{x.food_title}</Text><Badge status={x.status} /></View>
            <Text style={{ color: C.muted }}>{names[x.recipient_id] || `Penerima #${x.recipient_id}`} · {x.quantity} porsi · {fmtDate(x.created_at)}</Text>
            {x.note ? <Text style={{ marginTop: 4 }}>“{x.note}”</Text> : null}
            {x.rejection_reason ? <Text style={{ color: C.danger }}>Ditolak: {x.rejection_reason}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {x.status === 'pending' ? <><Button title="Setujui" kind="green" small onPress={() => approve(x.id)} /><Button title="Tolak" kind="danger" small onPress={() => setRejectId(x.id)} /></> : null}
              {x.status === 'approved' ? <><Button title="Jadwalkan" small onPress={() => openSchedule(x)} /><Button title="Batalkan" kind="danger" small onPress={() => cancel(x.id)} /></> : null}
              {x.status === 'scheduled' ? <Button title="Lihat donasi" kind="outline" small onPress={() => navigation.navigate('Donations')} /> : null}
            </View>
          </Card>
        )} />
    </Screen>
  );
}
