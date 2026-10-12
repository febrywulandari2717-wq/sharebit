import React, { useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { errText, newKey, requests } from '../api/client';
import { Button, Card, Field, Screen } from '../components/ui';
import { C } from '../theme';

export default function CreateRequestScreen({ route, navigation }) {
  const f = route.params.food;
  const maxQ = Math.min(f.quantity_available, f.max_per_request || f.quantity_available);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey()); // dipakai ulang jika koneksi putus agar tidak terkirim ganda

  async function submit() {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1 || n > maxQ) { setError(`Jumlah harus 1 sampai ${maxQ}.`); return; }
    setBusy(true); setError('');
    try {
      await requests('POST', '/requests', { key: key.current, body: { food_id: f.id, quantity: n, note: note.trim() || undefined } });
      key.current = newKey();
      navigation.navigate('Tabs', { screen: 'MyRequests' });
    } catch (e) {
      const m = { DUPLICATE_ACTIVE_REQUEST: 'Anda sudah punya permintaan aktif untuk makanan ini.', INSUFFICIENT_STOCK: 'Stok tidak mencukupi.' }[e.code];
      setError(m || errText(e)); setBusy(false);
    }
  }
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card><Text style={{ fontWeight: '800', fontSize: 18, color: C.ink }}>{f.title}</Text><Text style={{ color: C.muted }}>Tersisa {f.quantity_available} {f.unit}</Text></Card>
        <Field label={`Jumlah (maks ${maxQ})`} value={qty} onChangeText={setQty} keyboardType="number-pad" />
        <Field label="Catatan untuk donor (opsional)" value={note} onChangeText={setNote} multiline maxLength={255} />
        {error ? <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title="Kirim permintaan" onPress={submit} loading={busy} />
      </ScrollView>
    </Screen>
  );
}
